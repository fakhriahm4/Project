import { z } from 'zod';

/**
 * Fase 1 — Payroll Period & Attendance.
 *
 * payroll_periods : siklus periode (OPEN → LOCKED → PAID) dgn snapshot
 *                   cut_off/payday dari settings cb_parameter.
 * attendance      : input/impor Excel (fingerprint) + koreksi manual;
 *                   tanggal > cut_off TIDAK disimpan (derived saat dibaca).
 * Hari kerja: Sen–Jumat (aturan aplikasi — lihat payroll.service).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Status kehadiran yang bisa diinput manual / diimpor */
export const ATTENDANCE_STATUSES = ['HADIR', 'SAKIT', 'IZIN', 'CUTI', 'ALPHA'] as const;

export const createPeriodSchema = z.object({
  // 'YYYY-MM' dgn bulan valid 01–12
  period_month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format periode YYYY-MM (bulan 01–12)'),
});

export const periodIdParamSchema = z.object({
  id: z.coerce.number().int().positive('Id tidak valid'),
});

export const matrixQuerySchema = z.object({
  period_id: z.coerce.number().int().positive('period_id wajib'),
});

export const cellSchema = z.object({
  employee_id: z.number().int().positive('Pegawai wajib dipilih'),
  tanggal: z.string().regex(DATE_RE, 'Format tanggal YYYY-MM-DD'),
  status: z.enum(ATTENDANCE_STATUSES),
  jam_masuk: z
    .string()
    .regex(HHMM_RE, 'Format jam HH:MM')
    .nullable()
    .optional(),
  jam_keluar: z
    .string()
    .regex(HHMM_RE, 'Format jam HH:MM')
    .nullable()
    .optional(),
  keterangan: z.string().max(200, 'Keterangan maks 200 karakter').nullable().optional(),
});

export const cellQuerySchema = z.object({
  employee_id: z.coerce.number().int().positive('employee_id wajib'),
  tanggal: z.string().regex(DATE_RE, 'Format tanggal YYYY-MM-DD'),
});

export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;
export type CellInput = z.infer<typeof cellSchema>;

export interface PeriodResponse {
  id: number;
  period_month: string; // 'YYYY-MM'
  status: 'OPEN' | 'LOCKED' | 'PAID';
  cut_off_day: number;
  payday_day: number;
  locked_at: string | null;
  paid_at: string | null;
  attendance_count: number;
  created_at: string;
}

export interface MatrixEmployee {
  id: number;
  employee_id: string;
  nama: string;
  divisi_nama: string | null;
  jabatan_nama: string | null;
}

export interface AttendanceEntry {
  employee_id: number;
  tanggal: string; // 'YYYY-MM-DD'
  status: string;
  jam_masuk: string | null;
  jam_keluar: string | null;
  source: string;
  keterangan: string | null;
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  filename: string;
  total_rows: number;
  imported: number; // baris baru
  updated: number; // baris timpa (impor ulang / menimpa koreksi)
  errors: ImportRowError[];
}
