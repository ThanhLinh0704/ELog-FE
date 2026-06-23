import type { Product, ProductStatus } from '../types/product';
import { mockProducts, saveMockProducts } from './productData';
import { calculateVolumeM3 } from '../utils/productCalculations';

const delay = (ms = 600) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export interface GetProductsResponse {
  content: Product[];
  totalElements: number;
  totalPages: number;
}

export const productService = {
  async getProducts(params: {
    keyword?: string;
    status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
    page?: number;
    size?: number;
  }): Promise<GetProductsResponse> {
    await delay(500);
    const { keyword = '', status = 'ALL', page = 0, size = 10 } = params;

    let filtered = [...mockProducts];

    // Filter by keyword (SKU or Name)
    if (keyword.trim()) {
      const kw = keyword.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.sku.toLowerCase().includes(kw) ||
          p.productName.toLowerCase().includes(kw)
      );
    }

    // Filter by status
    if (status !== 'ALL') {
      filtered = filtered.filter((p) => p.status === status);
    }

    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / size);
    const start = page * size;
    const content = filtered.slice(start, start + size);

    return {
      content,
      totalElements,
      totalPages,
    };
  },

  async getProductById(id: string): Promise<Product> {
    await delay(300);
    const product = mockProducts.find((p) => p.id === id);
    if (!product) {
      throw new Error('404');
    }
    return product;
  },

  async createProduct(payload: Omit<Product, 'id' | 'volumeM3' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    await delay(800);

    const skuUpper = payload.sku.toUpperCase().trim();
    const duplicated = mockProducts.some((p) => p.sku.toUpperCase() === skuUpper);

    if (duplicated) {
      throw {
        status: 409,
        field: "sku",
        message: "SKU này đã tồn tại trong danh mục",
      };
    }

    const volumeM3 = calculateVolumeM3(payload.lengthM, payload.widthM, payload.heightM) || 0;

    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      sku: skuUpper,
      productName: payload.productName.trim(),
      lengthM: payload.lengthM,
      widthM: payload.widthM,
      heightM: payload.heightM,
      weightKg: payload.weightKg,
      volumeM3,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedList = [newProduct, ...mockProducts];
    saveMockProducts(updatedList);

    return newProduct;
  },

  async updateProduct(id: string, payload: Omit<Product, 'id' | 'sku' | 'volumeM3' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    await delay(800);

    const index = mockProducts.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('404');
    }

    const existingProduct = mockProducts[index];
    const volumeM3 = calculateVolumeM3(payload.lengthM, payload.widthM, payload.heightM) || 0;

    const updatedProduct: Product = {
      ...existingProduct,
      productName: payload.productName.trim(),
      lengthM: payload.lengthM,
      widthM: payload.widthM,
      heightM: payload.heightM,
      weightKg: payload.weightKg,
      volumeM3,
      updatedAt: new Date().toISOString(),
    };

    const newList = [...mockProducts];
    newList[index] = updatedProduct;
    saveMockProducts(newList);

    return updatedProduct;
  },

  async updateStatus(id: string, status: ProductStatus): Promise<Product> {
    await delay(500);

    const index = mockProducts.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new Error('404');
    }

    const existing = mockProducts[index];
    const updated: Product = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };

    const newList = [...mockProducts];
    newList[index] = updated;
    saveMockProducts(newList);

    return updated;
  }
};
