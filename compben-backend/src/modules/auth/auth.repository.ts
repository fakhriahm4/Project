import { query } from '@/config/database';

/**
 * Repository khusus modul auth.
 * (UserRepository menyediakan findByUsername untuk login;
 *  di sini query profil /me, update data diri, password & preferensi.)
 */
export class AuthRepository {
  // Profil utk GET /auth/me — selalu data terbaru dari DB,
  // termasuk data diri (user_profiles) & preferensi akun.
  async findProfileById(id: number) {
    const result = await query(
      `SELECT
         u.id::int, u.employee_id, u.username, u.nama, u.email, u.status,
         u.must_change_password,
         u.no_hp, u.tanggal_masuk::text AS tanggal_masuk,
         u.role_id::int, r.kode AS role_kode, r.nama AS role_nama,
         u.divisi_id::int, d.nama AS divisi_nama,
         u.jabatan_id::int, j.nama AS jabatan_nama,
         u.grade_id::int, g.kode AS grade_kode, g.nama AS grade_nama,
         u.avatar_url, u.last_login,
         u.preferences,
         p.nik, p.jenis_kelamin, p.tempat_lahir, p.tanggal_lahir::text AS tanggal_lahir,
         p.alamat, p.agama, p.status_kawin,
         p.kontak_darurat_nama, p.kontak_darurat_hubungan, p.kontak_darurat_hp,
         p.npwp, p.nama_bank, p.no_rekening, p.pendidikan_terakhir
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN divisi d ON u.divisi_id = d.id
       LEFT JOIN jabatan j ON u.jabatan_id = j.id
       LEFT JOIN grade g ON u.grade_id = g.id
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [id]
    );
    return result.rows[0] || null;
  }

  // UPSERT data diri (user_profiles) — employee hanya boleh ubah miliknya sendiri
  async upsertProfile(userId: number, data: Record<string, any>) {
    const keys = Object.keys(data);
    if (keys.length === 0) return;

    const cols = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 2}`).join(', ');
    const updates = keys
      .filter((k) => k !== 'user_id')
      .map((k, i) => `"${k}" = EXCLUDED."${k}"`)
      .join(', ');

    await query(
      `INSERT INTO user_profiles (user_id, ${cols})
       VALUES ($1, ${placeholders})
       ON CONFLICT (user_id) DO UPDATE SET ${updates}, updated_at = NOW()`,
      [userId, ...keys.map((k) => data[k])]
    );
  }

  // Hash password saat ini (utk verifikasi password lama)
  async findPasswordHash(id: number): Promise<string | null> {
    const result = await query(
      `SELECT password_hash FROM users WHERE id = $1 AND is_active = TRUE`,
      [id]
    );
    return result.rows[0]?.password_hash ?? null;
  }

  async updatePassword(id: number, passwordHash: string) {
    // must_change_password di-reset FALSE + password_changed_at diperbarui
    // di sini — inilah "penyelesaian" wajib ganti & awal umur password baru
    await query(
      `UPDATE users
         SET password_hash = $1,
             must_change_password = FALSE,
             password_changed_at = NOW(),
             failed_login_attempts = 0,
             locked_until = NULL,
             updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, id]
    );
  }

  // ============================================
  // LOCKOUT (kebijakan password — settings.general)
  // ============================================
  /** Tambah hitungan percobaan login gagal */
  async incrementFailedLogin(id: number, attempts: number) {
    await query(
      `UPDATE users SET failed_login_attempts = $1, updated_at = NOW() WHERE id = $2`,
      [attempts, id]
    );
  }

  /** Kunci akun sampai locked_until (menit dari settings) */
  async lockAccount(id: number, attempts: number, lockoutMinutes: number) {
    await query(
      `UPDATE users
         SET failed_login_attempts = $1,
             locked_until = NOW() + (($2::text || ' minutes')::interval),
             updated_at = NOW()
       WHERE id = $3`,
      [attempts, lockoutMinutes, id]
    );
  }

  /** Login sukses — lepas kunci & hitungan gagal */
  async resetFailedLogin(id: number) {
    await query(
      `UPDATE users
         SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  /** Password terdeteksi kedaluwarsa → wajib ganti saat login */
  async markMustChangePassword(id: number) {
    await query(
      `UPDATE users SET must_change_password = TRUE WHERE id = $1 AND must_change_password = FALSE`,
      [id]
    );
  }

  async updatePreferences(id: number, preferences: Record<string, any>) {
    await query(
      `UPDATE users SET preferences = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(preferences), id]
    );
  }
}
