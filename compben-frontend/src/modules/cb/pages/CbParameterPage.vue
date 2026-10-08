<script setup lang="ts">
import settingsService from '@/modules/settings/services/settingsService';
import type { CbParameterSettings } from '@/modules/settings/types/settings';
import { computed, onMounted, reactive, ref } from 'vue';

/**
 * Parameter C&B — konfigurasi payroll yang dihitung dari settings
 * (section cb_parameter): cut-off lock attendance, tanggal bayar,
 * dan aturan prorata gaji vs kehadiran. Semua configurable di DB.
 */

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const form = reactive<CbParameterSettings>({
  cut_off_day: 22,
  payday_day: 27,
  salary_attendance_rule: 'PRORATA_HARI',
});

let original: CbParameterSettings | null = null;

const dirty = computed(
  () => !!original && JSON.stringify(form) !== JSON.stringify(original)
);

function extractMessage(e: unknown): string {
  const err = e as { error?: unknown; message?: string };
  if (typeof err?.error === 'string') return err.error;
  if (err?.error && typeof err.error === 'object' && 'message' in err.error) {
    const m = (err.error as { message?: string }).message;
    if (m) return m;
  }
  return err?.message || 'Terjadi kesalahan yang tidak diketahui';
}

onMounted(load);

async function load() {
  error.value = null;
  try {
    const { data } = await settingsService.getSection('cb_parameter');
    Object.assign(form, data);
    original = { ...data };
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

async function save() {
  error.value = null;
  success.value = null;
  saving.value = true;
  try {
    const { data } = await settingsService.updateSection('cb_parameter', { ...form });
    Object.assign(form, data);
    original = { ...data };
    success.value = 'Parameter C&B berhasil disimpan.';
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    saving.value = false;
  }
}

function reset() {
  if (original) Object.assign(form, original);
  error.value = null;
  success.value = null;
}

const RULE_OPTIONS: { value: CbParameterSettings['salary_attendance_rule']; label: string }[] = [
  { value: 'TANPA_POTONGAN', label: 'Tanpa potongan — gaji penuh berapa pun kehadiran' },
  { value: 'PRORATA_HARI', label: 'Prorata hari kerja — gaji ÷ hari kerja bulan × hari hadir' },
  { value: 'PRORATA_22', label: 'Prorata 22 hari kerja tetap — gaji ÷ 22 × hari hadir' },
];
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Parameter C&amp;B</h1>
      <p class="text-sm text-gray-500 mt-1">
        Cut-off lock attendance, tanggal pembayaran gaji, dan aturan prorata
        kehadiran — semuanya dikonfigurasi, bukan hard-code.
      </p>
    </div>

    <div
      v-if="loading"
      class="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-400"
    >
      Memuat parameter…
    </div>

    <form v-else class="space-y-6" @submit.prevent="save">
      <div
        v-if="success"
        class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3"
      >
        {{ success }}
      </div>
      <div
        v-if="error"
        class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
      >
        {{ error }}
      </div>

      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Periode &amp; Cut-off</h2>
        <p class="text-sm text-gray-500 mb-5">
          Setelah tanggal cut-off, absensi bulan berjalan terkunci
          (<code class="font-mono text-xs">LOCKED_ASSUMED_PRESENT</code>) —
          koreksi setelah lock masuk adjustment periode berikutnya.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Cut-off (Lock Attendance)</label>
            <input
              v-model.number="form.cut_off_day"
              type="number"
              min="1"
              max="28"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p class="text-xs text-gray-400 mt-1">
              1 – 28. Default 22 (spesifikasi): tgl 22 → akhir bulan terhitung hadir penuh.
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Pembayaran Gaji</label>
            <input
              v-model.number="form.payday_day"
              type="number"
              min="1"
              max="31"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p class="text-xs text-gray-400 mt-1">Default 27 setiap bulan.</p>
          </div>
        </div>
      </section>

      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Aturan Gaji vs Kehadiran</h2>
        <p class="text-sm text-gray-500 mb-5">
          Menentukan cara prorata gaji pokok bila ada ketidakhadiran.
          Diubah di sini — tidak perlu ubah kode.
        </p>

        <label class="block text-sm font-medium text-gray-700 mb-1">Aturan Prorata</label>
        <select
          v-model="form.salary_attendance_rule"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option v-for="o in RULE_OPTIONS" :key="o.value" :value="o.value">
            {{ o.label }}
          </option>
        </select>
      </section>

      <div class="flex items-center justify-end gap-3 pb-4">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg disabled:opacity-50"
          :disabled="!dirty || saving"
          @click="reset"
        >
          Reset
        </button>
        <button
          type="submit"
          class="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
          :disabled="!dirty || saving"
        >
          {{ saving ? 'Menyimpan…' : 'Simpan Parameter' }}
        </button>
      </div>
    </form>
  </div>
</template>
