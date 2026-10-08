/** General Settings — 4 blok konfigurasi sistem */
export interface GeneralSettings {
  // Identitas aplikasi
  app_name: string;
  app_short_name: string;
  company_name: string;
  system_email: string;
  company_address: string;
  // Preferensi tampilan
  timezone: string;
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  default_page_size: number;
  // Kebijakan password
  password_min_length: number;
  password_max_age_days: number;
  login_max_attempts: number;
  login_lockout_minutes: number;
  // Session
  access_token_expires: string;
}

/** Data aman utk halaman login & semua role (GET /settings/public) */
export interface PublicSettings {
  appName: string;
  appShortName: string;
  companyName: string;
  timezone: string;
  dateFormat: string;
  defaultPageSize: number;
}

/** Payload update — semua field optional */
export type GeneralUpdatePayload = Partial<GeneralSettings>;

// ============================================
// Section: Approval Workflow
// ============================================
/** Chain approver per jenis pengajuan (role codes, berurutan level) */
export interface ApprovalSettings {
  chains: Record<string, string[]>;
  default_chain: string[];
}

// ============================================
// Section: Notification
// ============================================
export interface NotificationEventChannel {
  inapp: boolean;
  email: boolean;
}

export interface NotificationSettings {
  inapp_enabled: boolean;
  email_enabled: boolean;
  events: Record<string, NotificationEventChannel>;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
}

// ============================================
// Section: Integration
// ============================================
export type AppEvent = 'approval_created' | 'approval_decided';

export interface IntegrationSettings {
  webhook_enabled: boolean;
  webhook_url: string;
  webhook_secret: string;
  webhook_events: AppEvent[];
}

// ============================================
// Section: cb_parameter (Parameter C&B — laman Admin C&B)
// ============================================
export interface CbParameterSettings {
  /** Tanggal cut-off: attendance LOCK (spec: 22) */
  cut_off_day: number;
  /** Tanggal pembayaran gaji (spec: 27) */
  payday_day: number;
  /** Aturan prorata gaji pokok vs attendance — configurable, bukan hard-code */
  salary_attendance_rule: 'TANPA_POTONGAN' | 'PRORATA_HARI' | 'PRORATA_22';
}

/** Semua section — dipakai settingsService.getSection/updateSection */
export interface SettingsSectionMap {
  general: GeneralSettings;
  approval: ApprovalSettings;
  notification: NotificationSettings;
  integration: IntegrationSettings;
  cb_parameter: CbParameterSettings;
}
