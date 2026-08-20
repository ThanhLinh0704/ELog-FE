import type { Product } from '../types/product';

export interface ProductPage {
  content: Product[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export function normalizeProduct(apiProduct: any): Product {
  return {
    id: String(apiProduct.id),
    sku: apiProduct.sku || '',
    productName: apiProduct.productName || '',
    brand: apiProduct.brand ?? null,
    productGroup: apiProduct.productGroup ?? null,
    productType: apiProduct.productType ?? null,
    capacityValue: apiProduct.capacityValue != null ? Number(apiProduct.capacityValue) : null,
    lengthM: apiProduct.lengthM != null ? Number(apiProduct.lengthM) : 0,
    widthM: apiProduct.widthM != null ? Number(apiProduct.widthM) : 0,
    heightM: apiProduct.heightM != null ? Number(apiProduct.heightM) : 0,
    weightKg: apiProduct.weightKg != null ? Number(apiProduct.weightKg) : 0,
    volumeM3: apiProduct.volumeM3 != null ? Number(apiProduct.volumeM3) : 0,
    shape: apiProduct.shape ?? null,
    isFragile: apiProduct.isFragile ?? false,
    packageImageUrl: apiProduct.packageImageUrl ?? null,
    description: apiProduct.description ?? null,
    status: apiProduct.isActive === true || apiProduct.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    createdAt: apiProduct.createdAt || '',
    updatedAt: apiProduct.updatedAt || '',
  };
}

export function normalizeProductListItem(apiItem: any): Product {
  return {
    id: String(apiItem.id),
    sku: apiItem.sku || '',
    productName: apiItem.productName || '',
    brand: apiItem.brand ?? null,
    productGroup: apiItem.productGroup ?? null,
    productType: apiItem.productType ?? null,
    capacityValue: apiItem.capacityValue != null ? Number(apiItem.capacityValue) : null,
    lengthM: apiItem.lengthM != null ? Number(apiItem.lengthM) : 0,
    widthM: apiItem.widthM != null ? Number(apiItem.widthM) : 0,
    heightM: apiItem.heightM != null ? Number(apiItem.heightM) : 0,
    weightKg: apiItem.weightKg != null ? Number(apiItem.weightKg) : 0,
    volumeM3: apiItem.volumeM3 != null ? Number(apiItem.volumeM3) : 0,
    shape: apiItem.shape ?? null,
    isFragile: apiItem.isFragile ?? false,
    packageImageUrl: apiItem.packageImageUrl ?? null,
    description: apiItem.description ?? null,
    status: apiItem.isActive === true || apiItem.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    createdAt: apiItem.createdAt || '',
    updatedAt: apiItem.updatedAt || '',
  };
}

export function normalizeProductPage(responseBody: any, page: number, size: number): ProductPage {
  if (responseBody && responseBody.pagination) {
    const content = Array.isArray(responseBody.data) ? responseBody.data : [];
    const pag = responseBody.pagination;
    return {
      content: content.map(normalizeProductListItem),
      page: pag.page ?? page,
      size: pag.size ?? size,
      totalElements: pag.totalElements ?? content.length,
      totalPages: pag.totalPages ?? Math.max(1, Math.ceil((pag.totalElements ?? content.length) / size)),
    };
  }

  const raw = responseBody?.data ?? responseBody;
  const content = Array.isArray(raw?.content) ? raw.content : (Array.isArray(raw) ? raw : []);

  return {
    content: content.map(normalizeProductListItem),
    page: raw?.page ?? page,
    size: raw?.size ?? size,
    totalElements: raw?.totalElements ?? content.length,
    totalPages: raw?.totalPages ?? Math.max(1, Math.ceil((raw?.totalElements ?? content.length) / size)),
  };
}

export function buildProductCreateRequest(form: any) {
  return {
    sku: form.sku.toUpperCase().trim(),
    productName: form.productName.trim(),
    brand: form.brand?.trim() || null,
    productGroup: form.productGroup?.trim() || null,
    productType: form.productType?.trim() || null,
    capacityValue: form.capacityValue != null ? form.capacityValue : null,
    weightKg: parseFloat(form.weightKg.toFixed(3)),
    lengthM: parseFloat(form.lengthM.toFixed(4)),
    widthM: parseFloat(form.widthM.toFixed(4)),
    heightM: parseFloat(form.heightM.toFixed(4)),
    shape: form.shape || null,
    isFragile: !!form.isFragile,
    packageImageUrl: form.packageImageUrl?.trim() || null,
    description: form.description?.trim() || null,
  };
}
