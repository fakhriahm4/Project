import { z, type ZodType } from 'zod';

/**
 * Schema per resource C&B:
 * - create = field inti WAJIB (kode/nama/tipe dst.), sisanya opsional
 *            (default di-DB);
 * - update = create.partial() → boleh kirim sebagian.
 * Effective date memastikan riwayat konfigurasi bisa ditelusuri (Fase 3 engine).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const dateOpt = z
  .string()
  .regex(DATE_RE, 'Format tanggal YYYY-MM-DD')
  .nullish();

/** Komponen Payroll (penghasilan/potongan) — kode, nama, tipe wajib */
const componentBase = z.object({
  kode: z.string().min(1, 'Kode wajib diisi').max(20).transform((v) => v.toUpperCase()),
  nama: z.string().min(1, 'Nama wajib diisi').max(100),
  tipe: z.enum(['EARNING', 'DEDUCTION'], { message: 'Tipe harus EARNING atau DEDUCTION' }),
  formula: z.string().max(500).nullish(),
  sifat_tetap: z.boolean().optional(),
  dasar_perhitungan: z.string().max(40).nullish(),
  sort_order: z.coerce.number().int().min(0).max(999).optional(),
  effective_start: dateOpt,
  effective_end: dateOpt,
  is_active: z.boolean().optional(),
});

/** Struktur Compensation: grade ↔ komponen — grade & komponen wajib */
const structureBase = z.object({
  grade_id: z.coerce.number({ message: 'Grade wajib dipilih' }).int().positive('Grade wajib dipilih'),
  component_id: z.coerce
    .number({ message: 'Komponen wajib dipilih' })
    .int()
    .positive('Komponen wajib dipilih'),
  nilai_dasar: z.coerce.number('Harus berupa angka').min(0, 'Tidak boleh negatif').optional(),
  effective_start: dateOpt,
  effective_end: dateOpt,
  is_active: z.boolean().optional(),
});

/** Master BPJS — kode & nama wajib, persen default 0 */
const bpjsBase = z.object({
  kode: z.string().min(1, 'Kode wajib diisi').max(20).transform((v) => v.toUpperCase()),
  nama: z.string().min(1, 'Nama wajib diisi').max(100),
  persentase_pekerja: z.coerce.number('Harus berupa angka').min(0).max(100).optional(),
  persentase_perusahaan: z.coerce.number('Harus berupa angka').min(0).max(100).optional(),
  batas_atas: z.coerce.number('Harus berupa angka').min(0).optional(),
  dasar: z.string().max(30).optional(),
  effective_start: dateOpt,
  effective_end: dateOpt,
  is_active: z.boolean().optional(),
});

/** Satu baris tabel PPh 21 TER — kategori, range_min, tarif wajib */
const taxBase = z.object({
  kategori: z.enum(['TER_A', 'TER_B'], { message: 'Kategori harus TER_A atau TER_B' }),
  range_min: z.coerce.number('Harus berupa angka').min(0, 'Tidak boleh negatif'),
  range_max: z.coerce.number('Harus berupa angka').min(0).nullish(),
  tarif_persen: z.coerce.number('Harus berupa angka').min(0).max(100),
  effective_start: dateOpt,
  effective_end: dateOpt,
  is_active: z.boolean().optional(),
});

/** Master Deduction — rule JSONB: {"if":"is_driver","then":"applies"} */
const deductionBase = z.object({
  kode: z.string().min(1, 'Kode wajib diisi').max(30).transform((v) => v.toUpperCase()),
  nama: z.string().min(1, 'Nama wajib diisi').max(100),
  rule: z.record(z.string(), z.unknown()).optional(),
  nilai_default: z.coerce.number('Harus berupa angka').min(0).optional(),
  effective_start: dateOpt,
  effective_end: dateOpt,
  is_active: z.boolean().optional(),
});

/** Overtime Rule per grade (JAM_MATI / NORMATIF) — grade & method wajib */
const overtimeRuleBase = z.object({
  grade_id: z.coerce.number({ message: 'Grade wajib dipilih' }).int().positive('Grade wajib dipilih'),
  method: z.enum(['JAM_MATI', 'NORMATIF'], { message: 'Metode harus JAM_MATI atau NORMATIF' }),
  rate: z.coerce.number('Harus berupa angka').min(0).optional(),
  multiplier: z.coerce.number('Harus berupa angka').min(0).optional(),
  component_kode: z.string().max(20).optional(),
  effective_start: dateOpt,
  effective_end: dateOpt,
  is_active: z.boolean().optional(),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID tidak valid'),
});

export type CbResourceKey =
  | 'components'
  | 'structures'
  | 'bpjs'
  | 'tax'
  | 'deductions'
  | 'overtimeRules';

/** Registry: schema create (required inti) & update (partial) per resource */
export const CB_SCHEMAS: Record<CbResourceKey, { create: ZodType; update: ZodType }> = {
  components: { create: componentBase, update: componentBase.partial() },
  structures: { create: structureBase, update: structureBase.partial() },
  bpjs: { create: bpjsBase, update: bpjsBase.partial() },
  tax: { create: taxBase, update: taxBase.partial() },
  deductions: { create: deductionBase, update: deductionBase.partial() },
  overtimeRules: { create: overtimeRuleBase, update: overtimeRuleBase.partial() },
};
