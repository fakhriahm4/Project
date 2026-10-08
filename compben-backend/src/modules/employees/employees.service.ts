import { AppError } from '@/middleware/errorHandler';
import { writeAuditLog } from '@/utils/audit';
import type { z } from 'zod';
import { EmployeesRepository } from './employees.repository';
import type { employeeQuerySchema } from './employees.types';

/**
 * Master Pegawai — RBAC: baca oleh SUPER_ADMIN/ADMIN_CNB/HR_ADMIN/HR,
 * tulis murni ADMIN_CNB (laman Admin C&B).
 */
export class EmployeesService {
  constructor(private readonly repo = new EmployeesRepository()) {}

  async list(f: z.infer<typeof employeeQuerySchema> = {}) {
    return this.repo.list(f);
  }

  async get(id: number) {
    const row = await this.repo.findById(id);
    if (!row) throw new AppError('Pegawai tidak ditemukan', 404);
    return row;
  }

  async create(data: Record<string, unknown>, userId: number) {
    let row: Record<string, unknown>;
    try {
      row = await this.repo.create(data);
    } catch (err) {
      throw mapPgError(err);
    }
    await writeAuditLog({
      user_id: userId,
      action: 'CREATE',
      table_name: 'employees',
      record_id: Number(row.id),
      new_value: row,
    });
    return row;
  }

  async update(
    id: number,
    data: Record<string, unknown>,
    userId: number
  ) {
    const before = await this.repo.findById(id);
    if (!before) throw new AppError('Pegawai tidak ditemukan', 404);

    // Guard: akun SUPER_ADMIN tak bisa dipaksa ikut payroll
    if (data.include_in_payroll === true && before.user_id) {
      const role = await this.repo.getUserRoleKode(Number(before.user_id));
      if (role === 'SUPER_ADMIN') {
        throw new AppError(
          'Akun Super Admin khusus administrator — tidak masuk perhitungan gaji',
          400
        );
      }
    }

    let row: Record<string, unknown>;
    try {
      row = await this.repo.update(id, data);
    } catch (err) {
      throw mapPgError(err);
    }
    await writeAuditLog({
      user_id: userId,
      action: 'UPDATE',
      table_name: 'employees',
      record_id: id,
      old_value: before,
      new_value: row,
    });
    return row;
  }

  async remove(id: number, userId: number) {
    const before = await this.repo.findById(id);
    if (!before) throw new AppError('Pegawai tidak ditemukan', 404);
    // Baris tertaut akun login tak boleh dihapus — dijaga trigger sinkron
    // (akan tercipta lagi saat user berikutnya di-update). Nonaktifkan saja.
    if (before.user_id) {
      throw new AppError(
        'Pegawai ini terhubung dengan akun login — nonaktifkan lewat Manajemen User, jangan dihapus',
        409
      );
    }
    await this.repo.remove(id);
    await writeAuditLog({
      user_id: userId,
      action: 'DELETE',
      table_name: 'employees',
      record_id: id,
      old_value: before,
    });
    return true;
  }
}

function mapPgError(err: unknown): AppError | unknown {
  const code = (err as { code?: string })?.code;
  if (code === '23505') return new AppError('NIP sudah terdaftar', 400);
  if (code === '23503') {
    return new AppError(
      'Referensi tidak dikenal — pastikan company/divisi/jabatan/grade sudah ada',
      400
    );
  }
  if (code === '23514') {
    return new AppError('Nilai tidak diizinkan untuk field ini', 400);
  }
  if ((err as Error)?.message === 'EMPTY_UPDATE') {
    return new AppError('Tidak ada field yang diperbarui', 400);
  }
  return err;
}
