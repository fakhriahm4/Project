<script setup lang="ts">
import CbMasterPage from '@/modules/cb/components/CbMasterPage.vue';
import cbService from '@/modules/cb/services/cbService';
import type { CbColumn, CbField } from '@/modules/cb/types/form';
import { lookupService, type LookupItem } from '@/services/lookupService';
import { computed, onMounted, ref } from 'vue';

/**
 * Master Overtime Rule — mapping grade → metode lembur (Jam Mati / Normatif),
 * tarif, dan pengali. Back date: lembur bulan N dibayar bulan N+1 lewat
 * komponen RAPEL_LEMBURAN (Fase 2 engine).
 */

const grades = ref<LookupItem[]>([]);
onMounted(async () => {
  try {
    grades.value = (await lookupService.all()).grade;
  } catch {
    grades.value = [];
  }
});

const columns = computed<CbColumn[]>(() => [
  { key: 'grade_kode', label: 'Grade', type: 'code' },
  { key: 'grade_nama', label: 'Nama Grade' },
  {
    key: 'method',
    label: 'Metode',
    type: 'badge',
    badges: {
      JAM_MATI: { label: 'Jam Mati', class: 'bg-amber-100 text-amber-700' },
      NORMATIF: { label: 'Normatif', class: 'bg-indigo-100 text-indigo-700' },
    },
  },
  { key: 'rate', label: 'Tarif (× tarif/jam)', type: 'num', align: 'right' },
  { key: 'multiplier', label: 'Pengali', type: 'num', align: 'right' },
  { key: 'component_kode', label: 'Komponen Bayar', type: 'code' },
  { key: 'effective_start', label: 'Berlaku Dari', type: 'date' },
  { key: 'is_active', label: 'Status', type: 'bool', align: 'center' },
]);

const fields = computed<CbField[]>(() => [
  {
    key: 'grade_id',
    label: 'Grade',
    type: 'select',
    required: true,
    half: true,
    options: grades.value.map((g) => ({ value: g.id, label: `${g.kode} — ${g.nama}` })),
  },
  {
    key: 'method',
    label: 'Metode',
    type: 'select',
    required: true,
    half: true,
    options: [
      { value: 'JAM_MATI', label: 'Jam Mati (dari clock in/out)' },
      { value: 'NORMATIF', label: 'Normatif (tarif tetap per jam)' },
    ],
  },
  {
    key: 'rate',
    label: 'Tarif (pengali tarif/jam)',
    type: 'number',
    half: true,
    step: '0.01',
    min: 0,
    placeholder: 'mis. 1.5',
  },
  { key: 'multiplier', label: 'Pengali', type: 'number', half: true, step: '0.01', min: 0, placeholder: 'mis. 1' },
  {
    key: 'component_kode',
    label: 'Komponen Bayar',
    type: 'text',
    half: true,
    hint: 'Kode komponen penerima lembur (back date).',
  },
  { key: 'effective_start', label: 'Berlaku Dari', type: 'date', half: true },
  { key: 'effective_end', label: 'Berlaku Sampai', type: 'date', half: true, hint: 'Kosongkan = aktif terus' },
  { key: 'is_active', label: 'Aturan aktif', type: 'checkbox' },
]);
</script>

<template>
  <CbMasterPage
    title="Overtime Rule"
    subtitle="Aturan lembur per grade — Jam Mati / Normatif, tarif, dan pengali dikonfigurasi (effective date)."
    :columns="columns"
    :fields="fields"
    :load="cbService.overtimeRules.list"
    :create-fn="cbService.overtimeRules.create"
    :update-fn="cbService.overtimeRules.update"
    :remove-fn="cbService.overtimeRules.remove"
    entity-label="aturan lembur"
  />
</template>
