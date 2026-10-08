<script setup lang="ts">
import CbMasterPage from '@/modules/cb/components/CbMasterPage.vue';
import cbService from '@/modules/cb/services/cbService';
import type { CbColumn, CbField } from '@/modules/cb/types/form';

/**
 * Master Komponen Payroll — semua penghasilan/potongan didaftarkan di sini.
 * Formula & dasar perhitungan dikonfigurasi (bukan hard-code) → Payroll Engine
 * Fase 3 membaca kolom ini.
 */

const columns: CbColumn[] = [
  { key: 'kode', label: 'Kode', type: 'code' },
  { key: 'nama', label: 'Nama Komponen' },
  {
    key: 'tipe',
    label: 'Tipe',
    type: 'badge',
    badges: {
      EARNING: { label: 'Penghasilan', class: 'bg-emerald-100 text-emerald-700' },
      DEDUCTION: { label: 'Potongan', class: 'bg-red-100 text-red-700' },
    },
  },
  {
    key: 'sifat_tetap',
    label: 'Sifat',
    type: 'badge',
    badges: {
      true: { label: 'Tetap', class: 'bg-blue-100 text-blue-700' },
      false: { label: 'Tidak Tetap', class: 'bg-gray-100 text-gray-600' },
    },
  },
  { key: 'dasar_perhitungan', label: 'Dasar Hitung' },
  { key: 'sort_order', label: 'Urut', type: 'num', align: 'center' },
  { key: 'effective_start', label: 'Berlaku Dari', type: 'date' },
  { key: 'is_active', label: 'Status', type: 'bool', align: 'center' },
];

const fields: CbField[] = [
  { key: 'kode', label: 'Kode', type: 'text', required: true, half: true, placeholder: 'mis. TUNJ_MAKAN' },
  { key: 'nama', label: 'Nama', type: 'text', required: true, half: true, placeholder: 'mis. Tunjangan Makan' },
  {
    key: 'tipe',
    label: 'Tipe',
    type: 'select',
    required: true,
    half: true,
    options: [
      { value: 'EARNING', label: 'Penghasilan' },
      { value: 'DEDUCTION', label: 'Potongan' },
    ],
  },
  { key: 'sort_order', label: 'Urutan Tampil', type: 'number', half: true, min: 0, step: '1' },
  { key: 'sifat_tetap', label: 'Komponen tetap (ikut THP rutin)', type: 'checkbox' },
  {
    key: 'dasar_perhitungan',
    label: 'Dasar Perhitungan',
    type: 'select',
    options: [
      { value: 'ATTENDANCE', label: 'Attendance (prorata kehadiran)' },
      { value: 'COMPENSATION_STRUCTURE', label: 'Struktur Compensation (nilai dasar)' },
      { value: 'OVERTIME', label: 'Lembur (back date)' },
      { value: 'ADJUSTMENT', label: 'Koreksi / Adjustment' },
      { value: 'MANUAL', label: 'Manual (input Admin C&B)' },
    ],
    hint: 'Dipakai Payroll Engine (Fase 3) saat Generate.',
  },
  {
    key: 'formula',
    label: 'Formula',
    type: 'text',
    placeholder: 'mis. nilai_dasar / 22 * hari_hadir',
    hint: 'Ekspresi perhitungan — dikonfigurasi, bukan hard-code.',
  },
  { key: 'effective_start', label: 'Berlaku Dari', type: 'date', half: true },
  { key: 'effective_end', label: 'Berlaku Sampai', type: 'date', half: true, hint: 'Kosongkan = aktif terus' },
  { key: 'is_active', label: 'Komponen aktif', type: 'checkbox' },
];
</script>

<template>
  <CbMasterPage
    title="Komponen Payroll"
    subtitle="Daftar penghasilan & potongan — formula, dasar perhitungan, dan effective date dikonfigurasi di sini (bukan hard-code)."
    :columns="columns"
    :fields="fields"
    :load="cbService.components.list"
    :create-fn="cbService.components.create"
    :update-fn="cbService.components.update"
    :remove-fn="cbService.components.remove"
    entity-label="komponen"
  />
</template>
