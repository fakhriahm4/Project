import api from '@/services/api';
import type {
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UserListResponse,
} from '../types/user';

export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  total_roles: number;
}

/**
 * Catatan: interceptor response di services/api.ts sudah mengembalikan
 * `response.data` (unwrapping), sehingga tipe di bawah adalah isi body
 * (bukan AxiosResponse).
 */
export const userService = {
  async list(params?: Record<string, any>): Promise<UserListResponse> {
    const res = await api.get('/users', { params });
    return res as unknown as UserListResponse;
  },

  async stats(): Promise<{ data: UserStats }> {
    const res = await api.get('/users/stats');
    return res as unknown as { data: UserStats };
  },

  async detail(id: number): Promise<{ data: User }> {
    const res = await api.get(`/users/${id}`);
    return res as unknown as { data: User };
  },

  async create(payload: CreateUserPayload): Promise<{ data: User }> {
    const res = await api.post('/users', payload);
    return res as unknown as { data: User };
  },

  async update(
    id: number,
    payload: UpdateUserPayload
  ): Promise<{ data: User }> {
    const res = await api.put(`/users/${id}`, payload);
    return res as unknown as { data: User };
  },

  async delete(id: number): Promise<{ message?: string }> {
    const res = await api.delete(`/users/${id}`);
    return res as unknown as { message?: string };
  },

  // ============================================
  // IMPORT / EXPORT EXCEL
  // ============================================

  /** GET /users/import/template — unduh template Excel */
  async downloadTemplate(): Promise<void> {
    const blob = (await api.get('/users/import/template', {
      responseType: 'blob',
    })) as unknown as Blob;
    saveBlobAs(blob, 'template-import-user.xlsx');
  },

  /**
   * POST /users/import — upload file Excel (multipart field "file").
   * passwordMode: 'dob' = password = tanggal lahir DDMMYYYY (default),
   * 'random' = password acak 12 karakter.
   */
  async importFromExcel(
    file: File,
    passwordMode: 'dob' | 'random' = 'dob'
  ): Promise<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    form.append('password_mode', passwordMode);
    const res = await api.post('/users/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return (res as any).data;
  },

  /**
   * POST /users/import/credentials — unduh rekap akun+password (xlsx).
   * Dibuat on-the-fly di server; tidak ada penyimpanan password.
   */
  async exportCredentials(
    accounts: { employee_id: string; username: string; nama: string; password: string }[]
  ): Promise<void> {
    const blob = (await api.post('/users/import/credentials', { accounts }, {
      responseType: 'blob',
    })) as unknown as Blob;
    const date = new Date().toISOString().slice(0, 10);
    saveBlobAs(blob, `rekap-akun-${date}.xlsx`);
  },

  /** GET /users/export-profile — unduh semua profil user (untuk HR) */
  async downloadProfileExport(status?: string): Promise<void> {
    const blob = (await api.get('/users/export-profile', {
      params: status ? { status } : undefined,
      responseType: 'blob',
    })) as unknown as Blob;
    const date = new Date().toISOString().slice(0, 10);
    saveBlobAs(blob, `profil-user-${date}.xlsx`);
  },
};

// ============================================
// TIPE HASIL IMPORT
// ============================================

export interface ImportResult {
  password_mode?: 'dob' | 'random';
  summary: { total: number; imported: number; failed: number };
  errors: { baris: number; pesan: string }[];
  accounts: {
    baris: number;
    employee_id: string;
    username: string;
    nama: string;
    password: string;
  }[];
}

/** Trigger download Blob dengan nama file tertentu */
export function saveBlobAs(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Pesan error dari response — bisa berupa envelope JSON, atau Blob
 * (endpoint xlsx mengembalikan blob bahkan saat error).
 */
export async function extractErrorMessage(e: unknown): Promise<string> {
  let data: any = e;
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      return 'Gagal memproses file';
    }
  }
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  return 'Terjadi kesalahan, silakan coba lagi';
}

export default userService;
