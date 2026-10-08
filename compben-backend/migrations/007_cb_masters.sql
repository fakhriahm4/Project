-- ============================================
-- 007: Fase 0 — Fondasi Master C&B
--       - employees (master pegawai terpisah, di-seed dari users)
--       - payroll_components, compensation_structures
--       - bpjs_components, pph21_ter (PMK 168/2023)
--       - deduction_master (+ rule), overtime_rules (grade → method)
--       - settings section cb_parameter (cut-off, payday, aturan absen)
-- ============================================

-- ── Master Pegawai ───────────────────────────
CREATE TABLE IF NOT EXISTS employees (
    id              BIGSERIAL PRIMARY KEY,
    employee_id     VARCHAR(30)   NOT NULL UNIQUE,     -- NIP
    nama            VARCHAR(150)  NOT NULL,
    ktp             VARCHAR(30),
    email           VARCHAR(150),
    company_id      BIGINT        REFERENCES companies(id),
    divisi_id       BIGINT        REFERENCES divisi(id),
    jabatan_id      BIGINT        REFERENCES jabatan(id),
    grade_id        BIGINT        REFERENCES grade(id),
    status_pegawai  VARCHAR(20)   NOT NULL DEFAULT 'TETAP'
                      CHECK (status_pegawai IN ('TETAP', 'KONTRAK', 'PROBATION')),
    status_driver   BOOLEAN       NOT NULL DEFAULT FALSE,
    tanggal_masuk   DATE,
    tanggal_keluar  DATE,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    bpjs_active     BOOLEAN       NOT NULL DEFAULT FALSE,
    tax_status      VARCHAR(30)   NOT NULL DEFAULT 'NORMAL',
    pph21_category  VARCHAR(10)   NOT NULL DEFAULT 'TER_A'
                      CHECK (pph21_category IN ('TER_A', 'TER_B')),
    nama_bank       VARCHAR(50),
    no_rekening     VARCHAR(30),
    created_at      TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employees_active ON employees (is_active);
CREATE INDEX IF NOT EXISTS idx_employees_grade   ON employees (grade_id);

-- Seed dari data user yang ada (relasi longgar lewat employee_id; tanpa FK
-- agar CRUD user lama tidak terpengaruh — nanti HRIS mengisi tabel ini)
INSERT INTO employees (
    employee_id, nama, email, divisi_id, jabatan_id, grade_id,
    status_pegawai, status_driver, tanggal_masuk, is_active,
    bpjs_active, tax_status, pph21_category, nama_bank, no_rekening
)
SELECT
    u.employee_id, u.nama, u.email, u.divisi_id, u.jabatan_id, u.grade_id,
    'TETAP', FALSE, u.tanggal_masuk, u.is_active,
    FALSE, 'NORMAL', 'TER_A', p.nama_bank, p.no_rekening
FROM users u
LEFT JOIN user_profiles p ON p.user_id = u.id
ON CONFLICT (employee_id) DO NOTHING;

-- ── Komponen Payroll ─────────────────────────
CREATE TABLE IF NOT EXISTS payroll_components (
    id                 BIGSERIAL PRIMARY KEY,
    kode               VARCHAR(20)   NOT NULL UNIQUE,
    nama               VARCHAR(100)  NOT NULL,
    tipe               VARCHAR(10)   NOT NULL CHECK (tipe IN ('EARNING', 'DEDUCTION')),
    formula            TEXT,                          -- ekspresi utk Payroll Engine (Fase 3)
    sifat_tetap        BOOLEAN       NOT NULL DEFAULT TRUE,
    dasar_perhitungan  VARCHAR(40),                   -- ATTENDANCE | COMPENSATION_STRUCTURE | OVERTIME | ADJUSTMENT | MANUAL
    sort_order         INT           NOT NULL DEFAULT 0,
    effective_start    DATE          NOT NULL DEFAULT CURRENT_DATE,
    effective_end      DATE,
    is_active          BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at         TIMESTAMP     NOT NULL DEFAULT now()
);

-- 11 komponen penghasilan sesuai spesifikasi (semua configurable, tak di-hard-code)
INSERT INTO payroll_components
    (kode, nama, tipe, formula, sifat_tetap, dasar_perhitungan, sort_order, effective_start)
VALUES
    ('GAJI_POKOK',          'Gaji Pokok',          'EARNING', 'gaji_pokok_prorata',      TRUE,  'ATTENDANCE',            1,  DATE '2026-01-01'),
    ('TUNJ_MASA_KERJA',     'Tunjangan Masa Kerja', 'EARNING', 'nilai_dasar',             TRUE,  'COMPENSATION_STRUCTURE', 2,  DATE '2026-01-01'),
    ('TUNJ_FUNGSIONAL',     'Tunjangan Fungsional', 'EARNING', 'nilai_dasar',             TRUE,  'COMPENSATION_STRUCTURE', 3,  DATE '2026-01-01'),
    ('TUNJ_MAKAN',          'Tunjangan Makan',      'EARNING', 'nilai_dasar',             TRUE,  'COMPENSATION_STRUCTURE', 4,  DATE '2026-01-01'),
    ('TUNJ_TRANSPORT',      'Tunjangan Transport',  'EARNING', 'nilai_dasar',             TRUE,  'COMPENSATION_STRUCTURE', 5,  DATE '2026-01-01'),
    ('TUNJ_KEAHLIAN',       'Tunjangan Keahlian',   'EARNING', 'nilai_dasar',             TRUE,  'COMPENSATION_STRUCTURE', 6,  DATE '2026-01-01'),
    ('PROMOSI',             'Promosi',              'EARNING', 'manual_adjustment',       FALSE, 'MANUAL',                 7,  DATE '2026-01-01'),
    ('KENAIKAN_AWAL_TAHUN', 'Kenaikan Awal Tahun',  'EARNING', 'kenaikan_awal_tahun',     FALSE, 'MANUAL',                 8,  DATE '2026-01-01'),
    ('RAPEL_LEMBURAN',      'Rapel Lemburan',       'EARNING', 'overtime_back_date',      FALSE, 'OVERTIME',               9,  DATE '2026-01-01'),
    ('RAPEL_GAJI',          'Rapel Gaji',           'EARNING', 'salary_correction',       FALSE, 'ADJUSTMENT',             10, DATE '2026-01-01'),
    ('AKTUARIA',            'Aktuaria',             'EARNING', 'manual_adjustment',       FALSE, 'MANUAL',                 11, DATE '2026-01-01')
ON CONFLICT (kode) DO NOTHING;

-- ── Struktur Compensation (grade ↔ komponen) ─
CREATE TABLE IF NOT EXISTS compensation_structures (
    id              BIGSERIAL PRIMARY KEY,
    grade_id        BIGINT        NOT NULL REFERENCES grade(id),
    component_id    BIGINT        NOT NULL REFERENCES payroll_components(id),
    nilai_dasar     NUMERIC(15,2) NOT NULL DEFAULT 0,
    effective_start DATE          NOT NULL DEFAULT CURRENT_DATE,
    effective_end   DATE,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT now(),
    UNIQUE (grade_id, component_id, effective_start)
);

CREATE INDEX IF NOT EXISTS idx_comp_struct_grade ON compensation_structures (grade_id, is_active);

-- Seed: semua grade → 5 komponen dasar (gaji pokok = min_salary grade);
--       G2–G5 ikut Tunjangan Fungsional (menunjukkan struktur bisa beda per grade)
INSERT INTO compensation_structures (grade_id, component_id, nilai_dasar, effective_start)
SELECT g.id, c.id,
       CASE WHEN c.kode = 'GAJI_POKOK' THEN g.min_salary ELSE 0 END,
       DATE '2026-01-01'
FROM grade g
JOIN payroll_components c
  ON c.kode IN ('GAJI_POKOK', 'TUNJ_MASA_KERJA', 'TUNJ_MAKAN', 'TUNJ_TRANSPORT', 'TUNJ_KEAHLIAN')
  OR (c.kode = 'TUNJ_FUNGSIONAL' AND g.level >= 2)
ON CONFLICT (grade_id, component_id, effective_start) DO NOTHING;

-- ── Master BPJS (nilai resmi sbg default, editable) ─
CREATE TABLE IF NOT EXISTS bpjs_components (
    id                  BIGSERIAL PRIMARY KEY,
    kode                VARCHAR(20)   NOT NULL UNIQUE,
    nama                VARCHAR(100)  NOT NULL,
    persentase_pekerja  NUMERIC(6,3)  NOT NULL DEFAULT 0,   -- %
    persentase_perusahaan NUMERIC(6,3) NOT NULL DEFAULT 0,  -- %
    batas_atas          NUMERIC(15,2) NOT NULL DEFAULT 0,   -- batas upah (0 = tanpa batas)
    dasar               VARCHAR(30)   NOT NULL DEFAULT 'UPAH',
    effective_start     DATE          NOT NULL DEFAULT CURRENT_DATE,
    effective_end       DATE,
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP     NOT NULL DEFAULT now()
);

INSERT INTO bpjs_components
    (kode, nama, persentase_pekerja, persentase_perusahaan, batas_atas, effective_start)
VALUES
    ('BPJS_TK_JHT',   'BPJS TK JHT',           2.000, 3.750, 12436700, DATE '2026-01-01'),
    ('BPJS_TK_JP',    'BPJS TK JP',            1.000, 2.000, 12436700, DATE '2026-01-01'),
    ('BPJS_KES',      'BPJS Kesehatan',        1.000, 4.000, 12000000, DATE '2026-01-01'),
    ('BPJS_TK_JKK',   'BPJS TK JKK',           0.000, 0.240, 12000000, DATE '2026-01-01'), -- ikut tingkat risiko (0,24–1,74)
    ('BPJS_TK_JKM',   'BPJS TK JKM',           0.000, 0.300, 12000000, DATE '2026-01-01')
ON CONFLICT (kode) DO NOTHING;

-- ── Master PPh 21 TER (PMK 168/2023) ─────────
CREATE TABLE IF NOT EXISTS pph21_ter (
    id             BIGSERIAL      UNIQUE,               -- penanda baris utk UI
    kategori       VARCHAR(5)     NOT NULL CHECK (kategori IN ('TER_A', 'TER_B')),
    range_min      NUMERIC(15,2)  NOT NULL,
    range_max      NUMERIC(15,2),                       -- NULL = tanpa batas atas
    tarif_persen   NUMERIC(8,4)   NOT NULL,             -- mis. 0.25 = 0,25 %
    effective_start DATE          NOT NULL DEFAULT CURRENT_DATE,
    effective_end  DATE,
    is_active      BOOLEAN        NOT NULL DEFAULT TRUE,
    PRIMARY KEY (kategori, range_min)
);

-- TER A (TK/0 — kawin tidak)
INSERT INTO pph21_ter (kategori, range_min, range_max, tarif_persen, effective_start) VALUES
    ('TER_A', 0,          5400000,    0,     DATE '2024-01-01'),
    ('TER_A', 5400000,    5650000,    0.25,  DATE '2024-01-01'),
    ('TER_A', 5650000,    5950000,    0.5,   DATE '2024-01-01'),
    ('TER_A', 5950000,    6300000,    0.75,  DATE '2024-01-01'),
    ('TER_A', 6300000,    6750000,    1,     DATE '2024-01-01'),
    ('TER_A', 6750000,    7500000,    1.25,  DATE '2024-01-01'),
    ('TER_A', 7500000,    8550000,    1.5,   DATE '2024-01-01'),
    ('TER_A', 8550000,    9650000,    1.75,  DATE '2024-01-01'),
    ('TER_A', 9650000,    10050000,   2,     DATE '2024-01-01'),
    ('TER_A', 10050000,   10350000,   2.25,  DATE '2024-01-01'),
    ('TER_A', 10350000,   10700000,   2.5,   DATE '2024-01-01'),
    ('TER_A', 10700000,   11050000,   3,     DATE '2024-01-01'),
    ('TER_A', 11050000,   11600000,   3.5,   DATE '2024-01-01'),
    ('TER_A', 11600000,   12500000,   4,     DATE '2024-01-01'),
    ('TER_A', 12500000,   13750000,   5,     DATE '2024-01-01'),
    ('TER_A', 13750000,   15100000,   6,     DATE '2024-01-01'),
    ('TER_A', 15100000,   16950000,   7,     DATE '2024-01-01'),
    ('TER_A', 16950000,   19750000,   8,     DATE '2024-01-01'),
    ('TER_A', 19750000,   24150000,   9,     DATE '2024-01-01'),
    ('TER_A', 24150000,   26450000,   10,    DATE '2024-01-01'),
    ('TER_A', 26450000,   28000000,   11,    DATE '2024-01-01'),
    ('TER_A', 28000000,   30050000,   12,    DATE '2024-01-01'),
    ('TER_A', 30050000,   32400000,   13,    DATE '2024-01-01'),
    ('TER_A', 32400000,   35400000,   14,    DATE '2024-01-01'),
    ('TER_A', 35400000,   39100000,   15,    DATE '2024-01-01'),
    ('TER_A', 39100000,   43850000,   16,    DATE '2024-01-01'),
    ('TER_A', 43850000,   47800000,   17,    DATE '2024-01-01'),
    ('TER_A', 47800000,   51400000,   18,    DATE '2024-01-01'),
    ('TER_A', 51400000,   56300000,   19,    DATE '2024-01-01'),
    ('TER_A', 56300000,   62200000,   20,    DATE '2024-01-01'),
    ('TER_A', 62200000,   68600000,   21,    DATE '2024-01-01'),
    ('TER_A', 68600000,   77500000,   22,    DATE '2024-01-01'),
    ('TER_A', 77500000,   89000000,   23,    DATE '2024-01-01'),
    ('TER_A', 89000000,   103000000,  24,    DATE '2024-01-01'),
    ('TER_A', 103000000,  125000000,  25,    DATE '2024-01-01'),
    ('TER_A', 125000000,  157000000,  26,    DATE '2024-01-01'),
    ('TER_A', 157000000,  206000000,  27,    DATE '2024-01-01'),
    ('TER_A', 206000000,  337000000,  28,    DATE '2024-01-01'),
    ('TER_A', 337000000,  454000000,  29,    DATE '2024-01-01'),
    ('TER_A', 454000000,  550000000,  30,    DATE '2024-01-01'),
    ('TER_A', 550000000,  695000000,  31,    DATE '2024-01-01'),
    ('TER_A', 695000000,  910000000,  32,    DATE '2024-01-01'),
    ('TER_A', 910000000,  1405000000, 33,    DATE '2024-01-01'),
    ('TER_A', 1405000000, NULL,       34,    DATE '2024-01-01')
ON CONFLICT (kategori, range_min) DO NOTHING;

-- TER B (K/1 — kawin)
INSERT INTO pph21_ter (kategori, range_min, range_max, tarif_persen, effective_start) VALUES
    ('TER_B', 0,          6200000,    0,     DATE '2024-01-01'),
    ('TER_B', 6200000,    6500000,    0.25,  DATE '2024-01-01'),
    ('TER_B', 6500000,    6850000,    0.5,   DATE '2024-01-01'),
    ('TER_B', 6850000,    7300000,    0.75,  DATE '2024-01-01'),
    ('TER_B', 7300000,    9200000,    1,     DATE '2024-01-01'),
    ('TER_B', 9200000,    10750000,   1.5,   DATE '2024-01-01'),
    ('TER_B', 10750000,   11250000,   2,     DATE '2024-01-01'),
    ('TER_B', 11250000,   11600000,   2.5,   DATE '2024-01-01'),
    ('TER_B', 11600000,   12600000,   3,     DATE '2024-01-01'),
    ('TER_B', 12600000,   13600000,   4,     DATE '2024-01-01'),
    ('TER_B', 13600000,   14950000,   5,     DATE '2024-01-01'),
    ('TER_B', 14950000,   16400000,   6,     DATE '2024-01-01'),
    ('TER_B', 16400000,   18450000,   7,     DATE '2024-01-01'),
    ('TER_B', 18450000,   21850000,   8,     DATE '2024-01-01'),
    ('TER_B', 21850000,   26000000,   9,     DATE '2024-01-01'),
    ('TER_B', 26000000,   27700000,   10,    DATE '2024-01-01'),
    ('TER_B', 27700000,   29350000,   11,    DATE '2024-01-01'),
    ('TER_B', 29350000,   31450000,   12,    DATE '2024-01-01'),
    ('TER_B', 31450000,   33950000,   13,    DATE '2024-01-01'),
    ('TER_B', 33950000,   37100000,   14,    DATE '2024-01-01'),
    ('TER_B', 37100000,   41100000,   15,    DATE '2024-01-01'),
    ('TER_B', 41100000,   45800000,   16,    DATE '2024-01-01'),
    ('TER_B', 45800000,   49500000,   17,    DATE '2024-01-01'),
    ('TER_B', 49500000,   53800000,   18,    DATE '2024-01-01'),
    ('TER_B', 53800000,   58500000,   19,    DATE '2024-01-01'),
    ('TER_B', 58500000,   64000000,   20,    DATE '2024-01-01'),
    ('TER_B', 64000000,   71000000,   21,    DATE '2024-01-01'),
    ('TER_B', 71000000,   80000000,   22,    DATE '2024-01-01'),
    ('TER_B', 80000000,   93000000,   23,    DATE '2024-01-01'),
    ('TER_B', 93000000,   109000000,  24,    DATE '2024-01-01'),
    ('TER_B', 109000000,  129000000,  25,    DATE '2024-01-01'),
    ('TER_B', 129000000,  163000000,  26,    DATE '2024-01-01'),
    ('TER_B', 163000000,  211000000,  27,    DATE '2024-01-01'),
    ('TER_B', 211000000,  374000000,  28,    DATE '2024-01-01'),
    ('TER_B', 374000000,  459000000,  29,    DATE '2024-01-01'),
    ('TER_B', 459000000,  555000000,  30,    DATE '2024-01-01'),
    ('TER_B', 555000000,  704000000,  31,    DATE '2024-01-01'),
    ('TER_B', 704000000,  957000000,  32,    DATE '2024-01-01'),
    ('TER_B', 957000000,  1405000000, 33,    DATE '2024-01-01'),
    ('TER_B', 1405000000, NULL,       34,    DATE '2024-01-01')
ON CONFLICT (kategori, range_min) DO NOTHING;

-- ── Master Deduction (+ rule kondisional) ────
CREATE TABLE IF NOT EXISTS deduction_master (
    id              BIGSERIAL PRIMARY KEY,
    kode            VARCHAR(30)   NOT NULL UNIQUE,
    nama            VARCHAR(100)  NOT NULL,
    rule            JSONB         NOT NULL DEFAULT '{}',   -- mis. {"if":"is_driver","then":"applies"}
    nilai_default   NUMERIC(15,2) NOT NULL DEFAULT 0,
    effective_start DATE          NOT NULL DEFAULT CURRENT_DATE,
    effective_end   DATE,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT now()
);

INSERT INTO deduction_master (kode, nama, rule, nilai_default, effective_start) VALUES
    ('KOPERASI',            'Koperasi',             '{}'::jsonb,                                              0, DATE '2026-01-01'),
    ('COS_PUK',             'COS / PUK / Serikat',  '{}'::jsonb,                                              0, DATE '2026-01-01'),
    ('TABUNGENAN_KECELAKAAN','Tabungan Kecelakaan', '{"if":"is_driver","then":"applies"}'::jsonb,            0, DATE '2026-01-01')
ON CONFLICT (kode) DO NOTHING;

-- ── Master Overtime Rule (grade → metode) ────
CREATE TABLE IF NOT EXISTS overtime_rules (
    id              BIGSERIAL PRIMARY KEY,
    grade_id        BIGINT        NOT NULL REFERENCES grade(id),
    method          VARCHAR(20)   NOT NULL CHECK (method IN ('JAM_MATI', 'NORMATIF')),
    rate            NUMERIC(8,4)  NOT NULL DEFAULT 1.5,      -- pengali tarif per jam
    multiplier      NUMERIC(6,3)  NOT NULL DEFAULT 1.0,
    component_kode  VARCHAR(20)   NOT NULL DEFAULT 'RAPEL_LEMBURAN',
    effective_start DATE          NOT NULL DEFAULT CURRENT_DATE,
    effective_end   DATE,
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP     NOT NULL DEFAULT now(),
    UNIQUE (grade_id, effective_start)
);

-- Contoh mapping: grade rendah → Jam Mati, grade tinggi → Normatif (editable)
INSERT INTO overtime_rules (grade_id, method, rate, multiplier, effective_start)
SELECT id,
       CASE WHEN level <= 2 THEN 'JAM_MATI' ELSE 'NORMATIF' END,
       1.5, 1.0, DATE '2026-01-01'
FROM grade
ON CONFLICT (grade_id, effective_start) DO NOTHING;

-- ── Parameter C&B (settings section) ─────────
-- value bertipe JSONB; cut_off=22 (lock attendance), payday=27 (bayar gaji)
INSERT INTO settings (section, key, value) VALUES
  ('cb_parameter', 'cut_off_day',             '22'),
  ('cb_parameter', 'payday_day',              '27'),
  ('cb_parameter', 'salary_attendance_rule',  '"PRORATA_HARI"')
ON CONFLICT (section, key) DO NOTHING;
