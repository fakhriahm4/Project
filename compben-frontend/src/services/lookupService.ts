import api from '@/services/api';

export interface LookupItem {
  id: number;
  kode: string;
  nama: string;
  level?: number;
}

export interface Lookups {
  divisi: LookupItem[];
  jabatan: LookupItem[];
  grade: LookupItem[];
  roles: LookupItem[];
}

export const lookupService = {
  /** GET /lookups → semua data referensi dalam satu request */
  async all(): Promise<Lookups> {
    const res = await api.get('/lookups');
    return res.data;
  },
};

export default lookupService;
