import api from '@/services/api';

/**
 * Service Fase 1 — Payroll Period & Attendance (murni ADMIN_CNB).
 * Interceptor api sudah unwrap body { success, data } → hasil = data.
 */

export interface PayrollPeriod {
  id: number;
  period_month: string; // 'YYYY-MM'
  status: 'OPEN' | 'LOCKED' | 'PAID';
  cut_off_day: number;
  payday_day: number;
  locked_at: string | null;
  paid_at: string | null;
  attendance_count: number;
  created_at: string;
}

export interface MatrixEmployee {
  id: number;
  employee_id: string;
  nama: string;
  divisi_nama: string | null;
  jabatan_nama: string | null;
}

export interface AttendanceEntry {
  employee_id: number;
  tanggal: string; // 'YYYY-MM-DD'
  status: 'HADIR' | 'SAKIT' | 'IZIN' | 'CUTI' | 'ALPHA' | 'LOCKED_ASSUMED_PRESENT';
  jam_masuk: string | null;
  jam_keluar: string | null;
  source: string;
  keterangan: string | null;
}

export interface MatrixData {
  period: PayrollPeriod;
  lock_date: string; // 'YYYY-MM-DD'
  writable: boolean;
  employees: MatrixEmployee[];
  entries: AttendanceEntry[];
}

export interface ImportRowError {
  row: number;
  message: string;
}

export interface ImportResult {
  filename: string;
  total_rows: number;
  imported: number;
  updated: number;
  errors: ImportRowError[];
}

type Envelope<T> = { success: boolean; data: T };

function unwrap<T>(p: Promise<unknown>): Promise<T> {
  return p.then((r) => (r as Envelope<T>).data);
}

function saveBlobAs(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const payrollService = {
  periods: {
    list: () => unwrap<PayrollPeriod[]>(api.get('/payroll/periods')),
    create: (period_month: string) =>
      unwrap<PayrollPeriod>(api.post('/payroll/periods', { period_month })),
    lock: (id: number) =>
      unwrap<PayrollPeriod>(api.put(`/payroll/periods/${id}/lock`)),
    pay: (id: number) =>
      unwrap<PayrollPeriod>(api.put(`/payroll/periods/${id}/pay`)),
    remove: async (id: number) => {
      await api.delete(`/payroll/periods/${id}`);
    },
  },
  attendance: {
    matrix: (periodId: number) =>
      unwrap<MatrixData>(
        api.get('/attendance/matrix', { params: { period_id: periodId } })
      ),
    saveCell: (payload: {
      employee_id: number;
      tanggal: string;
      status: 'HADIR' | 'SAKIT' | 'IZIN' | 'CUTI' | 'ALPHA';
      jam_masuk?: string | null;
      jam_keluar?: string | null;
      keterangan?: string | null;
    }) => unwrap<AttendanceEntry>(api.put('/attendance/cell', payload)),
    deleteCell: async (employeeId: number, tanggal: string) => {
      await api.delete('/attendance/cell', {
        params: { employee_id: employeeId, tanggal },
      });
    },
    /** Upload hasil export finger (multipart field "file" + period_id) */
    import: (file: File, periodId: number) => {
      const form = new FormData();
      form.append('file', file);
      form.append('period_id', String(periodId));
      return unwrap<ImportResult>(
        api.post('/attendance/import', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
    },
    downloadTemplate: async () => {
      const blob = (await api.get('/attendance/template', {
        responseType: 'blob',
      })) as unknown as Blob;
      saveBlobAs(blob, 'template-absensi.xlsx');
    },
  },
};

export default payrollService;
