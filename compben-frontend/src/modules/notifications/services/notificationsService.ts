import api from '@/services/api';

/** Baris notifikasi in-app (tabel notifications) */
export interface NotificationItem {
  id: number;
  title: string;
  body: string | null;
  type: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Inbox notifikasi in-app — selalu milik user login.
 * Interceptor api sudah unwrap body { success, data }.
 */
export const notificationsService = {
  async list(): Promise<{
    data: { items: NotificationItem[]; unread_count: number };
  }> {
    const res = await api.get('/notifications');
    return res as unknown as {
      data: { items: NotificationItem[]; unread_count: number };
    };
  },

  async markRead(id: number): Promise<{ data: { updated: boolean } }> {
    const res = await api.patch(`/notifications/${id}/read`);
    return res as unknown as { data: { updated: boolean } };
  },

  async markAllRead(): Promise<{ data: { count: number } }> {
    const res = await api.patch('/notifications/read-all');
    return res as unknown as { data: { count: number } };
  },
};

export default notificationsService;
