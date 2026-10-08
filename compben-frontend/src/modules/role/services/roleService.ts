import api from '@/services/api';
import type { CreateRolePayload, Role, UpdateRolePayload } from '../types/role';

/**
 * Endpoint /roles khusus Super Admin (dicek backend).
 * Interceptor api sudah unwrap body { success, data }.
 */
export const roleService = {
  async list(): Promise<{ data: Role[] }> {
    const res = await api.get('/roles');
    return res as unknown as { data: Role[] };
  },

  async create(payload: CreateRolePayload): Promise<{ data: Role }> {
    const res = await api.post('/roles', payload);
    return res as unknown as { data: Role };
  },

  async update(id: number, payload: UpdateRolePayload): Promise<{ data: Role }> {
    const res = await api.put(`/roles/${id}`, payload);
    return res as unknown as { data: Role };
  },

  async remove(id: number): Promise<{ message?: string }> {
    const res = await api.delete(`/roles/${id}`);
    return res as unknown as { message?: string };
  },
};

export default roleService;
