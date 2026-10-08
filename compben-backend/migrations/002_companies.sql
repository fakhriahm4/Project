-- ============================================
-- CompBen Platform — Migration 002: Companies
-- Dijalankan: node scripts/run-sql.js migrations/002_companies.sql
-- Idempoten: memakai IF NOT EXISTS
-- ============================================

-- COMPANIES (master perusahaan / entitas legal)
CREATE TABLE IF NOT EXISTS companies (
    id          BIGSERIAL PRIMARY KEY,
    nama        VARCHAR(150) NOT NULL,
    alamat      TEXT,
    email       VARCHAR(150),
    no_hp       VARCHAR(20),
    npwp        VARCHAR(30),
    deskripsi   TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP
);
