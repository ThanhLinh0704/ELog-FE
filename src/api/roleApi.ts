import axiosInstance from './axiosInstance';

export interface PermissionItem {
  id: number;
  name: string;
  description: string;
}

export interface RoleItem {
  id: number;
  name: string;
  permissions: PermissionItem[];
}

export interface UpdateRolePermissionsPayload {
  permissionIds: number[];
}

interface ApiEnvelope<T> {
  success?: boolean;
  data: T;
  message?: string;
}

function unwrapData<T>(response: ApiEnvelope<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiEnvelope<T>).data;
  }

  return response as T;
}

export async function getRoles(): Promise<RoleItem[]> {
  const response = await axiosInstance.get<ApiEnvelope<RoleItem[]>>('/api/roles');
  return unwrapData(response.data);
}

export async function getRoleById(id: number | string): Promise<RoleItem> {
  const response = await axiosInstance.get<ApiEnvelope<RoleItem>>(`/api/roles/${id}`);
  return unwrapData(response.data);
}

export async function getPermissions(): Promise<PermissionItem[]> {
  const response = await axiosInstance.get<ApiEnvelope<PermissionItem[]>>('/api/permissions');
  return unwrapData(response.data);
}

export async function updateRolePermissions(
  id: number | string,
  payload: UpdateRolePermissionsPayload
): Promise<RoleItem> {
  const response = await axiosInstance.put<ApiEnvelope<RoleItem>>(
    `/api/roles/${id}/permissions`,
    payload
  );
  return unwrapData(response.data);
}
