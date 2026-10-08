import { z, type ZodType } from 'zod';

export type SettingsSection =
  | 'general'
  | 'approval'
  | 'notification'
  | 'integration'
  | 'cb_parameter';

/** Format durasi JWT: 45s / 15m / 12h / 7d */
const DURATION_RE = /^\d+[smhd]$/;

// ============================================
// SECTION: general
// ============================================
/**
 * General Settings — 4 blok:
 * identitas aplikasi, preferensi tampilan, kebijakan password, session.
 * Semua field optional (partial) — update hanya yang dikirim.
 */
export const generalUpdateSchema = z
  .object({
    // Identitas aplikasi
    app_name: z.string().min(1, 'Nama aplikasi wajib diisi').max(60),
    app_short_name: z.string().min(1, 'Singkatan wajib diisi').max(20),
    company_name: z.string().min(1, 'Nama perusahaan wajib diisi').max(150),
    system_email: z.union([
      z.string().email('Format email tidak valid').max(150),
      z.literal(''),
    ]),
    company_address: z.string().max(500),

    // Preferensi tampilan
    timezone: z.string().min(1, 'Timezone wajib diisi').max(60),
    date_format: z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], {
      message: 'Format tanggal tidak didukung',
    }),
    default_page_size: z.coerce
      .number({ message: 'Harus berupa angka' })
      .int('Harus bilangan bulat')
      .min(5, 'Minimal 5')
      .max(100, 'Maksimal 100'),

    // Kebijakan password
    password_min_length: z.coerce
      .number({ message: 'Harus berupa angka' })
      .int('Harus bilangan bulat')
      .min(6, 'Minimal 6')
      .max(64, 'Maksimal 64'),
    password_max_age_days: z.coerce
      .number({ message: 'Harus berupa angka' })
      .int('Harus bilangan bulat')
      .min(0, 'Minimal 0 (0 = tidak pernah kedaluwarsa)')
      .max(3650, 'Maksimal 3650 hari'),
    login_max_attempts: z.coerce
      .number({ message: 'Harus berupa angka' })
      .int('Harus bilangan bulat')
      .min(0, 'Minimal 0 (0 = tanpa kunci akun)')
      .max(20, 'Maksimal 20'),
    login_lockout_minutes: z.coerce
      .number({ message: 'Harus berupa angka' })
      .int('Harus bilangan bulat')
      .min(1, 'Minimal 1 menit')
      .max(1440, 'Maksimal 1440 menit (24 jam)'),

    // Session
    access_token_expires: z
      .string()
      .regex(DURATION_RE, 'Format durasi contoh: 45s, 15m, 12h, 7d'),
  })
  .partial(); // ← SEMUA field optional: PUT boleh kirim sebagian key

export interface GeneralSettings {
  app_name: string;
  app_short_name: string;
  company_name: string;
  system_email: string;
  company_address: string;
  timezone: string;
  date_format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  default_page_size: number;
  password_min_length: number;
  password_max_age_days: number;
  login_max_attempts: number;
  login_lockout_minutes: number;
  access_token_expires: string;
}

export const GENERAL_DEFAULTS: GeneralSettings = {
  app_name: 'CompBen',
  app_short_name: 'CB',
  company_name: 'PT Reethau Cipta Energi',
  system_email: '',
  company_address: '',
  timezone: 'Asia/Jakarta',
  date_format: 'DD/MM/YYYY',
  default_page_size: 10,
  password_min_length: 8,
  password_max_age_days: 90,
  login_max_attempts: 5,
  login_lockout_minutes: 15,
  access_token_expires: '15m',
};

// ============================================
// SECTION: approval
// ============================================
/** Event yang bisa dipicu engine approval (dipakai notifikasi & webhook) */
export const APP_EVENTS = ['approval_created', 'approval_decided'] as const;
export type AppEvent = (typeof APP_EVENTS)[number];

export const approvalUpdateSchema = z
  .object({
    /** Chain approver per request_type: {"REIMBURSEMENT": ["HR_ADMIN","SUPER_ADMIN"]} */
    chains: z.record(
      z.string().min(1).max(50),
      z
        .array(z.string().min(1).max(50))
        .min(1, 'Chain minimal 1 role')
        .max(5, 'Chain maksimal 5 level')
    ),
    /** Fallback kalau request_type tak ada di chains */
    default_chain: z
      .array(z.string().min(1).max(50))
      .min(1, 'Default chain minimal 1 role')
      .max(5, 'Default chain maksimal 5 level'),
  })
  .partial();

export interface ApprovalSettings {
  chains: Record<string, string[]>;
  default_chain: string[];
}

export const APPROVAL_DEFAULTS: ApprovalSettings = {
  chains: { DEFAULT: ['HR_ADMIN'] },
  default_chain: ['HR_ADMIN'],
};

// ============================================
// SECTION: notification
// ============================================
export const notificationUpdateSchema = z
  .object({
    inapp_enabled: z.boolean(),
    email_enabled: z.boolean(),
    /** Matrix event → kanal: {"approval_created": {inapp, email}} */
    events: z.record(
      z.string().min(1).max(50),
      z.object({ inapp: z.boolean(), email: z.boolean() })
    ),
    smtp_host: z.string().max(255),
    smtp_port: z.coerce
      .number({ message: 'Harus berupa angka' })
      .int('Harus bilangan bulat')
      .min(1)
      .max(65535),
    smtp_secure: z.boolean(),
    smtp_user: z.string().max(255),
    smtp_password: z.string().max(255),
    smtp_from: z.union([
      z.string().email('Format email tidak valid').max(150),
      z.literal(''),
    ]),
  })
  .partial();

export interface NotificationSettings {
  inapp_enabled: boolean;
  email_enabled: boolean;
  events: Record<string, { inapp: boolean; email: boolean }>;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
}

export const NOTIFICATION_DEFAULTS: NotificationSettings = {
  inapp_enabled: true,
  email_enabled: false,
  events: {
    approval_created: { inapp: true, email: false },
    approval_decided: { inapp: true, email: false },
  },
  smtp_host: '',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: '',
  smtp_password: '',
  smtp_from: '',
};

// ============================================
// SECTION: integration
// ============================================
export const integrationUpdateSchema = z
  .object({
    webhook_enabled: z.boolean(),
    webhook_url: z.union([
      z.string().url('URL tidak valid (contoh: https://contoh.com/hook)'),
      z.literal(''),
    ]),
    webhook_secret: z.string().max(255),
    webhook_events: z.array(
      z.enum(APP_EVENTS, { message: 'Event tidak dikenal' })
    ),
  })
  .partial();

export interface IntegrationSettings {
  webhook_enabled: boolean;
  webhook_url: string;
  webhook_secret: string;
  webhook_events: AppEvent[];
}

export const INTEGRATION_DEFAULTS: IntegrationSettings = {
  webhook_enabled: false,
  webhook_url: '',
  webhook_secret: '',
  webhook_events: ['approval_created', 'approval_decided'],
};

// ============================================
// SECTION: cb_parameter (Parameter C&B — laman Admin C&B)
// ============================================
export const cbParameterUpdateSchema = z
  .object({
    /** Tanggal cut-off: attendance LOCK (spec: 22) */
    cut_off_day: z.coerce
      .number({ message: 'Harus berupa angka' })
      .int('Harus bilangan bulat')
      .min(1, 'Minimal tanggal 1')
      .max(28, 'Maksimal 28 (sebelum akhir bulan)'),
    /** Tanggal pembayaran gaji (spec: 27) */
    payday_day: z.coerce
      .number({ message: 'Harus berupa angka' })
      .int('Harus bilangan bulat')
      .min(1, 'Minimal tanggal 1')
      .max(31, 'Maksimal 31'),
    /** Aturan prorata gaji pokok vs attendance — dikonfigurasi, bukan hard-code */
    salary_attendance_rule: z.enum(
      ['TANPA_POTONGAN', 'PRORATA_HARI', 'PRORATA_22'],
      { message: 'Aturan tidak didukung' }
    ),
  })
  .partial();

export interface CbParameterSettings {
  cut_off_day: number;
  payday_day: number;
  salary_attendance_rule: 'TANPA_POTONGAN' | 'PRORATA_HARI' | 'PRORATA_22';
}

export const CB_PARAMETER_DEFAULTS: CbParameterSettings = {
  cut_off_day: 22,
  payday_day: 27,
  salary_attendance_rule: 'PRORATA_HARI',
};

// ============================================
// Registry — dipakai service (cache/update) & route (validasi)
// ============================================
export interface SectionTypes {
  general: GeneralSettings;
  approval: ApprovalSettings;
  notification: NotificationSettings;
  integration: IntegrationSettings;
  cb_parameter: CbParameterSettings;
}

export const SECTION_DEFAULTS: SectionTypes = {
  general: GENERAL_DEFAULTS,
  approval: APPROVAL_DEFAULTS,
  notification: NOTIFICATION_DEFAULTS,
  integration: INTEGRATION_DEFAULTS,
  cb_parameter: CB_PARAMETER_DEFAULTS,
};

export const SECTION_SCHEMAS: Record<SettingsSection, ZodType> = {
  general: generalUpdateSchema,
  approval: approvalUpdateSchema,
  notification: notificationUpdateSchema,
  integration: integrationUpdateSchema,
  cb_parameter: cbParameterUpdateSchema,
};

export const SETTINGS_SECTIONS = Object.keys(SECTION_SCHEMAS) as SettingsSection[];

export function isSettingsSection(v: string): v is SettingsSection {
  return (SETTINGS_SECTIONS as string[]).includes(v);
}

export type GeneralUpdateInput = z.infer<typeof generalUpdateSchema>;

/** Sub-kunci yang aman ditampilkan tanpa login (login page, semua role) */
export interface PublicSettings {
  appName: string;
  appShortName: string;
  companyName: string;
  timezone: string;
  dateFormat: string;
  defaultPageSize: number;
}
