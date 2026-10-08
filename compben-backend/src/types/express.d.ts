import type { RoleCode } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        roleId: number;
        roleCode: RoleCode;
      };
    }
  }
}

export { };
