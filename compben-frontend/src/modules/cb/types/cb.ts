/**
 * Tipe data Master C&B (Fase 0) — mengikuti bentuk row dari backend
 * (alias join sudah di-cast: numerik → number, tanggal → string 'YYYY-MM-DD').
 */

export type ComponentType = 'EARNING' | 'DEDUCTION';

export type PayrollComponent = {
  id: number;
  kode: string;
  nama: string;
  tipe: ComponentType;
  formula: string | null;
  sifat_tetap: boolean;
  dasar_perhitungan: string | null;
  sort_order: number;
  effective_start: string | null;
  effective_end: string | null;
  is_active: boolean;
}

export type CompensationStructure = {
  id: number;
  grade_id: number;
  grade_kode: string;
  grade_nama: string;
  component_id: number;
  component_kode: string;
  component_nama: string;
  sort_order: number;
  nilai_dasar: number;
  effective_start: string | null;
  effective_end: string | null;
  is_active: boolean;
}

export type BpjsComponent = {
  id: number;
  kode: string;
  nama: string;
  persentase_pekerja: number;
  persentase_perusahaan: number;
  batas_atas: number;
  dasar: string;
  effective_start: string | null;
  effective_end: string | null;
  is_active: boolean;
}

export type TerKategori = 'TER_A' | 'TER_B';

export type Pph21TerRow = {
  id: number;
  kategori: TerKategori;
  range_min: number;
  range_max: number | null;
  tarif_persen: number;
  effective_start: string | null;
  effective_end: string | null;
  is_active: boolean;
}

export type DeductionMaster = {
  id: number;
  kode: string;
  nama: string;
  /** {"if":"is_driver","then":"applies"} → hanya driver; {} → semua pegawai */
  rule: Record<string, unknown>;
  nilai_default: number;
  effective_start: string | null;
  effective_end: string | null;
  is_active: boolean;
}

export type OvertimeMethod = 'JAM_MATI' | 'NORMATIF';

export type OvertimeRule = {
  id: number;
  grade_id: number;
  grade_kode: string;
  grade_nama: string;
  method: OvertimeMethod;
  rate: number;
  multiplier: number;
  component_kode: string;
  effective_start: string | null;
  effective_end: string | null;
  is_active: boolean;
}

export type StatusPegawai = 'TETAP' | 'KONTRAK' | 'PROBATION';

export type EmployeeRow = {
  id: number;
  employee_id: string;
  nama: string;
  ktp: string | null;
  email: string | null;
  company_id: number | null;
  company_nama: string | null;
  divisi_id: number | null;
  divisi_nama: string | null;
  jabatan_id: number | null;
  jabatan_nama: string | null;
  grade_id: number | null;
  grade_kode: string | null;
  grade_nama: string | null;
  status_pegawai: StatusPegawai;
  status_driver: boolean;
  tanggal_masuk: string | null;
  tanggal_keluar: string | null;
  is_active: boolean;
  bpjs_active: boolean;
  tax_status: string;
  pph21_category: TerKategori;
  nama_bank: string | null;
  no_rekening: string | null;
}

/** Payload create/update pegawai (semua kecuali NIP & nama opsional) */
export type EmployeePayload = Partial<
  Omit<EmployeeRow, 'id' | 'company_nama' | 'divisi_nama' | 'jabatan_nama' | 'grade_kode' | 'grade_nama'>
>;

