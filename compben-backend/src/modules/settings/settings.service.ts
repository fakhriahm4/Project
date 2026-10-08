import { JWT_ACCESS_EXPIRES } from '@/config/env';
import { AppError } from '@/middleware/errorHandler';
import { writeAuditLog } from '@utils/audit';
import { SettingsRepository } from './settings.repository';
import {
  SECTION_DEFAULTS,
  type GeneralSettings,
  type SectionTypes,
  type SettingsSection,
} from './settings.types';

/**
 * Cache in-memory per section — auth (login, change-password) & engine
 * (approval/notifikasi) memanggil get() tanpa query DB tiap request.
 * Diinvalidate per section saat update. Aman untuk 1 proses server;
 * kalau multi-proses nanti, pindahkan ke TTL pendek atau LISTEN/NOTIFY.
 */
const cache = new Map<SettingsSection, unknown>();

/**
 * Ambil nilai dari DB — hanya terima value yang tipenya cocok dengan default
 * (jaring pengaman kalau nilai DB diubah lewat konsol SQL di luar validasi API).
 */
function mergeWithDefaults<S extends SettingsSection>(
  section: S,
  rows: Array<{ key: string; value: unknown }>
): SectionTypes[S] {
  const defaults = SECTION_DEFAULTS[section] as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { ...defaults };
  const fromDb: Record<string, unknown> = {};
  for (const r of rows) fromDb[r.key] = r.value;

  for (const [key, def] of Object.entries(defaults)) {
    const v = fromDb[key];
    if (v === undefined || v === null) continue;
    if (Array.isArray(def)) {
      if (Array.isArray(v)) out[key] = v;
    } else if (typeof def === 'object' && def !== null) {
      if (typeof v === 'object' && !Array.isArray(v)) out[key] = v;
    } else if (typeof v === typeof def) {
      out[key] = v;
    }
  }
  return out as unknown as SectionTypes[S];
}

export class SettingsService {
  private repo = new SettingsRepository();

  /** Baca section (cached) — merge DB di atas DEFAULTS */
  async get<S extends SettingsSection>(section: S): Promise<SectionTypes[S]> {
    const hit = cache.get(section);
    if (hit) return hit as SectionTypes[S];

    const rows = await this.repo.findAll(section);
    const merged = mergeWithDefaults(section, rows);
    cache.set(section, merged);
    return merged;
  }

  /** Section general — alias utk auth (login, change-password) */
  getGeneral(): Promise<GeneralSettings> {
    return this.get('general');
  }

  /** Update sebagian key section — validasi schema sudah lewat Zod di route */
  async update<S extends SettingsSection>(
    section: S,
    input: Record<string, unknown>,
    userId: number
  ): Promise<SectionTypes[S]> {
    const entries = Object.entries(input);
    if (entries.length === 0) {
      throw new AppError('Tidak ada perubahan untuk disimpan', 400);
    }

    const oldValue = await this.get(section);
    await this.repo.upsertBulk(
      section,
      entries.map(([key, value]) => ({ key, value })),
      userId
    );

    await writeAuditLog({
      user_id: userId,
      action: 'UPDATE',
      table_name: 'settings',
      record_id: null,
      old_value: { section, ...stripSecrets(section, oldValue as unknown as Record<string, unknown>) },
      new_value: { section, ...stripSecrets(section, input) },
    });

    cache.delete(section); // invalidate — GET berikutnya baca DB segar
    return this.get(section);
  }

  /** Data aman utk halaman login & semua role (tanpa autentikasi) */
  async getPublic() {
    const g = await this.get('general');
    return {
      appName: g.app_name,
      appShortName: g.app_short_name,
      companyName: g.company_name,
      timezone: g.timezone,
      dateFormat: g.date_format,
      defaultPageSize: g.default_page_size,
    };
  }
}

/** Rahasia tidak boleh masuk audit log (hanya ditandai sudah-diisi/tidak) */
function stripSecrets(
  section: SettingsSection,
  obj: Record<string, unknown>
): Record<string, unknown> {
  const SECRET_KEYS: Record<SettingsSection, string[]> = {
    general: [],
    approval: [],
    notification: ['smtp_password'],
    integration: ['webhook_secret'],
    cb_parameter: [],
  };
  const out = { ...obj };
  for (const k of SECRET_KEYS[section]) {
    if (k in out) out[k] = out[k] ? '***' : '';
  }
  return out;
}

/**
 * Masa berlaku access token: settings dulu, fallback env 'JWT_ACCESS_EXPIRES'.
 * (regex dipertahankan di sini sebagai jaring pengaman kedua — nilai DB bisa
 * berubah lewat konsol SQL tanpa lewat validasi API.)
 */
export function jwtExpiresFrom(settings: GeneralSettings): string {
  return /^\d+[smhd]$/.test(settings.access_token_expires)
    ? settings.access_token_expires
    : JWT_ACCESS_EXPIRES;
}

/** Cek kebijakan panjang password — dipakai change-password & user create/update */
export function assertPasswordPolicy(
  password: string,
  settings: GeneralSettings
): void {
  if (password.length < settings.password_min_length) {
    throw new AppError(
      `Password minimal ${settings.password_min_length} karakter sesuai kebijakan sistem`,
      400
    );
  }
}

export const settingsService = new SettingsService();
