<script setup lang="ts">
import { allMenus, canAccessPath, superAdminMenus } from '@/constants/menu';
import { ROLES } from '@/constants/roles';
import roleService from '@/modules/role/services/roleService';
import type { Role } from '@/modules/role/types/role';
import type { RoleCode } from '@/types/auth';
import { computed, onMounted, ref } from 'vue';

// ============================================
// STATE DASAR
// ============================================
const loading = ref(true);
const error = ref<string | null>(null);
const roles = ref<Role[]>([]);

const activeTab = ref<'roles' | 'permission'>('roles');

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
    const res = await roleService.list();
    roles.value = res.data;
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
const editing = ref<Role | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const form = ref({ kode: '', nama: '', deskripsi: '', is_active: true });

function openCreate() {
  editing.value = null;
  form.value = { kode: '', nama: '', deskripsi: '', is_active: true };
  formError.value = null;
  showForm.value = true;
}

function openEdit(role: Role) {
  editing.value = role;
  form.value = {
    kode: role.kode,
    nama: role.nama,
    deskripsi: role.deskripsi ?? '',
    is_active: role.is_active,
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
    if (editing.value) {
      // Kode tidak dikirim — dikunci setelah create
      await roleService.update(editing.value.id, {
        nama: form.value.nama,
        deskripsi: form.value.deskripsi || null,
        is_active: form.value.is_active,
      });
    } else {
      await roleService.create({
        kode: form.value.kode.trim().toUpperCase(),
        nama: form.value.nama,
        deskripsi: form.value.deskripsi || null,
        is_active: form.value.is_active,
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

// ============================================
// HAPUS
// ============================================
async function remove(role: Role) {
  if (role.kode === 'SUPER_ADMIN') return;
  if (role.user_count_all > 0) return;
  if (!window.confirm(`Hapus role "${role.nama}"? Tindakan ini tidak bisa dibatalkan.`)) {
    return;
  }
  try {
    await roleService.remove(role.id);
    error.value = null;
    await load();
  } catch (e) {
    error.value = extractMessage(e);
  }
}

const isProtected = (role: Role) => role.kode === 'SUPER_ADMIN';

// ============================================
// MATRIKS PERMISSION (read-only)
// ============================================
interface MatrixRow {
  group: string;
  label: string;
  path: string;
}

/** Baris matriks = gabungan semua path dari kedua sumber menu, dedupe per path */
const matrixBlocks = computed<{ group: string; rows: MatrixRow[] }[]>(() => {
  const seen = new Set<string>();
  const rows: MatrixRow[] = [];
  const add = (group: string, label: string, path?: string) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    rows.push({ group, label, path });
  };

  for (const list of [superAdminMenus, allMenus]) {
    for (const g of list) {
      add(g.label, g.label, g.path);
      for (const c of g.children ?? []) add(g.label, c.label, c.path);
    }
  }

  // Gabungkan baris berurutan dengan grup yang sama
  const blocks: { group: string; rows: MatrixRow[] }[] = [];
  for (const row of rows) {
    const last = blocks[blocks.length - 1];
    if (last && last.group === row.group) last.rows.push(row);
    else blocks.push({ group: row.group, rows: [row] });
  }
  return blocks;
});

const roleColumns = Object.values(ROLES);
const canAccess = (role: RoleCode, path: string) => canAccessPath(role, path);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Role &amp; Permission</h1>
        <p class="text-sm text-gray-500 mt-1">
          Kelola role pengguna dan lihat matriks akses menu per role.
        </p>
      </div>
      <button
        v-if="activeTab === 'roles'"
        class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        @click="openCreate"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Role
      </button>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-6">
        <button
          class="pb-3 text-sm font-medium border-b-2 transition-colors"
          :class="
            activeTab === 'roles'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          "
          @click="activeTab = 'roles'"
        >
          Roles
        </button>
        <button
          class="pb-3 text-sm font-medium border-b-2 transition-colors"
          :class="
            activeTab === 'permission'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          "
          @click="activeTab = 'permission'"
        >
          Permission
        </button>
      </nav>
    </div>

    <!-- ================= TAB: ROLES ================= -->
    <template v-if="activeTab === 'roles'">
      <!-- Loading -->
      <div
        v-if="loading"
        class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3"
      >
        <svg class="w-8 h-8 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
        <p class="text-sm text-gray-500">Memuat data role…</p>
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
        <button
          class="text-sm font-medium text-red-700 hover:text-red-900"
          @click="load"
        >
          Coba Lagi
        </button>
      </div>

      <!-- Tabel roles -->
      <div v-else class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100">
          <p class="text-sm text-gray-500">
            Aturan: <span class="text-gray-700">kode dikunci</span> setelah dibuat ·
            <span class="text-gray-700">Super Admin</span> tidak bisa dinonaktifkan/dihapus ·
            role yang masih dipakai user tidak bisa dihapus.
          </p>
        </div>
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3 font-medium">Kode</th>
              <th class="px-5 py-3 font-medium">Nama</th>
              <th class="px-5 py-3 font-medium">Deskripsi</th>
              <th class="px-5 py-3 font-medium text-center">User</th>
              <th class="px-5 py-3 font-medium text-center">Status</th>
              <th class="px-5 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="role in roles" :key="role.id" class="hover:bg-gray-50">
              <td class="px-5 py-3">
                <span class="inline-flex items-center gap-1.5">
                  <span class="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {{ role.kode }}
                  </span>
                  <svg
                    v-if="isProtected(role)"
                    class="w-3.5 h-3.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    title="Role dilindungi"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </span>
              </td>
              <td class="px-5 py-3 font-medium text-gray-900">{{ role.nama }}</td>
              <td class="px-5 py-3 text-gray-500 max-w-xs truncate">
                {{ role.deskripsi || '—' }}
              </td>
              <td class="px-5 py-3 text-center">
                <span
                  class="text-xs font-medium px-2 py-0.5 rounded-full"
                  title="User aktif"
                  :class="
                    role.user_count > 0
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  "
                >
                  {{ role.user_count }}
                </span>
              </td>
              <td class="px-5 py-3 text-center">
                <span
                  class="text-xs font-medium px-2 py-1 rounded-full"
                  :class="
                    role.is_active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  "
                >
                  {{ role.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="px-5 py-3 text-right whitespace-nowrap">
                <button
                  class="text-emerald-600 hover:text-emerald-800 text-xs font-medium mr-3"
                  @click="openEdit(role)"
                >
                  Edit
                </button>
                <button
                  class="text-xs font-medium transition-colors"
                  :class="
                    isProtected(role)
                      ? 'text-gray-300 cursor-not-allowed'
                      : role.user_count_all > 0
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-red-500 hover:text-red-700'
                  "
                  :title="
                    isProtected(role)
                      ? 'Role Super Admin tidak dapat dihapus'
                      : role.user_count_all > 0
                        ? `Masih dipakai ${role.user_count_all} user (aktif maupun nonaktif)`
                        : 'Hapus role'
                  "
                  @click="remove(role)"
                >
                  Hapus
                </button>
              </td>
            </tr>
            <tr v-if="!roles.length">
              <td colspan="6" class="px-5 py-10 text-center text-gray-400">
                Belum ada role.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ================= TAB: PERMISSION ================= -->
    <template v-else>
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="text-sm text-blue-800">
          Matriks bersifat <span class="font-semibold">read-only</span> — mengikuti konfigurasi
          menu di <code class="bg-blue-100 px-1 rounded">src/constants/menu.ts</code>.
          Role baru otomatis tanpa akses menu sampai didaftarkan di konfigurasi tersebut.
        </p>
      </div>

      <div class="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table class="w-full text-sm min-w-[720px]">
          <thead>
            <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th class="px-5 py-3 font-medium">Menu</th>
              <th
                v-for="col in roleColumns"
                :key="col.code"
                class="px-3 py-3 font-medium text-center"
              >
                {{ col.name }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <template v-for="(block, i) in matrixBlocks" :key="i">
              <tr class="bg-gray-50/70">
                <td
                  :colspan="1 + roleColumns.length"
                  class="px-5 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
                >
                  {{ block.group }}
                </td>
              </tr>
              <tr v-for="row in block.rows" :key="row.path" class="hover:bg-gray-50">
                <td class="px-5 py-2.5 text-gray-700">{{ row.label }}</td>
                <td
                  v-for="col in roleColumns"
                  :key="col.code"
                  class="px-3 py-2.5 text-center"
                >
                  <span
                    v-if="canAccess(col.code, row.path)"
                    class="text-emerald-600 font-semibold"
                    title="Diakses"
                    >✓</span
                  >
                  <span v-else class="text-gray-300" title="Tidak diakses">–</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ================= MODAL FORM ================= -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeForm"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ editing ? 'Edit Role' : 'Tambah Role' }}
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
              :disabled="!!editing"
              placeholder="mis. OPERATOR"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-100 disabled:text-gray-500 font-mono uppercase"
            />
            <p v-if="editing" class="text-xs text-gray-400 mt-1">
              Kode dikunci setelah role dibuat.
            </p>
            <p v-else class="text-xs text-gray-400 mt-1">
              Huruf besar, angka, underscore. Tidak bisa diubah lagi.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama</label>
            <input
              v-model="form.nama"
              type="text"
              placeholder="mis. Operator Logistik"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea
              v-model="form.deskripsi"
              rows="2"
              placeholder="Keterangan singkat peran role ini…"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            ></textarea>
          </div>

          <label
            class="flex items-center gap-2 text-sm"
            :class="editing && isProtected(editing) ? 'text-gray-400' : 'text-gray-700'"
          >
            <input
              v-model="form.is_active"
              type="checkbox"
              :disabled="!!editing && isProtected(editing)"
              class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            Role aktif
            <span v-if="editing && isProtected(editing)" class="text-xs">
              (Super Admin selalu aktif)
            </span>
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
              {{ saving ? 'Menyimpan…' : editing ? 'Simpan Perubahan' : 'Buat Role' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
