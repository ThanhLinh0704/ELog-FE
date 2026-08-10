import { USE_MOCK_API } from '../config';
import axiosInstance from './axiosInstance';

export interface AdministrativeUnit {
  code: string;
  name: string;
  fullName: string;
}

export interface Province extends AdministrativeUnit {}

export interface District extends AdministrativeUnit {
  provinceCode: string;
}

export interface Ward extends AdministrativeUnit {
  districtCode: string;
}

const mockProvinces: Province[] = [
  { code: '01', name: 'Hà Nội', fullName: 'Thành phố Hà Nội' },
  { code: '79', name: 'Hồ Chí Minh', fullName: 'Thành phố Hồ Chí Minh' }
];

const mockDistricts: District[] = [
  { code: '001', name: 'Ba Đình', fullName: 'Quận Ba Đình', provinceCode: '01' },
  { code: '002', name: 'Hoàn Kiếm', fullName: 'Quận Hoàn Kiếm', provinceCode: '01' },
  { code: '760', name: 'Quận 1', fullName: 'Quận 1', provinceCode: '79' },
  { code: '772', name: 'Bình Thạnh', fullName: 'Quận Bình Thạnh', provinceCode: '79' }
];

const mockWards: Ward[] = [
  { code: '00001', name: 'Phúc Xá', fullName: 'Phường Phúc Xá', districtCode: '001' },
  { code: '00004', name: 'Trúc Bạch', fullName: 'Phường Trúc Bạch', districtCode: '001' },
  { code: '00037', name: 'Đồng Xuân', fullName: 'Phường Đồng Xuân', districtCode: '002' },
  { code: '26734', name: 'Bến Nghé', fullName: 'Phường Bến Nghé', districtCode: '760' },
  { code: '26743', name: 'Bến Thành', fullName: 'Phường Bến Thành', districtCode: '760' },
  { code: '27181', name: 'Phường 12', fullName: 'Phường 12', districtCode: '772' },
  { code: '27184', name: 'Phường 13', fullName: 'Phường 13', districtCode: '772' }
];

export const addressApi = {
  async getProvinces(): Promise<Province[]> {
    if (USE_MOCK_API) {
      return mockProvinces;
    }
    const response = await handleAxiosCall<any>(() =>
      axiosInstance.get('/api/v1/addresses/provinces')
    );
    return response?.data || [];
  },

  async getDistricts(provinceCode: string): Promise<District[]> {
    if (USE_MOCK_API) {
      return mockDistricts.filter(d => d.provinceCode === provinceCode);
    }
    const response = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/addresses/provinces/${provinceCode}/districts`)
    );
    return response?.data || [];
  },

  async getWards(districtCode: string): Promise<Ward[]> {
    if (USE_MOCK_API) {
      return mockWards.filter(w => w.districtCode === districtCode);
    }
    const response = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/addresses/districts/${districtCode}/wards`)
    );
    return response?.data || [];
  },
};

async function handleAxiosCall<T>(call: () => Promise<any>): Promise<T> {
  try {
    const response = await call();
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const body = error.response.data;
      const message = body?.error?.message || body?.message || `API error ${status}`;
      throw new Error(message);
    }
    throw new Error(error.message || 'Network Error');
  }
}
