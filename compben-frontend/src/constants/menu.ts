import type { RoleCode } from '@/types/auth';

/**
 * Konfigurasi sidebar — SUMBER TUNGGAL.
 *
 * Dipakai oleh:
 * - AppSidebar.vue  → render menu per role
 * - RoleListPage    → matriks permission (role × menu, read-only)
 *
 * Divisi & Departemen digabung jadi satu item "Divisi / Departemen"
 * karena ada entitas yang hanya divisi, ada pula yang hanya departemen.
 */
export interface MenuNode {
  id: string;
  label: string;
  icon: string;
  path?: string;
  children?: MenuNode[];
  roles: RoleCode[]; // Role yang boleh akses
}

/** Menu bersama untuk semua role selain Super Admin */
export const allMenus: MenuNode[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    path: '/dashboard',
    roles: ['SUPER_ADMIN', 'ADMIN_CNB', 'HR_ADMIN', 'HR', 'EMPLOYEE'],
  },
  {
    id: 'master',
    label: 'Master Data',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    roles: ['SUPER_ADMIN', 'HR'],
    children: [
      { id: 'company', label: 'Perusahaan', icon: '', path: '/master/company', roles: ['SUPER_ADMIN', 'HR'] },
      { id: 'employee', label: 'Karyawan', icon: '', path: '/master/employee', roles: ['SUPER_ADMIN', 'HR'] },
    ],
  },
  // ── Master C&B — khusus laman Admin C&B (spesifikasi §3) ──
  {
    id: 'master-cb',
    label: 'Master Data C&B',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 9v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    roles: ['ADMIN_CNB'],
    children: [
      { id: 'cb-employee', label: 'Pegawai', icon: '', path: '/master/employee', roles: ['ADMIN_CNB'] },
      // Referensi organisasi — satu sumber dgn laman Super Admin; di sini
      // baca-saja (tulis tetap Super Admin di backend), kecuali Grade.
      { id: 'cb-company', label: 'Perusahaan', icon: '', path: '/master/company', roles: ['ADMIN_CNB'] },
      { id: 'cb-divisi', label: 'Divisi / Departemen', icon: '', path: '/organization/divisi', roles: ['ADMIN_CNB'] },
      { id: 'cb-jabatan', label: 'Jabatan', icon: '', path: '/organization/jabatan', roles: ['ADMIN_CNB'] },
      { id: 'cb-grade', label: 'Grade & Level', icon: '', path: '/master/grade', roles: ['ADMIN_CNB'] },
      { id: 'cb-components', label: 'Komponen Payroll', icon: '', path: '/master/payroll-components', roles: ['ADMIN_CNB'] },
      { id: 'cb-structure', label: 'Struktur Compensation', icon: '', path: '/master/compensation', roles: ['ADMIN_CNB'] },
      { id: 'cb-bpjs', label: 'BPJS', icon: '', path: '/master/bpjs', roles: ['ADMIN_CNB'] },
      { id: 'cb-deduction', label: 'Deduction', icon: '', path: '/master/deduction', roles: ['ADMIN_CNB'] },
      { id: 'cb-tax', label: 'Pajak', icon: '', path: '/master/tax', roles: ['ADMIN_CNB'] },
      { id: 'cb-parameter', label: 'Parameter C&B', icon: '', path: '/settings/cb-parameter', roles: ['ADMIN_CNB'] },
    ],
  },
  // ── Payroll — siklus gaji Admin C&B (Fase 1: periode + absensi;
  //    Overtime / Payroll / Reimbursement / Output menyusul per fase) ──
  {
    id: 'payroll-cb',
    label: 'Payroll',
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    roles: ['ADMIN_CNB'],
    children: [
      { id: 'cb-period', label: 'Periode Payroll', icon: '', path: '/payroll/periods', roles: ['ADMIN_CNB'] },
      { id: 'cb-attendance', label: 'Absensi', icon: '', path: '/payroll/attendance', roles: ['ADMIN_CNB'] },
    ],
  },
  {
    id: 'approval',
    label: 'Approval',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    roles: ['SUPER_ADMIN', 'HR_ADMIN'],
    children: [
      { id: 'pending', label: 'Pending', icon: '', path: '/approval/pending', roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
      { id: 'history', label: 'History', icon: '', path: '/approval/history', roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
    ],
  },
  {
    id: 'reimbursement',
    label: 'Reimbursement',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    path: '/reimbursement',
    roles: ['SUPER_ADMIN', 'ADMIN_CNB', 'HR_ADMIN', 'EMPLOYEE'],
  },
  {
    id: 'benefit',
    label: 'Benefit',
    icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7',
    path: '/benefit',
    roles: ['SUPER_ADMIN', 'ADMIN_CNB', 'EMPLOYEE'],
  },
  {
    id: 'payment',
    label: 'Payment',
    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    path: '/payment',
    roles: ['SUPER_ADMIN', 'ADMIN_CNB'],
  },
  {
    id: 'report',
    label: 'Report',
    icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    path: '/report',
    roles: ['SUPER_ADMIN', 'ADMIN_CNB', 'HR_ADMIN', 'HR'],
  },
  {
    id: 'payslip',
    label: 'Payslip Saya',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    path: '/my-payslip',
    roles: ['EMPLOYEE'],
  },
  {
    id: 'profile',
    label: 'Profil Saya',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    path: '/profile',
    roles: ['SUPER_ADMIN', 'ADMIN_CNB', 'HR_ADMIN', 'HR', 'EMPLOYEE'],
  },
  {
    id: 'audit',
    label: 'Audit Log',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    path: '/audit',
    roles: ['SUPER_ADMIN', 'ADMIN_CNB', 'HR_ADMIN', 'HR'],
  },
];

/**
 * Menu khusus Super Admin — struktur mandiri sesuai fungsinya
 * (akses pengguna, organisasi, keamanan, konfigurasi sistem).
 * Terpisah dari allMenus agar menu role lain tidak terpengaruh.
 */
export const superAdminMenus: MenuNode[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    path: '/dashboard',
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    roles: ['SUPER_ADMIN'],
    children: [
      { id: 'users', label: 'Daftar User', icon: '', path: '/users', roles: ['SUPER_ADMIN'] },
      { id: 'user-create', label: 'Tambah User', icon: '', path: '/users/create', roles: ['SUPER_ADMIN'] },
      { id: 'user-import', label: 'Import User (Excel)', icon: '', path: '/users/import', roles: ['SUPER_ADMIN'] },
      { id: 'roles-permission', label: 'Role & Permission', icon: '', path: '/roles', roles: ['SUPER_ADMIN'] },
      { id: 'user-status', label: 'Status User', icon: '', path: '/users/status', roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    roles: ['SUPER_ADMIN'],
    children: [
      { id: 'org-company', label: 'Perusahaan', icon: '', path: '/master/company', roles: ['SUPER_ADMIN'] },
      { id: 'org-divisi', label: 'Divisi / Departemen', icon: '', path: '/organization/divisi', roles: ['SUPER_ADMIN'] },
      { id: 'org-jabatan', label: 'Jabatan', icon: '', path: '/organization/jabatan', roles: ['SUPER_ADMIN'] },
      { id: 'org-grade', label: 'Grade & Level', icon: '', path: '/master/grade', roles: ['SUPER_ADMIN'] },
      { id: 'org-structure', label: 'Struktur Organisasi', icon: '', path: '/organization/structure', roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    id: 'settings',
    label: 'System Configuration',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
    roles: ['SUPER_ADMIN'],
    children: [
      { id: 'set-general', label: 'General Settings', icon: '', path: '/settings/general', roles: ['SUPER_ADMIN'] },
      { id: 'set-payroll', label: 'Payroll Configuration', icon: '', path: '/settings/payroll', roles: ['SUPER_ADMIN'] },
      { id: 'set-attendance', label: 'Attendance Configuration', icon: '', path: '/settings/attendance', roles: ['SUPER_ADMIN'] },
      { id: 'set-approval', label: 'Approval Workflow', icon: '', path: '/settings/approval', roles: ['SUPER_ADMIN'] },
      { id: 'set-notification', label: 'Notification', icon: '', path: '/settings/notification', roles: ['SUPER_ADMIN'] },
      { id: 'set-integration', label: 'Integration', icon: '', path: '/settings/integration', roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    roles: ['SUPER_ADMIN'],
    children: [
      { id: 'sec-access', label: 'Access Control', icon: '', path: '/security/access-control', roles: ['SUPER_ADMIN'] },
      { id: 'sec-login', label: 'Login Security', icon: '', path: '/security/login', roles: ['SUPER_ADMIN'] },
      { id: 'sec-sessions', label: 'Session Management', icon: '', path: '/security/sessions', roles: ['SUPER_ADMIN'] },
      { id: 'sec-audit', label: 'Audit Log', icon: '', path: '/audit', roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    id: 'master-data',
    label: 'Master Data',
    icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4',
    roles: ['SUPER_ADMIN'],
    children: [
      { id: 'md-employee', label: 'Master Employee', icon: '', path: '/master/employee', roles: ['SUPER_ADMIN'] },
      { id: 'md-benefit', label: 'Master Benefit', icon: '', path: '/master/benefit', roles: ['SUPER_ADMIN'] },
      { id: 'md-bank', label: 'Master Bank', icon: '', path: '/master/bank', roles: ['SUPER_ADMIN'] },
      // Catatan: Master Compensation & Master Deduction pindah ke laman
      // "Master Data C&B" (role ADMIN_CNB) — spesifikasi payroll.
    ],
  },
  {
    id: 'data-management',
    label: 'Data Management',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
    roles: ['SUPER_ADMIN'],
    children: [
      { id: 'dm-import', label: 'Import Data', icon: '', path: '/data/import', roles: ['SUPER_ADMIN'] },
      { id: 'dm-export', label: 'Export Data', icon: '', path: '/data/export', roles: ['SUPER_ADMIN'] },
      { id: 'dm-validation', label: 'Data Validation', icon: '', path: '/data/validation', roles: ['SUPER_ADMIN'] },
      { id: 'dm-backup', label: 'Backup / Restore', icon: '', path: '/data/backup', roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    roles: ['SUPER_ADMIN'],
    children: [
      { id: 'rep-user-activity', label: 'User Activity', icon: '', path: '/reports/user-activity', roles: ['SUPER_ADMIN'] },
      { id: 'rep-system-activity', label: 'System Activity', icon: '', path: '/reports/system-activity', roles: ['SUPER_ADMIN'] },
      { id: 'rep-payroll-summary', label: 'Payroll Summary', icon: '', path: '/reports/payroll-summary', roles: ['SUPER_ADMIN'] },
      { id: 'rep-audit', label: 'Audit Report', icon: '', path: '/reports/audit-report', roles: ['SUPER_ADMIN'] },
    ],
  },
  {
    id: 'maintenance',
    label: 'System Maintenance',
    icon: 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z',
    roles: ['SUPER_ADMIN'],
    children: [
      { id: 'mnt-status', label: 'System Status', icon: '', path: '/maintenance/status', roles: ['SUPER_ADMIN'] },
      { id: 'mnt-error-log', label: 'Error Log', icon: '', path: '/maintenance/error-log', roles: ['SUPER_ADMIN'] },
      { id: 'mnt-backup', label: 'Backup', icon: '', path: '/maintenance/backup', roles: ['SUPER_ADMIN'] },
      { id: 'mnt-mode', label: 'Maintenance Mode', icon: '', path: '/maintenance/mode', roles: ['SUPER_ADMIN'] },
    ],
  },
];

/** Sumber menu untuk sebuah role (Super Admin punya struktur sendiri) */
export function menusForRole(role: RoleCode): MenuNode[] {
  return role === 'SUPER_ADMIN' ? superAdminMenus : allMenus;
}

/** Apakah sebuah path bisa diakses oleh role tertentu? */
export function canAccessPath(role: RoleCode, path: string): boolean {
  return menusForRole(role).some(
    (g) => g.path === path || g.children?.some((c) => c.path === path)
  );
}
