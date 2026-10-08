export type RoleCode =
  | 'SUPER_ADMIN'
  | 'ADMIN_CNB'
  | 'HR_ADMIN'
  | 'HR'
  | 'EMPLOYEE';

export interface User {
  userId: number;
  username: string;
  fullName: string;
  email: string;
  roleId: number;
  roleCode: RoleCode;
  roleName: string;
  companyName: string;
  avatar?: string;
  /** TRUE = wajib ganti password dulu (hasil import) sebelum ke halaman lain */
  mustChangePassword?: boolean;
}