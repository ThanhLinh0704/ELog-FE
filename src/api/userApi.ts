import { USE_MOCK_API } from '../config';
import axiosInstance from './axiosInstance';
import { mockUserApi } from './mockUserApi';
import { normalizeUser, normalizeUserPage, type User, type UserPage } from '../utils/userMapper';

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

export const userApi = {
  async getUsers(params: {
    keyword?: string;
    role?: string;
    isActive?: string | boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<UserPage> {
    if (USE_MOCK_API) {
      return mockUserApi.getUsers(params);
    }

    const { keyword = '', role = '', isActive = '', page = 0, size = 20, sort = 'id,desc' } = params;
    const query = encodeQuery({ keyword, role, isActive, page, size, sort });

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/users?${query}`)
    );
    return normalizeUserPage(data, page, size);
  },

  async createUser(payload: any): Promise<User> {
    if (USE_MOCK_API) {
      return mockUserApi.createUser(payload);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.post('/api/v1/users', payload)
    );
    return normalizeUser(data?.data ?? data);
  },

  async updateUser(id: number | string, payload: any): Promise<User> {
    if (USE_MOCK_API) {
      return mockUserApi.updateUser(id, payload);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.put(`/api/v1/users/${id}`, payload)
    );
    return normalizeUser(data?.data ?? data);
  },

  async updateRoles(id: number | string, roles: string[]): Promise<User> {
    if (USE_MOCK_API) {
      return mockUserApi.updateRoles(id, roles);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.patch(`/api/v1/users/${id}/roles`, { roles })
    );
    return normalizeUser(data?.data ?? data);
  },

  async updateStatus(id: number | string, isActive: boolean): Promise<User> {
    if (USE_MOCK_API) {
      return mockUserApi.updateStatus(id, isActive);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.patch(`/api/v1/users/${id}/status`, { isActive })
    );
    return normalizeUser(data?.data ?? data);
  },
};
