import { query } from '@/config/database';
import type { AttendanceEntry, MatrixEmployee, PeriodResponse } from './payroll.types';

/**
 * Repository Payroll Period & Attendance (Fase 1).
 * Semua SQL transparan — aturan bisnis (lock efektif, hari kerja, derived
 * LOCKED_ASSUMED_PRESENT) ada di payroll.service.
 */

const PERIOD_SELECT = `
  SELECT p.id::int,
         to_char(p.period_month, 'YYYY-MM') AS period_month,
         p.status,
         p.cut_off_day::int,
         p.payday_day::int,
         p.locked_at::text, p.locked_by::int,
         p.paid_at::text,  p.paid_by::int,
         p.created_by::int,
         p.created_at::text, p.updated_at::text,
         (SELECT COUNT(*)::int FROM attendance a WHERE a.period_id = p.id) AS attendance_count
    FROM payroll_periods p`;

export class PayrollRepository {
  // ── Periode ──────────────────────────────────────────────
  async listPeriods(): Promise<PeriodResponse[]> {
    const res = await query(`${PERIOD_SELECT} ORDER BY p.period_month DESC`);
    return res.rows as PeriodResponse[];
  }

  async findPeriodById(id: number): Promise<PeriodResponse | null> {
    const res = await query(`${PERIOD_SELECT} WHERE p.id = $1`, [id]);
    return (res.rows[0] as PeriodResponse) ?? null;
  }

  /** month = 'YYYY-MM' → period_month disimpan sebagai tgl-1 */
  async findPeriodByMonth(month: string): Promise<PeriodResponse | null> {
    const res = await query(`${PERIOD_SELECT} WHERE p.period_month = $1::date`, [
      `${month}-01`,
    ]);
    return (res.rows[0] as PeriodResponse) ?? null;
  }

  async insertPeriod(
    month: string,
    cutOffDay: number,
    paydayDay: number,
    userId: number
  ): Promise<PeriodResponse | null> {
    const res = await query(
      `INSERT INTO payroll_periods (period_month, cut_off_day, payday_day, created_by)
       VALUES ($1::date, $2, $3, $4)
       RETURNING id`,
      [`${month}-01`, cutOffDay, paydayDay, userId]
    );
    return this.findPeriodById(Number(res.rows[0].id));
  }

  async lockPeriod(id: number, userId: number): Promise<void> {
    await query(
      `UPDATE payroll_periods
          SET status = 'LOCKED', locked_at = now(), locked_by = $2, updated_at = now()
        WHERE id = $1`,
      [id, userId]
    );
  }

  async payPeriod(id: number, userId: number): Promise<void> {
    await query(
      `UPDATE payroll_periods
          SET status = 'PAID', paid_at = now(), paid_by = $2, updated_at = now()
        WHERE id = $1`,
      [id, userId]
    );
  }

  async deletePeriod(id: number): Promise<boolean> {
    const res = await query(`DELETE FROM payroll_periods WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  async countAttendance(periodId: number): Promise<number> {
    const res = await query(
      `SELECT COUNT(*)::int AS n FROM attendance WHERE period_id = $1`,
      [periodId]
    );
    return Number(res.rows[0].n);
  }

  // ── Absensi ──────────────────────────────────────────────

  /**
   * Pegawai yg ikut payroll: include_in_payroll = TRUE & aktif.
   * (Akun SUPER_ADMIN sudah dipaksa FALSE oleh trigger migrasi 009.)
   */
  async matrixEmployees(): Promise<MatrixEmployee[]> {
    const res = await query(
      `SELECT e.id::int, e.employee_id, e.nama,
              d.nama AS divisi_nama, j.nama AS jabatan_nama
         FROM employees e
         LEFT JOIN divisi  d ON d.id = e.divisi_id
         LEFT JOIN jabatan j ON j.id = e.jabatan_id
        WHERE e.include_in_payroll = TRUE AND e.is_active = TRUE
        ORDER BY e.nama ASC`
    );
    return res.rows as MatrixEmployee[];
  }

  async findPayrollEmployee(id: number): Promise<MatrixEmployee | null> {
    const res = await query(
      `SELECT e.id::int, e.employee_id, e.nama,
              d.nama AS divisi_nama, j.nama AS jabatan_nama
         FROM employees e
         LEFT JOIN divisi  d ON d.id = e.divisi_id
         LEFT JOIN jabatan j ON j.id = e.jabatan_id
        WHERE e.id = $1 AND e.include_in_payroll = TRUE AND e.is_active = TRUE`,
      [id]
    );
    return (res.rows[0] as MatrixEmployee) ?? null;
  }

  async listEntries(periodId: number): Promise<AttendanceEntry[]> {
    const res = await query(
      `SELECT employee_id::int,
              to_char(tanggal, 'YYYY-MM-DD') AS tanggal,
              status,
              to_char(jam_masuk,  'HH24:MI')  AS jam_masuk,
              to_char(jam_keluar, 'HH24:MI')  AS jam_keluar,
              source, keterangan
         FROM attendance
        WHERE period_id = $1
        ORDER BY employee_id, tanggal`,
      [periodId]
    );
    return res.rows as AttendanceEntry[];
  }

  async findEntry(employeeId: number, tanggal: string): Promise<AttendanceEntry | null> {
    const res = await query(
      `SELECT employee_id::int,
              to_char(tanggal, 'YYYY-MM-DD') AS tanggal,
              status,
              to_char(jam_masuk,  'HH24:MI')  AS jam_masuk,
              to_char(jam_keluar, 'HH24:MI')  AS jam_keluar,
              source, keterangan
         FROM attendance
        WHERE employee_id = $1 AND tanggal = $2::date`,
      [employeeId, tanggal]
    );
    return (res.rows[0] as AttendanceEntry) ?? null;
  }

  /** Upsert per (pegawai, tanggal) — inserted=true bila baris BARU */
  async upsertEntry(input: {
    period_id: number;
    employee_id: number;
    tanggal: string;
    status: string;
    jam_masuk: string | null;
    jam_keluar: string | null;
    keterangan: string | null;
    source: 'IMPORT' | 'MANUAL';
    user_id: number;
  }): Promise<{ id: number; inserted: boolean }> {
    const res = await query(
      `INSERT INTO attendance
         (period_id, employee_id, tanggal, status, jam_masuk, jam_keluar,
          keterangan, source, updated_by)
       VALUES ($1, $2, $3::date, $4, $5::time, $6::time, $7, $8, $9)
       ON CONFLICT (employee_id, tanggal) DO UPDATE SET
         period_id  = EXCLUDED.period_id,
         status     = EXCLUDED.status,
         jam_masuk  = EXCLUDED.jam_masuk,
         jam_keluar = EXCLUDED.jam_keluar,
         keterangan = EXCLUDED.keterangan,
         source     = EXCLUDED.source,
         updated_by = EXCLUDED.updated_by,
         updated_at = now()
       RETURNING id, (xmax = 0) AS inserted`,
      [
        input.period_id,
        input.employee_id,
        input.tanggal,
        input.status,
        input.jam_masuk,
        input.jam_keluar,
        input.keterangan,
        input.source,
        input.user_id,
      ]
    );
    return {
      id: Number(res.rows[0].id),
      inserted: res.rows[0]?.inserted === true,
    };
  }

  async deleteEntry(employeeId: number, tanggal: string): Promise<boolean> {
    const res = await query(
      `DELETE FROM attendance WHERE employee_id = $1 AND tanggal = $2::date`,
      [employeeId, tanggal]
    );
    return (res.rowCount ?? 0) > 0;
  }

  /** Periode aktif bulan dari tanggal tsb (untuk guard koreksi manual) */
  async findPeriodByDate(tanggal: string): Promise<PeriodResponse | null> {
    const res = await query(
      `${PERIOD_SELECT} WHERE p.period_month = date_trunc('month', $1::date)::date`,
      [tanggal]
    );
    return (res.rows[0] as PeriodResponse) ?? null;
  }
}

export const payrollRepository = new PayrollRepository();
