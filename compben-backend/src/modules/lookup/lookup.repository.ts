import { query } from '@/config/database';

/**
 * Data referensi (lookup) untuk dropdown form.
 * Semua hanya mengembalikan record aktif (is_active = TRUE).
 */
export class LookupRepository {
  async getDivisi() {
    const result = await query(
      `SELECT id::int, kode, nama FROM divisi WHERE is_active = TRUE ORDER BY nama ASC`
    );
    return result.rows;
  }

  async getJabatan() {
    const result = await query(
      `SELECT id::int, kode, nama FROM jabatan WHERE is_active = TRUE ORDER BY nama ASC`
    );
    return result.rows;
  }

  async getGrade() {
    const result = await query(
      `SELECT id::int, kode, nama, level FROM grade WHERE is_active = TRUE ORDER BY level ASC, nama ASC`
    );
    return result.rows;
  }

  async getRoles() {
    const result = await query(
      `SELECT id::int, kode, nama FROM roles WHERE is_active = TRUE ORDER BY id ASC`
    );
    return result.rows;
  }

  /** Semua lookup sekaligus — satu request utk form */
  async getAll() {
    const [divisi, jabatan, grade, roles] = await Promise.all([
      this.getDivisi(),
      this.getJabatan(),
      this.getGrade(),
      this.getRoles(),
    ]);
    return { divisi, jabatan, grade, roles };
  }
}
