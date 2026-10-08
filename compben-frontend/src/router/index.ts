import ModulePlaceholderPage from '@/components/ModulePlaceholderPage.vue';
import { useAppSettingsStore } from '@/stores/appSettings';
import { useAuthStore } from '@/stores/auth';
import { createRouter, createWebHistory } from 'vue-router';

/** Route placeholder utk modul yang belum dibangun — judul dari meta.title */
function placeholder(title: string) {
  return {
    component: ModulePlaceholderPage,
    meta: { title, roles: ['SUPER_ADMIN'] },
  };
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/modules/auth/pages/LoginPage.vue'),
    meta: { public: true, title: 'Login' },
  },
  {
    path: '/',
    component: () => import('@/layouts/DefaultLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/modules/dashboard/pages/DashboardPage.vue'),
        meta: { title: 'Dashboard' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/modules/user/pages/UserListPage.vue'),
        meta: { title: 'Manajemen User', roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'users/create',
        name: 'UserCreate',
        component: () => import('@/modules/user/pages/UserCreatePage.vue'),
        meta: { title: 'Tambah User', roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'users/import',
        name: 'UserImport',
        component: () => import('@/modules/user/pages/UserImportPage.vue'),
        meta: { title: 'Import User', roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'users/status',
        name: 'UserStatus',
        component: () => import('@/modules/user/pages/StatusUserPage.vue'),
        meta: { title: 'Status User', roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'users/:id/edit',
        name: 'UserEdit',
        component: () => import('@/modules/user/pages/UserEditPage.vue'),
        meta: { title: 'Edit User', roles: ['SUPER_ADMIN'] },
      },

      // ── Organization ──
      {
        path: 'organization/divisi',
        name: 'OrgDivisi',
        component: () => import('@/modules/organization/pages/DivisiPage.vue'),
        meta: { title: 'Divisi / Departemen', roles: ['SUPER_ADMIN', 'ADMIN_CNB'] },
      },
      {
        path: 'organization/jabatan',
        name: 'OrgJabatan',
        component: () => import('@/modules/organization/pages/JabatanPage.vue'),
        meta: { title: 'Jabatan', roles: ['SUPER_ADMIN', 'ADMIN_CNB'] },
      },
      { path: 'organization/structure', name: 'OrgStruktur', ...placeholder('Struktur Organisasi') },
      {
        path: 'master/grade',
        name: 'MasterGrade',
        component: () => import('@/modules/organization/pages/GradePage.vue'),
        meta: { title: 'Grade & Level', roles: ['SUPER_ADMIN', 'ADMIN_CNB'] },
      },

      // ── System Configuration ──
      { path: 'settings/account', name: 'AccountSettings', component: () => import('@/modules/settings/pages/AccountSettingsPage.vue'), meta: { title: 'Pengaturan Akun' } },
      { path: 'settings/general', name: 'SettingGeneral', component: () => import('@/modules/settings/pages/GeneralSettingsPage.vue'), meta: { title: 'General Settings', roles: ['SUPER_ADMIN'] } },
      { path: 'settings/payroll', name: 'SettingPayroll', ...placeholder('Payroll Configuration') },
      { path: 'settings/attendance', name: 'SettingAttendance', ...placeholder('Attendance Configuration') },
      { path: 'settings/approval', name: 'SettingApproval', component: () => import('@/modules/settings/pages/ApprovalSettingsPage.vue'), meta: { title: 'Approval Workflow', roles: ['SUPER_ADMIN'] } },
      { path: 'settings/notification', name: 'SettingNotification', component: () => import('@/modules/settings/pages/NotificationSettingsPage.vue'), meta: { title: 'Notification', roles: ['SUPER_ADMIN'] } },
      { path: 'settings/integration', name: 'SettingIntegration', component: () => import('@/modules/settings/pages/IntegrationSettingsPage.vue'), meta: { title: 'Integration', roles: ['SUPER_ADMIN'] } },

      // ── Security ──
      { path: 'security/access-control', name: 'SecurityAccess', ...placeholder('Access Control') },
      { path: 'security/login', name: 'SecurityLogin', ...placeholder('Login Security') },
      { path: 'security/sessions', name: 'SecuritySessions', ...placeholder('Session Management') },

      // ── Master Data ──
      {
        path: 'master/compensation',
        name: 'MasterCompensation',
        component: () => import('@/modules/cb/pages/CompensationStructurePage.vue'),
        meta: { title: 'Struktur Compensation', roles: ['ADMIN_CNB'] },
      },
      { path: 'master/benefit', name: 'MasterBenefit', ...placeholder('Master Benefit') },
      {
        path: 'master/deduction',
        name: 'MasterDeduction',
        component: () => import('@/modules/cb/pages/DeductionPage.vue'),
        meta: { title: 'Master Deduction', roles: ['ADMIN_CNB'] },
      },
      { path: 'master/bank', name: 'MasterBank', ...placeholder('Master Bank') },

      // ── Master Data C&B (laman Admin C&B — Fase 0) ──
      {
        path: 'master/payroll-components',
        name: 'PayrollComponents',
        component: () => import('@/modules/cb/pages/PayrollComponentPage.vue'),
        meta: { title: 'Komponen Payroll', roles: ['ADMIN_CNB'] },
      },
      {
        path: 'master/bpjs',
        name: 'MasterBpjs',
        component: () => import('@/modules/cb/pages/BpjsPage.vue'),
        meta: { title: 'Master BPJS', roles: ['ADMIN_CNB'] },
      },
      {
        path: 'master/tax',
        name: 'MasterTax',
        component: () => import('@/modules/cb/pages/TaxPage.vue'),
        meta: { title: 'Pajak (PPh 21 TER)', roles: ['ADMIN_CNB'] },
      },
      {
        path: 'settings/cb-parameter',
        name: 'CbParameter',
        component: () => import('@/modules/cb/pages/CbParameterPage.vue'),
        meta: { title: 'Parameter C&B', roles: ['ADMIN_CNB'] },
      },

      // ── Payroll (Fase 1 — laman Admin C&B) ──
      {
        path: 'payroll/periods',
        name: 'PayrollPeriods',
        component: () => import('@/modules/payroll/pages/PayrollPeriodPage.vue'),
        meta: { title: 'Periode Payroll', roles: ['ADMIN_CNB'] },
      },
      {
        path: 'payroll/attendance',
        name: 'PayrollAttendance',
        component: () => import('@/modules/payroll/pages/AttendancePage.vue'),
        meta: { title: 'Absensi', roles: ['ADMIN_CNB'] },
      },

      // ── Data Management ──
      { path: 'data/import', name: 'DataImport', ...placeholder('Import Data') },
      { path: 'data/export', name: 'DataExport', ...placeholder('Export Data') },
      { path: 'data/validation', name: 'DataValidation', ...placeholder('Data Validation') },
      { path: 'data/backup', name: 'DataBackup', ...placeholder('Backup / Restore') },

      // ── Reports ──
      { path: 'reports/user-activity', name: 'ReportUserActivity', ...placeholder('User Activity') },
      { path: 'reports/system-activity', name: 'ReportSystemActivity', ...placeholder('System Activity') },
      { path: 'reports/payroll-summary', name: 'ReportPayrollSummary', ...placeholder('Payroll Summary') },
      { path: 'reports/audit-report', name: 'ReportAudit', ...placeholder('Audit Report') },

      // ── System Maintenance ──
      { path: 'maintenance/status', name: 'MaintenanceStatus', ...placeholder('System Status') },
      { path: 'maintenance/error-log', name: 'MaintenanceErrorLog', ...placeholder('Error Log') },
      { path: 'maintenance/backup', name: 'MaintenanceBackup', ...placeholder('Backup') },
      { path: 'maintenance/mode', name: 'MaintenanceMode', ...placeholder('Maintenance Mode') },

      {
        path: 'roles',
        name: 'Roles',
        component: () => import('@/modules/role/pages/RoleListPage.vue'),
        meta: { title: 'Role & Permission', roles: ['SUPER_ADMIN'] },
      },
      {
        path: 'master/company',
        name: 'Company',
        component: () => import('@/modules/company/pages/CompanyListPage.vue'),
        meta: { title: 'Master Perusahaan' },
      },
      {
        path: 'master/employee',
        name: 'Employee',
        component: () => import('@/modules/employee/pages/EmployeeListPage.vue'),
        meta: {
          title: 'Master Pegawai',
          // Baca: Super Admin / Admin C&B / HR; tulis: Admin C&B (di backend)
          roles: ['SUPER_ADMIN', 'ADMIN_CNB', 'HR_ADMIN', 'HR'],
        },
      },
      {
        path: 'audit',
        name: 'Audit',
        component: () => import('@/modules/audit/pages/AuditLogPage.vue'),
        meta: { title: 'Audit Log' },
      },
      {
        path: 'approval/pending',
        name: 'ApprovalPending',
        component: () => import('@/modules/approval/pages/ApprovalListPage.vue'),
        meta: { title: 'Pending Approval', roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
      },
      {
        path: 'approval/history',
        name: 'ApprovalHistory',
        component: () => import('@/modules/approval/pages/ApprovalListPage.vue'),
        meta: { title: 'Approval History', roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
      },
      {
        path: 'reimbursement',
        name: 'Reimbursement',
        component: () => import('@/modules/audit/pages/AuditLogPage.vue'),
        meta: { title: 'Reimbursement' },
      },
      {
        path: 'benefit',
        name: 'Benefit',
        component: () => import('@/modules/audit/pages/AuditLogPage.vue'),
        meta: { title: 'Benefit' },
      },
      {
        path: 'payment',
        name: 'Payment',
        component: () => import('@/modules/audit/pages/AuditLogPage.vue'),
        meta: { title: 'Payment' },
      },
      {
        path: 'report',
        name: 'Report',
        component: () => import('@/modules/audit/pages/AuditLogPage.vue'),
        meta: { title: 'Report' },
      },
      {
        path: 'my-payslip',
        name: 'MyPayslip',
        component: () => import('@/modules/audit/pages/AuditLogPage.vue'),
        meta: { title: 'Payslip Saya' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/modules/profile/pages/ProfilePage.vue'),
        meta: { title: 'Profil Saya' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/dashboard',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore();
  const appSettings = useAppSettingsStore();

  document.title = to.meta.title
    ? `${to.meta.title} - ${appSettings.companyName}`
    : appSettings.companyName;

  if (to.meta.public) return next();
  if (!auth.isAuthenticated) return next('/login');

  // Wajib ganti password (hasil import): hanya boleh ke Pengaturan Akun
  if (auth.user?.mustChangePassword && to.path !== '/settings/account') {
    return next('/settings/account');
  }

  // Guard role: route dengan meta.roles hanya boleh diakses role tsb.
  const allowedRoles = to.meta.roles as string[] | undefined;
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(auth.userRole)) {
      return next('/dashboard');
    }
  }

  next();
});

export default router;