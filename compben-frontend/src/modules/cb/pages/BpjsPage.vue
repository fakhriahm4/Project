<script setup lang="ts">
import CbMasterPage from '@/modules/cb/components/CbMasterPage.vue';
import cbService from '@/modules/cb/services/cbService';
import type { CbColumn, CbField } from '@/modules/cb/types/form';

/**
 * Master BPJS — % pekerja/% perusahaan/batas upah disetel di sini
 * (default terisi nilai resmi saat migration; nilai bisa disesuaikan
 * per tahun / tingkat risiko tanpa mengubah struktur DB).
 */

const columns: CbColumn[] = [
  { key: 'kode', label: 'Kode', type: 'code' },
  { key: 'nama', label: 'Program' },
  { key: 'persentase_pekerja', label: '% Pekerja', type: 'pct', align: 'right' },
  { key: 'persentase_perusahaan', label: '% Perusahaan', type: 'pct', align: 'right' },
  { key: 'batas_atas', label: 'Batas Atas Upah', type: 'money', align: 'right' },
  { key: 'dasar', label: 'Dasar' },
  { key: 'effective_start', label: 'Berlaku Dari', type: 'date' },
  { key: 'is_active', label: 'Status', type: 'bool', align: 'center' },
];

const fields: CbField[] = [
  { key: 'kode', label: 'Kode', type: 'text', required: true, half: true, placeholder: 'mis. BPJS_KES' },
  { key: 'nama', label: 'Nama Program', type: 'text', required: true, half: true },
  {
    key: 'persentase_pekerja',
    label: '% Pekerja (dipotong dari gaji)',
    type: 'number',
    required: true,
    half: true,
    step: '0.001',
    min: 0,
    max: 100,
    placeholder: 'mis. 1',
  },
  {
    key: 'persentase_perusahaan',
    label: '% Perusahaan',
    type: 'number',
    required: true,
    half: true,
    step: '0.001',
    min: 0,
    max: 100,
    placeholder: 'mis. 4',
  },
  {
    key: 'batas_atas',
    label: 'Batas Atas Upah (Rp)',
    type: 'number',
    half: true,
    step: '0.01',
    min: 0,
    hint: '0 = tanpa batas. Nilai resmi bisa berubah tiap tahun.',
  },
  {
    key: 'dasar',
    label: 'Dasar Perhitungan',
    type: 'select',
    half: true,
    options: [{ value: 'UPAH', label: 'Upah bulanan' }],
  },
  { key: 'effective_start', label: 'Berlaku Dari', type: 'date', half: true },
  { key: 'effective_end', label: 'Berlaku Sampai', type: 'date', half: true, hint: 'Kosongkan = aktif terus' },
  { key: 'is_active', label: 'Komponen aktif', type: 'checkbox' },
];
</script>

<template>
  <CbMasterPage
    title="Master BPJS"
    subtitle="Persentase pekerja/perusahaan & batas upah per program — terisi nilai resmi, boleh disesuaikan (effective date)."
    :columns="columns"
    :fields="fields"
    :load="cbService.bpjs.list"
    :create-fn="cbService.bpjs.create"
    :update-fn="cbService.bpjs.update"
    :remove-fn="cbService.bpjs.remove"
    entity-label="komponen BPJS"
  />
</template>
