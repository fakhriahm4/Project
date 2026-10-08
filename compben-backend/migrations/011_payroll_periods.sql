-- ============================================
-- 011: Fase 1 — Payroll Period + Attendance
--   - payroll_periods : siklus periode gaji (OPEN → LOCKED → PAID),
--     snapshot cut_off/payday dari cb_parameter saat periode dibuat.
--   - attendance      : data absensi per pegawai per hari.
--     Sumber utama: IMPOR Excel (export alat fingerprint),
--     lalu KOREKSI MANUAL Admin C&B; hari > cut_off = derived
--     LOCKED_ASSUMED_PRESENT (tidak disimpan — dihitung saat dibaca).
--   - Hari kerja: Sen–Jumat (aturan di aplikasi).
--   - Baris include_in_payroll = FALSE tak punya absensi (flag dari 009).
-- ============================================

CREATE TABLE IF NOT EXISTS payroll_periods (
  id           BIGSERIAL PRIMARY KEY,
  period_month DATE        NOT NULL UNIQUE,      -- tanggal-1 bulan tsb
  status       VARCHAR(10) NOT NULL DEFAULT 'OPEN'
               CHECK (status IN ('OPEN', 'LOCKED', 'PAID')),
  cut_off_day  INT         NOT NULL DEFAULT 22,  -- snapshot cb_parameter (lock absensi)
  payday_day   INT         NOT NULL DEFAULT 27,  -- snapshot cb_parameter (bayar gaji)
  locked_at    TIMESTAMP,
  locked_by    BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  paid_at      TIMESTAMP,
  paid_by      BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  created_by   BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS payroll_periods_status_idx ON payroll_periods(status);

CREATE TABLE IF NOT EXISTS attendance (
  id          BIGSERIAL PRIMARY KEY,
  period_id   BIGINT      NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id BIGINT      NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tanggal     DATE        NOT NULL,
  status      VARCHAR(25) NOT NULL DEFAULT 'HADIR'
              CHECK (status IN ('HADIR', 'SAKIT', 'IZIN', 'CUTI', 'ALPHA',
                                'LOCKED_ASSUMED_PRESENT')),
  jam_masuk   TIME,                                  -- dari alat finger (impor)
  jam_keluar  TIME,
  source      VARCHAR(10) NOT NULL DEFAULT 'MANUAL'
              CHECK (source IN ('IMPORT', 'MANUAL', 'ASSUMED')),
  keterangan  VARCHAR(200),
  updated_by  BIGINT      REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP,
  UNIQUE (employee_id, tanggal)
);

CREATE INDEX IF NOT EXISTS attendance_period_id_idx ON attendance(period_id);
CREATE INDEX IF NOT EXISTS attendance_tanggal_idx    ON attendance(tanggal);
