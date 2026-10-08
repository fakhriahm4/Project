<script setup lang="ts">
import { getRoleInfo } from '@/constants/roles';
import userService, { extractErrorMessage } from '@/modules/user/services/userService';
import { lookupService, type LookupItem } from '@/services/lookupService';
import { useAppSettingsStore } from '@/stores/appSettings';
import type { RoleCode } from '@/types/auth';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { User } from '../types/user';

const router = useRouter();
const appSettings = useAppSettingsStore();

const isExporting = ref(false);

async function downloadProfileExcel() {
  isExporting.value = true;
  errorMessage.value = '';
  try {
    await userService.downloadProfileExport(filterStatus.value || undefined);
  } catch (e) {
    errorMessage.value = await extractErrorMessage(e);
  } finally {
    isExporting.value = false;
  }
}

function goToImport() {
  router.push('/users/import');
}

const users = ref<User[]>([]);
const isLoading = ref(false);
const errorMessage = ref('');
const search = ref('');
const filterRole = ref<number | ''>('');
const filterStatus = ref('');
const page = ref(1);
/** Baris per halaman — dari System Configuration (default 10) */
const limit = ref(appSettings.defaultPageSize);
const total = ref(0);
const totalPages = ref(0);
const stats = ref({ total: 0, active: 0, inactive: 0, total_roles: 0 });
const roleOptions = ref<LookupItem[]>([]);

/** Dari /users?... → properti top-level (bukan data) */
const fromRow = computed(() => {
  const start = total.value === 0 ? 0 : (page.value - 1) * limit.value + 1;
  const end = Math.min(page.value * limit.value, total.value);
  return { start, end };
});

async function loadStats() {
  try {
    const res = await userService.stats();
    stats.value = res.data;
  } catch {
    // stats non-kritis — biarkan angka lama
  }
}

async function loadData() {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const res = await userService.list({
      page: page.value,
      limit: limit.value,
      search: search.value || undefined,
      role_id: filterRole.value || undefined,
      status: filterStatus.value || undefined,
      // Fase 0.6: urut nama ASC — identik dgn Master Pegawai
      sort_by: 'nama',
      sort_order: 'asc',
    });
    users.value = res.data;
    total.value = res.total;
    totalPages.value = res.totalPages;
  } catch (error: any) {
    errorMessage.value = error?.error || error?.message || 'Gagal memuat data user';
    users.value = [];
    total.value = 0;
    totalPages.value = 0;
  } finally {
    isLoading.value = false;
  }
}

async function loadRoles() {
  try {
    const data = await lookupService.all();
    roleOptions.value = data.roles;
  } catch {
    // filter role non-kritis
  }
}

// Debounce search → reload dari server (reset ke page 1)
let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    loadData();
  }, 300);
});

// Filter role/status langsung reload
watch([filterRole, filterStatus], () => {
  page.value = 1;
  loadData();
});

// Pagination
watch(page, () => loadData());

function prevPage() {
  if (page.value > 1) page.value--;
}
function nextPage() {
  if (page.value < totalPages.value) page.value++;
}

function getRoleBadge(roleCode: string) {
  return getRoleInfo(roleCode as RoleCode);
}

function goToCreate() {
  router.push('/users/create');
}

function goToEdit(id: number) {
  router.push(`/users/${id}/edit`);
}

async function handleDelete(user: User) {
  if (!confirm(`Yakin ingin menghapus user "${user.nama}"?`)) return;
  try {
    await userService.delete(user.id);
    alert('User berhasil dihapus');
    // Jika baris terakhir dihapus di page terakhir → mundur satu page
    if (users.value.length === 1 && page.value > 1) {
      page.value--; // watch(page) akan memicu reload
    } else {
      await loadData();
    }
    await loadStats();
  } catch (error: any) {
    alert(error?.error || error?.message || 'Gagal menghapus user');
  }
}

onMounted(() => {
  loadStats();
  loadRoles();
  loadData();
});

onUnmounted(() => clearTimeout(searchTimer));
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Manajemen User</h1>
        <p class="text-sm text-gray-500 mt-1">Kelola akun pengguna sistem</p>
      </div>
      <div class="flex items-center gap-3 flex-wrap">
        <button
          class="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
          :disabled="isExporting"
          title="Undah semua profil user (akun + data diri) dalam format Excel"
          @click="downloadProfileExcel"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ isExporting ? 'Menyiapkan…' : 'Unduh Profil (Excel)' }}
        </button>
        <button
          class="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors"
          @click="goToImport"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Import User
        </button>
        <button
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm"
          @click="goToCreate"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah User
        </button>
      </div>
    </div>

    <!-- Error banner -->
    <div
      v-if="errorMessage"
      class="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <p class="text-xs text-gray-500 mb-1">Total User</p>
        <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <p class="text-xs text-gray-500 mb-1">Aktif</p>
        <p class="text-2xl font-bold text-emerald-600">{{ stats.active }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <p class="text-xs text-gray-500 mb-1">Tidak Aktif</p>
        <p class="text-2xl font-bold text-red-600">{{ stats.inactive }}</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-5">
        <p class="text-xs text-gray-500 mb-1">Total Role</p>
        <p class="text-2xl font-bold text-blue-600">{{ stats.total_roles }}</p>
      </div>
    </div>

    <!-- Filter & Search -->
    <div class="bg-white rounded-xl border border-gray-100 p-5">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <!-- Search -->
        <div class="md:col-span-2 relative">
          <svg
            class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            v-model="search"
            type="text"
            placeholder="Cari nama, NIP, email, atau username..."
            class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        <!-- Filter Role -->
        <select
          v-model="filterRole"
          class="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Semua Role</option>
          <option v-for="r in roleOptions" :key="r.id" :value="r.id">
            {{ r.nama }}
          </option>
        </select>

          <!-- Filter Status — semantik = is_active (sama dgn Master Pegawai) -->
          <select
            v-model="filterStatus"
            class="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">NIP</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Nama</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Divisi</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Jabatan</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Grade</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Role</th>
              <th class="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading">
              <td colspan="8" class="py-8 text-center text-gray-500">
                Memuat data...
              </td>
            </tr>
            <tr v-else-if="users.length === 0">
              <td colspan="8" class="py-8 text-center text-gray-500">
                Tidak ada data user
              </td>
            </tr>
            <template v-else>
            <tr
              v-for="user in users"
              :key="user.id"
              class="border-b border-gray-50 hover:bg-gray-50 transition-colors"
            >
              <td class="py-3 px-4">
                <span class="text-sm font-mono text-gray-700">{{ user.employee_id }}</span>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span class="text-xs font-semibold text-emerald-700">
                      {{ user.nama.charAt(0).toUpperCase() }}
                    </span>
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">{{ user.nama }}</p>
                    <p class="text-xs text-gray-500">@{{ user.username }}</p>
                  </div>
                </div>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm text-gray-600">{{ user.email }}</span>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm text-gray-600">{{ user.divisi_nama }}</span>
              </td>
              <td class="py-3 px-4">
                <span class="text-sm text-gray-600">{{ user.jabatan_nama }}</span>
              </td>
              <td class="py-3 px-4">
                <span
                  class="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                  :title="user.grade_nama"
                >
                  {{ user.grade_kode || '—' }}
                </span>
              </td>
              <td class="py-3 px-4">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="`${getRoleBadge(user.role_kode).bgColor} ${getRoleBadge(user.role_kode).textColor}`"
                >
                  {{ user.role_nama }}
                </span>
              </td>
              <td class="py-3 px-4">
                <span
                  class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                  :class="user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="user.is_active ? 'bg-emerald-500' : 'bg-gray-400'"
                  ></span>
                  {{ user.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center justify-center gap-1">
                  <button
                    class="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                    title="Edit"
                    @click="goToEdit(user.id)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    class="p-1.5 rounded-md hover:bg-red-50 text-red-600 transition-colors"
                    title="Hapus"
                    @click="handleDelete(user)"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div
        v-if="users.length > 0"
        class="border-t border-gray-100 px-4 py-3 flex items-center justify-between"
      >
        <p class="text-sm text-gray-500">
          Menampilkan {{ fromRow.start }}–{{ fromRow.end }} dari {{ total }} user
        </p>
        <div class="flex items-center gap-2">
          <button
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            :disabled="page <= 1 || isLoading"
            @click="prevPage"
          >
            Prev
          </button>
          <span class="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-md">
            {{ page }}
          </span>
          <button
            class="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            :disabled="page >= totalPages || isLoading"
            @click="nextPage"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>