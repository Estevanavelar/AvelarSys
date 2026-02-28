import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  address?: string;
  city?: string;
  state?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CustomersContextType {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  getCustomerById: (id: string) => Customer | undefined;
  searchByCPF: (cpf: string) => Customer | undefined;
  searchByName: (name: string) => Customer[];
}

const CustomersContext = createContext<CustomersContextType | undefined>(undefined);

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const customersQuery = trpc.customers.getCustomers.useQuery({
    isActive: true,
    limit: 200,
    offset: 0,
  });
  const createCustomer = trpc.customers.createCustomer.useMutation();
  const updateCustomerMutation = trpc.customers.updateCustomer.useMutation();

  const mappedCustomers = useMemo(() => {
    if (!customersQuery.data) return [];
    return customersQuery.data.map((customer) => ({
      id: customer.id,
      name: customer.name || '',
      email: undefined,
      phone: customer.whatsapp || undefined,
      cpf: customer.id,
      address: undefined,
      city: undefined,
      state: undefined,
      active: customer.isActive ?? true,
      createdAt: new Date(customer.createdAt),
      updatedAt: new Date(customer.updatedAt),
    })) as Customer[];
  }, [customersQuery.data]);

  useEffect(() => {
    if (!customersQuery.data) return;
    setCustomers(mappedCustomers);
  }, [mappedCustomers, customersQuery.data]);

  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createCustomer.mutateAsync({
        customerId: customer.cpf || customer.name,
        name: customer.name,
        phone: customer.phone || undefined,
        whatsapp: customer.phone || undefined,
        email: customer.email || undefined,
        address: customer.address ? customer.address : undefined,
        isActive: customer.active ?? true,
      });
      await customersQuery.refetch();
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      await updateCustomerMutation.mutateAsync({
        customerId: id,
        data: {
          name: updates.name,
          phone: updates.phone,
          whatsapp: updates.phone,
          email: updates.email,
          address: updates.address,
          isActive: updates.active,
        },
      });
      await customersQuery.refetch();
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
    }
  };

  const getCustomerById = (id: string) => {
    return customers.find((c) => c.id === id);
  };

  const searchByCPF = (cpf: string) => {
    const cleanCPF = cpf.replace(/\D/g, '');
    return customers.find((c) => c.cpf?.replace(/\D/g, '') === cleanCPF);
  };

  const searchByName = (name: string) => {
    const lowerName = name.toLowerCase();
    return customers.filter((c) =>
      c.name.toLowerCase().includes(lowerName)
    );
  };

  return (
    <CustomersContext.Provider value={{ customers, addCustomer, updateCustomer, getCustomerById, searchByCPF, searchByName }}>
      {children}
    </CustomersContext.Provider>
  );
}

export function useCustomers() {
  const context = useContext(CustomersContext);
  if (!context) {
    throw new Error('useCustomers deve ser usado dentro de CustomersProvider');
  }
  return context;
}
