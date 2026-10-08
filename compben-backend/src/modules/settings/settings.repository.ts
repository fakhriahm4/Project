import { query } from '@/config/database';

export interface SettingRow {
  key: string;
  value: unknown;
}

export class SettingsRepository {
  /** Semua key dalam satu section */
  async findAll(section: string): Promise<SettingRow[]> {
    const result = await query(
      `SELECT key, value FROM settings WHERE section = $1 ORDER BY key ASC`,
      [section]
    );
    return result.rows;
  }

  /** Upsert banyak key dalam satu section (per-key, ON CONFLICT) */
  async upsertBulk(
    section: string,
    entries: Array<{ key: string; value: unknown }>,
    userId: number
  ): Promise<void> {
    for (const e of entries) {
      await query(
        `INSERT INTO settings (section, key, value, updated_by)
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT (section, key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
        [section, e.key, JSON.stringify(e.value), userId]
      );
    }
  }
}
