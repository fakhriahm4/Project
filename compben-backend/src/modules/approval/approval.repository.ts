import { query, transaction } from '@/config/database';
import type { ApprovalRequestRow, ApprovalStepRow } from './approval.types';

const SELECT_REQUEST = `
  SELECT
    r.id::int, r.request_type, r.title, r.description,
    r.amount::float AS amount,
    r.requested_by::int, u.nama AS requested_by_name,
    r.status, r.current_step::int,
    r.created_at::text, r.updated_at::text,
    COALESCE(
      (SELECT json_agg(json_build_object(
         'id', s.id::int,
         'step_no', s.step_no::int,
         'approver_role', s.approver_role,
         'approver_id', s.approver_id::int,
         'status', s.status,
         'decided_at', s.decided_at::text,
         'notes', s.notes
       ) ORDER BY s.step_no)
       FROM approval_steps s WHERE s.request_id = r.id),
      '[]'::json
    ) AS steps
  FROM approval_requests r
  JOIN users u ON u.id = r.requested_by`;

export class ApprovalRepository {
  /** Insert request + seluruh step (transaction) → id */
  async createRequest(
    data: {
      request_type: string;
      title: string;
      description: string | null;
      amount: number | null;
      requested_by: number;
    },
    chain: string[]
  ): Promise<number> {
    return transaction(async (client) => {
      const r = await client.query(
        `INSERT INTO approval_requests
           (request_type, title, description, amount, requested_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [data.request_type, data.title, data.description, data.amount, data.requested_by]
      );
      const id: number = r.rows[0].id;

      for (let i = 0; i < chain.length; i++) {
        await client.query(
          `INSERT INTO approval_steps (request_id, step_no, approver_role, status)
           VALUES ($1, $2, $3, $4)`,
          [id, i + 1, chain[i], i === 0 ? 'PENDING' : 'WAITING']
        );
      }
      return id;
    });
  }

  async findById(id: number): Promise<ApprovalRequestRow | null> {
    const r = await query<ApprovalRequestRow>(
      `${SELECT_REQUEST} WHERE r.id = $1`,
      [id]
    );
    return r.rows[0] || null;
  }

  async list(status?: string): Promise<ApprovalRequestRow[]> {
    const r = await query<ApprovalRequestRow>(
      `${SELECT_REQUEST}
       WHERE ($1::text IS NULL OR r.status = $1)
       ORDER BY r.created_at DESC
       LIMIT 100`,
      [status ?? null]
    );
    return r.rows;
  }

  /** Tandai step telah diputus + catat siapa yang memutus */
  async decideStep(
    stepId: number,
    decision: 'APPROVED' | 'REJECTED',
    approverId: number,
    notes: string | null
  ): Promise<void> {
    await query(
      `UPDATE approval_steps
         SET status = $1, approver_id = $2, notes = $3, decided_at = NOW()
       WHERE id = $4`,
      [decision, approverId, notes, stepId]
    );
  }

  async setCurrentStep(requestId: number, stepNo: number): Promise<void> {
    await query(
      `UPDATE approval_requests
         SET current_step = $1, updated_at = NOW()
       WHERE id = $2`,
      [stepNo, requestId]
    );
  }

  /** Aktifkan step berikutnya (WAITING → PENDING) */
  async activateStep(requestId: number, stepNo: number): Promise<void> {
    await query(
      `UPDATE approval_steps SET status = 'PENDING'
       WHERE request_id = $1 AND step_no = $2 AND status = 'WAITING'`,
      [requestId, stepNo]
    );
  }

  async setRequestStatus(
    requestId: number,
    status: 'APPROVED' | 'REJECTED'
  ): Promise<void> {
    await query(
      `UPDATE approval_requests SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, requestId]
    );
  }

  /** ID user aktif dengan role tertentu — penerima notifikasi approver */
  async userIdsByRole(roleCode: string): Promise<number[]> {
    const r = await query<{ id: number }>(
      `SELECT u.id::int FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE r.kode = $1 AND u.is_active = TRUE`,
      [roleCode]
    );
    return r.rows.map((x) => x.id);
  }
}

export type { ApprovalStepRow };
