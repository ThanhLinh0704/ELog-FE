import type {
  FleetCapacity,
  VehicleItem,
  VehiclePayload,
  VehiclePageResponse,
  VehicleQueryParams,
} from '../api/vehicleApi';

let mockVehicles: VehicleItem[] = [
  {
    id: 1,
    plateNumber: '51B-67890',
    vehicleType: 'Xe tải nhỏ',
    maxWeightKg: 1200,
    maxVolumeM3: 8.5,
    isActive: true,
    createdAt: '2026-06-01 08:30',
    updatedAt: '2026-06-05 10:15',
  },
  {
    id: 2,
    plateNumber: '51C-23456',
    vehicleType: 'Xe tải trung',
    maxWeightKg: 2500,
    maxVolumeM3: 14,
    isActive: true,
    createdAt: '2026-06-01 09:00',
    updatedAt: '2026-06-08 14:20',
  },
  {
    id: 3,
    plateNumber: '50H-11223',
    vehicleType: 'Xe tải lớn',
    maxWeightKg: 5000,
    maxVolumeM3: 27,
    isActive: true,
    createdAt: '2026-06-02 08:10',
    updatedAt: '2026-06-09 16:45',
  },
  {
    id: 4,
    plateNumber: '51D-99887',
    vehicleType: 'Xe van giao hàng',
    maxWeightKg: 900,
    maxVolumeM3: 6.5,
    isActive: true,
    createdAt: '2026-06-03 10:00',
    updatedAt: '2026-06-03 10:00',
  },
  {
    id: 5,
    plateNumber: '60C-77889',
    vehicleType: 'Xe đông lạnh',
    maxWeightKg: 1800,
    maxVolumeM3: 10.5,
    isActive: false,
    createdAt: '2026-06-04 11:30',
    updatedAt: '2026-06-10 09:25',
  },
  {
    id: 6,
    plateNumber: '51A-12345',
    vehicleType: 'Xe tải trung',
    maxWeightKg: 2200,
    maxVolumeM3: 13.2,
    isActive: true,
    createdAt: '2026-06-05 13:20',
    updatedAt: '2026-06-06 15:00',
  },
  {
    id: 7,
    plateNumber: '29H-45678',
    vehicleType: 'Xe tải lớn',
    maxWeightKg: 7000,
    maxVolumeM3: 32,
    isActive: false,
    createdAt: '2026-06-06 08:15',
    updatedAt: '2026-06-11 17:40',
  },
  {
    id: 8,
    plateNumber: '51F-88990',
    vehicleType: 'Xe tải nhỏ',
    maxWeightKg: 1000,
    maxVolumeM3: 7,
    isActive: true,
    createdAt: '2026-06-07 09:45',
    updatedAt: '2026-06-07 09:45',
  },
  {
    id: 9,
    plateNumber: '62C-13579',
    vehicleType: 'Xe bán tải',
    maxWeightKg: 750,
    maxVolumeM3: 4.2,
    isActive: true,
    createdAt: '2026-06-08 10:30',
    updatedAt: '2026-06-12 11:10',
  },
  {
    id: 10,
    plateNumber: '51G-24680',
    vehicleType: 'Xe tải nặng',
    maxWeightKg: 8000,
    maxVolumeM3: 40,
    isActive: false,
    createdAt: '2026-06-09 14:00',
    updatedAt: '2026-06-13 08:50',
  },
];

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function paginate<T>(items: T[], page = 0, size = 10) {
  const start = page * size;
  return items.slice(start, start + size);
}

function normalizeKeyword(value?: string) {
  return value?.trim().toLowerCase() || '';
}

export const mockVehicleApi = {
  async getVehicles(params: VehicleQueryParams = {}): Promise<VehiclePageResponse> {
    await delay();

    const keyword = normalizeKeyword(params.keyword);
    const page = Number(params.page ?? 0);
    const size = Number(params.size ?? 10);

    let filtered = [...mockVehicles];

    if (keyword) {
      filtered = filtered.filter((item) => {
        return (
          item.plateNumber.toLowerCase().includes(keyword) ||
          item.vehicleType.toLowerCase().includes(keyword)
        );
      });
    }

    if (params.isActive !== undefined && params.isActive !== '') {
      const activeValue = String(params.isActive) === 'true';
      filtered = filtered.filter((item) => item.isActive === activeValue);
    }

    filtered.sort((a, b) => b.id - a.id);

    const content = paginate(filtered, page, size);

    return {
      content,
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / size)),
    };
  },

  async getVehicle(id: number): Promise<VehicleItem> {
    await delay();

    const found = mockVehicles.find((item) => item.id === id);

    if (!found) {
      throw new Error('Không tìm thấy xe.');
    }

    return found;
  },

  async getFleetCapacity(): Promise<FleetCapacity> {
    await delay();

    const activeVehicles = mockVehicles.filter((item) => item.isActive);

    return {
      activeVehicleCount: activeVehicles.length,
      totalMaxWeightKg: activeVehicles.reduce(
        (sum, item) => sum + Number(item.maxWeightKg || 0),
        0
      ),
      totalMaxVolumeM3: activeVehicles.reduce(
        (sum, item) => sum + Number(item.maxVolumeM3 || 0),
        0
      ),
    };
  },

  async createVehicle(payload: VehiclePayload): Promise<VehicleItem> {
    await delay();

    const plateNumber = payload.plateNumber?.trim().toUpperCase();

    if (!plateNumber) {
      throw new Error('Vui lòng nhập biển số xe.');
    }

    const duplicated = mockVehicles.some(
      (item) => item.plateNumber.toUpperCase() === plateNumber
    );

    if (duplicated) {
      const error = new Error('Biển số xe đã tồn tại.') as any;
      error.status = 409;
      error.body = {
        error: {
          field: 'plateNumber',
          message: 'Biển số xe đã tồn tại.',
        },
      };
      throw error;
    }

    if (payload.maxWeightKg <= 0) {
      const error = new Error('Tải trọng phải lớn hơn 0.') as any;
      error.body = {
        error: {
          field: 'maxWeightKg',
          message: 'Tải trọng phải lớn hơn 0.',
        },
      };
      throw error;
    }

    if (payload.maxVolumeM3 <= 0) {
      const error = new Error('Thể tích phải lớn hơn 0.') as any;
      error.body = {
        error: {
          field: 'maxVolumeM3',
          message: 'Thể tích phải lớn hơn 0.',
        },
      };
      throw error;
    }

    const newVehicle: VehicleItem = {
      id: Math.max(...mockVehicles.map((item) => item.id)) + 1,
      plateNumber,
      vehicleType: payload.vehicleType,
      maxWeightKg: payload.maxWeightKg,
      maxVolumeM3: payload.maxVolumeM3,
      isActive: true,
      createdAt: new Date().toLocaleString('vi-VN'),
      updatedAt: new Date().toLocaleString('vi-VN'),
    };

    mockVehicles = [newVehicle, ...mockVehicles];

    return newVehicle;
  },

  async updateVehicle(id: number, payload: VehiclePayload): Promise<VehicleItem> {
    await delay();

    const index = mockVehicles.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('Không tìm thấy xe.');
    }

    if (payload.maxWeightKg <= 0) {
      const error = new Error('Tải trọng phải lớn hơn 0.') as any;
      error.body = {
        error: {
          field: 'maxWeightKg',
          message: 'Tải trọng phải lớn hơn 0.',
        },
      };
      throw error;
    }

    if (payload.maxVolumeM3 <= 0) {
      const error = new Error('Thể tích phải lớn hơn 0.') as any;
      error.body = {
        error: {
          field: 'maxVolumeM3',
          message: 'Thể tích phải lớn hơn 0.',
        },
      };
      throw error;
    }

    const updated: VehicleItem = {
      ...mockVehicles[index],
      vehicleType: payload.vehicleType,
      maxWeightKg: payload.maxWeightKg,
      maxVolumeM3: payload.maxVolumeM3,
      updatedAt: new Date().toLocaleString('vi-VN'),
    };

    mockVehicles[index] = updated;

    return updated;
  },

  async updateStatus(id: number, isActive: boolean): Promise<VehicleItem> {
    await delay();

    const index = mockVehicles.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error('Không tìm thấy xe.');
    }

    const updated: VehicleItem = {
      ...mockVehicles[index],
      isActive,
      updatedAt: new Date().toLocaleString('vi-VN'),
    };

    mockVehicles[index] = updated;

    return updated;
  },
};