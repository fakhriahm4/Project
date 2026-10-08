import type { RoleCode, User } from '@/types/auth';
import api from '@/services/api';
import { useAppSettingsStore } from '@/stores/appSettings';

export interface LoginPayload {
  username: string;
  password: string;
}

// Bentuk user dari backend (module auth)
export interface AuthUser {
  userId: number;
  username: string;
  nama: string;
  email: string;
  roleId: number;
  roleCode: RoleCode;
  roleName: string;
  /** TRUE = wajib ganti password saat login pertama (hasil import) */
  mustChangePassword?: boolean;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

/** Data diri — diisi employee di halaman Profil */
export interface ProfileData {
  nik: string | null;
  jenis_kelamin: 'L' | 'P' | null;
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  alamat: string | null;
  agama: string | null;
  status_kawin: string | null;
  kontak_darurat_nama: string | null;
  kontak_darurat_hubungan: string | null;
  kontak_darurat_hp: string | null;
  npwp: string | null;
  nama_bank: string | null;
  no_rekening: string | null;
  pendidikan_terakhir: string | null;
}

/** Hasil GET /auth/me — info akun + data diri + kelengkapan */
export interface MeProfile extends AuthUser {
  employeeId: string;
  noHp: string | null;
  divisiNama: string | null;
  jabatanNama: string | null;
  gradeKode: string | null;
  gradeNama: string | null;
  status: string;
  tanggalMasuk: string;
  avatarUrl: string | null;
  lastLogin: string | null;
  preferences: { notif_email?: boolean; notif_app?: boolean };
  completeness: number;
  profile: ProfileData;
}

export const authService = {
  /** POST /auth/login → { accessToken, user } */
  async login(payload: LoginPayload): Promise<LoginResult> {
    const res = await api.post('/auth/login', payload);
    return res.data;
  },

  /** GET /auth/me — profil terbaru (untuk hydrate setelah refresh) */
  async me(): Promise<MeProfile> {
    const res = await api.get('/auth/me');
    return res.data;
  },

  /** PUT /auth/profile — simpan data diri sendiri */
  async updateProfile(payload: Partial<ProfileData>): Promise<MeProfile> {
    const res = await api.put('/auth/profile', payload);
    return res.data;
  },

  /** PUT /auth/change-password → respons: { success, message } (bukan data wrapper) */
  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> {
    const res = await api.put('/auth/change-password', payload);
    return res as unknown as { message: string };
  },

  /** PUT /auth/preferences — simpan preferensi akun */
  async savePreferences(payload: {
    notif_email: boolean;
    notif_app: boolean;
  }): Promise<{ preferences: { notif_email: boolean; notif_app: boolean } }> {
    const res = await api.put('/auth/preferences', payload);
    return res.data;
  },

  /** Map AuthUser (backend) → User (tipe store frontend) */
  toStoreUser(authUser: AuthUser): User {
    return {
      userId: authUser.userId,
      username: authUser.username,
      fullName: authUser.nama,
      email: authUser.email,
      roleId: authUser.roleId,
      roleCode: authUser.roleCode,
      roleName: authUser.roleName,
      mustChangePassword: authUser.mustChangePassword ?? false,
      // Identitas perusahaan dari System Configuration (GET /settings/public)
      companyName: useAppSettingsStore().companyName,
    };
  },
};

export default authService;
