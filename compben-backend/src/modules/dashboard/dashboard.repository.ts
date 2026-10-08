import { query } from '@/config/database';
import { UserRepository } from '../user/user.repository';

const userRepository = new UserRepository();

/**
 * Repository ringkasan dashboard (Super Admin).
 * Semua angka di-cast ::int agar aman dari BIGINT (string) driver pg.
 */
export class DashboardRepository {
  /** Statistik user + aktivitas login hari ini (Fase 0.6: semua user, is_active) */
  async getStats() {
    const [userStats, loginStats] = await Promise.all([
      query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE is_active = TRUE)::int AS active,
           COUNT(*) FILTER (WHERE is_active = FALSE)::int AS inactive,
           COUNT(DISTINCT role_id)::int AS total_roles,
           COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::int AS new_this_month,
           COUNT(*) FILTER (WHERE last_login IS NULL)::int AS never_logged_in
         FROM users`
      ),
      query(
        `SELECT COUNT(*)::int AS logins_today
         FROM audit_logs
         WHERE action = 'LOGIN' AND created_at::date = CURRENT_DATE`
      ),
    ]);

    return {
      ...userStats.rows[0],
      logins_today: loginStats.rows[0].logins_today,
    };
  }

  /** Jumlah user per role — inti tampilan "akses pengguna" (semua user) */
  async getRoleDistribution() {
    const result = await query(
      `SELECT
         r.id::int,
         r.kode,
         r.nama,
         COUNT(u.id)::int AS total
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.id
       WHERE r.is_active = TRUE
       GROUP BY r.id, r.kode, r.nama
       ORDER BY r.id ASC`
    );
    return result.rows;
  }

  /** 5 user terbaru (reuse query findAll agar join divisi/jabatan/role konsisten) */
  async getRecentUsers(limit = 5) {
    const result = await userRepository.findAll({
      page: 1,
      limit,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    return result.data;
  }

  /** 8 aktivitas audit terakhir + nama pelaku */
  async getRecentActivities(limit = 8) {
    const result = await query(
      `SELECT
         a.id::int,
         a.action,
         a.table_name,
         a.record_id::int,
         a.ip_address,
         a.created_at,
         u.nama AS user_name,
         u.username
       FROM audit_logs a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /** User baru per bulan — 6 bulan terakhir (bulan kosong diisi 0; semua user) */
  async getMonthlySignups(months = 6) {
    const result = await query(
      `SELECT
         to_char(d, 'YYYY-MM') AS month,
         COUNT(u.id)::int AS total
       FROM generate_series(
         date_trunc('month', NOW()) - ($1 || ' months')::interval,
         date_trunc('month', NOW()),
         interval '1 month'
       ) d
       LEFT JOIN users u
         ON date_trunc('month', u.created_at) = d
       GROUP BY d
       ORDER BY d ASC`,
      [months - 1]
    );
    return result.rows;
  }

  /**
   * Pengunjung situs per hari — N hari terakhir, dari audit LOGIN
   * (hari kosong diisi 0; total = jumlah login di tanggal itu).
   */
  async getDailyVisits(days = 30) {
    const result = await query(
      `SELECT
         to_char(d, 'YYYY-MM-DD') AS day,
         COALESCE(v.total, 0)::int AS total
       FROM generate_series(
         date_trunc('day', NOW()) - (($1 - 1)::text || ' days')::interval,
         date_trunc('day', NOW()),
         interval '1 day'
       ) d
       LEFT JOIN (
         SELECT date_trunc('day', created_at) AS day, COUNT(*)::int AS total
         FROM audit_logs
         WHERE action = 'LOGIN'
           AND created_at >= date_trunc('day', NOW()) - (($1 - 1)::text || ' days')::interval
         GROUP BY 1
       ) v ON v.day = d
       ORDER BY d ASC`,
      [days]
    );
    return result.rows;
  }

  /** Top pengunjung situs — user paling sering login dalam N hari terakhir */
  async getTopVisitors(limit = 10, days = 30) {
    const result = await query(
      `SELECT
         u.id::int,
         u.nama,
         u.username,
         r.nama AS role_nama,
         COUNT(a.id)::int AS visits,
         MAX(a.created_at) AS last_visit
       FROM audit_logs a
       JOIN users u ON a.user_id = u.id
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE a.action = 'LOGIN'
         AND a.created_at >= date_trunc('day', NOW()) - (($1 - 1)::text || ' days')::interval
       GROUP BY u.id, u.nama, u.username, r.nama
       ORDER BY visits DESC, u.nama ASC
       LIMIT $2`,
      [days, limit]
    );
    return result.rows;
  }

  /** Gabungkan semua untuk 1 request */
  async getSummary() {
    const [stats, role_distribution, recent_users, recent_activities, monthly_signups, daily_visits, top_visitors] =
      await Promise.all([
        this.getStats(),
        this.getRoleDistribution(),
        this.getRecentUsers(),
        this.getRecentActivities(),
        this.getMonthlySignups(),
        this.getDailyVisits(),
        this.getTopVisitors(),
      ]);

    return {
      stats,
      role_distribution,
      recent_users,
      recent_activities,
      monthly_signups,
      daily_visits,
      top_visitors,
    };
  }
}
