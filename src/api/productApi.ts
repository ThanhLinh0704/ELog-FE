import { USE_MOCK_API } from '../config';
import axiosInstance from './axiosInstance';
import { productService } from '../mocks/productService';
import type { Product, ProductStatus } from '../types/product';
import {
  normalizeProduct,
  normalizeProductPage,
  buildProductCreateRequest,
  type ProductPage,
} from '../utils/productMapper';

export class ApiError extends Error {
  status?: number;
  body?: any;

  constructor(message: string, status?: number, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function handleAxiosCall<T>(call: () => Promise<any>): Promise<T> {
  try {
    const response = await call();
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const body = error.response.data;
      const message = body?.error?.message || body?.message || `API error ${status}`;
      throw new ApiError(message, status, body);
    }
    throw new ApiError(error.message || 'Network Error');
  }
}

function normalizeQueryValue(value: any): string {
  if (value === undefined || value === null || value === '') return '';

  if (typeof value === 'object') {
    if ('value' in value) return value.value;
    if ('id' in value) return value.id;
    return '';
  }

  return String(value);
}

function encodeQuery(params: Record<string, any>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const normalizedValue = normalizeQueryValue(value);

    if (normalizedValue !== '') {
      search.set(key, normalizedValue);
    }
  });

  return search.toString();
}

export const productApi = {
  async getProducts(params: {
    keyword?: string;
    status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
    page?: number;
    size?: number;
  }): Promise<ProductPage> {
    if (USE_MOCK_API) {
      const mockRes = await productService.getProducts(params);
      return {
        content: mockRes.content,
        page: params.page ?? 0,
        size: params.size ?? 10,
        totalElements: mockRes.totalElements,
        totalPages: mockRes.totalPages,
      };
    }

    const { keyword = '', status = 'ALL', page = 0, size = 10 } = params;
    
    // Map status string to isActive boolean parameter
    // ALL -> undefined (do not send status filter)
    // ACTIVE -> true
    // INACTIVE -> false
    const isActive = status === 'ALL' ? undefined : status === 'ACTIVE';

    const queryParams: Record<string, any> = {
      page,
      size,
    };
    if (keyword.trim()) {
      queryParams.keyword = keyword.trim();
    }
    if (isActive !== undefined) {
      queryParams.isActive = isActive;
    }

    const query = encodeQuery(queryParams);

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/products?${query}`)
    );
    return normalizeProductPage(data, page, size);
  },

  async getProductById(id: string): Promise<Product> {
    if (USE_MOCK_API) {
      return productService.getProductById(id);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/products/${id}`)
    );
    return normalizeProduct(data?.data ?? data);
  },

  async createProduct(payload: Omit<Product, 'id' | 'volumeM3' | 'status' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    if (USE_MOCK_API) {
      return productService.createProduct(payload);
    }

    try {
      const requestBody = buildProductCreateRequest(payload);
      const data = await handleAxiosCall<any>(() =>
        axiosInstance.post('/api/v1/products', requestBody)
      );
      return normalizeProduct(data?.data ?? data);
    } catch (error: any) {
      // Map backend business error for SKU duplicate
      if (error instanceof ApiError && error.status === 409) {
        const errCode = error.body?.error?.code;
        if (errCode === 'PRODUCT_SKU_DUPLICATE') {
          throw {
            status: 409,
            field: 'sku',
            message: 'SKU này đã tồn tại trong danh mục',
          };
        }
      }
      throw error;
    }
  },

  async updateProduct(
    id: string,
    payload: Omit<Product, 'id' | 'sku' | 'volumeM3' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<Product> {
    if (USE_MOCK_API) {
      return productService.updateProduct(id, payload);
    }

    const requestBody = {
      productName: payload.productName.trim(),
      weightKg: parseFloat(payload.weightKg.toFixed(3)),
      lengthM: parseFloat(payload.lengthM.toFixed(4)),
      widthM: parseFloat(payload.widthM.toFixed(4)),
      heightM: parseFloat(payload.heightM.toFixed(4)),
    };

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.put(`/api/v1/products/${id}`, requestBody)
    );
    return normalizeProduct(data?.data ?? data);
  },

  async updateStatus(id: string, status: ProductStatus): Promise<Product> {
    if (USE_MOCK_API) {
      return productService.updateStatus(id, status);
    }

    const isActive = status === 'ACTIVE';
    const data = await handleAxiosCall<any>(() =>
      axiosInstance.patch(`/api/v1/products/${id}/status`, { isActive })
    );
    return normalizeProduct(data?.data ?? data);
  },
};
