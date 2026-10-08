import api from '@/services/api';
import type { ApprovalRequest } from '../types/approval';

/**
 * Approval engine — endpoint /approvals.
 * Interceptor api sudah unwrap body { success, data }.
 */
export const approvalService = {
  /** status: PENDING | APPROVED | REJECTED — tanpa status = semua */
  async list(status?: string): Promise<{ data: ApprovalRequest[] }> {
    const res = await api.get('/approvals', {
      params: status ? { status } : {},
    });
    return res as unknown as { data: ApprovalRequest[] };
  },

  /** Putuskan satu step */
  async decide(
    id: number,
    payload: { decision: 'APPROVED' | 'REJECTED'; notes?: string | null }
  ): Promise<{ data: ApprovalRequest }> {
    const res = await api.post(`/approvals/${id}/decide`, payload);
    return res as unknown as { data: ApprovalRequest };
  },
};

export default approvalService;
