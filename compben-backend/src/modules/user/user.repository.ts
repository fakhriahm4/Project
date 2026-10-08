import { query } from '@/config/database';
import type { UserResponse } from './user.types';

export class UserRepository {
  // ============================================
  // FIND ALL dengan filter & pagination
  // ============================================
  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
    role_id?: number;
    divisi_id?: number;
    status?: string;
    sort_by: string;
    sort_order: string;
  }) {
    const { page, limit, search, role_id, divisi_id, status, sort_by, sort_order } = params;
    const offset = (page - 1) * limit;

    // Fase 0.6: TANPA hardcode is_active — daftar menampilkan semua user
    // (aktif & nonaktif), konsisten dgn Master Pegawai.
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        u.nama ILIKE $${paramIndex} OR
        u.employee_id ILIKE $${paramIndex} OR
        u.email ILIKE $${paramIndex} OR
        u.username ILIKE $${paramIndex}
      )`);
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (role_id) {
      conditions.push(`u.role_id = $${paramIndex}`);
      values.push(role_id);
      paramIndex++;
    }

    if (divisi_id) {
      conditions.push(`u.divisi_id = $${paramIndex}`);
      values.push(divisi_id);
      paramIndex++;
    }

    // Filter status memakai SEMANTIK yg sama dgn /employees: is_active
    // (terima 'ACTIVE'/'INACTIVE' maupun huruf kecil)
    if (status) {
      conditions.push(`u.is_active = $${paramIndex}`);
      values.push(status.toUpperCase() === 'ACTIVE');
      paramIndex++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Allowed sort columns (whitelist to prevent SQL injection)
    const allowedSort = ['nama', 'employee_id', 'email', 'created_at', 'tanggal_masuk'];
    const sortColumn = allowedSort.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Count total
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM users u ${whereClause}`,
      values
    );
    const total = countResult.rows[0].total;

    // Get data
    // Catatan ::int / ::text penting: BIGINT & DATE by default kembali
    // sebagai string dari driver pg → frontend butuh number & 'YYYY-MM-DD'.
    const dataResult = await query(
      `SELECT
        u.id::int,
        u.employee_id,
        u.username,
        u.nama,
        u.email,
        u.no_hp,
        u.divisi_id::int,
        d.nama AS divisi_nama,
        u.jabatan_id::int,
        j.nama AS jabatan_nama,
        u.grade_id::int,
        g.kode AS grade_kode,
        g.nama AS grade_nama,
        u.role_id::int,
        r.kode AS role_kode,
        r.nama AS role_nama,
        u.status,
        u.is_active::boolean AS is_active,
        u.tanggal_masuk::text AS tanggal_masuk,
        u.avatar_url,
        u.last_login,
        u.created_at,
        u.updated_at
       FROM users u
       LEFT JOIN divisi d ON u.divisi_id = d.id
       LEFT JOIN jabatan j ON u.jabatan_id = j.id
       LEFT JOIN grade g ON u.grade_id = g.id
       LEFT JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY u.${sortColumn} ${sortDir}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return {
      data: dataResult.rows as UserResponse[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================
  // FIND BY ID
  // ============================================
  async findById(id: number): Promise<UserResponse | null> {
    const result = await query(
      `SELECT
        u.id::int, u.employee_id, u.username, u.nama, u.email, u.no_hp,
        u.divisi_id::int, d.nama AS divisi_nama,
        u.jabatan_id::int, j.nama AS jabatan_nama,
        u.grade_id::int, g.nama AS grade_nama,
        u.role_id::int, r.kode AS role_kode, r.nama AS role_nama,
        u.status, u.tanggal_masuk::text AS tanggal_masuk, u.avatar_url, u.last_login,
        u.created_at, u.updated_at
       FROM users u
       LEFT JOIN divisi d ON u.divisi_id = d.id
       LEFT JOIN jabatan j ON u.jabatan_id = j.id
       LEFT JOIN grade g ON u.grade_id = g.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [id]
    );
    return result.rows[0] || null;
  }

  // ============================================
  // FIND BY USERNAME (untuk login)
  // ============================================
  async findByUsername(username: string) {
    const result = await query(
      `SELECT
        u.id::int, u.username, u.password_hash, u.nama, u.email,
        u.role_id::int, r.kode AS role_kode, r.nama AS role_nama,
        u.status, u.must_change_password,
        u.password_changed_at, u.failed_login_attempts::int, u.locked_until
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.username = $1 AND u.is_active = TRUE`,
      [username]
    );
    return result.rows[0] || null;
  }

  // ============================================
  // CHECK DUPLICATE
  // ============================================
  /**
   * Unique constraint (employee_id/email/username) berlaku untuk SEMUA baris,
   * termasuk soft-delete (is_active = FALSE) — jadi jangan filter is_active,
   * kalau tidak user nonaktif lolos pre-check lalu INSERT meledak 500.
   */
  async checkDuplicate(field: 'employee_id' | 'email' | 'username', value: string, excludeId?: number) {
    const sql = excludeId
      ? `SELECT id FROM users WHERE ${field} = $1 AND id != $2`
      : `SELECT id FROM users WHERE ${field} = $1`;
    const params = excludeId ? [value, excludeId] : [value];
    const result = await query(sql, params);
    return result.rows.length > 0;
  }

  // ============================================
  // CREATE
  // ============================================
  async create(data: {
    employee_id: string;
    username: string;
    nama: string;
    email: string;
    no_hp?: string | null;
    password_hash: string;
    divisi_id: number;
    jabatan_id: number;
    grade_id: number;
    role_id: number;
    status: string;
    tanggal_masuk: string;
    created_by: number;
    /** TRUE = user dipaksa ganti password saat login pertama (hasil import) */
    must_change_password?: boolean;
  }) {
    const result = await query(
      `INSERT INTO users (
        employee_id, username, nama, email, no_hp, password_hash,
        divisi_id, jabatan_id, grade_id, role_id,
        status, tanggal_masuk, created_by, must_change_password
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id::int`,
      [
        data.employee_id,
        data.username,
        data.nama,
        data.email,
        data.no_hp || null,
        data.password_hash,
        data.divisi_id,
        data.jabatan_id,
        data.grade_id,
        data.role_id,
        data.status,
        data.tanggal_masuk,
        data.created_by,
        data.must_change_password ?? false,
      ]
    );
    return result.rows[0].id;
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: number, data: Partial<{
    employee_id: string;
    username: string;
    nama: string;
    email: string;
    no_hp: string | null;
    password_hash: string;
    divisi_id: number;
    jabatan_id: number;
    grade_id: number;
    role_id: number;
    status: string;
    tanggal_masuk: string;
  }>) {
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
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i}`,
      values
    );
  }

  // ============================================
  // SOFT DELETE
  // ============================================
  async softDelete(id: number) {
    await query(
      `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  // ============================================
  // UPDATE LAST LOGIN
  // ============================================
  async updateLastLogin(id: number) {
    await query(`UPDATE users SET last_login = NOW() WHERE id = $1`, [id]);
  }

  // ============================================
  // STATS
  // ============================================
  async getStats() {
    const result = await query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active,
         COUNT(*) FILTER (WHERE is_active = FALSE)::int AS inactive,
         COUNT(DISTINCT role_id)::int AS total_roles
       FROM users`
    );
    return result.rows[0];
  }
}