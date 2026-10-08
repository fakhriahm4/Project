import { z } from 'zod';

// ============================================
// ZOD SCHEMAS
// ============================================

/** Master generik: divisi & jabatan punya bentuk identik */
export type MasterEntity = 'divisi' | 'jabatan';

export const createMasterSchema = z.object({
  kode: z
    .string()
    .min(1, 'Kode wajib diisi')
    .max(20, 'Kode maksimal 20 karakter')
    .regex(/^[A-Za-z0-9_-]+$/, 'Kode hanya huruf, angka, dash, atau underscore'),
  nama: z.string().min(1, 'Nama wajib diisi').max(100),
  deskripsi: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const updateMasterSchema = createMasterSchema.partial();

// ── Grade ──────────────────────────────────
// Grade beda bentuk dari divisi/jabatan (level + rentang gaji, tanpa
// deskripsi) → schema & repo sendiri. Ditulis SUPER_ADMIN & ADMIN_CNB
// (perubahan tahunan mengikuti kebijakan kompensasi).
const gradeBaseSchema = z.object({
  kode: z
    .string()
    .min(1, 'Kode wajib diisi')
    .max(30, 'Kode maksimal 30 karakter')
    .regex(/^[A-Za-z0-9_-]+$/, 'Kode hanya huruf, angka, dash, atau underscore'),
  nama: z.string().min(1, 'Nama wajib diisi').max(150),
  level: z.number().int('Level harus bilangan bulat').min(0).max(99).optional().nullable(),
  min_salary: z.number().min(0, 'Gaji minimum tidak boleh negatif').optional().nullable(),
  max_salary: z.number().min(0, 'Gaji maksimum tidak boleh negatif').optional().nullable(),
  is_active: z.boolean().default(true),
});

export const createGradeSchema = gradeBaseSchema.superRefine((val, ctx) => {
  if (val.min_salary != null && val.max_salary != null && val.max_salary < val.min_salary) {
    ctx.addIssue({
      code: 'custom',
      path: ['max_salary'],
      message: 'Gaji maksimum harus lebih besar atau sama dengan gaji minimum',
    });
  }
});

export const updateGradeSchema = gradeBaseSchema.partial().superRefine((val, ctx) => {
  if (val.min_salary != null && val.max_salary != null && val.max_salary < val.min_salary) {
    ctx.addIssue({
      code: 'custom',
      path: ['max_salary'],
      message: 'Gaji maksimum harus lebih besar atau sama dengan gaji minimum',
    });
  }
});


export const createCompanySchema = z.object({
  nama: z.string().min(1, 'Nama perusahaan wajib diisi').max(150),
  alamat: z.string().max(500).optional().nullable(),
  email: z.string().email('Format email tidak valid').max(150).optional().nullable(),
  no_hp: z.string().max(20).optional().nullable(),
  npwp: z.string().max(30).optional().nullable(),
  deskripsi: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const updateCompanySchema = createCompanySchema.partial();

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID tidak valid'),
});

export type CreateMasterInput = z.infer<typeof createMasterSchema>;
export type UpdateMasterInput = z.infer<typeof updateMasterSchema>;
export type CreateGradeInput = z.infer<typeof createGradeSchema>;
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ============================================
// RESPONSE TYPES
// ============================================

export interface MasterResponse {
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

export interface GradeResponse {
  id: number;
  kode: string;
  nama: string;
  level: number | null;
  min_salary: number | null;
  max_salary: number | null;
  is_active: boolean;
  /** User AKTIF dengan grade ini (badge) */
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

export interface CompanyResponse {
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
