-- ============================================
-- 005: System Configuration — General Settings
--       - Tabel settings (key-value per section)
--       - Kebijakan password & lockout akun di users
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
    section    VARCHAR(30) NOT NULL,
    key        VARCHAR(50) NOT NULL,
    value      JSONB       NOT NULL,
    updated_at TIMESTAMP   NOT NULL DEFAULT now(),
    updated_by BIGINT      REFERENCES users(id),
    PRIMARY KEY (section, key)
);

-- Kebijakan password & percobaan login gagal
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_changed_at   TIMESTAMP,
    ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until          TIMESTAMP;

-- User lama: anggap password diatur saat record dibuat
UPDATE users SET password_changed_at = COALESCE(created_at, now())
WHERE password_changed_at IS NULL;

-- Seed General Settings (ON CONFLICT → tidak menimpa nilai admin)
INSERT INTO settings (section, key, value) VALUES
  -- Identitas aplikasi
  ('general', 'app_name',             '"CompBen"'),
  ('general', 'app_short_name',       '"CB"'),
  ('general', 'company_name',         '"PT Reethau Cipta Energi"'),
  ('general', 'system_email',         '""'),
  ('general', 'company_address',      '""'),
  -- Preferensi tampilan
  ('general', 'timezone',             '"Asia/Jakarta"'),
  ('general', 'date_format',          '"DD/MM/YYYY"'),
  ('general', 'default_page_size',    '10'),
  -- Kebijakan password
  ('general', 'password_min_length',  '8'),
  ('general', 'password_max_age_days','90'),
  ('general', 'login_max_attempts',   '5'),
  ('general', 'login_lockout_minutes','15'),
  -- Session
  ('general', 'access_token_expires', '"15m"')
ON CONFLICT (section, key) DO NOTHING;
