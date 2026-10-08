-- ============================================
-- 008: Fase 0.5 — Integrasi Data
--       - employees.user_id: tautan sinkron users ↔ employees
--       - backfill baris existing + baris untuk user tanpa employees
--       - trigger INSERT/UPDATE users → upsert employees (berlapis di
--         database: Tambah User, Edit User, Import Excel, dsb. semua
--         otomatis ikut — satu titik implementasi)
--       - trigger user_profiles → kolom bank di employees
--       - DELETE users → baris employees ikut terhapus (FK CASCADE)
--         (hard delete umumnya hanya jalur test/ cleanup; operasional
--          memakai soft delete → is_active = FALSE, baris tetap ada)
-- ============================================

-- ── Tautan sinkron ──────────────────────────
-- employee_id tetap business key (NIP); user_id opsional agar baris
-- HRIS mendatang bisa ada tanpa akun CompBen.
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE CASCADE;

-- Backfill: pasangkan baris hasil seed 007 (by NIP)
UPDATE employees e
   SET user_id = u.id
  FROM users u
WHERE e.user_id IS NULL
  AND e.employee_id = u.employee_id;

-- Baris employees untuk user yang belum punya (mis. user baru setelah 007)
INSERT INTO employees (
    employee_id, nama, email, divisi_id, jabatan_id, grade_id,
    status_pegawai, tanggal_masuk, is_active, user_id,
    nama_bank, no_rekening
)
SELECT u.employee_id, u.nama, u.email, u.divisi_id, u.jabatan_id, u.grade_id,
       'TETAP', u.tanggal_masuk, u.is_active AND u.status = 'ACTIVE', u.id,
       p.nama_bank, p.no_rekening
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.employee_id = u.employee_id);

-- ── Trigger users → employees ──────────────
-- HANYA kolom identitas/keorganisasian yang disinkronkan. Kolom payroll
-- milik Admin C&B (company, status_pegawai, driver, BPJS, pajak, rekening)
-- TIDAK pernah ditimpa oleh trigger ini.
CREATE OR REPLACE FUNCTION fn_sync_employees_from_user() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO employees (
        employee_id, nama, email, divisi_id, jabatan_id, grade_id,
        status_pegawai, tanggal_masuk, is_active, user_id
    ) VALUES (
        NEW.employee_id, NEW.nama, NEW.email, NEW.divisi_id, NEW.jabatan_id, NEW.grade_id,
        'TETAP', NEW.tanggal_masuk, NEW.is_active AND NEW.status = 'ACTIVE', NEW.id
    )
    ON CONFLICT (employee_id) DO UPDATE SET
      -- NIP sama = orang sama → baris manual C&B tertaut, bukan duplikat
      user_id = EXCLUDED.user_id;
    RETURN NEW;
  END IF;

  -- UPDATE: baris tertaut ikut semua kolom identitas
  UPDATE employees
     SET employee_id = NEW.employee_id,
         nama          = NEW.nama,
         email         = NEW.email,
         divisi_id     = NEW.divisi_id,
         jabatan_id    = NEW.jabatan_id,
         grade_id      = NEW.grade_id,
         tanggal_masuk = NEW.tanggal_masuk,
         is_active     = NEW.is_active AND NEW.status = 'ACTIVE',
         updated_at    = now()
   WHERE user_id = NEW.id;

  IF NOT FOUND THEN
    -- Belum ada baris tertaut (mis. user lama tak ter-seed) → buat
    INSERT INTO employees (
        employee_id, nama, email, divisi_id, jabatan_id, grade_id,
        status_pegawai, tanggal_masuk, is_active, user_id
    ) VALUES (
        NEW.employee_id, NEW.nama, NEW.email, NEW.divisi_id, NEW.jabatan_id, NEW.grade_id,
        'TETAP', NEW.tanggal_masuk, NEW.is_active AND NEW.status = 'ACTIVE', NEW.id
    )
    ON CONFLICT (employee_id) DO UPDATE SET
      user_id = EXCLUDED.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_sync_employees ON users;
CREATE TRIGGER trg_users_sync_employees
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_employees_from_user();

-- ── Trigger user_profiles → rekening di employees ──
CREATE OR REPLACE FUNCTION fn_sync_employees_from_profile() RETURNS trigger AS $$
BEGIN
  UPDATE employees
     SET nama_bank    = NEW.nama_bank,
         no_rekening  = NEW.no_rekening,
         updated_at   = now()
   WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_sync_employees ON user_profiles;
CREATE TRIGGER trg_user_profiles_sync_employees
  AFTER INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_employees_from_profile();

-- Catatan DELETE: FK employees.user_id ON DELETE CASCADE menangani
-- penghapusan baris employees tanpa trigger terpisah.
