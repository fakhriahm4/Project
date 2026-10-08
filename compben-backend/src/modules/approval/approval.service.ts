import { AppError } from '@/middleware/errorHandler';
import { settingsService } from '@/modules/settings/settings.service';
import { notify } from '@/services/notification.service';
import { writeAuditLog } from '@utils/audit';
import { ApprovalRepository } from './approval.repository';
import type {
  ApprovalRequestRow,
  CreateApprovalInput,
  DecideApprovalInput,
} from './approval.types';

const repo = new ApprovalRepository();

/**
 * Engine approval generik.
 * - create : dipanggil modul masa depan (reimbursement, cuti, …) atau API test.
 * - decide : satu step per keputusan; chain approver dari settings approval.
 * - Notifikasi (in-app/email/webhook) lewat notify() — best-effort.
 */
export class ApprovalService {
  async create(
    input: CreateApprovalInput,
    userId: number
  ): Promise<ApprovalRequestRow> {
    // Chain: request_type → settings.chains; fallback default_chain
    const cfg = await settingsService.get('approval');
    const chain = cfg.chains[input.request_type] ?? cfg.default_chain;
    if (!chain || chain.length === 0) {
      throw new AppError(
        'Konfigurasi approval workflow belum diatur — isi di System Configuration → Approval Workflow',
        400
      );
    }

    const id = await repo.createRequest(
      {
        request_type: input.request_type,
        title: input.title,
        description: input.description ?? null,
        amount: input.amount ?? null,
        requested_by: userId,
      },
      chain
    );

    // Approver step 1 diberi tahu
    await this.notifyRole(chain[0], {
      event: 'approval_created',
      title: `Pengajuan "${input.title}" menunggu persetujuan`,
      body: `Jenis: ${input.request_type}${
        input.amount ? ` — Rp ${input.amount.toLocaleString('id-ID')}` : ''
      }`,
      type: 'APPROVAL',
      link: '/approval/pending',
    });

    await writeAuditLog({
      user_id: userId,
      action: 'CREATE',
      table_name: 'approval_requests',
      record_id: id,
      new_value: { ...input, chain },
    });

    return (await repo.findById(id))!;
  }

  async list(status?: string): Promise<ApprovalRequestRow[]> {
    return repo.list(status);
  }

  async decide(
    id: number,
    input: DecideApprovalInput,
    userId: number,
    roleCode: string
  ): Promise<ApprovalRequestRow> {
    const req = await repo.findById(id);
    if (!req) throw new AppError('Pengajuan tidak ditemukan', 404);
    if (req.status !== 'PENDING') {
      throw new AppError(`Pengajuan sudah ${req.status}`, 400);
    }

    const step = req.steps.find((s) => s.step_no === req.current_step);
    if (!step || step.status !== 'PENDING') {
      throw new AppError('Step persetujuan tidak dalam status aktif', 400);
    }
    // Role yang berhak: role approver step ini (SUPER_ADMIN boleh override)
    if (roleCode !== 'SUPER_ADMIN' && step.approver_role !== roleCode) {
      throw new AppError(
        `Anda bukan approver untuk step ini (dibutuhkan role ${step.approver_role})`,
        403
      );
    }

    await repo.decideStep(step.id, input.decision, userId, input.notes ?? null);

    if (input.decision === 'REJECTED') {
      await repo.setRequestStatus(req.id, 'REJECTED');
      await notify({
        userId: req.requested_by,
        event: 'approval_decided',
        title: `Pengajuan "${req.title}" DITOLAK`,
        body: input.notes
          ? `Catatan approver: ${input.notes}`
          : 'Pengajuan Anda ditolak oleh approver.',
        type: 'APPROVAL',
        link: '/approval/history',
      });
    } else {
      const next = req.steps.find((s) => s.step_no === req.current_step + 1);
      if (next) {
        // Masih ada level berikut → lanjut
        await repo.setCurrentStep(req.id, next.step_no);
        await repo.activateStep(req.id, next.step_no);
        await this.notifyRole(next.approver_role, {
          event: 'approval_created',
          title: `Pengajuan "${req.title}" menunggu persetujuan Anda`,
          body: `Level ${next.step_no} dari ${req.steps.length} — silakan putuskan di halaman Pending Approval.`,
          type: 'APPROVAL',
          link: '/approval/pending',
        });
      } else {
        // Seluruh level selesai → APPROVED
        await repo.setRequestStatus(req.id, 'APPROVED');
        await notify({
          userId: req.requested_by,
          event: 'approval_decided',
          title: `Pengajuan "${req.title}" DISETUJUI`,
          body: 'Seluruh level persetujuan telah selesai.',
          type: 'APPROVAL',
          link: '/approval/history',
        });
      }
    }

    await writeAuditLog({
      user_id: userId,
      action: 'UPDATE',
      table_name: 'approval_requests',
      record_id: req.id,
      old_value: { status: req.status, current_step: req.current_step },
      new_value: {
        decision: input.decision,
        step_no: req.current_step,
        notes: input.notes ?? null,
      },
    });

    return (await repo.findById(req.id))!;
  }

  private async notifyRole(
    roleCode: string,
    n: Omit<Parameters<typeof notify>[0], 'userId'>
  ): Promise<void> {
    const ids = await repo.userIdsByRole(roleCode);
    for (const uid of ids) {
      await notify({ userId: uid, ...n });
    }
  }
}

export const approvalService = new ApprovalService();
