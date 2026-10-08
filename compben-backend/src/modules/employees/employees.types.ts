import { z } from 'zod';

/**
 * Master Pegawai — tabel `employees` (terpisah dari `users`, relasi longgar
 * via employee_id). Sumber data awal: seed dari users; nanti: HRIS (read-only).
 *
 * employeeSchema  = CREATE (NIP & nama wajib, sisanya opsional — default di DB)
 * employeeUpdateSchema = UPDATE (semua field boleh sebagian)
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toNull = (v: unknown): unknown =>
  v === '' || v === undefined ? null : v;

const optStr = (max: number) =>
  z.preprocess(toNull, z.string().max(max).nullable()).optional();

const dateOpt = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z
    .string()
    .regex(DATE_RE, 'Format tanggal YYYY-MM-DD')
    .nullable()
).optional();

const refId = z.coerce.number().int().positive('Referensi tidak valid').nullish();

const employeeFull = z.object({
  employee_id: z
    .string()
    .min(1, 'NIP wajib diisi')
    .max(30)
    .transform((v) => v.trim()),
  nama: z.string().min(1, 'Nama wajib diisi').max(150),
  ktp: optStr(30),
  email: z.preprocess(
    toNull,
    z
      .string()
      .max(150)
      .regex(EMAIL_RE, 'Format email tidak valid')
      .nullable()
  ).optional(),
  company_id: refId,
  divisi_id: refId,
  jabatan_id: refId,
  grade_id: refId,
  status_pegawai: z
    .enum(['TETAP', 'KONTRAK', 'PROBATION'], {
      message: 'Status pegawai tidak valid',
    })
    .optional(),
  status_driver: z.boolean().optional(),
  tanggal_masuk: dateOpt,
  tanggal_keluar: dateOpt,
  is_active: z.boolean().optional(),
  bpjs_active: z.boolean().optional(),
  tax_status: z.string().max(30).optional(),
  pph21_category: z
    .enum(['TER_A', 'TER_B'], { message: 'Kategori PPh 21 harus TER_A atau TER_B' })
    .optional(),
  nama_bank: optStr(50),
  no_rekening: optStr(30),
  /** Ikut perhitungan payroll — akun SUPER_ADMIN dipaksa FALSE oleh trigger */
  include_in_payroll: z.boolean().optional(),
});

export const employeeSchema = employeeFull;
export const employeeUpdateSchema = employeeFull.partial();

export const employeeQuerySchema = z
  .object({
    q: z.string().max(100).optional(),
    status: z.enum(['all', 'active', 'inactive']).optional(),
    divisi_id: z.coerce.number().int().positive().optional(),
    grade_id: z.coerce.number().int().positive().optional(),
  })
  .partial();

export const employeeIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID tidak valid'),
});
