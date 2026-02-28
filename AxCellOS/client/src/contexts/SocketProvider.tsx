import React, { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { connectSocket, disconnectSocket } from "@/lib/socket";

/**
 * Provider que conecta ao WebSocket e invalida queries tRPC em tempo real
 * quando ordens, produtos ou clientes são atualizados.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const utils = trpc.useUtils();
  const utilsRef = useRef(utils);
  utilsRef.current = utils;

  useEffect(() => {
    const onInvalidate = (event: string) => {
      const u = utilsRef.current;
      if (event === "orders") {
        void u.orders.getOrders.invalidate();
        void u.orders.getOrder.invalidate();
      } else if (event === "products") {
        void u.products.getProducts.invalidate();
        void u.products.getProduct.invalidate();
      } else if (event === "customers") {
        void u.customers.getCustomers.invalidate();
        void u.customers.getCustomer.invalidate();
      }
    };

    connectSocket(onInvalidate);

    return () => {
      disconnectSocket();
    };
  }, []);

  return <>{children}</>;
}
