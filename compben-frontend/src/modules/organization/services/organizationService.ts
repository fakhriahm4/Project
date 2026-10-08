import api from '@/services/api';
import type {
  Company,
  CompanyPayload,
  GradeItem,
  GradePayload,
  MasterEntity,
  MasterItem,
  MasterPayload,
} from '../types/organization';

/**
 * Endpoint organization:
 * - GET  : semua role terotentikasi
 * - Tulis: divisi/jabatan/perusahaan hanya SUPER_ADMIN; grade juga ADMIN_CNB
 *   (dicek backend)
 *
 * Interceptor api sudah unwrap body { success, data }.
 */
export const organizationService = {
  masters: {
    async list(entity: MasterEntity): Promise<{ data: MasterItem[] }> {
      const res = await api.get(`/${entity}`);
      return res as unknown as { data: MasterItem[] };
    },

    async create(
      entity: MasterEntity,
      payload: MasterPayload
    ): Promise<{ data: MasterItem }> {
      const res = await api.post(`/${entity}`, payload);
      return res as unknown as { data: MasterItem };
    },

    async update(
      entity: MasterEntity,
      id: number,
      payload: MasterPayload
    ): Promise<{ data: MasterItem }> {
      const res = await api.put(`/${entity}/${id}`, payload);
      return res as unknown as { data: MasterItem };
    },

    async remove(entity: MasterEntity, id: number): Promise<{ message?: string }> {
      const res = await api.delete(`/${entity}/${id}`);
      return res as unknown as { message?: string };
    },
  },

  grades: {
    async list(): Promise<{ data: GradeItem[] }> {
      const res = await api.get('/grades');
      return res as unknown as { data: GradeItem[] };
    },

    async create(payload: GradePayload): Promise<{ data: GradeItem }> {
      const res = await api.post('/grades', payload);
      return res as unknown as { data: GradeItem };
    },

    async update(id: number, payload: GradePayload): Promise<{ data: GradeItem }> {
      const res = await api.put(`/grades/${id}`, payload);
      return res as unknown as { data: GradeItem };
    },

    async remove(id: number): Promise<{ message?: string }> {
      const res = await api.delete(`/grades/${id}`);
      return res as unknown as { message?: string };
    },
  },

  companies: {
    async list(): Promise<{ data: Company[] }> {
      const res = await api.get('/companies');
      return res as unknown as { data: Company[] };
    },

    async create(payload: CompanyPayload): Promise<{ data: Company }> {
      const res = await api.post('/companies', payload);
      return res as unknown as { data: Company };
    },

    async update(id: number, payload: CompanyPayload): Promise<{ data: Company }> {
      const res = await api.put(`/companies/${id}`, payload);
      return res as unknown as { data: Company };
    },

    async remove(id: number): Promise<{ message?: string }> {
      const res = await api.delete(`/companies/${id}`);
      return res as unknown as { message?: string };
    },
  },
};

export default organizationService;
