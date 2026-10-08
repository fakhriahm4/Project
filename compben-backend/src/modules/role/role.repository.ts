import { query } from '@/config/database';
import type { RoleResponse } from './role.types';

/**
 * Repository role — daftar role dilengkapi jumlah user aktif
 * supaya halaman Role & Permission menampilkan data nyata.
 */
export class RoleRepository {
  /** Semua role + jumlah user per role (aktif & nonaktif — keduanya menahan FK) */
  async findAll(): Promise<RoleResponse[]> {
    const result = await query(
      `SELECT
         r.id::int,
         r.kode,
         r.nama,
         r.deskripsi,
         r.is_active,
         COUNT(u.id) FILTER (WHERE u.is_active = TRUE)::int AS user_count,
         COUNT(u.id)::int AS user_count_all,
         r.created_at
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.id
       GROUP BY r.id
       ORDER BY r.id ASC`
    );
    return result.rows as RoleResponse[];
  }

  async findById(id: number): Promise<RoleResponse | null> {
    const result = await query(
      `SELECT
         r.id::int, r.kode, r.nama, r.deskripsi, r.is_active,
         (SELECT COUNT(*)::int FROM users u
           WHERE u.role_id = r.id AND u.is_active = TRUE) AS user_count,
         (SELECT COUNT(*)::int FROM users u
           WHERE u.role_id = r.id) AS user_count_all,
         r.created_at
       FROM roles r
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByKode(kode: string, excludeId?: number): Promise<boolean> {
    const sql = excludeId
      ? `SELECT id FROM roles WHERE kode = $1 AND id != $2`
      : `SELECT id FROM roles WHERE kode = $1`;
    const params = excludeId ? [kode, excludeId] : [kode];
    const result = await query(sql, params);
    return result.rows.length > 0;
  }

  /**
   * Jumlah user yang memakai role ini (aktif & nonaktif).
   * FK users.role_id NOT NULL menahan hapus meski user sudah nonaktif.
   */
  async countUsers(id: number): Promise<number> {
    const result = await query(
      `SELECT COUNT(*)::int AS total FROM users
       WHERE role_id = $1`,
      [id]
    );
    return result.rows[0].total;
  }

  async create(data: {
    kode: string;
    nama: string;
    deskripsi?: string | null;
    is_active: boolean;
  }): Promise<number> {
    const result = await query(
      `INSERT INTO roles (kode, nama, deskripsi, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING id::int`,
      [data.kode, data.nama, data.deskripsi ?? null, data.is_active]
    );
    return result.rows[0].id;
  }

  async update(
    id: number,
    data: Partial<{ nama: string; deskripsi: string | null; is_active: boolean }>
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

    values.push(id);

    await query(`UPDATE roles SET ${fields.join(', ')} WHERE id = $${i}`, values);
  }

  /** Hapus permanen — hanya untuk role yang tidak dipakai user */
  async delete(id: number): Promise<void> {
    await query(`DELETE FROM roles WHERE id = $1`, [id]);
  }
}
