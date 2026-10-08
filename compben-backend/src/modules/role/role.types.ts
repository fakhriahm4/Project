import { z } from 'zod';

// ============================================
// ZOD SCHEMAS
// ============================================

export const createRoleSchema = z.object({
  kode: z
    .string()
    .min(2, 'Kode minimal 2 karakter')
    .max(30, 'Kode maksimal 30 karakter')
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      'Kode hanya huruf besar, angka, dan underscore (diawali huruf)'
    ),
  nama: z.string().min(1, 'Nama wajib diisi').max(100),
  deskripsi: z.string().max(500).optional().nullable(),
  is_active: z.boolean().default(true),
});

// Kode TIDAK boleh diubah — RBAC backend mengandalkan nilai kode.
export const updateRoleSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').max(100).optional(),
  deskripsi: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
});

export const roleIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID tidak valid'),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

// ============================================
// RESPONSE TYPES
// ============================================

export interface RoleResponse {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  is_active: boolean;
  /** Jumlah user AKTIF dengan role ini (tampilan badge) */
  user_count: number;
  /** Semua baris user (aktif & nonaktif) — menahan hapus karena FK */
  user_count_all: number;
  created_at: string;
  /** Tabel roles tidak punya kolom updated_at — selalu null */
  updated_at: null;
}