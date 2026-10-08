import api from '@/services/api';
import type {
  GeneralSettings,
  GeneralUpdatePayload,
  PublicSettings,
  SettingsSectionMap,
} from '../types/settings';

/**
 * System Configuration — per-section.
 * - /public       : tanpa auth (identitas + preferensi tampilan)
 * - /:section     : Super Admin (GET & PUT partial)
 * Interceptor api sudah unwrap body { success, data }.
 */
export const settingsService = {
  async getPublic(): Promise<{ data: PublicSettings }> {
    const res = await api.get('/settings/public');
    return res as unknown as { data: PublicSettings };
  },

  async getGeneral(): Promise<{ data: GeneralSettings }> {
    const res = await api.get('/settings/general');
    return res as unknown as { data: GeneralSettings };
  },

  async updateGeneral(
    payload: GeneralUpdatePayload
  ): Promise<{ data: GeneralSettings }> {
    const res = await api.put('/settings/general', payload);
    return res as unknown as { data: GeneralSettings };
  },

  /** GET /settings/:section — berlaku untuk approval/notification/integration (dan general) */
  async getSection<S extends keyof SettingsSectionMap>(
    section: S
  ): Promise<{ data: SettingsSectionMap[S] }> {
    const res = await api.get(`/settings/${section}`);
    return res as unknown as { data: SettingsSectionMap[S] };
  },

  /** PUT /settings/:section — partial: hanya key yang dikirim yang ditimpa */
  async updateSection<S extends keyof SettingsSectionMap>(
    section: S,
    payload: Partial<SettingsSectionMap[S]>
  ): Promise<{ data: SettingsSectionMap[S] }> {
    const res = await api.put(`/settings/${section}`, payload);
    return res as unknown as { data: SettingsSectionMap[S] };
  },
};

export default settingsService;
