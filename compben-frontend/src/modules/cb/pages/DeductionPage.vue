<script setup lang="ts">
import CbMasterPage from '@/modules/cb/components/CbMasterPage.vue';
import cbService from '@/modules/cb/services/cbService';
import type { CbColumn, CbField } from '@/modules/cb/types/form';

/**
 * Master Deduction — potongan bergantung kondisi lewat field `rule` (JSONB).
 * Contoh: Tabungan Kecelakaan hanya untuk driver
 * (rule {"if":"is_driver","then":"applies"}). UI menyederhanakannya jadi
 * pilihan "Semua Pegawai / Hanya Driver".
 */

const columns: CbColumn[] = [
  { key: 'kode', label: 'Kode', type: 'code' },
  { key: 'nama', label: 'Nama Potongan' },
  { key: 'rule', label: 'Berlaku Untuk', type: 'rule' },
  { key: 'nilai_default', label: 'Nilai Default', type: 'money', align: 'right' },
  { key: 'effective_start', label: 'Berlaku Dari', type: 'date' },
  { key: 'is_active', label: 'Status', type: 'bool', align: 'center' },
];

const fields: CbField[] = [
  { key: 'kode', label: 'Kode', type: 'text', required: true, half: true, placeholder: 'mis. KOPERASI' },
  { key: 'nama', label: 'Nama', type: 'text', required: true, half: true, placeholder: 'mis. Koperasi' },
  {
    key: 'rule',
    label: 'Berlaku Untuk',
    type: 'rule-scope',
    half: true,
    hint: 'Rule disimpan sebagai kondisi JSON — dasar evaluasi Payroll Engine.',
  },
  {
    key: 'nilai_default',
    label: 'Nilai Default (Rp)',
    type: 'number',
    half: true,
    step: '0.01',
    min: 0,
    hint: '0 = nominal diatur per pegawai/periode saat generate.',
  },
  { key: 'effective_start', label: 'Berlaku Dari', type: 'date', half: true },
  { key: 'effective_end', label: 'Berlaku Sampai', type: 'date', half: true, hint: 'Kosongkan = aktif terus' },
  { key: 'is_active', label: 'Potongan aktif', type: 'checkbox' },
];
</script>

<template>
  <CbMasterPage
    title="Master Deduction"
    subtitle="Potongan rutin dengan rule kondisional (mis. hanya driver) — dievaluasi otomatis saat Generate Payroll."
    :columns="columns"
    :fields="fields"
    :load="cbService.deductions.list"
    :create-fn="cbService.deductions.create"
    :update-fn="cbService.deductions.update"
    :remove-fn="cbService.deductions.remove"
    entity-label="potongan"
  />
</template>
