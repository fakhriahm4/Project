import { query } from '@/config/database';

/**
 * Definisi 6 resource master C&B — tabel & kolom di-whitelist di sini
 * (tak ada nama tabel/kolom dari input user → aman dari SQL injection).
 * listSql dengan SELECT eksplisit agar alias kolom & tipe numerik konsisten
 * untuk frontend (NUMERIC pg → string, di-cast ke float di sini).
 */
export interface CrudResource {
  table: string;
  /** Kolom yang boleh ditulis (insert/update) */
  columns: string[];
  listSql: string;
}

export const RESOURCES: Record<string, CrudResource> = {
  components: {
    table: 'payroll_components',
    columns: [
      'kode', 'nama', 'tipe', 'formula', 'sifat_tetap', 'dasar_perhitungan',
      'sort_order', 'effective_start', 'effective_end', 'is_active',
    ],
    listSql: `SELECT id::int, kode, nama, tipe, formula, sifat_tetap, dasar_perhitungan,
                     sort_order::int, effective_start::text, effective_end::text, is_active
              FROM payroll_components ORDER BY sort_order, kode`,
  },
  structures: {
    table: 'compensation_structures',
    columns: ['grade_id', 'component_id', 'nilai_dasar', 'effective_start', 'effective_end', 'is_active'],
    listSql: `SELECT s.id::int, s.grade_id::int, g.kode AS grade_kode, g.nama AS grade_nama,
                     s.component_id::int, c.kode AS component_kode, c.nama AS component_nama,
                     c.sort_order::int AS sort_order,
                     s.nilai_dasar::float AS nilai_dasar,
                     s.effective_start::text, s.effective_end::text, s.is_active
              FROM compensation_structures s
              JOIN grade g ON g.id = s.grade_id
              JOIN payroll_components c ON c.id = s.component_id
              ORDER BY g.level, c.sort_order`,
  },
  bpjs: {
    table: 'bpjs_components',
    columns: [
      'kode', 'nama', 'persentase_pekerja', 'persentase_perusahaan',
      'batas_atas', 'dasar', 'effective_start', 'effective_end', 'is_active',
    ],
    listSql: `SELECT id::int, kode, nama,
                     persentase_pekerja::float, persentase_perusahaan::float,
                     batas_atas::float, dasar,
                     effective_start::text, effective_end::text, is_active
              FROM bpjs_components ORDER BY kode`,
  },
  tax: {
    table: 'pph21_ter',
    columns: [
      'kategori', 'range_min', 'range_max', 'tarif_persen',
      'effective_start', 'effective_end', 'is_active',
    ],
    listSql: `SELECT id::int, kategori, range_min::float, range_max::float,
                     tarif_persen::float, effective_start::text, effective_end::text, is_active
              FROM pph21_ter ORDER BY kategori, range_min`,
  },
  deductions: {
    table: 'deduction_master',
    columns: ['kode', 'nama', 'rule', 'nilai_default', 'effective_start', 'effective_end', 'is_active'],
    listSql: `SELECT id::int, kode, nama, rule, nilai_default::float,
                     effective_start::text, effective_end::text, is_active
              FROM deduction_master ORDER BY kode`,
  },
  overtimeRules: {
    table: 'overtime_rules',
    columns: [
      'grade_id', 'method', 'rate', 'multiplier', 'component_kode',
      'effective_start', 'effective_end', 'is_active',
    ],
    listSql: `SELECT r.id::int, r.grade_id::int, g.kode AS grade_kode, g.nama AS grade_nama,
                     r.method, r.rate::float, r.multiplier::float, r.component_kode,
                     r.effective_start::text, r.effective_end::text, r.is_active
              FROM overtime_rules r JOIN grade g ON g.id = r.grade_id
              ORDER BY g.level, r.effective_start DESC`,
  },
};

export class CbmasterRepository {
  async list(key: string): Promise<Record<string, unknown>[]> {
    const r = RESOURCES[key];
    const res = await query(r.listSql);
    return res.rows as Record<string, unknown>[];
  }

  async findById(key: string, id: number): Promise<Record<string, unknown> | null> {
    const r = RESOURCES[key];
    const res = await query(`SELECT * FROM ${r.table} WHERE id = $1`, [id]);
    return (res.rows[0] as Record<string, unknown>) || null;
  }

  async create(
    key: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const r = RESOURCES[key];
    const cols = r.columns.filter((c) => data[c] !== undefined);
    const vals = cols.map((c) => data[c]);
    const res = await query(
      `INSERT INTO ${r.table} (${cols.join(', ')})
       VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      vals
    );
    return res.rows[0] as Record<string, unknown>;
  }

  async update(
    key: string,
    id: number,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const r = RESOURCES[key];
    const cols = r.columns.filter((c) => data[c] !== undefined);
    if (cols.length === 0) throw new Error('EMPTY_UPDATE');
    const sets = cols.map((c, i) => `${c} = $${i + 1}`);
    const res = await query(
      `UPDATE ${r.table} SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${cols.length + 1} RETURNING *`,
      [...vals(cols, data), id]
    );
    return res.rows[0] as Record<string, unknown>;
  }

  async remove(key: string, id: number): Promise<boolean> {
    const r = RESOURCES[key];
    const res = await query(`DELETE FROM ${r.table} WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }
}

function vals(cols: string[], data: Record<string, unknown>): unknown[] {
  return cols.map((c) => data[c]);
}
