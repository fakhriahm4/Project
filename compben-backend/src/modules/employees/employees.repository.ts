import { query } from '@/config/database';
import type { z } from 'zod';
import type { employeeQuerySchema } from './employees.types';

type EmployeeInput = Partial<Record<string, unknown>>;

const COLUMNS = [
  'employee_id',
  'nama',
  'ktp',
  'email',
  'company_id',
  'divisi_id',
  'jabatan_id',
  'grade_id',
  'status_pegawai',
  'status_driver',
  'tanggal_masuk',
  'tanggal_keluar',
  'is_active',
  'bpjs_active',
  'tax_status',
  'pph21_category',
  'nama_bank',
  'no_rekening',
  'include_in_payroll',
];

const SELECT_SQL = `
  SELECT e.id::int,
         e.employee_id, e.nama, e.ktp, e.email,
         e.user_id::int,
         u.username, r.kode AS role_kode, r.nama AS role_nama,
         e.company_id::int, co.nama AS company_nama,
         e.divisi_id::int,  d.nama AS divisi_nama,
         e.jabatan_id::int, j.nama AS jabatan_nama,
         e.grade_id::int,   g.kode AS grade_kode, g.nama AS grade_nama,
         e.status_pegawai, e.status_driver,
         e.tanggal_masuk::text, e.tanggal_keluar::text,
         e.is_active, e.bpjs_active, e.tax_status, e.pph21_category,
         e.nama_bank, e.no_rekening,
         e.include_in_payroll,
         -- Gaji pokok aktif per grade (effective-dated) utk tampilan payroll
         (SELECT cs.nilai_dasar::float
            FROM compensation_structures cs
            JOIN payroll_components pc ON pc.id = cs.component_id
           WHERE cs.grade_id = e.grade_id
             AND pc.kode = 'GAJI_POKOK'
             AND cs.is_active = TRUE
             AND cs.effective_start <= CURRENT_DATE
             AND (cs.effective_end IS NULL OR cs.effective_end >= CURRENT_DATE)
           ORDER BY cs.effective_start DESC
           LIMIT 1) AS gaji_pokok,
         e.created_at::text, e.updated_at::text
  FROM employees e
  LEFT JOIN users    u ON u.id = e.user_id
  LEFT JOIN roles    r ON r.id = u.role_id
  LEFT JOIN companies co ON co.id = e.company_id
  LEFT JOIN divisi   d   ON d.id  = e.divisi_id
  LEFT JOIN jabatan  j   ON j.id  = e.jabatan_id
  LEFT JOIN grade    g   ON g.id  = e.grade_id`;

export class EmployeesRepository {
  async list(
    f: z.infer<typeof employeeQuerySchema> = {}
  ): Promise<Record<string, unknown>[]> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (f.q) {
      params.push(`%${f.q}%`);
      where.push(`(e.nama ILIKE $${params.length} OR e.employee_id ILIKE $${params.length})`);
    }
    if (f.status === 'active') where.push('e.is_active = TRUE');
    if (f.status === 'inactive') where.push('e.is_active = FALSE');
    if (f.divisi_id) {
      params.push(f.divisi_id);
      where.push(`e.divisi_id = $${params.length}`);
    }
    if (f.grade_id) {
      params.push(f.grade_id);
      where.push(`e.grade_id = $${params.length}`);
    }

    const sql =
      SELECT_SQL +
      (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
      ' ORDER BY e.nama';
    const res = await query(sql, params);
    return res.rows as Record<string, unknown>[];
  }

  async findById(id: number): Promise<Record<string, unknown> | null> {
    const res = await query(`${SELECT_SQL} WHERE e.id = $1`, [id]);
    return (res.rows[0] as Record<string, unknown>) || null;
  }

  async create(data: EmployeeInput): Promise<Record<string, unknown>> {
    const cols = COLUMNS.filter((c) => data[c] !== undefined);
    const vals = cols.map((c) => data[c]);
    const res = await query(
      `INSERT INTO employees (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING id`,
      vals
    );
    return (await this.findById(Number(res.rows[0].id)))!;
  }

  async update(
    id: number,
    data: EmployeeInput
  ): Promise<Record<string, unknown>> {
    const cols = COLUMNS.filter((c) => data[c] !== undefined);
    if (cols.length === 0) throw new Error('EMPTY_UPDATE');
    const sets = cols.map((c, i) => `${c} = $${i + 1}`);
    await query(
      `UPDATE employees SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${cols.length + 1}`,
      [...cols.map((c) => data[c]), id]
    );
    return (await this.findById(id))!;
  }

  async remove(id: number): Promise<boolean> {
    const res = await query('DELETE FROM employees WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  /** Role kode pemilik baris (dari user tertaut) — utk guard include_in_payroll */
  async getUserRoleKode(userId: number): Promise<string | null> {
    const res = await query(
      `SELECT r.kode FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`,
      [userId]
    );
    return res.rows[0]?.kode ?? null;
  }
}
