import { JWT_SECRET } from '@/config/env';
import { AppError } from '@/middleware/errorHandler';
import { assertPasswordPolicy, jwtExpiresFrom, settingsService } from '@/modules/settings/settings.service';
import { writeAuditLog } from '@utils/audit';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../user/user.repository';
import { AuthRepository } from './auth.repository';
import {
    PROFILE_FIELDS,
    type AuthUserRow,
    type ChangePasswordInput,
    type LoginInput,
    type PreferencesInput,
    type UpdateProfileInput,
} from './auth.types';

const userRepository = new UserRepository();
const authRepository = new AuthRepository();

export class AuthService {
  /**
   * Login: verifikasi kredensial → terbitkan access token (JWT).
   * Pesan error sengaja disatukan agar tidak membocorkan
   * apakah username terdaftar atau tidak.
   */
  async login(
    input: LoginInput,
    meta?: { ip?: string; userAgent?: string }
  ) {
    // 0. Kebijakan password & session dari settings (cached)
    const settings = await settingsService.getGeneral();

    // 1. Cari user by username
    const user = (await userRepository.findByUsername(
      input.username
    )) as AuthUserRow | undefined;

    if (!user) {
      throw new AppError('Username atau password salah', 401);
    }

    // 2. Akun terkunci? (percobaan gagal berturut-turut)
    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      throw new AppError(
        'Akun dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi.',
        423
      );
    }

    // 3. Bandingkan password
    const valid = await bcrypt.compare(input.password, user.password_hash);
    if (!valid) {
      // Catat gagal; mencapai batas → kunci akun selama login_lockout_minutes
      const attempts = (user.failed_login_attempts ?? 0) + 1;
      const maxAttempts = settings.login_max_attempts;
      if (maxAttempts > 0 && attempts >= maxAttempts) {
        await authRepository.lockAccount(user.id, attempts, settings.login_lockout_minutes);
        throw new AppError(
          'Akun dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi.',
          423
        );
      }
      await authRepository.incrementFailedLogin(user.id, attempts);
      throw new AppError('Username atau password salah', 401);
    }

    // 4. Cek status akun
    if (user.status !== 'ACTIVE') {
      throw new AppError('Akun Anda tidak aktif', 403);
    }

    // 5. Password benar → lepas kunci & hitungan gagal (jika ada)
    if ((user.failed_login_attempts ?? 0) > 0 || user.locked_until) {
      await authRepository.resetFailedLogin(user.id);
    }

    // 6. Umur password melebihi password_max_age_days? → wajib ganti
    //    (0 = tidak pernah kedaluwarsa; flag menempel sampai ganti password)
    if (settings.password_max_age_days > 0 && user.password_changed_at) {
      const ageMs = Date.now() - new Date(user.password_changed_at).getTime();
      if (ageMs > settings.password_max_age_days * 86_400_000) {
        await authRepository.markMustChangePassword(user.id);
        user.must_change_password = true;
      }
    }

    // 7. Terbitkan access token (masa berlaku dari settings.general,
    //    fallback env JWT_ACCESS_EXPIRES)
    const accessToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        roleId: user.role_id,
        roleCode: user.role_kode,
      },
      JWT_SECRET,
      { expiresIn: jwtExpiresFrom(settings) } as jwt.SignOptions
    );

    // 5. Catat last_login + audit
    await userRepository.updateLastLogin(user.id);
    await writeAuditLog({
      user_id: user.id,
      action: 'LOGIN',
      table_name: 'users',
      record_id: user.id,
      ip_address: meta?.ip,
      user_agent: meta?.userAgent,
    });

    return {
      accessToken,
      user: {
        userId: user.id,
        username: user.username,
        nama: user.nama,
        email: user.email,
        roleId: user.role_id,
        roleCode: user.role_kode,
        roleName: user.role_nama,
        mustChangePassword: user.must_change_password,
      },
    };
  }

  /** Profil terbaru utk GET /auth/me */
  async me(userId: number) {
    const profile = await this.profile(userId);
    if (!profile) throw new AppError('User tidak ditemukan', 404);
    return profile;
  }

  async profile(userId: number) {
    const row = await authRepository.findProfileById(userId);
    if (!row) return null;

    // Data diri (dipisah dari info akun)
    const profileData: Record<string, string | null> = {};
    for (const f of PROFILE_FIELDS) profileData[f] = row[f] ?? null;

    // Kelengkapan profil (%): jumlah field terisi / total field
    const filled = PROFILE_FIELDS.filter((f) => row[f] !== null && row[f] !== undefined && row[f] !== '').length;
    const completeness = Math.round((filled / PROFILE_FIELDS.length) * 100);

    const preferences =
      typeof row.preferences === 'string' ? JSON.parse(row.preferences) : row.preferences || {};

    return {
      userId: row.id,
      employeeId: row.employee_id,
      username: row.username,
      nama: row.nama,
      email: row.email,
      noHp: row.no_hp,
      roleId: row.role_id,
      roleCode: row.role_kode,
      roleName: row.role_nama,
      divisiNama: row.divisi_nama,
      jabatanNama: row.jabatan_nama,
      gradeKode: row.grade_kode,
      gradeNama: row.grade_nama,
      status: row.status,
      tanggalMasuk: row.tanggal_masuk,
      avatarUrl: row.avatar_url,
      lastLogin: row.last_login,
      mustChangePassword: row.must_change_password === true,
      preferences,
      completeness,
      profile: profileData,
    };
  }

  /**
   * Update data diri sendiri (employee hanya boleh ubah miliknya sendiri).
   * Kolom akun (role/divisi/status dsb) TIDAK bisa lewat sini — itu urusan admin.
   */
  async updateProfile(userId: number, input: UpdateProfileInput) {
    const existing = await this.profile(userId);
    if (!existing) throw new AppError('User tidak ditemukan', 404);

    // Normalisasi: string kosong → NULL (agar progress kelengkapan akurat)
    const data: Record<string, any> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined) continue;
      data[k] = v === '' ? null : v;
    }
    if (Object.keys(data).length === 0) {
      throw new AppError('Tidak ada perubahan untuk disimpan', 400);
    }

    await authRepository.upsertProfile(userId, data);

    await writeAuditLog({
      user_id: userId,
      action: 'UPDATE',
      table_name: 'user_profiles',
      record_id: userId,
      old_value: existing.profile,
      new_value: data,
    });

    return this.profile(userId);
  }

  /** Ganti password — verifikasi password lama dulu. */
  async changePassword(userId: number, input: ChangePasswordInput) {
    // Kebijakan panjang password dari settings.general
    const settings = await settingsService.getGeneral();
    assertPasswordPolicy(input.newPassword, settings);

    const currentHash = await authRepository.findPasswordHash(userId);
    if (!currentHash) throw new AppError('User tidak ditemukan', 404);

    const valid = await bcrypt.compare(input.currentPassword, currentHash);
    if (!valid) throw new AppError('Password lama tidak sesuai', 400);

    if (input.currentPassword === input.newPassword) {
      throw new AppError('Password baru tidak boleh sama dengan password lama', 400);
    }

    const newHash = await bcrypt.hash(input.newPassword, 12);
    await authRepository.updatePassword(userId, newHash);

    await writeAuditLog({
      user_id: userId,
      action: 'UPDATE',
      table_name: 'users',
      record_id: userId,
      new_value: { password: '***' },
    });

    return { message: 'Password berhasil diubah' };
  }

  /** Simpan preferensi akun (notif dsb). */
  async updatePreferences(userId: number, preferences: PreferencesInput) {
    const existing = await this.profile(userId);
    if (!existing) throw new AppError('User tidak ditemukan', 404);

    await authRepository.updatePreferences(userId, preferences);

    await writeAuditLog({
      user_id: userId,
      action: 'UPDATE',
      table_name: 'users',
      record_id: userId,
      old_value: { preferences: existing.preferences },
      new_value: { preferences },
    });

    return { preferences };
  }
}
