export type RoleCode =
  | 'SUPER_ADMIN'
  | 'ADMIN_CNB'
  | 'HR_ADMIN'
  | 'HR'
  | 'EMPLOYEE';

export interface JwtPayload {
  userId: number;
  username: string;
  roleId: number;
  roleCode: RoleCode;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    userId: number;
    username: string;
    nama: string;
    email: string;
    roleId: number;
    roleCode: RoleCode;
    roleName: string;
  };
}