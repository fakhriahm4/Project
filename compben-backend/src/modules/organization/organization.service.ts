import { AppError } from '@/middleware/errorHandler';
import { writeAuditLog } from '@utils/audit';
import { OrganizationRepository } from './organization.repository';
import type {
  CreateCompanyInput,
  CreateGradeInput,
  CreateMasterInput,
  MasterEntity,
  UpdateCompanyInput,
  UpdateGradeInput,
  UpdateMasterInput,
} from './organization.types';

const repository = new OrganizationRepository();

export class OrganizationService {
  // ============================================
  // MASTER: divisi / jabatan
  // ============================================

  async listMaster(entity: MasterEntity) {
    return repository.findAllMaster(entity);
  }

  async createMaster(
    entity: MasterEntity,
    input: CreateMasterInput,
    currentUserId: number
  ) {
    if (await repository.checkMasterDuplicate(entity, 'kode', input.kode)) {
      throw new AppError('Kode sudah digunakan', 400);
    }
    if (await repository.checkMasterDuplicate(entity, 'nama', input.nama)) {
      throw new AppError('Nama sudah terdaftar', 400);
    }

    const id = await repository.createMaster(entity, input);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'CREATE',
      table_name: entity,
      record_id: id,
      new_value: input,
    });

    return repository.findMasterById(entity, id);
  }

  async updateMaster(
    entity: MasterEntity,
    id: number,
    input: UpdateMasterInput,
    currentUserId: number
  ) {
    const existing = await repository.findMasterById(entity, id);
    if (!existing) throw new AppError('Data tidak ditemukan', 404);

    if (input.kode && (await repository.checkMasterDuplicate(entity, 'kode', input.kode, id))) {
      throw new AppError('Kode sudah digunakan', 400);
    }
    if (input.nama && (await repository.checkMasterDuplicate(entity, 'nama', input.nama, id))) {
      throw new AppError('Nama sudah terdaftar', 400);
    }

    await repository.updateMaster(entity, id, input);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'UPDATE',
      table_name: entity,
      record_id: id,
      old_value: existing,
      new_value: input,
    });

    return repository.findMasterById(entity, id);
  }

  async deleteMaster(entity: MasterEntity, id: number, currentUserId: number) {
    const existing = await repository.findMasterById(entity, id);
    if (!existing) throw new AppError('Data tidak ditemukan', 404);

    const userCount = await repository.countMasterUsers(entity, id);
    if (userCount > 0) {
      throw new AppError(
        `Masih menampung ${userCount} user (aktif maupun nonaktif) — pindahkan user tersebut terlebih dahulu`,
        409
      );
    }

    await repository.deleteMaster(entity, id);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'DELETE',
      table_name: entity,
      record_id: id,
      old_value: existing,
    });

    return { message: 'Data berhasil dihapus' };
  }

  // ============================================
  // GRADE — ditulis SUPER_ADMIN & ADMIN_CNB (perubahan tahunan)
  // ============================================

  async listGrades() {
    return repository.findAllGrades();
  }

  async createGrade(
    input: CreateGradeInput,
    currentUserId: number
  ) {
    if (await repository.checkGradeDuplicate('kode', input.kode)) {
      throw new AppError('Kode grade sudah digunakan', 400);
    }
    if (await repository.checkGradeDuplicate('nama', input.nama)) {
      throw new AppError('Nama grade sudah terdaftar', 400);
    }

    const id = await repository.createGrade(input);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'CREATE',
      table_name: 'grade',
      record_id: id,
      new_value: input,
    });

    return repository.findGradeById(id);
  }

  async updateGrade(
    id: number,
    input: UpdateGradeInput,
    currentUserId: number
  ) {
    const existing = await repository.findGradeById(id);
    if (!existing) throw new AppError('Grade tidak ditemukan', 404);

    if (input.kode && (await repository.checkGradeDuplicate('kode', input.kode, id))) {
      throw new AppError('Kode grade sudah digunakan', 400);
    }
    if (input.nama && (await repository.checkGradeDuplicate('nama', input.nama, id))) {
      throw new AppError('Nama grade sudah terdaftar', 400);
    }

    await repository.updateGrade(id, input);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'UPDATE',
      table_name: 'grade',
      record_id: id,
      old_value: existing,
      new_value: input,
    });

    return repository.findGradeById(id);
  }

  async deleteGrade(id: number, currentUserId: number) {
    const existing = await repository.findGradeById(id);
    if (!existing) throw new AppError('Grade tidak ditemukan', 404);

    const u = await repository.gradeUsage(id);
    const total = u.users + u.employees + u.structures + u.overtime;
    if (total > 0) {
      const parts: string[] = [];
      if (u.users) parts.push(`${u.users} user`);
      if (u.employees) parts.push(`${u.employees} pegawai`);
      if (u.structures) parts.push(`${u.structures} struktur compensation`);
      if (u.overtime) parts.push(`${u.overtime} aturan lembur`);
      throw new AppError(
        `Grade masih dipakai ${parts.join(', ')} — nonaktifkan saja agar riwayat payroll tetap utuh`,
        409
      );
    }

    await repository.deleteGrade(id);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'DELETE',
      table_name: 'grade',
      record_id: id,
      old_value: existing,
    });

    return { message: 'Grade berhasil dihapus' };
  }

  // ============================================
  // COMPANIES
  // ============================================

  async listCompanies() {
    return repository.findAllCompanies();
  }

  async createCompany(input: CreateCompanyInput, currentUserId: number) {
    const id = await repository.createCompany(input);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'CREATE',
      table_name: 'companies',
      record_id: id,
      new_value: input,
    });

    return repository.findCompanyById(id);
  }

  async updateCompany(
    id: number,
    input: UpdateCompanyInput,
    currentUserId: number
  ) {
    const existing = await repository.findCompanyById(id);
    if (!existing) throw new AppError('Perusahaan tidak ditemukan', 404);

    await repository.updateCompany(id, input);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'UPDATE',
      table_name: 'companies',
      record_id: id,
      old_value: existing,
      new_value: input,
    });

    return repository.findCompanyById(id);
  }

  async deleteCompany(id: number, currentUserId: number) {
    const existing = await repository.findCompanyById(id);
    if (!existing) throw new AppError('Perusahaan tidak ditemukan', 404);

    await repository.deleteCompany(id);

    await writeAuditLog({
      user_id: currentUserId,
      action: 'DELETE',
      table_name: 'companies',
      record_id: id,
      old_value: existing,
    });

    return { message: 'Perusahaan berhasil dihapus' };
  }
}
