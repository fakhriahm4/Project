<script setup lang="ts">
import CbMasterPage from '@/modules/cb/components/CbMasterPage.vue';
import cbService from '@/modules/cb/services/cbService';
import type { CbColumn, CbField } from '@/modules/cb/types/form';
import { ref } from 'vue';

/**
 * Master PPh 21 TER (PMK 168/2023) — tabel tarif per range bruto bulanan.
 * Dua kategori: TER_A (TK/0) & TER_B (K/1). Semua baris editable/ditambah
 * oleh Admin C&B dengan effective date → aturan pajak bisa diperbarui
 * tanpa perubahan kode.
 */

const tab = ref<'TER_A' | 'TER_B'>('TER_A');

const columns: CbColumn[] = [
  { key: 'range_min', label: 'Dari (Rp)', type: 'money', align: 'right' },
  { key: 'range_max', label: 'Sampai (Rp)', type: 'money', align: 'right' },
  { key: 'tarif_persen', label: 'Tarif', type: 'pct', align: 'right' },
  { key: 'effective_start', label: 'Berlaku Dari', type: 'date' },
  { key: 'is_active', label: 'Status', type: 'bool', align: 'center' },
];

const fields: CbField[] = [
  {
    key: 'kategori',
    label: 'Kategori',
    type: 'select',
    required: true,
    half: true,
    options: [
      { value: 'TER_A', label: 'TER A (TK/0 — kawin tidak)' },
      { value: 'TER_B', label: 'TER B (K/1 — kawin)' },
    ],
  },
  { key: 'tarif_persen', label: 'Tarif (%)', type: 'number', required: true, half: true, step: '0.01', min: 0, max: 100, placeholder: 'mis. 2.5' },
  { key: 'range_min', label: 'Range Dari (Rp)', type: 'number', required: true, half: true, step: '0.01', min: 0 },
  {
    key: 'range_max',
    label: 'Range Sampai (Rp)',
    type: 'number',
    half: true,
    step: '0.01',
    min: 0,
    hint: 'Kosongkan = tanpa batas atas (bracket terakhir).',
  },
  { key: 'effective_start', label: 'Berlaku Dari', type: 'date', half: true },
  { key: 'is_active', label: 'Baris aktif', type: 'checkbox' },
];
</script>

<template>
  <CbMasterPage
    title="Pajak (PPh 21 TER)"
    subtitle="Tabel tarif efektif rata-rata per kategori — tarif & range dikonfigurasi (PMK 168/2023), bukan hard-code."
    :columns="columns"
    :fields="fields"
    :load="cbService.tax.list"
    :create-fn="cbService.tax.create"
    :update-fn="cbService.tax.update"
    :remove-fn="cbService.tax.remove"
    :defaults="{ kategori: tab }"
    :row-filter="(rows) => rows.filter((r) => r.kategori === tab)"
    entity-label="baris tarif"
    empty-text="Belum ada baris tarif pada kategori ini."
  >
    <template #toolbar>
      <div class="bg-gray-100 rounded-lg p-1 flex gap-1">
        <button
          v-for="k in ['TER_A', 'TER_B'] as const"
          :key="k"
          class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
          :class="tab === k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'"
          @click="tab = k"
        >
          {{ k === 'TER_A' ? 'TER A (TK/0)' : 'TER B (K/1)' }}
        </button>
      </div>
    </template>
  </CbMasterPage>
</template>
