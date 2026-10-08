import approvalRoutes from '@/modules/approval/approval.routes';
import authRoutes from '@/modules/auth/auth.routes';
import cbmasterRoutes from '@/modules/cbmaster/cbmaster.routes';
import dashboardRoutes from '@/modules/dashboard/dashboard.routes';
import employeesRoutes from '@/modules/employees/employees.routes';
import lookupRoutes from '@/modules/lookup/lookup.routes';
import notificationsRoutes from '@/modules/notifications/notifications.routes';
import { companyRoutes, divisiRoutes, gradeRoutes, jabatanRoutes } from '@/modules/organization/organization.routes';
import payrollRoutes, { attendanceRoutes } from '@/modules/payroll/payroll.routes';
import roleRoutes from '@/modules/role/role.routes';
import settingsRoutes from '@/modules/settings/settings.routes';
import userRoutes from '@/modules/user/user.routes';
import compression from 'compression';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { CORS_ORIGIN } from '@/config/env';
import errorHandler from '@/middleware/errorHandler';

const app: Application = express();

// Security & utility middleware
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/lookups', lookupRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/approvals', approvalRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/divisi', divisiRoutes);
app.use('/api/v1/jabatan', jabatanRoutes);
app.use('/api/v1/grades', gradeRoutes);               // Grade (baca login, tulis SUPER_ADMIN/ADMIN_CNB)
app.use('/api/v1/employees', employeesRoutes);   // Master Pegawai (baca bersama, tulis ADMIN_CNB)
app.use('/api/v1/cb', cbmasterRoutes);           // Master C&B (murni ADMIN_CNB)
app.use('/api/v1/payroll/periods', payrollRoutes); // Fase 1: periode gaji (murni ADMIN_CNB)
app.use('/api/v1/attendance', attendanceRoutes);   // Fase 1: absensi finger (murni ADMIN_CNB)

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (harus paling bawah)
app.use(errorHandler);

export default app;