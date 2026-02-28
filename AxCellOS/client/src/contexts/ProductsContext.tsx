import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { normalizeStorageImageUrl } from '@/lib/storage';

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: number;
  cost?: number;
  quantity: number;
  minStock?: number;
  maxStock?: number;
  unit?: string;
  category?: string;
  imageUrl?: string;
  imageBase64?: string;
  emojiIcon?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductsContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  searchProducts: (term: string) => Product[];
  refreshProducts: () => Promise<void>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const productsQuery = trpc.products.getProducts.useQuery({
    isActive: true,
    limit: 100,
    offset: 0,
  });
  const createProduct = trpc.products.createProduct.useMutation();
  const updateProductMutation = trpc.products.updateProduct.useMutation();
  const deleteProductMutation = trpc.products.deleteProduct.useMutation();

  const mappedProducts = useMemo(() => {
    if (!productsQuery.data) return [];
    return productsQuery.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description || undefined,
      sku: product.sku || '',
      barcode: product.barcode || undefined,
      price: Number(product.price || 0),
      cost: product.costPrice ? Number(product.costPrice) : undefined,
      quantity: product.stock ?? 0,
      minStock: product.minStock ?? 0,
      maxStock: product.maxStock || undefined,
      unit: product.unit || 'unidade',
      category: product.category || undefined,
      imageUrl: normalizeStorageImageUrl(product.imageUrl || undefined),
      imageBase64: undefined,
      emojiIcon: (product.metadata as any)?.emojiIcon || undefined,
      active: product.isActive ?? true,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt),
    })) as Product[];
  }, [productsQuery.data]);

  useEffect(() => {
    if (!productsQuery.data) return;
    setProducts(mappedProducts);
  }, [mappedProducts, productsQuery.data]);

  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createProduct.mutateAsync({
        name: product.name,
        description: product.description || undefined,
        sku: product.sku || undefined,
        barcode: product.barcode || undefined,
        price: Number(product.price || 0),
        costPrice: product.cost ? Number(product.cost) : undefined,
        category: product.category || undefined,
        unit: product.unit || 'unidade',
        stock: Number(product.quantity || 0),
        minStock: Number(product.minStock || 0),
        maxStock: product.maxStock ? Number(product.maxStock) : undefined,
        isActive: product.active ?? true,
        imageUrl: product.imageUrl || undefined,
        metadata: product.emojiIcon ? { emojiIcon: product.emojiIcon } : undefined,
      });
      await productsQuery.refetch();
    } catch (error) {
      console.error('Erro ao criar produto:', error);
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      await updateProductMutation.mutateAsync({
        id,
        data: {
          name: updates.name,
          description: updates.description,
          sku: updates.sku || undefined,
          barcode: updates.barcode,
          price: updates.price !== undefined ? Number(updates.price) : undefined,
          costPrice: updates.cost !== undefined ? Number(updates.cost) : undefined,
          category: updates.category || undefined,
          unit: updates.unit,
          stock: updates.quantity !== undefined ? Number(updates.quantity) : undefined,
          minStock: updates.minStock !== undefined ? Number(updates.minStock) : undefined,
          maxStock: updates.maxStock,
          isActive: updates.active,
          imageUrl: normalizeStorageImageUrl(updates.imageUrl || undefined),
          metadata: updates.emojiIcon ? { emojiIcon: updates.emojiIcon } : undefined,
        },
      });
      await productsQuery.refetch();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteProductMutation.mutateAsync({ id });
      await productsQuery.refetch();
    } catch (error) {
      console.error('Erro ao remover produto:', error);
    }
  };

  const getProductById = (id: string) => {
    return products.find((p) => p.id === id);
  };

  const searchProducts = (term: string) => {
    const lowerTerm = term.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerTerm) ||
        p.sku.toLowerCase().includes(lowerTerm) ||
        p.category?.toLowerCase().includes(lowerTerm)
    );
  };

  const refreshProducts = async () => {
    await productsQuery.refetch();
  };

  return (
    <ProductsContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, getProductById, searchProducts, refreshProducts }}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (!context) {
    throw new Error('useProducts deve ser usado dentro de ProductsProvider');
  }
  return context;
}
