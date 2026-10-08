import { z } from 'zod';

/** Buat pengajuan — dipanggil modul masa depan (reimbursement, cuti, dst.) */
export const createApprovalSchema = z.object({
  request_type: z
    .string()
    .min(1, 'Jenis pengajuan wajib diisi')
    .max(50)
    .transform((v) => v.toUpperCase()),
  title: z.string().min(1, 'Judul wajib diisi').max(200),
  description: z.string().max(2000).nullish(),
  amount: z.coerce.number('Harus berupa angka').nonnegative('Tidak boleh negatif').nullish(),
});

/** Putuskan satu step (approve/reject) */
export const decideApprovalSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED'], {
    message: 'Keputusan harus APPROVED atau REJECTED',
  }),
  notes: z.string().max(1000).nullish(),
});

export const approvalIdParamSchema = z.object({
  id: z.coerce.number().int().positive('ID tidak valid'),
});

export const approvalQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

export type CreateApprovalInput = z.infer<typeof createApprovalSchema>;
export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;

export interface ApprovalStepRow {
  id: number;
  step_no: number;
  approver_role: string;
  approver_id: number | null;
  status: 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED';
  decided_at: string | null;
  notes: string | null;
}

export interface ApprovalRequestRow {
  id: number;
  request_type: string;
  title: string;
  description: string | null;
  amount: number | null;
  requested_by: number;
  requested_by_name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  current_step: number;
  created_at: string;
  updated_at: string;
  steps: ApprovalStepRow[];
}
