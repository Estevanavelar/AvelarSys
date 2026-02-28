import { router, protectedProcedure } from "../lib/trpc";
import { z } from "zod";
import { db } from "../db";
import { devices, customerDevices, customers } from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { avadminApi } from "../lib/avadmin-api";

export const devicesRouter = router({
  // Lista aparelhos cadastrados para um cliente (CPF)
  getCustomerDevices: protectedProcedure
    .input(z.object({ customerCpf: z.string().min(11).max(14) }))
    .query(async ({ ctx, input }) => {
      const cleanCpf = input.customerCpf.replace(/\D/g, "");
      if (cleanCpf.length !== 11) {
        throw new Error("CPF inválido");
      }

      // Garante vínculo do cliente com a loja atual no momento da busca
      const existingCustomer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, cleanCpf))
        .limit(1);

      if (existingCustomer.length > 0) {
        if (existingCustomer[0].accountId !== ctx.accountId) {
          await db
            .update(customers)
            .set({
              accountId: ctx.accountId!,
              isActive: true,
              lastSyncAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(customers.id, cleanCpf));
        }
      } else {
        await db.insert(customers).values({
          id: cleanCpf,
          accountId: ctx.accountId!,
          name: cleanCpf,
          whatsapp: null,
          isActive: true,
          lastSyncAt: new Date(),
        });
      }

      // Sincroniza devices globais para o banco da loja no momento da busca
      const globalDevices = await avadminApi.getCustomerDevicesByCPF(cleanCpf);
      for (const item of globalDevices) {
        const brand = String(item.brand || "").trim().toUpperCase();
        const model = String(item.model || "").trim().toUpperCase();
        if (!brand || !model) continue;

        const deviceLabel = String(item.device_label || `${brand} ${model}`)
          .trim()
          .toUpperCase();

        const existingLocal = await db
          .select({ id: customerDevices.id })
          .from(customerDevices)
          .where(
            and(
              eq(customerDevices.accountId, ctx.accountId!),
              eq(customerDevices.ownerCpf, ctx.account!.owner_cpf!),
              eq(customerDevices.customerId, cleanCpf),
              eq(customerDevices.brand, brand),
              eq(customerDevices.model, model)
            )
          )
          .limit(1);

        if (existingLocal.length > 0) {
          await db
            .update(customerDevices)
            .set({
              deviceLabel,
              isActive: true,
              updatedAt: new Date(),
            })
            .where(eq(customerDevices.id, existingLocal[0].id));
        } else {
          await db.insert(customerDevices).values({
            accountId: ctx.accountId!,
            ownerCpf: ctx.account!.owner_cpf!,
            customerId: cleanCpf,
            brand,
            model,
            deviceLabel,
            isActive: true,
          });
        }
      }

      const localDevices = await db
        .select({
          id: customerDevices.id,
          brand: customerDevices.brand,
          model: customerDevices.model,
          deviceLabel: customerDevices.deviceLabel,
          createdAt: customerDevices.createdAt,
          updatedAt: customerDevices.updatedAt,
        })
        .from(customerDevices)
        .where(
          and(
            eq(customerDevices.accountId, ctx.accountId!),
            eq(customerDevices.ownerCpf, ctx.account!.owner_cpf!),
            eq(customerDevices.customerId, cleanCpf),
            eq(customerDevices.isActive, true)
          )
        )
        .orderBy(desc(customerDevices.updatedAt));

      const localWithSource = localDevices.map((item) => ({
        ...item,
        source: "local" as const,
      }));

      return localWithSource;
    }),

  // Cadastra aparelho para cliente (CPF)
  createCustomerDevice: protectedProcedure
    .input(
      z.object({
        customerCpf: z.string().min(11).max(14),
        brand: z.string().min(1).max(100),
        model: z.string().min(1).max(150),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cleanCpf = input.customerCpf.replace(/\D/g, "");
      if (cleanCpf.length !== 11) {
        throw new Error("CPF inválido");
      }

      const brand = input.brand.trim().toUpperCase();
      const model = input.model.trim().toUpperCase();
      const deviceLabel = `${brand} ${model}`.trim();

      // Garante que cliente está vinculado à conta
      const linkedCustomer = await db
        .select({ id: customers.id })
        .from(customers)
        .where(
          and(
            eq(customers.id, cleanCpf),
            eq(customers.isActive, true)
          )
        )
        .limit(1);

      if (linkedCustomer.length === 0) {
        throw new Error("Cliente não vinculado. Cadastre/vincule o cliente primeiro.");
      }

      const globalSync = await avadminApi.upsertCustomerDevice(cleanCpf, {
        brand,
        model,
        device_label: deviceLabel,
      });
      if (!globalSync.length) {
        throw new Error("Falha ao sincronizar aparelho no banco global");
      }

      const existing = await db
        .select()
        .from(customerDevices)
        .where(
          and(
            eq(customerDevices.accountId, ctx.accountId!),
            eq(customerDevices.customerId, cleanCpf),
            eq(customerDevices.brand, brand),
            eq(customerDevices.model, model)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const updated = await db
          .update(customerDevices)
          .set({
            deviceLabel,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(customerDevices.id, existing[0].id))
          .returning();
        return updated[0];
      }

      const inserted = await db
        .insert(customerDevices)
        .values({
          accountId: ctx.accountId!,
          ownerCpf: ctx.account!.owner_cpf!,
          customerId: cleanCpf,
          brand,
          model,
          deviceLabel,
          isActive: true,
        })
        .returning();

      return inserted[0];
    }),

  // Register device
  registerDevice: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1),
        deviceId: z.string().min(1),
        pushToken: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if device already exists
      const existingDevice = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.deviceId, input.deviceId),
            eq(devices.ownerCpf, ctx.account!.owner_cpf!)
          )
        )
        .limit(1);

      if (existingDevice.length > 0) {
        // Update existing device
        const updatedDevice = await db
          .update(devices)
          .set({
            pushToken: input.pushToken,
            lastActiveAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(devices.deviceId, input.deviceId),
              eq(devices.ownerCpf, ctx.account!.owner_cpf!)
            )
          )
          .returning();

        return updatedDevice[0];
      }

      // Create new device
      const newDevice = await db
        .insert(devices)
        .values({
          ...input,
          accountId: ctx.accountId!,
          ownerCpf: ctx.account!.owner_cpf!,
          operatorCpf: ctx.user!.cpf || ctx.account!.owner_cpf!,
          isActive: true,
          lastActiveAt: new Date(),
        })
        .returning();

      return newDevice[0];
    }),

  // Get user's devices
  getUserDevices: protectedProcedure
    .query(async ({ ctx }) => {
      const userDevices = await db
        .select()
        .from(devices)
        .where(
          and(
            eq(devices.operatorCpf, ctx.user!.cpf),
            eq(devices.ownerCpf, ctx.account!.owner_cpf!)
          )
        )
        .orderBy(desc(devices.lastActiveAt));

      return userDevices;
    }),

  // Update push token
  updatePushToken: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        pushToken: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedDevice = await db
        .update(devices)
        .set({
          pushToken: input.pushToken,
          lastActiveAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(devices.deviceId, input.deviceId),
            eq(devices.operatorCpf, ctx.user!.cpf),
            eq(devices.ownerCpf, ctx.account!.owner_cpf!)
          )
        )
        .returning();

      if (updatedDevice.length === 0) {
        throw new Error("Dispositivo não encontrado");
      }

      return updatedDevice[0];
    }),

  // Deactivate device
  deactivateDevice: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deactivatedDevice = await db
        .update(devices)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(devices.deviceId, input.deviceId),
            eq(devices.operatorCpf, ctx.user!.cpf),
            eq(devices.ownerCpf, ctx.account!.owner_cpf!)
          )
        )
        .returning();

      if (deactivatedDevice.length === 0) {
        throw new Error("Dispositivo não encontrado");
      }

      return { success: true };
    }),

  // Update device activity
  updateActivity: protectedProcedure
    .input(z.object({ deviceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const updatedDevice = await db
        .update(devices)
        .set({
          lastActiveAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(devices.deviceId, input.deviceId),
            eq(devices.operatorCpf, ctx.user!.cpf),
            eq(devices.ownerCpf, ctx.account!.owner_cpf!)
          )
        )
        .returning();

      if (updatedDevice.length === 0) {
        throw new Error("Dispositivo não encontrado");
      }

      return updatedDevice[0];
    }),
});