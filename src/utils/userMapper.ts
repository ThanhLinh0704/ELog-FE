export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAt: string;
}

export interface UserPage {
  content: User[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export function normalizeUser(apiUser: any): User {
  return {
    id: apiUser.id,
    username: apiUser.username,
    fullName: apiUser.fullName || apiUser.full_name || '',
    email: apiUser.email || '',
    roles: Array.isArray(apiUser.roles) ? apiUser.roles : [],
    isActive: typeof apiUser.isActive === 'boolean' ? apiUser.isActive : Boolean(apiUser.is_active),
    createdAt: apiUser.createdAt || apiUser.created_at || '',
  };
}

export function normalizeUserPage(responseBody: any, page: number, size: number): UserPage {
  const raw = responseBody?.data ?? responseBody;

  if (Array.isArray(raw)) {
    return {
      content: raw.map(normalizeUser),
      page,
      size,
      totalElements: raw.length,
      totalPages: Math.max(1, Math.ceil(raw.length / size)),
    };
  }

  const content = raw?.content ?? raw?.items ?? [];

  return {
    content: content.map(normalizeUser),
    page: raw?.page ?? raw?.number ?? page,
    size: raw?.size ?? size,
    totalElements: raw?.totalElements ?? raw?.total_items ?? content.length,
    totalPages: raw?.totalPages ?? Math.max(1, Math.ceil((raw?.totalElements ?? content.length) / size)),
  };
}

export interface CreateUserPayload {
  username: string;
  password?: string;
  fullName: string;
  email: string;
  roles: string[];
}

export function buildCreateUserPayload(form: any): CreateUserPayload {
  return {
    username: form.username.trim(),
    password: form.password,
    fullName: form.fullName.trim(),
    email: form.email.trim(),
    roles: form.roles,
  };
}

export interface UpdateUserPayload {
  fullName: string;
  email: string;
}

export function buildUpdateUserPayload(form: any): UpdateUserPayload {
  return {
    fullName: form.fullName.trim(),
    email: form.email.trim(),
  };
}
