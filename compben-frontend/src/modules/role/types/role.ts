export interface Role {
  id: number;
  kode: string;
  nama: string;
  deskripsi: string | null;
  is_active: boolean;
  /** Jumlah user AKTIF dengan role ini (tampilan badge) */
  user_count: number;
  /** Semua baris user (aktif & nonaktif) — menahan hapus karena FK */
  user_count_all: number;
  created_at: string;
}

export interface CreateRolePayload {
  kode: string;
  nama: string;
  deskripsi?: string | null;
  is_active?: boolean;
}

/** Kode dikunci setelah create — backend menolak perubahan kode */
export interface UpdateRolePayload {
  nama?: string;
  deskripsi?: string | null;
  is_active?: boolean;
}
