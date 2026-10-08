import { query } from '@/config/database';
import type {
  CompanyResponse,
  CreateCompanyInput,
  CreateGradeInput,
  CreateMasterInput,
  GradeResponse,
  MasterEntity,
  MasterResponse,
  UpdateCompanyInput,
  UpdateGradeInput,
  UpdateMasterInput,
} from './organization.types';

/** Kolom FK di tabel users per entitas master */
const USER_FK: Record<MasterEntity, string> = {
  divisi: 'divisi_id',
  jabatan: 'jabatan_id',
};

export class OrganizationRepository {
  // ============================================
  // MASTER GENERIK: divisi / jabatan
  // Nama tabel & FK dari whitelist tipe — bukan input bebas.
  // ============================================

  async findAllMaster(entity: MasterEntity): Promise<MasterResponse[]> {
    const fk = USER_FK[entity];
    const result = await query(
      `SELECT
         m.id::int,
         m.kode,
         m.nama,
         m.deskripsi,
         m.is_active,
         COUNT(u.id) FILTER (WHERE u.is_active = TRUE)::int AS user_count,
         COUNT(u.id)::int AS user_count_all,
         m.created_at,
         m.updated_at
       FROM ${entity} m
       LEFT JOIN users u ON u.${fk} = m.id
       GROUP BY m.id
       ORDER BY m.nama ASC`
    );
    return result.rows as MasterResponse[];
  }

  async findMasterById(
    entity: MasterEntity,
    id: number
  ): Promise<MasterResponse | null> {
    const fk = USER_FK[entity];
    const result = await query(
      `SELECT
         m.id::int, m.kode, m.nama, m.deskripsi, m.is_active,
         (SELECT COUNT(*)::int FROM users u
           WHERE u.${fk} = m.id AND u.is_active = TRUE) AS user_count,
         (SELECT COUNT(*)::int FROM users u
           WHERE u.${fk} = m.id) AS user_count_all,
         m.created_at, m.updated_at
       FROM ${entity} m
       WHERE m.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async checkMasterDuplicate(
    entity: MasterEntity,
    field: 'kode' | 'nama',
    value: string,
    excludeId?: number
  ): Promise<boolean> {
    const sql = excludeId
      ? `SELECT id FROM ${entity} WHERE ${field} = $1 AND id != $2 AND is_active = TRUE`
      : `SELECT id FROM ${entity} WHERE ${field} = $1 AND is_active = TRUE`;
    const params = excludeId ? [value, excludeId] : [value];
    const result = await query(sql, params);
    return result.rows.length > 0;
  }

  /** Jumlah user yang memakai data ini (aktif & nonaktif — FK menahan hapus) */
  async countMasterUsers(entity: MasterEntity, id: number): Promise<number> {
    const fk = USER_FK[entity];
    const result = await query(
      `SELECT COUNT(*)::int AS total FROM users
       WHERE ${fk} = $1`,
      [id]
    );
    return result.rows[0].total;
  }

  async createMaster(
    entity: MasterEntity,
    data: CreateMasterInput
  ): Promise<number> {
    const result = await query(
      `INSERT INTO ${entity} (kode, nama, deskripsi, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id::int`,
      [data.kode, data.nama, data.deskripsi ?? null, data.is_active]
    );
    return result.rows[0].id;
  }

  async updateMaster(
    entity: MasterEntity,
    id: number,
    data: UpdateMasterInput
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${i}`);
        values.push(value);
        i++;
      }
    });

    if (fields.length === 0) return;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await query(
      `UPDATE ${entity} SET ${fields.join(', ')} WHERE id = $${i}`,
      values
    );
  }

  async deleteMaster(entity: MasterEntity, id: number): Promise<void> {
    await query(`DELETE FROM ${entity} WHERE id = $1`, [id]);
  }

  // ============================================
  // GRADE — kode/nama/level/rentang gaji (tanpa deskripsi)
  // ============================================

  private static readonly GRADE_SELECT = `
    SELECT g.id::int, g.kode, g.nama, g.level,
           g.min_salary::float, g.max_salary::float,
           g.is_active,
           (SELECT COUNT(*)::int FROM users u
             WHERE u.grade_id = g.id AND u.is_active = TRUE) AS user_count,
           (SELECT COUNT(*)::int FROM users u
             WHERE u.grade_id = g.id) AS user_count_all,
           (SELECT COUNT(*)::int FROM employees e
             WHERE e.grade_id = g.id) AS employee_count,
           (SELECT COUNT(*)::int FROM compensation_structures cs
             WHERE cs.grade_id = g.id) AS structure_count,
           g.created_at, g.updated_at
    FROM grade g`;

  async findAllGrades(): Promise<GradeResponse[]> {
    const result = await query(
      `${OrganizationRepository.GRADE_SELECT}
       ORDER BY g.level ASC NULLS LAST, g.kode ASC`
    );
    return result.rows as GradeResponse[];
  }

  async findGradeById(id: number): Promise<GradeResponse | null> {
    const result = await query(
      `${OrganizationRepository.GRADE_SELECT} WHERE g.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async checkGradeDuplicate(
    field: 'kode' | 'nama',
    value: string,
    excludeId?: number
  ): Promise<boolean> {
    const sql = excludeId
      ? `SELECT id FROM grade WHERE ${field} = $1 AND id != $2 AND is_active = TRUE`
      : `SELECT id FROM grade WHERE ${field} = $1 AND is_active = TRUE`;
    const params = excludeId ? [value, excludeId] : [value];
    const result = await query(sql, params);
    return result.rows.length > 0;
  }

  /** Penggunaan grade di semua tabel yang mereferensikannya (penahan hapus) */
  async gradeUsage(id: number): Promise<{
    users: number;
    employees: number;
    structures: number;
    overtime: number;
  }> {
    const result = await query(
      `SELECT
         (SELECT COUNT(*)::int FROM users WHERE grade_id = $1)                 AS users,
         (SELECT COUNT(*)::int FROM employees WHERE grade_id = $1)             AS employees,
         (SELECT COUNT(*)::int FROM compensation_structures WHERE grade_id = $1) AS structures,
         (SELECT COUNT(*)::int FROM overtime_rules WHERE grade_id = $1)        AS overtime`,
      [id]
    );
    return result.rows[0];
  }

  async createGrade(data: CreateGradeInput): Promise<number> {
    const result = await query(
      `INSERT INTO grade (kode, nama, level, min_salary, max_salary, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id::int`,
      [
        data.kode,
        data.nama,
        data.level ?? null,
        data.min_salary ?? null,
        data.max_salary ?? null,
        data.is_active,
      ]
    );
    return result.rows[0].id;
  }

  async updateGrade(id: number, data: UpdateGradeInput): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${i}`);
        values.push(value);
        i++;
      }
    });

    if (fields.length === 0) return;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await query(`UPDATE grade SET ${fields.join(', ')} WHERE id = $${i}`, values);
  }

  async deleteGrade(id: number): Promise<void> {
    await query(`DELETE FROM grade WHERE id = $1`, [id]);
  }

  // ============================================
  // COMPANIES
  // ============================================

  async findAllCompanies(): Promise<CompanyResponse[]> {
    const result = await query(
      `SELECT id::int, nama, alamat, email, no_hp, npwp, deskripsi,
              is_active, created_at, updated_at
       FROM companies
       ORDER BY is_active DESC, nama ASC`
    );
    return result.rows as CompanyResponse[];
  }

  async findCompanyById(id: number): Promise<CompanyResponse | null> {
    const result = await query(
      `SELECT id::int, nama, alamat, email, no_hp, npwp, deskripsi,
              is_active, created_at, updated_at
       FROM companies WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async createCompany(data: CreateCompanyInput): Promise<number> {
    const result = await query(
      `INSERT INTO companies (nama, alamat, email, no_hp, npwp, deskripsi, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id::int`,
      [
        data.nama,
        data.alamat ?? null,
        data.email ?? null,
        data.no_hp ?? null,
        data.npwp ?? null,
        data.deskripsi ?? null,
        data.is_active,
      ]
    );
    return result.rows[0].id;
  }

  async updateCompany(
    id: number,
    data: UpdateCompanyInput
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${i}`);
        values.push(value);
        i++;
      }
    });

    if (fields.length === 0) return;

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await query(`UPDATE companies SET ${fields.join(', ')} WHERE id = $${i}`, values);
  }

  async deleteCompany(id: number): Promise<void> {
    await query(`DELETE FROM companies WHERE id = $1`, [id]);
  }
}
