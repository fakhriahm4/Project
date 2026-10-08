<script setup lang="ts">
import settingsService from '@/modules/settings/services/settingsService';
import type {
  GeneralSettings,
  GeneralUpdatePayload,
} from '@/modules/settings/types/settings';
import { useAppSettingsStore } from '@/stores/appSettings';
import { computed, onMounted, reactive, ref } from 'vue';

const app = useAppSettingsStore();

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

/** Form default kosong — diisi saat GET selesai */
const form = reactive<GeneralSettings>({
  app_name: '',
  app_short_name: '',
  company_name: '',
  system_email: '',
  company_address: '',
  timezone: 'Asia/Jakarta',
  date_format: 'DD/MM/YYYY',
  default_page_size: 10,
  password_min_length: 8,
  password_max_age_days: 90,
  login_max_attempts: 5,
  login_lockout_minutes: 15,
  access_token_expires: '15m',
});

/** Snapshot terakhir (load/save) utk deteksi perubahan & Reset */
let original: GeneralSettings | null = null;

const dirty = computed(
  () => !!original && JSON.stringify(form) !== JSON.stringify(original)
);

function extractMessage(e: unknown): string {
  const err = e as { error?: unknown; message?: string };
  if (typeof err?.error === 'string') return err.error;
  return err?.message || 'Terjadi kesalahan yang tidak diketahui';
}

onMounted(load);

async function load() {
  error.value = null;
  try {
    const { data } = await settingsService.getGeneral();
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
    const payload: GeneralUpdatePayload = { ...form };
    const { data } = await settingsService.updateGeneral(payload);
    Object.assign(form, data);
    original = { ...data };

    // Identitas & preferensi tampilan dipakai seluruh app → sinkronkan store
    app.applyPublic({
      appName: data.app_name,
      appShortName: data.app_short_name,
      companyName: data.company_name,
      timezone: data.timezone,
      dateFormat: data.date_format,
      defaultPageSize: data.default_page_size,
    });
    success.value = 'Pengaturan berhasil disimpan.';
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

const TIMEZONES = [
  'Asia/Jakarta',
  'Asia/Pontianak',
  'Asia/Makassar',
  'Asia/Jayapura',
  'UTC',
];
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">General Settings</h1>
      <p class="text-sm text-gray-500 mt-1">
        Identitas aplikasi, preferensi tampilan, kebijakan password, dan masa
        berlaku session.
      </p>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-400"
    >
      Memuat pengaturan…
    </div>

    <form v-else class="space-y-6" @submit.prevent="save">
      <!-- Banner sukses / error -->
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

      <!-- 1. Identitas Aplikasi -->
      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">
          Identitas Aplikasi
        </h2>
        <p class="text-sm text-gray-500 mb-5">
          Ditampilkan di judul halaman, halaman login, sidebar, dan footer.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Nama Aplikasi
            </label>
            <input
              v-model="form.app_name"
              type="text"
              required
              maxlength="60"
              placeholder="mis. CompBen"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Singkatan
            </label>
            <input
              v-model="form.app_short_name"
              type="text"
              required
              maxlength="20"
              placeholder="mis. CB"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Nama Perusahaan
            </label>
            <input
              v-model="form.company_name"
              type="text"
              required
              maxlength="150"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Email Sistem
            </label>
            <input
              v-model="form.system_email"
              type="email"
              maxlength="150"
              placeholder="mis. hr@perusahaan.co.id"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Alamat Perusahaan
            </label>
            <input
              v-model="form.company_address"
              type="text"
              maxlength="500"
              placeholder="Alamat singkat"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>
      </section>

      <!-- 2. Preferensi Tampilan -->
      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">
          Preferensi Tampilan
        </h2>
        <p class="text-sm text-gray-500 mb-5">
          Berlaku untuk semua user: zona waktu, format tanggal, dan jumlah baris
          default tabel.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Timezone
            </label>
            <select
              v-model="form.timezone"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option v-for="tz in TIMEZONES" :key="tz" :value="tz">
                {{ tz }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Format Tanggal
            </label>
            <select
              v-model="form.date_format"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Baris per Halaman
            </label>
            <input
              v-model.number="form.default_page_size"
              type="number"
              min="5"
              max="100"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p class="text-xs text-gray-400 mt-1">5 – 100 baris</p>
          </div>
        </div>
      </section>

      <!-- 3. Kebijakan Password -->
      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">
          Kebijakan Password
        </h2>
        <p class="text-sm text-gray-500 mb-5">
          Berlaku untuk ganti password, tambah/edit user. Password lama tidak
          terpengaruh sampai diganti.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Panjang Minimum
            </label>
            <input
              v-model.number="form.password_min_length"
              type="number"
              min="6"
              max="64"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p class="text-xs text-gray-400 mt-1">6 – 64 karakter</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Masa Berlaku (hari)
            </label>
            <input
              v-model.number="form.password_max_age_days"
              type="number"
              min="0"
              max="3650"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p class="text-xs text-gray-400 mt-1">
              0 = tidak pernah kedaluwarsa; lewat batas → wajib ganti saat
              login.
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Maks Percobaan Login Gagal
            </label>
            <input
              v-model.number="form.login_max_attempts"
              type="number"
              min="0"
              max="20"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p class="text-xs text-gray-400 mt-1">
              0 = tanpa kunci akun; mencapai batas → akun terkunci sementara.
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Durasi Kunci Akun (menit)
            </label>
            <input
              v-model.number="form.login_lockout_minutes"
              type="number"
              min="1"
              max="1440"
              required
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p class="text-xs text-gray-400 mt-1">
              Kunci dilepas otomatis setelah durasi ini (login sukses juga
              melepas).
            </p>
          </div>
        </div>
      </section>

      <!-- 4. Session -->
      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Session</h2>
        <p class="text-sm text-gray-500 mb-5">
          Masa berlaku access token. Berlaku untuk login berikutnya — token yang
          sudah terbit tetap berlaku sampai expired.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Masa Berlaku Access Token
            </label>
            <input
              v-model="form.access_token_expires"
              type="text"
              required
              pattern="\d+[smhd]"
              placeholder="mis. 15m"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p class="text-xs text-gray-400 mt-1">
              Format: angka + satuan — <code class="font-mono">s</code> detik,
              <code class="font-mono">m</code> menit,
              <code class="font-mono">h</code> jam,
              <code class="font-mono">d</code> hari. Contoh: 45s, 15m, 12h, 7d.
            </p>
          </div>
        </div>
      </section>

      <!-- Aksi -->
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
          {{ saving ? 'Menyimpan…' : 'Simpan Pengaturan' }}
        </button>
      </div>
    </form>
  </div>
</template>
