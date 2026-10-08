<script setup lang="ts">
import organizationService from '@/modules/organization/services/organizationService';
import type { Company } from '@/modules/organization/types/organization';
import { useAuthStore } from '@/stores/auth';
import { computed, onMounted, ref } from 'vue';

const auth = useAuthStore();
/** Tulis hanya Super Admin — HR tetap bisa melihat daftar (baca saja) */
const canWrite = computed(() => auth.hasRole('SUPER_ADMIN'));

const loading = ref(true);
const error = ref<string | null>(null);
const companies = ref<Company[]>([]);

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
    const res = await organizationService.companies.list();
    companies.value = res.data;
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
const editing = ref<Company | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const form = ref({
  nama: '',
  alamat: '',
  email: '',
  no_hp: '',
  npwp: '',
  deskripsi: '',
  is_active: true,
});

function openCreate() {
  editing.value = null;
  form.value = { nama: '', alamat: '', email: '', no_hp: '', npwp: '', deskripsi: '', is_active: true };
  formError.value = null;
  showForm.value = true;
}

function openEdit(company: Company) {
  editing.value = company;
  form.value = {
    nama: company.nama,
    alamat: company.alamat ?? '',
    email: company.email ?? '',
    no_hp: company.no_hp ?? '',
    npwp: company.npwp ?? '',
    deskripsi: company.deskripsi ?? '',
    is_active: company.is_active,
  };
  formError.value = null;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
}

async function save() {
  if (!form.value.nama.trim()) {
    formError.value = 'Nama perusahaan wajib diisi';
    return;
  }
  saving.value = true;
  formError.value = null;
  try {
    // String kosong → null (backend hanya menerima email valid atau null)
    const payload = {
      nama: form.value.nama.trim(),
      alamat: form.value.alamat.trim() || null,
      email: form.value.email.trim() || null,
      no_hp: form.value.no_hp.trim() || null,
      npwp: form.value.npwp.trim() || null,
      deskripsi: form.value.deskripsi.trim() || null,
      is_active: form.value.is_active,
    };
    if (editing.value) {
      await organizationService.companies.update(editing.value.id, payload);
    } else {
      await organizationService.companies.create(payload);
    }
    closeForm();
    await load();
  } catch (e) {
    formError.value = extractMessage(e);
  } finally {
    saving.value = false;
  }
}

async function remove(company: Company) {
  if (!window.confirm(`Hapus perusahaan "${company.nama}"? Tindakan ini tidak bisa dibatalkan.`)) {
    return;
  }
  try {
    await organizationService.companies.remove(company.id);
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
        <h1 class="text-2xl font-bold text-gray-900">Master Perusahaan</h1>
        <p class="text-sm text-gray-500 mt-1">
          Daftar perusahaan / entitas legal yang terdaftar di sistem.
        </p>
      </div>
      <button
        v-if="canWrite"
        class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        @click="openCreate"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Perusahaan
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
      <p class="text-sm text-gray-500">Memuat data perusahaan…</p>
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
            <th class="px-5 py-3 font-medium">Nama Perusahaan</th>
            <th class="px-5 py-3 font-medium">Kontak</th>
            <th class="px-5 py-3 font-medium">NPWP</th>
            <th class="px-5 py-3 font-medium text-center">Status</th>
            <th v-if="canWrite" class="px-5 py-3 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="company in companies" :key="company.id" class="hover:bg-gray-50">
            <td class="px-5 py-3">
              <p class="font-medium text-gray-900">{{ company.nama }}</p>
              <p class="text-xs text-gray-400 max-w-sm truncate">
                {{ company.alamat || company.deskripsi || '—' }}
              </p>
            </td>
            <td class="px-5 py-3 text-gray-600">
              <p>{{ company.email || '—' }}</p>
              <p class="text-xs text-gray-400">{{ company.no_hp || '' }}</p>
            </td>
            <td class="px-5 py-3 text-gray-600 font-mono text-xs">
              {{ company.npwp || '—' }}
            </td>
            <td class="px-5 py-3 text-center">
              <span
                class="text-xs font-medium px-2 py-1 rounded-full"
                :class="
                  company.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                "
              >
                {{ company.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td v-if="canWrite" class="px-5 py-3 text-right whitespace-nowrap">
              <button
                class="text-emerald-600 hover:text-emerald-800 text-xs font-medium mr-3"
                @click="openEdit(company)"
              >
                Edit
              </button>
              <button
                class="text-red-500 hover:text-red-700 text-xs font-medium"
                @click="remove(company)"
              >
                Hapus
              </button>
            </td>
          </tr>
          <tr v-if="!companies.length">
            <td :colspan="canWrite ? 5 : 4" class="px-5 py-10 text-center text-gray-400">
              Belum ada perusahaan.
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
      <div class="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ editing ? 'Edit Perusahaan' : 'Tambah Perusahaan' }}
          </h2>
          <button class="text-gray-400 hover:text-gray-600" @click="closeForm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="save">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan</label>
            <input
              v-model="form.nama"
              type="text"
              placeholder="mis. PT Reethau Cipta Energi"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              v-model="form.alamat"
              rows="2"
              placeholder="Alamat lengkap…"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                v-model="form.email"
                type="email"
                placeholder="info@perusahaan.co.id"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">No. HP</label>
              <input
                v-model="form.no_hp"
                type="text"
                placeholder="021-xxxxxxx"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">NPWP</label>
            <input
              v-model="form.npwp"
              type="text"
              placeholder="00.000.000.0-000.000"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
            Perusahaan aktif
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
