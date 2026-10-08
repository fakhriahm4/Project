import { AppError } from '@/middleware/errorHandler';
import { writeAuditLog } from '@/utils/audit';
import { CbmasterRepository } from './cbmaster.repository';

/**
 * Service generik untuk 6 master C&B.
 * - Validasi referensi (grade/komponen) diserahkan ke FK → error pg 23503 → 400.
 * - Duplikasi (kode / unique) → error pg 23505 → 400.
 * - Semua perubahan dicatat ke audit_logs (acceptance #25).
 */
export class CbmasterService {
  constructor(private readonly repo = new CbmasterRepository()) {}

  async list(key: string) {
    return this.repo.list(key);
  }

  async create(key: string, data: Record<string, unknown>, userId: number) {
    let row: Record<string, unknown>;
    try {
      row = await this.repo.create(key, data);
    } catch (err) {
      throw mapPgError(err);
    }
    await this.audit(key, 'CREATE', userId, Number(row.id), undefined, row);
    return row;
  }

  async update(
    key: string,
    id: number,
    data: Record<string, unknown>,
    userId: number
  ) {
    const before = await this.repo.findById(key, id);
    if (!before) throw new AppError('Data tidak ditemukan', 404);
    let row: Record<string, unknown>;
    try {
      row = await this.repo.update(key, id, data);
    } catch (err) {
      throw mapPgError(err);
    }
    await this.audit(key, 'UPDATE', userId, id, before, row);
    return row;
  }

  async remove(key: string, id: number, userId: number) {
    const before = await this.repo.findById(key, id);
    if (!before) throw new AppError('Data tidak ditemukan', 404);
    await this.repo.remove(key, id);
    await this.audit(key, 'DELETE', userId, id, before, undefined);
    return true;
  }

  private async audit(
    key: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    userId: number,
    recordId: number,
    oldVal?: Record<string, unknown>,
    newVal?: Record<string, unknown>
  ) {
    // writeAuditLog sudah menangkap error internal → audit gagal tak menggagalkan operasi
    await writeAuditLog({
      user_id: userId,
      action,
      table_name: key,
      record_id: recordId,
      old_value: oldVal ?? null,
      new_value: newVal ?? null,
    });
  }
}

function mapPgError(err: unknown): AppError | unknown {
  const code = (err as { code?: string })?.code;
  if (code === '23505') {
    return new AppError('Kode/baris sudah digunakan (duplikat)', 400);
  }
  if (code === '23503') {
    return new AppError(
      'Referensi tidak dikenal — pastikan grade/komponen sudah ada',
      400
    );
  }
  if (code === '23514') {
    return new AppError('Nilai tidak diizinkan untuk field ini', 400);
  }
  if (code === '23502') {
    return new AppError('Field wajib belum diisi', 400);
  }
  if (code === '22007' || code === '22008') {
    return new AppError('Format tanggal tidak valid (YYYY-MM-DD)', 400);
  }
  if ((err as Error)?.message === 'EMPTY_UPDATE') {
    return new AppError('Tidak ada field yang diperbarui', 400);
  }
  return err;
}
