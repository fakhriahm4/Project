<script setup lang="ts">
import settingsService from '@/modules/settings/services/settingsService';
import type { IntegrationSettings } from '@/modules/settings/types/settings';
import { computed, onMounted, reactive, ref } from 'vue';

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const EVENT_LABELS: Record<string, string> = {
  approval_created: 'Pengajuan baru dibuat',
  approval_decided: 'Keputusan approve / reject',
};

const form = reactive<IntegrationSettings>({
  webhook_enabled: false,
  webhook_url: '',
  webhook_secret: '',
  webhook_events: ['approval_created', 'approval_decided'],
});

let original: IntegrationSettings | null = null;
const showSecret = ref(false);

const dirty = computed(
  () => !!original && JSON.stringify(form) !== JSON.stringify(original)
);

const eventKeys = computed(() => {
  const keys = new Set(Object.keys(EVENT_LABELS));
  for (const k of form.webhook_events) keys.add(k);
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
    const { data } = await settingsService.getSection('integration');
    applyData(data);
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

function applyData(data: IntegrationSettings) {
  Object.assign(form, { ...data, webhook_events: [...data.webhook_events] });
  original = { ...data, webhook_events: [...data.webhook_events] };
}

function reset() {
  if (original) applyData(original);
  error.value = null;
  success.value = null;
}

function toggleEvent(key: string) {
  const i = form.webhook_events.indexOf(key as IntegrationSettings['webhook_events'][number]);
  if (i >= 0) form.webhook_events.splice(i, 1);
  else form.webhook_events.push(key as IntegrationSettings['webhook_events'][number]);
}

async function save() {
  error.value = null;
  success.value = null;
  saving.value = true;
  try {
    const { data } = await settingsService.updateSection('integration', {
      ...form,
      webhook_events: [...form.webhook_events],
    });
    applyData(data);
    success.value = 'Konfigurasi integrasi berhasil disimpan.';
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
      <h1 class="text-2xl font-bold text-gray-900">Integration</h1>
      <p class="text-sm text-gray-500 mt-1">
        Webhook keluar — kirim event sistem ke sistem eksternal (HTTP POST
        JSON).
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

      <!-- 1. Webhook -->
      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <div class="flex items-start justify-between mb-5">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-1">Webhook Keluar</h2>
            <p class="text-sm text-gray-500">
              Saat event terjadi, sistem mengirim POST JSON ke URL tujuan.
              Gagal kirim hanya dicatat di log (timeout 5 detik).
            </p>
          </div>
          <label class="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              v-model="form.webhook_enabled"
              type="checkbox"
              class="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
            />
            {{ form.webhook_enabled ? 'Aktif' : 'Nonaktif' }}
          </label>
        </div>

        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">URL Tujuan</label>
            <input
              v-model="form.webhook_url"
              type="url"
              maxlength="255"
              placeholder="https://contoh.com/api/webhook"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Secret (HMAC-SHA256)
            </label>
            <div class="relative">
              <input
                v-model="form.webhook_secret"
                :type="showSecret ? 'text' : 'password'"
                maxlength="255"
                autocomplete="off"
                placeholder="Opsional — untuk memverifikasi request"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 pr-24 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-1"
                @click="showSecret = !showSecret"
              >
                {{ showSecret ? 'Sembunyikan' : 'Tampilkan' }}
              </button>
            </div>
            <p class="text-xs text-gray-400 mt-1">
              Bila diisi, setiap request menyertakan header
              <code class="font-mono">X-Webhook-Signature</code> = hex
              HMAC-SHA256(body, secret) — penerima wajib memverifikasinya.
            </p>
          </div>
        </div>
      </section>

      <!-- 2. Event -->
      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Event yang Dikirim</h2>
        <p class="text-sm text-gray-500 mb-5">
          Hanya event terpilih yang dikirim ke URL tujuan.
        </p>

        <div class="space-y-3">
          <label
            v-for="key in eventKeys"
            :key="key"
            class="flex items-start gap-3"
          >
            <input
              type="checkbox"
              :checked="form.webhook_events.includes(key as IntegrationSettings['webhook_events'][number])"
              class="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
              @change="toggleEvent(key)"
            />
            <span>
              <span class="block text-sm font-medium text-gray-800">
                {{ EVENT_LABELS[key] || key }}
              </span>
              <code class="text-xs text-gray-400">{{ key }}</code>
            </span>
          </label>
        </div>

        <!-- Contoh payload -->
        <div class="mt-5 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p class="text-xs font-medium text-gray-500 mb-2">Contoh payload</p>
          <pre class="text-xs text-gray-600 overflow-x-auto">{
{
  "event": "approval_created",
  "occurred_at": "2026-10-07T08:15:00.000Z",
  "data": { "user_id": 3, "title": "...", "link": "/approval/pending" }
}</pre>
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
