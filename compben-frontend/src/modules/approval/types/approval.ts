/** Baris langkah persetujuan (approval_steps) */
export interface ApprovalStep {
  id: number;
  step_no: number;
  approver_role: string;
  approver_id: number | null;
  status: 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED';
  decided_at: string | null;
  notes: string | null;
}

/** Pengajuan (approval_requests) + langkah persetujuannya */
export interface ApprovalRequest {
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
  steps: ApprovalStep[];
}
