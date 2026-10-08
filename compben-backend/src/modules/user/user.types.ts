import { z } from 'zod';

// ============================================
// ZOD SCHEMAS
// ============================================

export const createUserSchema = z.object({
  employee_id: z.string().min(1, 'NIP wajib diisi').max(30),
  username: z.string().min(3, 'Username minimal 3 karakter').max(50),
  nama: z.string().min(1, 'Nama wajib diisi').max(150),
  email: z.string().email('Format email tidak valid').max(150),
  no_hp: z.string().max(20).optional().nullable(),
  password: z.string().min(6, 'Password minimal 6 karakter').max(100),
  divisi_id: z.number().int().positive('Divisi wajib dipilih'),
  jabatan_id: z.number().int().positive('Jabatan wajib dipilih'),
  grade_id: z.number().int().positive('Grade wajib dipilih'),
  role_id: z.number().int().positive('Role wajib dipilih'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  tanggal_masuk: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
});

export const updateUserSchema = createUserSchema.partial().extend({
  password: z.string().min(6).max(100).optional(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  role_id: z.coerce.number().int().optional(),
  divisi_id: z.coerce.number().int().optional(),
  // Fase 0.6: 'ACTIVE'/'INACTIVE' & huruf kecil → keduanya dipetakan ke is_active
  status: z.enum(['ACTIVE', 'INACTIVE', 'active', 'inactive']).optional(),
  // Default urut nama ASC — identik dgn urutan Master Pegawai
  sort_by: z.string().default('nama'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

// Param :id — mencegah "GET /users/abc" jadi 500 (NaN → SQL error)
export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID tidak valid'),
});

// Body POST /users/import/credentials — rekap akun utk diunduh (on-the-fly)
export const credentialsSchema = z.object({
  accounts: z
    .array(
      z.object({
        employee_id: z.string().min(1).max(30),
        username: z.string().min(1).max(50),
        nama: z.string().min(1).max(150),
        password: z.string().min(1).max(100),
      })
    )
    .min(1, 'Tidak ada akun untuk direkap')
    .max(1000, 'Maksimal 1000 akun per rekap'),
});

export type PasswordMode = 'dob' | 'random';

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;

// ============================================
// RESPONSE TYPES
// ============================================

export interface UserResponse {
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
  status: string;
  /** TRUE = akun aktif (soft delete men-set FALSE) — sumber status di daftar */
  is_active: boolean;
  tanggal_masuk: string;
  avatar_url: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string | null;
}