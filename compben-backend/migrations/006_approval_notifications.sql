-- ============================================
-- 006: System Configuration — Approval Workflow,
--       Notification, Integration
--       - Engine approval generik (requests + steps)
--       - Inbox notifikasi in-app
--       - Seed 3 section settings baru
-- ============================================

-- ── Approval engine ──────────────────────────
CREATE TABLE IF NOT EXISTS approval_requests (
    id           BIGSERIAL PRIMARY KEY,
    request_type VARCHAR(50)   NOT NULL,          -- mis. REIMBURSEMENT, CUTI, DEFAULT
    title        VARCHAR(200)  NOT NULL,
    description  TEXT,
    amount       NUMERIC(15,2),
    requested_by BIGINT        NOT NULL REFERENCES users(id),
    status       VARCHAR(20)   NOT NULL DEFAULT 'PENDING'
                 CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    current_step INT           NOT NULL DEFAULT 1,
    created_at   TIMESTAMP     NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approval_steps (
    id            BIGSERIAL PRIMARY KEY,
    request_id    BIGINT      NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    step_no       INT         NOT NULL,
    approver_role VARCHAR(50) NOT NULL,           -- role code yg berhak memutus step ini
    approver_id   BIGINT      REFERENCES users(id), -- user yg benar2 memutus
    status        VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                  CHECK (status IN ('WAITING', 'PENDING', 'APPROVED', 'REJECTED')),
    decided_at    TIMESTAMP,
    notes         TEXT,
    created_at    TIMESTAMP   NOT NULL DEFAULT now(),
    UNIQUE (request_id, step_no)
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status
    ON approval_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_steps_request
    ON approval_steps (request_id, step_no);

-- ── Inbox notifikasi (in-app) ────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(200) NOT NULL,
    body       TEXT,
    type       VARCHAR(50)  NOT NULL DEFAULT 'SYSTEM',
    link       VARCHAR(255),
    is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
    ON notifications (user_id, is_read, created_at DESC);

-- ── Seed 3 section settings ──────────────────
-- (ON CONFLICT → tidak menimpa nilai admin)

-- Approval Workflow: chain approver per request_type
INSERT INTO settings (section, key, value) VALUES
  ('approval', 'chains',
     '{"DEFAULT": ["HR_ADMIN"]}'),
  ('approval', 'default_chain',
     '["HR_ADMIN"]')
ON CONFLICT (section, key) DO NOTHING;

-- Notification: channel, event matrix, SMTP
INSERT INTO settings (section, key, value) VALUES
  ('notification', 'inapp_enabled',  'true'),
  ('notification', 'email_enabled',  'false'),
  ('notification', 'events',
     '{"approval_created": {"inapp": true,  "email": false},
       "approval_decided": {"inapp": true,  "email": false}}'),
  ('notification', 'smtp_host',      '""'),
  ('notification', 'smtp_port',      '587'),
  ('notification', 'smtp_secure',    'false'),
  ('notification', 'smtp_user',      '""'),
  ('notification', 'smtp_password',  '""'),
  ('notification', 'smtp_from',      '""')
ON CONFLICT (section, key) DO NOTHING;

-- Integration: webhook keluar
INSERT INTO settings (section, key, value) VALUES
  ('integration', 'webhook_enabled', 'false'),
  ('integration', 'webhook_url',     '""'),
  ('integration', 'webhook_secret',  '""'),
  ('integration', 'webhook_events',
     '["approval_created", "approval_decided"]')
ON CONFLICT (section, key) DO NOTHING;
