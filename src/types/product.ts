export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface Product {
  id: string;
  sku: string;
  productName: string;
  lengthM: number;
  widthM: number;
  heightM: number;
  weightKg: number;
  volumeM3: number;
  shape?: string | null;
  isFragile?: boolean;
  packageImageUrl?: string | null;
  description?: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type UserRole =
  | "SYSTEM_ADMIN"
  | "DISPATCHER"
  | "LOGISTICS_MANAGER"
  | "WAREHOUSE_STAFF";
