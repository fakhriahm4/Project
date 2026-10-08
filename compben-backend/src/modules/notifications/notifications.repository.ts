import { query } from '@/config/database';

export interface NotificationRow {
  id: number;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Inbox notifikasi in-app (bell di AppHeader).
 * Baris dibuat oleh services/notification.service.ts (notify()).
 */
export class NotificationsRepository {
  /** Notifikasi user login — terbaru dulu + jumlah belum dibaca */
  async listForUser(userId: number, limit = 20) {
    const list = await query<NotificationRow>(
      `SELECT id::int, title, body, type, link, is_read, created_at::text
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    const unread = await query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM notifications
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return { items: list.rows, unread_count: unread.rows[0].count };
  }

  async markRead(userId: number, id: number): Promise<boolean> {
    const r = await query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2 AND is_read = FALSE`,
      [id, userId]
    );
    return (r.rowCount ?? 0) > 0;
  }

  async markAllRead(userId: number): Promise<number> {
    const r = await query(
      `UPDATE notifications SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );
    return r.rowCount ?? 0;
  }
}
