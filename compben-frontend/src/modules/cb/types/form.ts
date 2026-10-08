/** Konfigurasi form & tabel utk CbMasterPage (CRUD generik Master C&B) */

export interface CbOption {
  value: string | number;
  label: string;
}

export interface CbField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'rule-scope';
  required?: boolean;
  options?: CbOption[];
  placeholder?: string;
  hint?: string;
  step?: string;
  min?: number;
  max?: number;
  /** true → setengah lebar grid; default kolom penuh */
  half?: boolean;
}

export interface CbColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  /**
   * 'code' = mono chip · 'bool' = badge aktif · 'badge' = badge by value ·
   * 'money'/'pct'/'num' = angka · 'date' = tanggal · 'rule' = scope deduction
   */
  type?: 'text' | 'code' | 'bool' | 'badge' | 'money' | 'pct' | 'num' | 'date' | 'rule';
  /** Untuk type 'badge': value → { label, class } */
  badges?: Record<string, { label: string; class: string }>;
}
