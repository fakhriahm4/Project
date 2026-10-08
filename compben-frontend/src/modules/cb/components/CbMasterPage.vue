<script setup lang="ts">
import type { CbColumn, CbField } from '@/modules/cb/types/form';
import { useAuthStore } from '@/stores/auth';
import { computed, onMounted, ref } from 'vue';

/**
 * Kartu CRUD generik utk halaman Master C&B (konfigurasi via props).
 * Pola UI mengikuti MasterCrudPage (header, banner baca-saja, tabel, modal form).
 * Tulis hanya role ADMIN_CNB; baca mengikuti route (semua role di route tsb).
 */

type Row = Record<string, unknown>;

const props = defineProps<{
  title: string;
  subtitle: string;
  columns: CbColumn[];
  fields: CbField[];
  load: () => Promise<Row[]>;
  createFn: (payload: Record<string, unknown>) => Promise<Row>;
  updateFn: (id: number, payload: Record<string, unknown>) => Promise<Row>;
  removeFn: (id: number) => Promise<void>;
  /** Nilai awal form saat tambah (mis. kategori TER_B utk tab TER_B) */
  defaults?: Record<string, unknown>;
  /** Saring baris hasil load (mis. tab kategori) */
  rowFilter?: (rows: Row[]) => Row[];
  /** Label utk konfirmasi hapus (mis. 'komponen') */
  entityLabel?: string;
  /** Teks kolom kosong */
  emptyText?: string;
}>();

const emit = defineEmits<{ loaded: [rows: Row[]] }>();

const auth = useAuthStore();
const canWrite = computed(() => auth.hasRole('ADMIN_CNB'));

const loading = ref(true);
const error = ref<string | null>(null);
const allRows = ref<Row[]>([]);
const items = computed(() =>
  props.rowFilter ? props.rowFilter(allRows.value) : allRows.value
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

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const rows = await props.load();
    allRows.value = rows;
    emit('loaded', rows);
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());
defineExpose({ reload: load });

// ============================================
// FORM (create / edit)
// ============================================
const showForm = ref(false);
const editing = ref<Row | null>(null);
const saving = ref(false);
const formError = ref<string | null>(null);
const form = ref<Record<string, unknown>>({});

function openCreate() {
  editing.value = null;
  form.value = { ...(props.defaults ?? {}) };
  for (const f of props.fields) {
    if (f.type === 'checkbox' && form.value[f.key] === undefined) form.value[f.key] = true;
    if (f.type === 'rule-scope') form.value[f.key] = form.value[f.key] ?? 'ALL';
  }
  formError.value = null;
  showForm.value = true;
}

function openEdit(item: Row) {
  editing.value = item;
  form.value = { ...item };
  for (const f of props.fields) {
    if (f.type === 'rule-scope') {
      const rule = item[f.key] as Record<string, unknown> | null;
      form.value[f.key] = rule?.if === 'is_driver' ? 'DRIVER' : 'ALL';
    }
  }
  formError.value = null;
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
}

async function save() {
  const payload: Record<string, unknown> = { ...form.value };
  for (const f of props.fields) {
    if (f.type === 'rule-scope') {
      payload[f.key] =
        form.value[f.key] === 'DRIVER'
          ? { if: 'is_driver', then: 'applies' }
          : {};
    }
    if (f.type === 'number' && typeof payload[f.key] === 'string') {
      payload[f.key] = payload[f.key] === '' ? null : Number(payload[f.key]);
    }
    if (f.type === 'date' && payload[f.key] === '') payload[f.key] = null;
  }
  delete payload.id;
  delete payload.created_at;
  delete payload.updated_at;

  // required check sederhana (Zod di backend juga memvalidasi)
  for (const f of props.fields) {
    if (f.required && (payload[f.key] === null || payload[f.key] === undefined || payload[f.key] === '')) {
      formError.value = `${f.label} wajib diisi`;
      return;
    }
  }

  saving.value = true;
  formError.value = null;
  try {
    if (editing.value) {
      await props.updateFn(Number(editing.value.id), payload);
    } else {
      await props.createFn(payload);
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
async function remove(item: Row) {
  const label = props.entityLabel ?? 'data';
  if (!window.confirm(`Hapus ${label} "${item.kode ?? item.nama ?? item.id}"? Tindakan ini tidak bisa dibatalkan.`)) {
    return;
  }
  try {
    await props.removeFn(Number(item.id));
    error.value = null;
    await load();
  } catch (e) {
    error.value = extractMessage(e);
  }
}

// ============================================
// TAMPILAN SEL
// ============================================
function money(v: unknown): string {
  const n = Number(v ?? 0);
  return `Rp ${n.toLocaleString('id-ID')}`;
}
function num(v: unknown): string {
  const n = Number(v ?? 0);
  return n.toLocaleString('id-ID');
}
function fmt(col: CbColumn, item: Row): string {
  const v = item[col.key];
  if (v === null || v === undefined || v === '') return '—';
  if (col.type === 'rule') {
    const rule = v as Record<string, unknown> | null;
    return rule?.if === 'is_driver' ? 'Hanya Driver' : 'Semua Pegawai';
  }
  switch (col.type) {
    case 'money':
      return money(v);
    case 'pct':
      return `${num(v)} %`;
    case 'num':
      return num(v);
    case 'date':
      return String(v);
    default:
      return String(v);
  }
}
function badge(col: CbColumn, item: Row): { label: string; class: string } | null {
  if (col.type !== 'badge' || !col.badges) return null;
  return col.badges[String(item[col.key])] ?? null;
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
      <div class="flex items-center gap-3">
        <slot name="toolbar" />
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
    </div>

    <!-- Akses baca saja -->
    <div
      v-if="!canWrite"
      class="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3"
    >
      <svg class="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm text-blue-800">
        Anda memiliki akses baca saja. Perubahan master C&amp;B dilakukan oleh Admin C&amp;B.
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
      <p class="text-sm text-red-700">{{ error }}</p>
      <button class="text-sm font-medium text-red-700 hover:text-red-900" @click="load">Coba Lagi</button>
    </div>

    <!-- Tabel -->
    <div v-else class="bg-white rounded-xl border border-gray-100 overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-5 py-3 font-medium"
              :class="col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''"
            >
              {{ col.label }}
            </th>
            <th v-if="canWrite" class="px-5 py-3 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in items" :key="String(item.id)" class="hover:bg-gray-50">
            <td
              v-for="col in columns"
              :key="col.key"
              class="px-5 py-3"
              :class="[
                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : '',
                col.type === 'text' || col.type === undefined ? 'font-medium text-gray-900' : '',
              ]"
            >
              <span
                v-if="col.type === 'code'"
                class="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
              >
                {{ item[col.key] }}
              </span>
              <span
                v-else-if="col.type === 'bool'"
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="item[col.key] ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
              >
                {{ item[col.key] ? 'Aktif' : 'Nonaktif' }}
              </span>
              <span
                v-else-if="badge(col, item)"
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="badge(col, item)!.class"
              >
                {{ badge(col, item)!.label }}
              </span>
              <span
                v-else
                :class="['text-gray-600', col.align === 'right' ? 'font-mono tabular-nums' : '']"
              >
                {{ fmt(col, item) }}
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
          <tr v-if="!items.length">
            <td
              :colspan="columns.length + (canWrite ? 1 : 0)"
              class="px-5 py-10 text-center text-gray-400"
            >
              {{ emptyText ?? 'Belum ada data.' }}
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
            {{ editing ? `Edit ${entityLabel ?? title}` : `Tambah ${entityLabel ?? title}` }}
          </h2>
          <button class="text-gray-400 hover:text-gray-600" @click="closeForm">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="save">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              v-for="f in fields"
              :key="f.key"
              :class="f.half || fields.length < 2 ? '' : 'sm:col-span-2'"
            >
              <!-- Checkbox -->
              <label v-if="f.type === 'checkbox'" class="flex items-center gap-2 text-sm text-gray-700 pt-5">
                <input
                  v-model="form[f.key]"
                  type="checkbox"
                  class="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                {{ f.label }}
              </label>

              <!-- Select -->
              <template v-else-if="f.type === 'select' || f.type === 'rule-scope'">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ f.label }}<span v-if="f.required" class="text-red-500"> *</span>
                </label>
                <select
                  v-model="form[f.key]"
                  :required="f.required"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option v-if="!f.required" value="">— pilih —</option>
                  <option
                    v-for="o in f.type === 'rule-scope'
                      ? [
                          { value: 'ALL', label: 'Semua Pegawai' },
                          { value: 'DRIVER', label: 'Hanya Driver' },
                        ]
                      : (f.options ?? [])"
                    :key="o.value"
                    :value="o.value"
                  >
                    {{ o.label }}
                  </option>
                </select>
                <p v-if="f.hint" class="text-xs text-gray-400 mt-1">{{ f.hint }}</p>
              </template>

              <!-- Number -->
              <template v-else-if="f.type === 'number'">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ f.label }}<span v-if="f.required" class="text-red-500"> *</span>
                </label>
                <input
                  v-model="form[f.key]"
                  type="number"
                  :required="f.required"
                  :step="f.step"
                  :min="f.min"
                  :max="f.max"
                  :placeholder="f.placeholder"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p v-if="f.hint" class="text-xs text-gray-400 mt-1">{{ f.hint }}</p>
              </template>

              <!-- Date -->
              <template v-else-if="f.type === 'date'">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ f.label }}<span v-if="f.required" class="text-red-500"> *</span>
                </label>
                <input
                  v-model="form[f.key]"
                  type="date"
                  :required="f.required"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p v-if="f.hint" class="text-xs text-gray-400 mt-1">{{ f.hint }}</p>
              </template>

              <!-- Text -->
              <template v-else>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ f.label }}<span v-if="f.required" class="text-red-500"> *</span>
                </label>
                <input
                  v-model="form[f.key]"
                  type="text"
                  :required="f.required"
                  :placeholder="f.placeholder"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p v-if="f.hint" class="text-xs text-gray-400 mt-1">{{ f.hint }}</p>
              </template>
            </div>
          </div>

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
