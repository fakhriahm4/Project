<script setup lang="ts">
import roleService from '@/modules/role/services/roleService';
import settingsService from '@/modules/settings/services/settingsService';
import type { ApprovalSettings } from '@/modules/settings/types/settings';
import { computed, onMounted, reactive, ref } from 'vue';

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

/** Daftar role (untuk memilih approver per level) */
const roles = ref<{ kode: string; nama: string }[]>([]);

interface ChainRow {
  request_type: string;
  roles: string[];
}

const defaultChain = ref<string[]>([]);
const rows = reactive<ChainRow[]>([]);
/** Snapshot terakhir — utk deteksi perubahan & Reset */
let original: { chains: Record<string, string[]>; default_chain: string[] } | null =
  null;

const dirty = computed(() => {
  if (!original) return false;
  return JSON.stringify(toPayload()) !== JSON.stringify(original);
});

function toPayload() {
  const chains: Record<string, string[]> = {};
  for (const r of rows) {
    const key = r.request_type.trim().toUpperCase();
    if (!key || r.roles.length === 0) continue; // baris belum lengkap → lewati
    chains[key] = [...r.roles];
  }
  return { chains, default_chain: [...defaultChain.value] };
}

function extractMessage(e: unknown): string {
  const err = e as { error?: unknown; message?: string };
  if (typeof err?.error === 'string') return err.error;
  return err?.message || 'Terjadi kesalahan yang tidak diketahui';
}

onMounted(load);

async function load() {
  error.value = null;
  try {
    const [sec, rl] = await Promise.all([
      settingsService.getSection('approval'),
      roleService.list().catch(() => ({ data: [] as { kode: string; nama: string }[] })),
    ]);
    applyData(sec.data);
    roles.value = rl.data;
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

function applyData(data: ApprovalSettings) {
  rows.splice(
    0,
    rows.length,
    ...Object.entries(data.chains).map(([request_type, r]) => ({
      request_type,
      roles: [...r],
    }))
  );
  defaultChain.value = [...data.default_chain];
  const p = toPayload();
  original = { chains: p.chains, default_chain: [...p.default_chain] };
}

function addRow() {
  rows.push({ request_type: '', roles: [] });
}

function removeRow(i: number) {
  rows.splice(i, 1);
}

function toggleRole(target: string[], kode: string) {
  const i = target.indexOf(kode);
  if (i >= 0) target.splice(i, 1);
  else target.push(kode);
}

async function save() {
  error.value = null;
  success.value = null;
  saving.value = true;
  try {
    const payload = toPayload();
    if (Object.keys(payload.chains).length === 0 && payload.default_chain.length === 0) {
      throw new Error('Isi minimal satu approver pada Default Chain.');
    }
    const { data } = await settingsService.updateSection('approval', payload);
    applyData(data);
    success.value = 'Konfigurasi approval workflow berhasil disimpan.';
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    saving.value = false;
  }
}

function reset() {
  if (!original) return;
  applyData({
    chains: original.chains,
    default_chain: original.default_chain,
  });
  error.value = null;
  success.value = null;
}
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">Approval Workflow</h1>
      <p class="text-sm text-gray-500 mt-1">
        Chain approver generik — dipakai setiap pengajuan (reimbursement, cuti,
        dst.) sesuai jenis pengajuan.
      </p>
    </div>

    <div
      v-if="loading"
      class="bg-white rounded-xl border border-gray-100 p-10 text-center text-sm text-gray-400"
    >
      Memuat konfigurasi…
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

      <!-- 1. Default Chain -->
      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Default Chain</h2>
        <p class="text-sm text-gray-500 mb-5">
          Dipakai untuk jenis pengajuan yang tidak punya chain khusus.
          Pilih role berurutan dari level 1 (penyetuju pertama).
        </p>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="r in roles"
            :key="r.kode"
            type="button"
            class="px-3 py-1.5 rounded-lg border text-sm transition-colors"
            :class="
              defaultChain.includes(r.kode)
                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium'
                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
            "
            @click="toggleRole(defaultChain, r.kode)"
          >
            {{ r.nama }}
            <span
              v-if="defaultChain.includes(r.kode)"
              class="ml-1 text-xs text-emerald-600"
            >
              #{{ defaultChain.indexOf(r.kode) + 1 }}
            </span>
          </button>
          <span
            v-if="roles.length === 0"
            class="text-sm text-gray-400"
          >
            Daftar role tidak dapat dimuat.
          </span>
        </div>
      </section>

      <!-- 2. Chain per Jenis Pengajuan -->
      <section class="bg-white rounded-xl border border-gray-100 p-6">
        <div class="flex items-start justify-between mb-5">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 mb-1">
              Chain per Jenis Pengajuan
            </h2>
            <p class="text-sm text-gray-500">
              Jenis pengajuan dicocokkan tanpa memperhatikan huruf besar/kecil.
              Baris tanpa role akan diabaikan saat menyimpan.
            </p>
          </div>
          <button
            type="button"
            class="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg"
            @click="addRow"
          >
            + Tambah Chain
          </button>
        </div>

        <div v-if="rows.length === 0" class="text-sm text-gray-400 py-4">
          Belum ada chain khusus — semua pengajuan memakai Default Chain.
        </div>

        <div class="space-y-4">
          <div
            v-for="(row, i) in rows"
            :key="i"
            class="border border-gray-200 rounded-lg p-4"
          >
            <div class="flex items-center gap-3 mb-3">
              <input
                v-model="row.request_type"
                type="text"
                maxlength="50"
                placeholder="Jenis pengajuan, mis. REIMBURSEMENT"
                class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                type="button"
                class="px-3 py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg"
                @click="removeRow(i)"
              >
                Hapus
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="r in roles"
                :key="r.kode"
                type="button"
                class="px-3 py-1.5 rounded-lg border text-sm transition-colors"
                :class="
                  row.roles.includes(r.kode)
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                "
                @click="toggleRole(row.roles, r.kode)"
              >
                {{ r.nama }}
                <span v-if="row.roles.includes(r.kode)" class="ml-1 text-xs text-emerald-600">
                  #{{ row.roles.indexOf(r.kode) + 1 }}
                </span>
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
