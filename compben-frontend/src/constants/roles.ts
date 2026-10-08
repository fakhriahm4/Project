import type { RoleCode } from '@/types/auth';

export interface RoleInfo {
  code: RoleCode;
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export const ROLES: Record<RoleCode, RoleInfo> = {
  SUPER_ADMIN: {
    code: 'SUPER_ADMIN',
    name: 'Super Admin',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
  ADMIN_CNB: {
    code: 'ADMIN_CNB',
    name: 'Admin C&B',
    color: 'emerald',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  HR_ADMIN: {
    code: 'HR_ADMIN',
    name: 'HR Admin',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  HR: {
    code: 'HR',
    name: 'HR',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  EMPLOYEE: {
    code: 'EMPLOYEE',
    name: 'Employee',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
  },
};

export const getRoleInfo = (roleCode: RoleCode): RoleInfo => {
  return ROLES[roleCode] || ROLES.EMPLOYEE;
};