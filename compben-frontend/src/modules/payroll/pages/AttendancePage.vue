<script setup lang="ts">
import payrollService, {
  type AttendanceEntry,
  type ImportResult,
  type MatrixEmployee,
  type PayrollPeriod,
} from '@/modules/payroll/services/payrollService';
import { computed, onMounted, ref } from 'vue';

/**
 * Absensi (Fase 1) — sumber data: IMPOR Excel dari alat fingerprint,
 * lalu koreksi manual Admin C&B.
 *   • Hari kerja Sen–Jumat; hari kosong = "Belum absen" (wajib dikoreksi
 *     sebelum generate — validasi sebelum finalisasi).
 *   • Tgl > cut-off (22) tampil terkunci "Asumsi hadir" (tanpa baris).
 *   • Periode OPEN & belum lewat cut-off → sel bisa diedit (server enforce).
 */

const loading = ref(true);
const error = ref<string | null>(null);

const periods = ref<PayrollPeriod[]>([]);
const selectedPeriodId = ref<number | null>(null);

// matrix
const period = ref<PayrollPeriod | null>(null);
const lockDate = ref('');
const writable = ref(false);
const employees = ref<MatrixEmployee[]>([]);
const entriesMap = ref<Map<string, AttendanceEntry>>(new Map());

// impor
const importing = ref(false);
const importResult = ref<ImportResult | null>(null);
const importError = ref<string | null>(null);

// editor sel
const editor = ref<{
  emp: MatrixEmployee;
  tanggal: string;
  status: 'HADIR' | 'SAKIT' | 'IZIN' | 'CUTI' | 'ALPHA';
  jam_masuk: string;
  jam_keluar: string;
  keterangan: string;
  hasEntry: boolean;
} | null>(null);
const savingCell = ref(false);
const cellError = ref<string | null>(null);

function extractMessage(e: unknown): string {
  const err = e as { error?: unknown; message?: string };
  if (typeof err?.error === 'string') return err.error;
  if (err?.error && typeof err.error === 'object' && 'message' in err.error) {
    const m = (err.error as { message?: string }).message;
    if (m) return m;
  }
  return err?.message || 'Terjadi kesalahan yang tidak diketahui';
}

const pad = (n: number) => String(n).padStart(2, '0');

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAY_LETTERS = ['M', 'S', 'S', 'R', 'K', 'J', 'S']; // Min..Sab

function monthLabel(periodMonth: string): string {
  const [y, m] = periodMonth.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    periods.value = await payrollService.periods.list();
    if (!periods.value.length) return;
    const firstOpen = periods.value.find((p) => p.status === 'OPEN');
    selectedPeriodId.value = (firstOpen ?? periods.value[0]).id;
    await loadMatrix();
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

async function onPeriodChange() {
  if (!selectedPeriodId.value) return;
  importResult.value = null;
  importError.value = null;
  error.value = null;
  try {
    await loadMatrix();
  } catch (e) {
    error.value = extractMessage(e);
  }
}

async function loadMatrix() {
  if (!selectedPeriodId.value) return;
  const data = await payrollService.attendance.matrix(selectedPeriodId.value);
  period.value = data.period;
  lockDate.value = data.lock_date;
  writable.value = data.writable;
  employees.value = data.employees;
  entriesMap.value = new Map(
    data.entries.map((e) => [`${e.employee_id}|${e.tanggal}`, e])
  );
}

// ── Grid ───────────────────────────────────────────────────
const days = computed<number[]>(() => {
  if (!period.value) return [];
  const [y, m] = period.value.period_month.split('-').map(Number);
  const n = new Date(y, m, 0).getDate(); // hari terakhir bulan tsb
  return Array.from({ length: n }, (_, i) => i + 1);
});

function tanggalOf(day: number): string {
  return `${period.value!.period_month}-${pad(day)}`;
}

function weekdayOf(day: number): number {
  const [y, m] = period.value!.period_month.split('-').map(Number);
  return new Date(y, m - 1, day).getDay();
}

type CellKind =
  | AttendanceEntry['status']
  | 'WEEKEND'
  | 'ASSUMED'
  | 'NONE';

const STATUS_LABEL: Record<string, string> = {
  HADIR: 'Hadir',
  SAKIT: 'Sakit',
  IZIN: 'Izin',
  CUTI: 'Cuti',
  ALPHA: 'Alpha',
};
const STATUS_LETTER: Record<string, string> = {
  HADIR: 'H',
  SAKIT: 'S',
  IZIN: 'I',
  CUTI: 'C',
  ALPHA: 'X',
};
const STATUS_CLASS: Record<CellKind, string> = {
  HADIR: 'bg-emerald-100 text-emerald-700',
  SAKIT: 'bg-amber-100 text-amber-700',
  IZIN: 'bg-sky-100 text-sky-700',
  CUTI: 'bg-purple-100 text-purple-700',
  ALPHA: 'bg-red-100 text-red-700',
  ASSUMED: 'bg-indigo-50 text-indigo-400 border border-dashed border-indigo-200',
  WEEKEND: 'bg-gray-50 text-gray-300',
  NONE: 'text-gray-300',
  LOCKED_ASSUMED_PRESENT: 'bg-indigo-50 text-indigo-400 border border-dashed border-indigo-200',
};

function cellOf(empId: number, day: number): {
  kind: CellKind;
  label: string;
  title: string;
} {
  const p = period.value!;
  if (day > p.cut_off_day) {
    return {
      kind: 'ASSUMED',
      label: 'H',
      title: `Tgl ${day} — terkunci cut-off (tgl ${p.cut_off_day}), dianggap hadir`,
    };
  }
  if (weekdayOf(day) === 0 || weekdayOf(day) === 6) {
    return { kind: 'WEEKEND', label: '', title: 'Akhir pekan' };
  }
  const entry = entriesMap.value.get(`${empId}|${tanggalOf(day)}`);
  if (entry) {
    const jam =
      entry.jam_masuk || entry.jam_keluar
        ? ` · ${entry.jam_masuk ?? '—'}–${entry.jam_keluar ?? '—'}`
        : '';
    const ket = entry.keterangan ? ` · ${entry.keterangan}` : '';
    const src = entry.source === 'IMPORT' ? ' (impor finger)' : ' (koreksi manual)';
    return {
      kind: entry.status,
      label: STATUS_LETTER[entry.status] ?? '?',
      title: `${STATUS_LABEL[entry.status] ?? entry.status}${jam}${ket}${src}`,
    };
  }
  return { kind: 'NONE', label: '—', title: 'Belum absen' };
}

function isEditable(_empId: number, day: number): boolean {
  const p = period.value;
  if (!p || !writable.value) return false;
  if (day > p.cut_off_day) return false;
  const dow = weekdayOf(day);
  return dow !== 0 && dow !== 6;
}

function openEditor(emp: MatrixEmployee, day: number) {
  const tanggal = tanggalOf(day);
  const existing = entriesMap.value.get(`${emp.id}|${tanggal}`);
  cellError.value = null;
  editor.value = {
    emp,
    tanggal,
    status: (existing?.status as 'HADIR' | 'SAKIT' | 'IZIN' | 'CUTI' | 'ALPHA') || 'HADIR',
    jam_masuk: existing?.jam_masuk ?? '',
    jam_keluar: existing?.jam_keluar ?? '',
    keterangan: existing?.keterangan ?? '',
    hasEntry: !!existing,
  };
}

function closeEditor() {
  editor.value = null;
}

async function saveCell() {
  if (!editor.value) return;
  savingCell.value = true;
  cellError.value = null;
  try {
    await payrollService.attendance.saveCell({
      employee_id: editor.value.emp.id,
      tanggal: editor.value.tanggal,
      status: editor.value.status,
      jam_masuk:
        editor.value.status === 'HADIR' ? editor.value.jam_masuk || null : null,
      jam_keluar:
        editor.value.status === 'HADIR' ? editor.value.jam_keluar || null : null,
      keterangan: editor.value.keterangan.trim() || null,
    });
    closeEditor();
    await loadMatrix();
  } catch (e) {
    cellError.value = extractMessage(e);
  } finally {
    savingCell.value = false;
  }
}

async function deleteCell() {
  if (!editor.value) return;
  if (!window.confirm(`Hapus data absensi ${editor.value.emp.nama} tgl ${editor.value.tanggal}?`)) return;
  savingCell.value = true;
  cellError.value = null;
  try {
    await payrollService.attendance.deleteCell(
      editor.value.emp.id,
      editor.value.tanggal
    );
    closeEditor();
    await loadMatrix();
  } catch (e) {
    cellError.value = extractMessage(e);
  } finally {
    savingCell.value = false;
  }
}

// ── Impor Excel (finger) & template ────────────────────────
async function onFileChosen(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // reset agar file sama bisa dipilih lagi
  if (!file || !selectedPeriodId.value || !period.value) return;
  importing.value = true;
  importError.value = null;
  importResult.value = null;
  try {
    importResult.value = await payrollService.attendance.import(
      file,
      selectedPeriodId.value
    );
    await loadMatrix();
  } catch (e) {
    importError.value = extractMessage(e);
  } finally {
    importing.value = false;
  }
}

async function downloadTemplate() {
  try {
    await payrollService.attendance.downloadTemplate();
  } catch (e) {
    importError.value = extractMessage(e);
  }
}

// ── Rekap ringkas per pegawai ──────────────────────────────
function summaryOf(empId: number): { h: number; s: number; i: number; c: number; x: number } {
  const sum = { h: 0, s: 0, i: 0, c: 0, x: 0 };
  for (const d of days.value) {
    if (d > (period.value?.cut_off_day ?? 0)) break;
    const e = entriesMap.value.get(`${empId}|${tanggalOf(d)}`);
    if (!e) continue;
    if (e.status === 'HADIR') sum.h++;
    else if (e.status === 'SAKIT') sum.s++;
    else if (e.status === 'IZIN') sum.i++;
    else if (e.status === 'CUTI') sum.c++;
    else if (e.status === 'ALPHA') sum.x++;
  }
  return sum;
}

const statusBanner = computed(() => {
  const p = period.value;
  if (!p) return null;
  if (p.status === 'PAID')
    return { cls: 'bg-gray-100 text-gray-600', text: 'Periode sudah DIBAYAR — data final, hanya baca.' };
  if (p.status === 'LOCKED')
    return { cls: 'bg-amber-50 text-amber-700', text: 'Periode DIKUNCI — koreksi via Adjustment (bulan berikutnya).' };
  if (!writable.value)
    return { cls: 'bg-amber-50 text-amber-700', text: `Absensi terkunci otomatis sejak tgl ${lockDate.value} (cut-off) — koreksi via Adjustment.` };
  return {
    cls: 'bg-emerald-50 text-emerald-700',
    text: `Absensi TERBUKA — input s/d tgl ${p.cut_off_day - 1}; tgl ${p.cut_off_day} ke atas dianggap hadir.`,
  };
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Absensi</h1>
        <p class="text-sm text-gray-500 mt-1">
          Impor hasil export alat fingerprint (Excel), lalu koreksi manual bila perlu —
          hari kerja Sen–Jumat.
        </p>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <select
          v-model="selectedPeriodId"
          class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          @change="onPeriodChange"
        >
          <option v-for="p in periods" :key="p.id" :value="p.id">
            {{ monthLabel(p.period_month) }} — {{ p.status }}
          </option>
        </select>
        <button
          class="inline-flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          title="Unduh format file Excel absensi"
          @click="downloadTemplate"
        >
          Unduh Template
        </button>
        <label
          class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors cursor-pointer"
          :class="{ 'pointer-events-none opacity-60': importing || !period || !writable }"
          :title="period && !writable ? 'Periode terkunci — impor ditolak' : 'Upload file .xlsx hasil export finger'"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {{ importing ? 'Mengimpor…' : 'Impor Excel' }}
          <input
            type="file"
            accept=".xlsx,.xls"
            class="hidden"
            :disabled="importing"
            @change="onFileChosen"
          />
        </label>
      </div>
    </div>

    <!-- Loading / empty -->
    <div
      v-if="loading"
      class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3"
    >
      <svg class="w-8 h-8 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8H4z" />
      </svg>
      <p class="text-sm text-gray-500">Memuat absensi…</p>
    </div>

    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start justify-between gap-4"
    >
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-sm text-red-700">{{ error }}</p>
      </div>
      <button class="text-sm font-medium text-red-700 hover:text-red-900" @click="load">Coba Lagi</button>
    </div>

    <div v-else-if="!periods.length" class="bg-white rounded-xl border border-gray-100 p-10 text-center">
      <p class="text-gray-500">Belum ada periode payroll.</p>
      <RouterLink
        to="/payroll/periods"
        class="inline-block mt-3 text-emerald-600 hover:text-emerald-800 text-sm font-medium"
      >
        Buat periode dulu →
      </RouterLink>
    </div>

    <template v-else>
      <!-- Banner status -->
      <div v-if="statusBanner" class="rounded-xl px-4 py-3 text-sm font-medium" :class="statusBanner.cls">
        {{ statusBanner.text }}
      </div>

      <!-- Hasil impor -->
      <div
        v-if="importResult"
        class="bg-white border border-gray-100 rounded-xl p-4 space-y-2"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="text-sm text-gray-700">
            <span class="font-medium">Impor "{{ importResult.filename }}" selesai</span> —
            {{ importResult.imported }} baris baru, {{ importResult.updated }} baris diperbarui
            <span v-if="importResult.errors.length" class="text-amber-600">
              , {{ importResult.errors.length }} baris ditolak
            </span>
          </div>
          <button class="text-xs text-gray-400 hover:text-gray-600" @click="importResult = null">Tutup</button>
        </div>
        <table v-if="importResult.errors.length" class="w-full text-xs">
          <thead>
            <tr class="text-left text-gray-400">
              <th class="py-1 pr-4 font-medium">Baris</th>
              <th class="py-1 font-medium">Keterangan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="err in importResult.errors" :key="err.row">
              <td class="py-1 pr-4 font-mono text-gray-500">{{ err.row }}</td>
              <td class="py-1 text-amber-700">{{ err.message }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="importError"
        class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex justify-between gap-3"
      >
        <span>{{ importError }}</span>
        <button class="text-red-400 hover:text-red-600" @click="importError = null">Tutup</button>
      </div>

      <!-- Legenda -->
      <div class="flex items-center gap-3 flex-wrap text-xs text-gray-500">
        <span class="font-medium text-gray-600">Legenda:</span>
        <span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">H</span> Hadir
        <span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">S</span> Sakit
        <span class="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-medium">I</span> Izin
        <span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">C</span> Cuti
        <span class="px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">X</span> Alpha
        <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-500 border border-dashed border-indigo-200 font-medium">H</span> Asumsi (terkunci)
        <span class="px-1.5 py-0.5 rounded text-gray-300">—</span> Belum absen
        <span class="px-1.5 py-0.5 rounded bg-gray-50 text-gray-300">·</span> Akhir pekan
      </div>

      <!-- Grid -->
      <div class="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table class="text-xs border-collapse">
          <thead>
            <tr class="bg-gray-50 text-gray-500">
              <th
                class="px-3 py-2 text-left font-medium sticky left-0 bg-gray-50 border-r border-gray-200 min-w-[200px] z-10"
              >
                Pegawai
              </th>
              <th
                v-for="d in days"
                :key="d"
                class="px-1 py-2 font-medium text-center w-8 border-b border-gray-200"
                :class="
                  d > (period?.cut_off_day ?? 0)
                    ? 'bg-indigo-50 text-indigo-400'
                    : weekdayOf(d) === 0 || weekdayOf(d) === 6
                      ? 'bg-gray-100 text-gray-400'
                      : ''
                "
                :title="`Tanggal ${d}`"
              >
                <div class="text-[9px] leading-none text-gray-400">
                  {{ DAY_LETTERS[weekdayOf(d)] }}
                </div>
                {{ d }}
              </th>
              <th class="px-2 py-2 font-medium text-center text-gray-400 border-l border-gray-200">H</th>
              <th class="px-2 py-2 font-medium text-center text-gray-400">S</th>
              <th class="px-2 py-2 font-medium text-center text-gray-400">I</th>
              <th class="px-2 py-2 font-medium text-center text-gray-400">C</th>
              <th class="px-2 py-2 font-medium text-center text-gray-400">X</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="emp in employees" :key="emp.id" class="hover:bg-gray-50/60">
              <td class="px-3 py-1.5 sticky left-0 bg-white border-r border-gray-200 z-10">
                <div class="font-medium text-gray-900 truncate max-w-[190px]" :title="emp.nama">
                  {{ emp.nama }}
                </div>
                <div class="text-[10px] text-gray-400">
                  {{ emp.employee_id }}<span v-if="emp.divisi_nama"> · {{ emp.divisi_nama }}</span>
                </div>
              </td>
              <td
                v-for="d in days"
                :key="d"
                class="w-8 h-7 p-0 text-center align-middle select-none"
                :class="[
                  STATUS_CLASS[cellOf(emp.id, d).kind],
                  isEditable(emp.id, d)
                    ? 'cursor-pointer hover:ring-1 hover:ring-emerald-400'
                    : '',
                ]"
                :title="cellOf(emp.id, d).title"
                @click="isEditable(emp.id, d) && openEditor(emp, d)"
              >
                <span class="font-medium">{{ cellOf(emp.id, d).label }}</span>
              </td>
              <td class="px-2 py-1.5 text-center text-gray-600 font-medium border-l border-gray-200">
                {{ summaryOf(emp.id).h }}
              </td>
              <td class="px-2 py-1.5 text-center text-amber-600 font-medium">{{ summaryOf(emp.id).s }}</td>
              <td class="px-2 py-1.5 text-center text-sky-600 font-medium">{{ summaryOf(emp.id).i }}</td>
              <td class="px-2 py-1.5 text-center text-purple-600 font-medium">{{ summaryOf(emp.id).c }}</td>
              <td class="px-2 py-1.5 text-center text-red-600 font-medium">{{ summaryOf(emp.id).x }}</td>
            </tr>
            <tr v-if="!employees.length">
              <td :colspan="days.length + 6" class="px-5 py-10 text-center text-gray-400">
                Tidak ada pegawai yang ikut payroll (cek flag "Ikut Gaji" di Master Pegawai).
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Modal koreksi sel -->
    <div
      v-if="editor"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      @click.self="closeEditor"
    >
      <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div class="flex items-center justify-between mb-1">
          <h2 class="text-lg font-semibold text-gray-900">Koreksi Absensi</h2>
          <button class="text-gray-400 hover:text-gray-600" @click="closeEditor">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p class="text-sm text-gray-500 mb-4">
          {{ editor.emp.nama }} ({{ editor.emp.employee_id }}) ·
          {{ editor.tanggal }}
          <span v-if="editor.hasEntry" class="text-gray-400">· sudah ada data</span>
        </p>

        <form class="space-y-4" @submit.prevent="saveCell">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="s in (['HADIR', 'SAKIT', 'IZIN', 'CUTI', 'ALPHA'] as const)"
                :key="s"
                type="button"
                class="px-2 py-2 rounded-lg text-xs font-medium border transition-colors"
                :class="
                  editor.status === s
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                "
                @click="editor.status = s"
              >
                {{ STATUS_LABEL[s] }}
              </button>
            </div>
          </div>

          <div v-if="editor.status === 'HADIR'" class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jam Masuk</label>
              <input
                v-model="editor.jam_masuk"
                type="time"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Jam Keluar</label>
              <input
                v-model="editor.jam_keluar"
                type="time"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
            <input
              v-model="editor.keterangan"
              type="text"
              maxlength="200"
              placeholder="mis. Surat dokter"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <p
            v-if="cellError"
            class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            {{ cellError }}
          </p>

          <div class="flex justify-between gap-3 pt-2">
            <button
              v-if="editor.hasEntry"
              type="button"
              class="text-sm font-medium text-red-500 hover:text-red-700 px-3 py-2"
              :disabled="savingCell"
              @click="deleteCell"
            >
              Hapus Data
            </button>
            <div class="flex gap-3 ml-auto">
              <button
                type="button"
                class="text-sm font-medium text-gray-600 hover:text-gray-800 px-4 py-2"
                @click="closeEditor"
              >
                Batal
              </button>
              <button
                type="submit"
                :disabled="savingCell"
                class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {{ savingCell ? 'Menyimpan…' : 'Simpan' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
