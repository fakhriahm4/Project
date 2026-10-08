export type UserStatus = 'ACTIVE' | 'INACTIVE';

export interface User {
  id: number;
  employee_id: string;
  username: string;
  nama: string;
  email: string;
  no_hp: string | null;
  divisi_id: number;
  divisi_nama: string;
  jabatan_id: number;
  jabatan_nama: string;
  grade_id: number;
  grade_kode: string | null;
  grade_nama: string;
  role_id: number;
  role_kode: string;
  role_nama: string;
  status: UserStatus;
  /** Sumber badge status di daftar (soft delete men-set FALSE) */
  is_active: boolean;
  tanggal_masuk: string;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface CreateUserPayload {
  employee_id: string;
  username: string;
  nama: string;
  email: string;
  no_hp?: string;
  password: string;
  divisi_id: number;
  jabatan_id: number;
  grade_id: number;
  role_id: number;
  status: UserStatus;
  tanggal_masuk: string;
}

export type UpdateUserPayload = Partial<CreateUserPayload>;

export interface UserListResponse {
  success: boolean;
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}