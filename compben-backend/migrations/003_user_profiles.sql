-- ============================================
-- 003: Data diri user (diisi employee di halaman Profil)
--       + preferensi akun (Pengaturan)
-- ============================================

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id                BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    nik                    VARCHAR(30),
    jenis_kelamin          VARCHAR(10) CHECK (jenis_kelamin IN ('L', 'P')),
    tempat_lahir           VARCHAR(100),
    tanggal_lahir          DATE,
    alamat                 TEXT,
    agama                  VARCHAR(20),
    status_kawin           VARCHAR(20),
    kontak_darurat_nama    VARCHAR(150),
    kontak_darurat_hubungan VARCHAR(50),
    kontak_darurat_hp      VARCHAR(20),
    npwp                   VARCHAR(30),
    nama_bank              VARCHAR(50),
    no_rekening            VARCHAR(30),
    pendidikan_terakhir    VARCHAR(50),
    created_at             TIMESTAMP NOT NULL DEFAULT now(),
    updated_at             TIMESTAMP
);

-- Preferensi akun (notif dsb) — JSONB fleksibel utk modul notifikasi mendatang
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';
