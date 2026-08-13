export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8080';
export const USE_MOCK_API = String(import.meta.env.VITE_USE_MOCK ?? 'true') === 'true';

export interface UserRole {
  value: string;
  label: string;
}

export const USER_ROLES: UserRole[] = [
  { value: 'SYSTEM_ADMIN', label: 'System Admin' },
  { value: 'DISPATCHER', label: 'Điều phối viên' },
  { value: 'LOGISTICS_MANAGER', label: 'Quản lý logistics' },
  { value: 'DRIVER', label: 'Tài xế' },
];
