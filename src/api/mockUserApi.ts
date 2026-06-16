import { normalizeUser, normalizeUserPage, type User, type UserPage } from '../utils/userMapper';
import { ApiError } from './userApi'; // We will define ApiError in userApi.ts

let users: any[] = [
  { id: 1, username: 'admin', fullName: 'Admin ELog', email: 'admin@elog.vn', roles: ['SYSTEM_ADMIN'], isActive: true, createdAt: '2026-06-01' },
  { id: 2, username: 'dispatcher01', fullName: 'Lê Thành Linh', email: 'dispatcher01@elog.vn', roles: ['DISPATCHER'], isActive: true, createdAt: '2026-06-02' },
  { id: 3, username: 'manager01', fullName: 'Phạm Tiến Phát', email: 'manager01@elog.vn', roles: ['LOGISTICS_MANAGER'], isActive: true, createdAt: '2026-06-03' },
  { id: 4, username: 'warehouse01', fullName: 'Trần Thị B', email: 'warehouse01@elog.vn', roles: ['WAREHOUSE_STAFF'], isActive: true, createdAt: '2026-06-04' },
  { id: 5, username: 'driver_a', fullName: 'Nguyễn Văn A', email: 'driver.a@elog.vn', roles: ['DRIVER'], isActive: true, createdAt: '2026-06-05' },
  { id: 6, username: 'driver_cuong', fullName: 'Đặng Đức Cường', email: 'cuong.driver@elog.vn', roles: ['DRIVER'], isActive: false, createdAt: '2026-06-06' },
];

function delay(ms: number = 450) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function conflict(message: string, field: string) {
  return new ApiError(message, 409, { message, field });
}

export const mockUserApi = {
  async getUsers(params: {
    keyword?: string;
    role?: string;
    isActive?: string | boolean;
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<UserPage> {
    await delay();
    const { keyword = '', role = '', isActive = '', page = 0, size = 20 } = params;
    const q = keyword.trim().toLowerCase();

    let filtered = [...users];

    if (q) {
      filtered = filtered.filter((user) =>
        user.fullName.toLowerCase().includes(q) || user.username.toLowerCase().includes(q)
      );
    }

    if (role) {
      filtered = filtered.filter((user) => user.roles.includes(role));
    }

    if (isActive !== '') {
      const activeBool = isActive === 'true' || isActive === true;
      filtered = filtered.filter((user) => user.isActive === activeBool);
    }

    const start = Number(page) * Number(size);
    const content = filtered.slice(start, start + Number(size));

    return normalizeUserPage({
      data: {
        content,
        page: Number(page),
        size: Number(size),
        totalElements: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / Number(size))),
      }
    }, Number(page), Number(size));
  },

  async getUser(id: number | string): Promise<User> {
    await delay();
    const user = users.find((item) => String(item.id) === String(id));
    if (!user) {
      throw new ApiError('Không tìm thấy user', 404);
    }
    return normalizeUser(user);
  },

  async createUser(payload: any): Promise<User> {
    await delay();
    if (users.some((user) => user.username.toLowerCase() === payload.username.toLowerCase())) {
      throw conflict('Username đã tồn tại', 'username');
    }
    if (users.some((user) => user.email.toLowerCase() === payload.email.toLowerCase())) {
      throw conflict('Email đã tồn tại', 'email');
    }

    const next = {
      id: Math.max(...users.map((user) => user.id)) + 1,
      username: payload.username,
      fullName: payload.fullName,
      email: payload.email,
      roles: payload.roles,
      isActive: true,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    users = [next, ...users];
    return normalizeUser(next);
  },

  async updateUser(id: number | string, payload: any): Promise<User> {
    await delay();
    if (users.some((user) => String(user.id) !== String(id) && user.email.toLowerCase() === payload.email.toLowerCase())) {
      throw conflict('Email đã tồn tại', 'email');
    }
    users = users.map((user) => String(user.id) === String(id) ? { ...user, fullName: payload.fullName, email: payload.email } : user);
    const updated = users.find((user) => String(user.id) === String(id));
    if (!updated) {
      throw new ApiError('Không tìm thấy user để cập nhật', 404);
    }
    return normalizeUser(updated);
  },

  async updateRoles(id: number | string, roles: string[]): Promise<User> {
    await delay();
    users = users.map((user) => String(user.id) === String(id) ? { ...user, roles } : user);
    const updated = users.find((user) => String(user.id) === String(id));
    if (!updated) {
      throw new ApiError('Không tìm thấy user để cập nhật', 404);
    }
    return normalizeUser(updated);
  },

  async updateStatus(id: number | string, isActive: boolean): Promise<User> {
    await delay();
    users = users.map((user) => String(user.id) === String(id) ? { ...user, isActive } : user);
    const updated = users.find((user) => String(user.id) === String(id));
    if (!updated) {
      throw new ApiError('Không tìm thấy user để cập nhật', 404);
    }
    return normalizeUser(updated);
  },
};
