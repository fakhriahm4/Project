-- ============================================
-- 009: Fase 0.6 — Akun administrator di luar perhitungan gaji
--       - employees.include_in_payroll (transparan & teraudit, bukan
--         aturan tersembunyi di formula)
--       - akun role SUPER_ADMIN otomatis FALSE (seed + trigger paksa)
--       - sisanya default TRUE, boleh di-toggle Admin C&B per pegawai
--       - Dikonsumsi Fase 1 (daftar attendance) & Fase 3 (generate payroll):
--         hanya baris include_in_payroll = TRUE
-- ============================================

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS include_in_payroll BOOLEAN NOT NULL DEFAULT TRUE;

-- Seed: akun Super Admin tak pernah ikut payroll
UPDATE employees e
   SET include_in_payroll = FALSE
  FROM users u
  JOIN roles r ON r.id = u.role_id
WHERE e.user_id = u.id
  AND r.kode = 'SUPER_ADMIN';

-- ── Perluasan trigger sinkron (008) ─────────
-- Fungsi lama diganti in-place (nama sama) → trigger lama langsung memakai
-- versi baru. Tambahan: paksa include_in_payroll = FALSE utk role SUPER_ADMIN;
-- utk role lain kolom TIDAK disentuh (edit manual Admin C&B tetap berlaku).
CREATE OR REPLACE FUNCTION fn_sync_employees_from_user() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO employees (
        employee_id, nama, email, divisi_id, jabatan_id, grade_id,
        status_pegawai, tanggal_masuk, is_active, user_id, include_in_payroll
    ) VALUES (
        NEW.employee_id, NEW.nama, NEW.email, NEW.divisi_id, NEW.jabatan_id, NEW.grade_id,
        'TETAP', NEW.tanggal_masuk, NEW.is_active AND NEW.status = 'ACTIVE', NEW.id,
        (SELECT r.kode FROM roles r WHERE r.id = NEW.role_id) <> 'SUPER_ADMIN'
    )
    ON CONFLICT (employee_id) DO UPDATE SET
      -- NIP sama = orang sama → baris manual C&B tertaut, bukan duplikat
      user_id = EXCLUDED.user_id,
      -- superadmin → FALSE selalu; selain itu: pertahankan nilai existing
      include_in_payroll = CASE
        WHEN NOT EXCLUDED.include_in_payroll THEN FALSE
        ELSE employees.include_in_payroll
      END;
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
         include_in_payroll = CASE
           WHEN (SELECT r.kode FROM roles r WHERE r.id = NEW.role_id) = 'SUPER_ADMIN'
           THEN FALSE
           ELSE include_in_payroll
         END,
         updated_at    = now()
   WHERE user_id = NEW.id;

  IF NOT FOUND THEN
    -- Belum ada baris tertaut (mis. user lama tak ter-seed) → buat
    INSERT INTO employees (
        employee_id, nama, email, divisi_id, jabatan_id, grade_id,
        status_pegawai, tanggal_masuk, is_active, user_id, include_in_payroll
    ) VALUES (
        NEW.employee_id, NEW.nama, NEW.email, NEW.divisi_id, NEW.jabatan_id, NEW.grade_id,
        'TETAP', NEW.tanggal_masuk, NEW.is_active AND NEW.status = 'ACTIVE', NEW.id,
        (SELECT r.kode FROM roles r WHERE r.id = NEW.role_id) <> 'SUPER_ADMIN'
    )
    ON CONFLICT (employee_id) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      include_in_payroll = CASE
        WHEN NOT EXCLUDED.include_in_payroll THEN FALSE
        ELSE employees.include_in_payroll
      END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
