/** Master generik — divisi & jabatan punya bentuk identik */
export type MasterEntity = 'divisi' | 'jabatan';

export interface MasterItem {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  is_active: boolean;
  /** Jumlah user AKTIF yang memakai data ini (tampilan badge) */
  user_count: number;
  /** Semua baris user (aktif & nonaktif) — menahan hapus karena FK */
  user_count_all: number;
  created_at: string;
  updated_at: string | null;
}

export interface MasterPayload {
  kode?: string;
  nama?: string;
  deskripsi?: string | null;
  is_active?: boolean;
}

/** Grade — level + rentang gaji, tanpa deskripsi */
export interface GradeItem {
  id: number;
  kode: string;
  nama: string;
  level: number | null;
  min_salary: number | null;
  max_salary: number | null;
  is_active: boolean;
  /** User AKTIF dengan grade ini */
  user_count: number;
  /** Semua user (aktif & nonaktif) — menahan hapus */
  user_count_all: number;
  /** Baris master pegawai yang memakai grade ini */
  employee_count: number;
  /** Baris struktur compensation yang menunjuk grade ini */
  structure_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface GradePayload {
  kode?: string;
  nama?: string;
  level?: number | null;
  min_salary?: number | null;
  max_salary?: number | null;
  is_active?: boolean;
}

export interface Company {
  id: number;
  nama: string;
  alamat: string | null;
  email: string | null;
  no_hp: string | null;
  npwp: string | null;
  deskripsi: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CompanyPayload {
  nama?: string;
  alamat?: string | null;
  email?: string | null;
  no_hp?: string | null;
  npwp?: string | null;
  deskripsi?: string | null;
  is_active?: boolean;
}
