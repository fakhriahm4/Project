<script setup lang="ts">
import cbService from '@/modules/cb/services/cbService';
import type { CompensationStructure } from '@/modules/cb/types/cb';
import { useAuthStore } from '@/stores/auth';
import { lookupService, type LookupItem } from '@/services/lookupService';
import { computed, onMounted, ref } from 'vue';

/**
 * Struktur Compensation per grade — pilih grade → daftar komponen + nilai dasar.
 * Payroll Engine (Fase 3) membaca baris aktif dengan effective_date berlaku
 * untuk menghitung komponen berbasis struktur.
 */

const auth = useAuthStore();
const canWrite = computed(() => auth.hasRole('ADMIN_CNB'));

const loading = ref(true);
const error = ref<string | null>(null);
const grades = ref<LookupItem[]>([]);
const components = ref<{ id: number; kode: string; nama: string }[]>([]);
const rows = ref<CompensationStructure[]>([]);
const selectedGrade = ref<number | null>(null);

function extractMessage(e: unknown): string {
  const err = e as { error?: unknown; message?: string };
  if (typeof err?.error === 'string') return err.error;
  if (err?.error && typeof err.error === 'object' && 'message' in err.error) {
    const m = (err.error as { message?: string }).message;
    if (m) return m;
  }
  return err?.message || 'Terjadi kesalahan yang tidak diketahui';
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [lk, comps, structs] = await Promise.all([
      lookupService.all(),
      cbService.components.list(),
      cbService.structures.list(),
    ]);
    grades.value = lk.grade;
    components.value = comps;
    rows.value = structs;
    if (selectedGrade.value === null && grades.value.length) {
      selectedGrade.value = grades.value[0].id;
    }
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

const filtered = computed(() =>
  rows.value.filter((r) => r.grade_id === selectedGrade.value)
);

const selectedGradeLabel = computed(() => {
  const g = grades.value.find((x) => x.id === selectedGrade.value);
  return g ? `${g.kode} — ${g.nama}` : '—';
});

function money(v: number): string {
  return `Rp ${Number(v ?? 0).toLocaleString('id-ID')}`;
}

// ============================================
// FORM (tambah / edit baris struktur)
// ============================================
const showForm = ref(false);
const editing = ref<CompensationStructure | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const form = ref<{
  component_id: number | '';
  nilai_dasar: number | '';
  effective_start: string;
  effective_end: string;
  is_active: boolean;
}>({
  component_id: '',
  nilai_dasar: 0,
  effective_start: '',
  effective_end: '',
  is_active: true,
});

function openCreate() {
  if (selectedGrade.value === null) return;
  editing.value = null;
  form.value = {
    component_id: '',
    nilai_dasar: 0,
    effective_start: '',
    effective_end: '',
    is_active: true,
  };
  formError.value = null;
  showForm.value = true;
}

function openEdit(item: CompensationStructure) {
  editing.value = item;
  form.value = {
    component_id: item.component_id,
    nilai_dasar: item.nilai_dasar,
    effective_start: item.effective_start ?? '',
    effective_end: item.effective_end ?? '',
    is_active: item.is_active,
  };
  formError.value = null;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
}

async function save() {
  if (form.value.component_id === '') {
    formError.value = 'Komponen wajib dipilih';
    return;
  }
  saving.value = true;
  formError.value = null;
  try {
    const payload = {
      component_id: form.value.component_id,
      nilai_dasar: Number(form.value.nilai_dasar || 0),
      effective_start: form.value.effective_start || null,
      effective_end: form.value.effective_end || null,
      is_active: form.value.is_active,
    };
    if (editing.value) {
      await cbService.structures.update(editing.value.id, payload);
    } else {
      await cbService.structures.create({
        ...payload,
        grade_id: selectedGrade.value,
      });
    }
    closeForm();
    await load();
  } catch (e) {
    formError.value = extractMessage(e);
  } finally {
    saving.value = false;
  }
}

async function remove(item: CompensationStructure) {
  if (
    !window.confirm(
      `Hapus komponen "${item.component_nama}" dari ${item.grade_kode}? Tindakan ini tidak bisa dibatalkan.`
    )
  ) {
    return;
  }
  try {
    await cbService.structures.remove(item.id);
    error.value = null;
    await load();
  } catch (e) {
    error.value = extractMessage(e);
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Struktur Compensation</h1>
        <p class="text-sm text-gray-500 mt-1">
          Komponen &amp; nilai dasar per grade — sumber otomatis Generate Payroll
          (Admin C&amp;B tidak input gaji manual per pegawai).
        </p>
      </div>
      <button
        v-if="canWrite"
        class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        :disabled="selectedGrade === null"
        @click="openCreate"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Komponen
      </button>
    </div>

    <!-- Pilih grade -->
    <div class="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap items-center gap-4">
      <label class="text-sm font-medium text-gray-700">Grade:</label>
      <select
        v-model="selectedGrade"
        class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-w-[220px]"
      >
        <option v-for="g in grades" :key="g.id" :value="g.id">
          {{ g.kode }} — {{ g.nama }}
        </option>
      </select>
      <span class="text-xs text-gray-400">
        Menampilkan struktur untuk {{ selectedGradeLabel }} · {{ filtered.length }} komponen
      </span>
    </div>

    <!-- Baca saja -->
    <div
      v-if="!canWrite"
      class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800"
    >
      Anda memiliki akses baca saja. Perubahan struktur dilakukan oleh Admin C&amp;B.
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3"
    >
      <svg class="w-8 h-8 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <p class="text-sm text-gray-500">Memuat data…</p>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start justify-between gap-4"
    >
      <p class="text-sm text-red-700">{{ error }}</p>
      <button class="text-sm font-medium text-red-700 hover:text-red-900" @click="load">Coba Lagi</button>
    </div>

    <!-- Tabel -->
    <div v-else class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <th class="px-5 py-3 font-medium">Kode</th>
            <th class="px-5 py-3 font-medium">Komponen</th>
            <th class="px-5 py-3 font-medium text-right">Nilai Dasar</th>
            <th class="px-5 py-3 font-medium">Berlaku Dari</th>
            <th class="px-5 py-3 font-medium">Berlaku Sampai</th>
            <th class="px-5 py-3 font-medium text-center">Status</th>
            <th v-if="canWrite" class="px-5 py-3 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in filtered" :key="item.id" class="hover:bg-gray-50">
            <td class="px-5 py-3">
              <span class="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {{ item.component_kode }}
              </span>
            </td>
            <td class="px-5 py-3 font-medium text-gray-900">{{ item.component_nama }}</td>
            <td class="px-5 py-3 text-right font-mono tabular-nums text-gray-600">
              {{ money(item.nilai_dasar) }}
            </td>
            <td class="px-5 py-3 text-gray-600">{{ item.effective_start ?? '—' }}</td>
            <td class="px-5 py-3 text-gray-600">{{ item.effective_end ?? '—' }}</td>
            <td class="px-5 py-3 text-center">
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
              >
                {{ item.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td v-if="canWrite" class="px-5 py-3 text-right whitespace-nowrap">
              <button
                class="text-emerald-600 hover:text-emerald-800 text-xs font-medium mr-3"
                @click="openEdit(item)"
              >
                Edit
              </button>
              <button class="text-red-500 hover:text-red-700 text-xs font-medium" @click="remove(item)">
                Hapus
              </button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td :colspan="canWrite ? 7 : 6" class="px-5 py-10 text-center text-gray-400">
              Grade ini belum punya komponen compensation.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal form -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeForm"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ editing ? 'Edit Komponen' : 'Tambah Komponen' }} — {{ selectedGradeLabel }}
          </h2>
          <button class="text-gray-400 hover:text-gray-600" @click="closeForm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="save">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Komponen *</label>
            <select
              v-model="form.component_id"
              :disabled="!!editing"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="" disabled>— pilih komponen —</option>
              <option v-for="c in components" :key="c.id" :value="c.id">
                {{ c.kode }} — {{ c.nama }}
              </option>
            </select>
            <p class="text-xs text-gray-400 mt-1">
              Nilai dasar mengisi komponen berbasis struktur (mis. Gaji Pokok).
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nilai Dasar (Rp) *</label>
            <input
              v-model="form.nilai_dasar"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="mis. 3500000"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Berlaku Dari</label>
              <input
                v-model="form.effective_start"
                type="date"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Berlaku Sampai</label>
              <input
                v-model="form.effective_end"
                type="date"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input
              v-model="form.is_active"
              type="checkbox"
              class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Baris aktif
          </label>

          <p
            v-if="formError"
            class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            {{ formError }}
          </p>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              class="text-sm font-medium text-gray-600 hover:text-gray-800 px-4 py-2"
              @click="closeForm"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {{ saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Simpan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
