import { z } from 'zod';

// Validasi body POST /api/v1/auth/login
export const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'Username minimal 3 karakter')
    .max(50, 'Username maksimal 50 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter').max(100),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Validasi body PUT /api/v1/auth/profile — data diri (diisi employee)
// Semua optional+nullable: kirim hanya kolom yang diubah.
const nullableStr = (max: number) => z.string().max(max).trim().optional().nullable();

export const updateProfileSchema = z.object({
  nik: nullableStr(30),
  jenis_kelamin: z.enum(['L', 'P']).optional().nullable(),
  tempat_lahir: nullableStr(100),
  tanggal_lahir: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD')
    .optional()
    .nullable(),
  alamat: z.string().max(500).optional().nullable(),
  agama: nullableStr(20),
  status_kawin: nullableStr(20),
  kontak_darurat_nama: nullableStr(150),
  kontak_darurat_hubungan: nullableStr(50),
  kontak_darurat_hp: nullableStr(20),
  npwp: nullableStr(30),
  nama_bank: nullableStr(50),
  no_rekening: nullableStr(30),
  pendidikan_terakhir: nullableStr(50),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password lama wajib diisi'),
  newPassword: z
    .string()
    .min(6, 'Password baru minimal 6 karakter')
    .max(100, 'Password baru maksimal 100 karakter'),
});

export const preferencesSchema = z.object({
  notif_email: z.boolean().default(true),
  notif_app: z.boolean().default(true),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;

/** Kolom data diri — dipakai utk hitung kelengkapan profil */
export const PROFILE_FIELDS = [
  'nik',
  'jenis_kelamin',
  'tempat_lahir',
  'tanggal_lahir',
  'alamat',
  'agama',
  'status_kawin',
  'kontak_darurat_nama',
  'kontak_darurat_hubungan',
  'kontak_darurat_hp',
  'npwp',
  'nama_bank',
  'no_rekening',
  'pendidikan_terakhir',
] as const;

// Row dari tabel users + join roles (hasil findByUsername)
export interface AuthUserRow {
  id: number;
  username: string;
  password_hash: string;
  nama: string;
  email: string;
  role_id: number;
  role_kode: string;
  role_nama: string;
  status: string;
  must_change_password: boolean;
  /** Kebijakan password: umur password utk cek kedaluwarsa */
  password_changed_at: Date | null;
  /** Lockout: percobaan login gagal berturut-turut */
  failed_login_attempts: number;
  locked_until: Date | null;
}
