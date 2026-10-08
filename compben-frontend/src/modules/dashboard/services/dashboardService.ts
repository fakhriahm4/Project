import api from '@/services/api';

export interface DashboardStats {
  total: number;
  active: number;
  inactive: number;
  total_roles: number;
  new_this_month: number;
  never_logged_in: number;
  logins_today: number;
}

export interface RoleDistributionItem {
  id: number;
  kode: string;
  nama: string;
  total: number;
}

export interface RecentUser {
  id: number;
  employee_id: string;
  username: string;
  nama: string;
  email: string;
  role_id: number;
  role_kode: string;
  role_nama: string;
  status: 'ACTIVE' | 'INACTIVE';
  /** Sumber badge: TRUE = aktif (soft delete → FALSE) */
  is_active: boolean;
  divisi_nama: string | null;
  created_at: string;
}

export interface RecentActivity {
  id: number;
  action: string;
  table_name: string | null;
  record_id: number | null;
  ip_address: string | null;
  created_at: string;
  user_name: string | null;
  username: string | null;
}

export interface MonthlySignup {
  month: string; // "YYYY-MM"
  total: number;
}

export interface DailyVisit {
  day: string; // "YYYY-MM-DD"
  total: number; // jumlah login (pengunjung) di tanggal itu
}

export interface TopVisitor {
  id: number;
  nama: string;
  username: string;
  role_nama: string | null;
  visits: number; // jumlah login 30 hari terakhir
  last_visit: string;
}

export interface DashboardSummary {
  stats: DashboardStats;
  role_distribution: RoleDistributionItem[];
  recent_users: RecentUser[];
  recent_activities: RecentActivity[];
  monthly_signups: MonthlySignup[];
  daily_visits: DailyVisit[];
  top_visitors: TopVisitor[];
}

/**
 * Catatan: interceptor response di services/api.ts sudah mengembalikan
 * `response.data` (unwrapping Axios), sehingga `res` di bawah adalah body
 * envelope `{ success, data }` → ambil `.data` utk isi ringkasannya.
 */
export const dashboardService = {
  /** GET /dashboard/summary — khusus SUPER_ADMIN */
  async summary(): Promise<DashboardSummary> {
    const res = await api.get('/dashboard/summary');
    return res.data as DashboardSummary;
  },
};

export default dashboardService;
