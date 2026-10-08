import api from '@/services/api';
import type {
  BpjsComponent,
  CompensationStructure,
  DeductionMaster,
  EmployeePayload,
  EmployeeRow,
  OvertimeRule,
  PayrollComponent,
  Pph21TerRow,
} from '../types/cb';

/**
 * Service Master C&B — semua endpoint di bawah /cb murni ADMIN_CNB,
 * /employees: baca (SUPER_ADMIN/ADMIN_CNB/HR_ADMIN/HR), tulis ADMIN_CNB.
 * Interceptor api sudah unwrap body { success, data } → res = data.
 */

type ListRes<T> = { success: boolean; data: T };
type ItemRes<T> = { success: boolean; data: T };

async function list<T>(path: string): Promise<T[]> {
  const res = (await api.get(path)) as unknown as ListRes<T[]>;
  return res.data;
}

async function create<T>(path: string, payload: unknown): Promise<T> {
  const res = (await api.post(path, payload)) as unknown as ItemRes<T>;
  return res.data;
}

async function update<T>(path: string, id: number, payload: unknown): Promise<T> {
  const res = (await api.put(`${path}/${id}`, payload)) as unknown as ItemRes<T>;
  return res.data;
}

async function remove(path: string, id: number): Promise<void> {
  await api.delete(`${path}/${id}`);
}

export const cbService = {
  components: {
    list: () => list<PayrollComponent>('/cb/components'),
    create: (p: unknown) => create<PayrollComponent>('/cb/components', p),
    update: (id: number, p: unknown) => update<PayrollComponent>('/cb/components', id, p),
    remove: (id: number) => remove('/cb/components', id),
  },
  structures: {
    list: () => list<CompensationStructure>('/cb/structures'),
    create: (p: unknown) => create<CompensationStructure>('/cb/structures', p),
    update: (id: number, p: unknown) => update<CompensationStructure>('/cb/structures', id, p),
    remove: (id: number) => remove('/cb/structures', id),
  },
  bpjs: {
    list: () => list<BpjsComponent>('/cb/bpjs'),
    create: (p: unknown) => create<BpjsComponent>('/cb/bpjs', p),
    update: (id: number, p: unknown) => update<BpjsComponent>('/cb/bpjs', id, p),
    remove: (id: number) => remove('/cb/bpjs', id),
  },
  tax: {
    list: () => list<Pph21TerRow>('/cb/tax'),
    create: (p: unknown) => create<Pph21TerRow>('/cb/tax', p),
    update: (id: number, p: unknown) => update<Pph21TerRow>('/cb/tax', id, p),
    remove: (id: number) => remove('/cb/tax', id),
  },
  deductions: {
    list: () => list<DeductionMaster>('/cb/deductions'),
    create: (p: unknown) => create<DeductionMaster>('/cb/deductions', p),
    update: (id: number, p: unknown) => update<DeductionMaster>('/cb/deductions', id, p),
    remove: (id: number) => remove('/cb/deductions', id),
  },
  overtimeRules: {
    list: () => list<OvertimeRule>('/cb/overtime-rules'),
    create: (p: unknown) => create<OvertimeRule>('/cb/overtime-rules', p),
    update: (id: number, p: unknown) => update<OvertimeRule>('/cb/overtime-rules', id, p),
    remove: (id: number) => remove('/cb/overtime-rules', id),
  },
  employees: {
    list: (params?: { q?: string; status?: 'all' | 'active' | 'inactive' }) =>
      list<EmployeeRow>(
        '/employees' +
          (params
            ? '?' +
              Object.entries(params)
                .filter(([, v]) => v !== undefined && v !== '' && v !== 'all')
                .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
                .join('&')
            : '')
      ),
    create: (p: EmployeePayload) => create<EmployeeRow>('/employees', p),
    update: (id: number, p: EmployeePayload) => update<EmployeeRow>('/employees', id, p),
    remove: (id: number) => remove('/employees', id),
  },
};

export default cbService;
