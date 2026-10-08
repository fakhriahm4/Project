<script setup lang="ts">
import organizationService from '@/modules/organization/services/organizationService';
import type { MasterEntity, MasterItem } from '@/modules/organization/types/organization';
import { useAuthStore } from '@/stores/auth';
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
  entity: MasterEntity;
  title: string;
  subtitle: string;
}>();

const auth = useAuthStore();
/** Tulis (tambah/edit/hapus) hanya Super Admin — GET terbuka utk semua role login */
const canWrite = computed(() => auth.hasRole('SUPER_ADMIN'));

const loading = ref(true);
const error = ref<string | null>(null);
const items = ref<MasterItem[]>([]);

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
    const res = await organizationService.masters.list(props.entity);
    items.value = res.data;
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

// ============================================
// FORM (create / edit)
// ============================================
const showForm = ref(false);
const editing = ref<MasterItem | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const form = ref({ kode: '', nama: '', deskripsi: '', is_active: true });

function openCreate() {
  editing.value = null;
  form.value = { kode: '', nama: '', deskripsi: '', is_active: true };
  formError.value = null;
  showForm.value = true;
}

function openEdit(item: MasterItem) {
  editing.value = item;
  form.value = {
    kode: item.kode,
    nama: item.nama,
    deskripsi: item.deskripsi ?? '',
    is_active: item.is_active,
  };
  formError.value = null;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
}

async function save() {
  if (!form.value.kode.trim() || !form.value.nama.trim()) {
    formError.value = 'Kode dan nama wajib diisi';
    return;
  }
  saving.value = true;
  formError.value = null;
  try {
    const payload = {
      kode: form.value.kode.trim(),
      nama: form.value.nama.trim(),
      deskripsi: form.value.deskripsi || null,
      is_active: form.value.is_active,
    };
    if (editing.value) {
      await organizationService.masters.update(props.entity, editing.value.id, payload);
    } else {
      await organizationService.masters.create(props.entity, payload);
    }
    closeForm();
    await load();
  } catch (e) {
    formError.value = extractMessage(e);
  } finally {
    saving.value = false;
  }
}

// ============================================
// HAPUS
// ============================================
async function remove(item: MasterItem) {
  if (item.user_count_all > 0) return;
  const label = props.entity === 'divisi' ? 'divisi/departemen' : 'jabatan';
  if (!window.confirm(`Hapus ${label} "${item.nama}"? Tindakan ini tidak bisa dibatalkan.`)) {
    return;
  }
  try {
    await organizationService.masters.remove(props.entity, item.id);
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
        <h1 class="text-2xl font-bold text-gray-900">{{ title }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ subtitle }}</p>
      </div>
      <button
        v-if="canWrite"
        class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        @click="openCreate"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah
      </button>
    </div>

    <!-- Akses baca saja -->
    <div
      v-if="!canWrite"
      class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3"
    >
      <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p class="text-sm text-blue-800">
        Anda memiliki akses baca saja. Penambahan &amp; perubahan data dilakukan oleh Super Admin.
      </p>
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
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>
      <button class="text-sm font-medium text-red-700 hover:text-red-900" @click="load">
        Coba Lagi
      </button>
    </div>

    <!-- Tabel -->
    <div v-else class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <th class="px-5 py-3 font-medium">Kode</th>
            <th class="px-5 py-3 font-medium">Nama</th>
            <th class="px-5 py-3 font-medium">Deskripsi</th>
            <th class="px-5 py-3 font-medium text-center">User</th>
            <th class="px-5 py-3 font-medium text-center">Status</th>
            <th v-if="canWrite" class="px-5 py-3 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in items" :key="item.id" class="hover:bg-gray-50">
            <td class="px-5 py-3">
              <span class="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {{ item.kode }}
              </span>
            </td>
            <td class="px-5 py-3 font-medium text-gray-900">{{ item.nama }}</td>
            <td class="px-5 py-3 text-gray-500 max-w-xs truncate">
              {{ item.deskripsi || '—' }}
            </td>
            <td class="px-5 py-3 text-center">
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                title="User aktif"
                :class="
                  item.user_count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                "
              >
                {{ item.user_count }}
              </span>
            </td>
            <td class="px-5 py-3 text-center">
              <span
                class="text-xs font-medium px-2 py-1 rounded-full"
                :class="
                  item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                "
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
              <button
                class="text-xs font-medium transition-colors"
                :class="
                  item.user_count_all > 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-red-500 hover:text-red-700'
                "
                :title="
                  item.user_count_all > 0
                    ? `Masih dipakai ${item.user_count_all} user (aktif maupun nonaktif) — nonaktifkan saja`
                    : 'Hapus data'
                "
                @click="remove(item)"
              >
                Hapus
              </button>
            </td>
          </tr>
          <tr v-if="!items.length">
            <td :colspan="canWrite ? 6 : 5" class="px-5 py-10 text-center text-gray-400">
              Belum ada data.
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
            {{ editing ? `Edit ${title}` : `Tambah ${title}` }}
          </h2>
          <button class="text-gray-400 hover:text-gray-600" @click="closeForm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="save">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Kode</label>
            <input
              v-model="form.kode"
              type="text"
              placeholder="mis. HRGA"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono uppercase focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              v-model="form.nama"
              type="text"
              :placeholder="entity === 'divisi' ? 'mis. Human Capital' : 'mis. Staff'"

              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea
              v-model="form.deskripsi"
              rows="2"
              placeholder="Keterangan singkat…"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            ></textarea>
          </div>

          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input
              v-model="form.is_active"
              type="checkbox"
              class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Data aktif
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
