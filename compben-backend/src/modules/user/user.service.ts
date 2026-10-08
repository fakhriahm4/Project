import { AppError } from '@/middleware/errorHandler';
import { assertPasswordPolicy, settingsService } from '@/modules/settings/settings.service';
import { writeAuditLog } from '@utils/audit';
import bcrypt from 'bcrypt';
import { UserRepository } from './user.repository';
import type { CreateUserInput, UpdateUserInput, UserQuery } from './user.types';

const userRepository = new UserRepository();

/** Pesan duplikat — singgung user nonaktif agar jelas kenapa "hapus pun masih terpakai" */
const DUP_MESSAGES = {
  employee_id: 'NIP sudah terdaftar — termasuk user nonaktif',
  email: 'Email sudah terdaftar — termasuk user nonaktif',
  username: 'Username sudah terdaftar — termasuk user nonaktif',
} as const;

/**
 * Safety net: pelanggaran unique constraint (PG 23505) yang lolos pre-check
 * (race condition dsb) → 400 dengan pesan ramah, bukan 500.
 */
function throwFriendlyDuplicate(e: unknown): never {
  const err = e as { code?: string; constraint?: string };
  if (err?.code === '23505') {
    const c = err.constraint ?? '';
    if (c.includes('employee_id')) throw new AppError(DUP_MESSAGES.employee_id, 400);
    if (c.includes('email')) throw new AppError(DUP_MESSAGES.email, 400);
    if (c.includes('username')) throw new AppError(DUP_MESSAGES.username, 400);
    throw new AppError('Data sudah terdaftar', 400);
  }
  throw e;
}

export class UserService {
  // ============================================
  // LIST
  // ============================================
  async list(params: UserQuery, currentUserId: number) {
    return userRepository.findAll(params);
  }

  // ============================================
  // DETAIL
  // ============================================
  async detail(id: number) {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError('User tidak ditemukan', 404);
    return user;
  }

  // ============================================
  // CREATE
  // ============================================
  async create(input: CreateUserInput, currentUserId: number) {
    // Cek duplikat (semua baris — termasuk user nonaktif)
    if (await userRepository.checkDuplicate('employee_id', input.employee_id)) {
      throw new AppError(DUP_MESSAGES.employee_id, 400);
    }
    if (await userRepository.checkDuplicate('email', input.email)) {
      throw new AppError(DUP_MESSAGES.email, 400);
    }
    if (await userRepository.checkDuplicate('username', input.username)) {
      throw new AppError(DUP_MESSAGES.username, 400);
    }

    // Kebijakan panjang password dari settings.general
    assertPasswordPolicy(input.password, await settingsService.getGeneral());

    // Hash password
    const password_hash = await bcrypt.hash(input.password, 12);

    // Insert
    const id = await userRepository
      .create({
        ...input,
        password_hash,
        created_by: currentUserId,
      })
      .catch(throwFriendlyDuplicate);

    // Audit log
    await writeAuditLog({
      user_id: currentUserId,
      action: 'CREATE',
      table_name: 'users',
      record_id: id,
      new_value: { ...input, password: '***' },
    });

    return this.detail(id);
  }

  // ============================================
  // UPDATE
  // ============================================
  async update(id: number, input: UpdateUserInput, currentUserId: number) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError('User tidak ditemukan', 404);

    // Cek duplikat (exclude id, semua baris — termasuk user nonaktif)
    if (input.employee_id && (await userRepository.checkDuplicate('employee_id', input.employee_id, id))) {
      throw new AppError(DUP_MESSAGES.employee_id, 400);
    }
    if (input.email && (await userRepository.checkDuplicate('email', input.email, id))) {
      throw new AppError(DUP_MESSAGES.email, 400);
    }
    if (input.username && (await userRepository.checkDuplicate('username', input.username, id))) {
      throw new AppError(DUP_MESSAGES.username, 400);
    }

    const updateData: any = { ...input };

    // Hash password kalau diisi — sekalian reset umur password (kedaluwarsa)
    if (input.password) {
      assertPasswordPolicy(input.password, await settingsService.getGeneral());
      updateData.password_hash = await bcrypt.hash(input.password, 12);
      updateData.password_changed_at = new Date().toISOString();
      delete updateData.password;
    }

    await userRepository.update(id, updateData).catch(throwFriendlyDuplicate);

    // Audit log
    await writeAuditLog({
      user_id: currentUserId,
      action: 'UPDATE',
      table_name: 'users',
      record_id: id,
      old_value: existing,
      new_value: { ...input, password: input.password ? '***' : undefined },
    });

    return this.detail(id);
  }

  // ============================================
  // DELETE (Soft)
  // ============================================
  async delete(id: number, currentUserId: number) {
    const existing = await userRepository.findById(id);
    if (!existing) throw new AppError('User tidak ditemukan', 404);

    if (id === currentUserId) {
      throw new AppError('Tidak dapat menghapus akun sendiri', 400);
    }

    await userRepository.softDelete(id);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'DELETE',
      table_name: 'users',
      record_id: id,
      old_value: existing,
    });

    return { message: 'User berhasil dihapus' };
  }

  // ============================================
  // STATS
  // ============================================
  async stats() {
    return userRepository.getStats();
  }
}