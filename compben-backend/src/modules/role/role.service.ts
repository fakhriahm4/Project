import { AppError } from '@/middleware/errorHandler';
import { writeAuditLog } from '@utils/audit';
import { RoleRepository } from './role.repository';
import type { CreateRoleInput, UpdateRoleInput } from './role.types';

const roleRepository = new RoleRepository();

/** Role yang dilindungi dari nonaktif/hapus — fondasi RBAC sistem */
const PROTECTED_ROLE_KODE = 'SUPER_ADMIN';

export class RoleService {
  /** Daftar role + jumlah user aktif */
  async list() {
    return roleRepository.findAll();
  }

  async detail(id: number) {
    const role = await roleRepository.findById(id);
    if (!role) throw new AppError('Role tidak ditemukan', 404);
    return role;
  }

  async create(input: CreateRoleInput, currentUserId: number) {
    if (await roleRepository.findByKode(input.kode)) {
      throw new AppError('Kode role sudah digunakan', 400);
    }

    const id = await roleRepository.create(input);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'CREATE',
      table_name: 'roles',
      record_id: id,
      new_value: input,
    });

    return this.detail(id);
  }

  async update(id: number, input: UpdateRoleInput, currentUserId: number) {
    const existing = await roleRepository.findById(id);
    if (!existing) throw new AppError('Role tidak ditemukan', 404);

    if (existing.kode === PROTECTED_ROLE_KODE && input.is_active === false) {
      throw new AppError('Role Super Admin tidak dapat dinonaktifkan', 400);
    }

    await roleRepository.update(id, input);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'UPDATE',
      table_name: 'roles',
      record_id: id,
      old_value: { nama: existing.nama, deskripsi: existing.deskripsi, is_active: existing.is_active },
      new_value: input,
    });

    return this.detail(id);
  }

  async delete(id: number, currentUserId: number) {
    const existing = await roleRepository.findById(id);
    if (!existing) throw new AppError('Role tidak ditemukan', 404);

    if (existing.kode === PROTECTED_ROLE_KODE) {
      throw new AppError('Role Super Admin tidak dapat dihapus', 400);
    }

    const userCount = await roleRepository.countUsers(id);
    if (userCount > 0) {
      throw new AppError(
        `Role masih menampung ${userCount} user (aktif maupun nonaktif) — pindahkan user tersebut terlebih dahulu`,
        409
      );
    }

    await roleRepository.delete(id);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'DELETE',
      table_name: 'roles',
      record_id: id,
      old_value: existing,
    });

    return { message: 'Role berhasil dihapus' };
  }
}
