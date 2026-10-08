<script setup lang="ts">
import settingsService from '@/modules/settings/services/settingsService';
import type { NotificationSettings } from '@/modules/settings/types/settings';
import { computed, onMounted, reactive, ref } from 'vue';

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

/** Label event yang dikenal engine */
const EVENT_LABELS: Record<string, string> = {
  approval_created: 'Pengajuan baru menunggu persetujuan',
  approval_decided: 'Keputusan approve / reject pengajuan',
};

const form = reactive<NotificationSettings>({
  inapp_enabled: true,
  email_enabled: false,
  events: {
    approval_created: { inapp: true, email: false },
    approval_decided: { inapp: true, email: false },
  },
  smtp_host: '',
  smtp_port: 587,
  smtp_secure: false,
  smtp_user: '',
  smtp_password: '',
  smtp_from: '',
});

let original: NotificationSettings | null = null;
const showSmtpPassword = ref(false);

const dirty = computed(
  () => !!original && JSON.stringify(form) !== JSON.stringify(original)
);

/** Semua event: yang sudah dikenal + key tambahan dari DB */
const eventKeys = computed(() => {
  const keys = new Set(Object.keys(EVENT_LABELS));
  for (const k of Object.keys(form.events)) keys.add(k);
  return [...keys];
});

function extractMessage(e: unknown): string {
  const err = e as { error?: unknown; message?: string };
  if (typeof err?.error === 'string') return err.error;
  return err?.message || 'Terjadi kesalahan yang tidak diketahui';
}

onMounted(load);

async function load() {
  error.value = null;
  try {
    const { data } = await settingsService.getSection('notification');
    applyData(data);
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

function applyData(data: NotificationSettings) {
  const events = JSON.parse(JSON.stringify(data.events));
  // Pastikan semua event yang dikenal punya entri (jangan sampai undefined di template)
  for (const key of Object.keys(EVENT_LABELS)) {
    if (!events[key]) events[key] = { inapp: true, email: false };
  }
  Object.assign(form, { ...data, events });
  original = JSON.parse(JSON.stringify(form));
}

function reset() {
  if (original) applyData(original);
  error.value = null;
  success.value = null;
}

async function save() {
  error.value = null;
  success.value = null;
  saving.value = true;
  try {
    const { data } = await settingsService.updateSection('notification', {
      ...form,
    });
    applyData(data);
    success.value = 'Pengaturan notifikasi berhasil disimpan.';
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Notification</h1>
      <p class="text-sm text-gray-500 mt-1">
        Kanal notifikasi (in-app &amp; email), matriks per-event, dan koneksi
        SMTP.
      </p>
    </div>

    <div
      v-if="loading"
      class="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-400"
    >
      Memuat pengaturan…
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

      <!-- 1. Kanal -->
      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Kanal Notifikasi</h2>
        <p class="text-sm text-gray-500 mb-5">
          Saklar utama tiap kanal. Per-event tetap bisa diatur di matriks
          bawah.
        </p>

        <div class="space-y-3">
          <label class="flex items-start gap-3">
            <input
              v-model="form.inapp_enabled"
              type="checkbox"
              class="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <span>
              <span class="block text-sm font-medium text-gray-800">
                In-App (bell)
              </span>
              <span class="block text-xs text-gray-500">
                Notifikasi muncul di lonceng kanan atas setelah user login.
              </span>
            </span>
          </label>
          <label class="flex items-start gap-3">
            <input
              v-model="form.email_enabled"
              type="checkbox"
              class="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            <span>
              <span class="block text-sm font-medium text-gray-800">Email</span>
              <span class="block text-xs text-gray-500">
                Dikirim lewat SMTP — gagal kirim hanya dicatat di log, tidak
                menggagalkan proses bisnis.
              </span>
            </span>
          </label>
        </div>
      </section>

      <!-- 2. Matriks Event -->
      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Matriks Per-Event</h2>
        <p class="text-sm text-gray-500 mb-5">
          Event aktif hanya jika kanalnya juga diaktifkan di atas.
        </p>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase text-gray-400 border-b border-gray-100">
                <th class="py-2 pr-4 font-medium">Event</th>
                <th class="py-2 px-4 text-center font-medium w-24">In-App</th>
                <th class="py-2 px-4 text-center font-medium w-24">Email</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="key in eventKeys"
                :key="key"
                class="border-b border-gray-50"
              >
                <td class="py-3 pr-4">
                  <span class="block font-medium text-gray-800">
                    {{ EVENT_LABELS[key] || key }}
                  </span>
                  <code class="text-xs text-gray-400">{{ key }}</code>
                </td>
                <td class="py-3 px-4 text-center">
                  <input
                    v-model="form.events[key].inapp"
                    type="checkbox"
                    class="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                </td>
                <td class="py-3 px-4 text-center">
                  <input
                    v-model="form.events[key].email"
                    type="checkbox"
                    class="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 3. SMTP -->
      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Koneksi SMTP</h2>
        <p class="text-sm text-gray-500 mb-5">
          Wajib diisi hanya jika Email diaktifkan. Password tersimpan terenkripsi
          di sisi server dan tidak pernah ditampilkan kembali.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Host</label>
            <input
              v-model="form.smtp_host"
              type="text"
              maxlength="255"
              placeholder="smtp.perusahaan.co.id"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <input
              v-model.number="form.smtp_port"
              type="number"
              min="1"
              max="65535"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Keamanan</label>
            <select
              v-model="form.smtp_secure"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option :value="false">TLS (STARTTLS — port 587)</option>
              <option :value="true">SSL/TLS (port 465)</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email Pengirim</label>
            <input
              v-model="form.smtp_from"
              type="email"
              maxlength="150"
              placeholder="no-reply@perusahaan.co.id"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              v-model="form.smtp_user"
              type="text"
              maxlength="255"
              autocomplete="off"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div class="relative">
              <input
                v-model="form.smtp_password"
                :type="showSmtpPassword ? 'text' : 'password'"
                maxlength="255"
                autocomplete="new-password"
                placeholder="Kosongkan bila tidak ada password"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-1"
                @click="showSmtpPassword = !showSmtpPassword"
              >
                {{ showSmtpPassword ? 'Sembunyikan' : 'Tampilkan' }}
              </button>
            </div>
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
