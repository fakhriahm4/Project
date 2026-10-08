-- ============================================
-- 004: Wajib ganti password saat login pertama
--       (password awal hasil import — tgl lahir / acak —
--        hanya berlaku sampai user menggantinya di ESS)
-- ============================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
