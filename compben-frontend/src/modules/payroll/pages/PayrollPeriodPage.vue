<script setup lang="ts">
import payrollService, { type PayrollPeriod } from '@/modules/payroll/services/payrollService';
import settingsService from '@/modules/settings/services/settingsService';
import { computed, onMounted, ref } from 'vue';

/**
 * Periode Payroll (Fase 1) — siklus absensi & gaji Admin C&B:
 *   OPEN → (kunci absensi, tgl cut-off 22) → LOCKED → (bayar, tgl 27) → PAID
 * Parameter cut-off/payday diambil dari settings cb_parameter; setiap periode
 * menyimpan snapshot-nya saat dibuat.
 */

const loading = ref(true);
const error = ref<string | null>(null);
const items = ref<PayrollPeriod[]>([]);

const cutOffDay = ref(22);
const paydayDay = ref(27);

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
    const [periods, cfg] = await Promise.all([
      payrollService.periods.list(),
      settingsService.getSection('cb_parameter').catch(() => null),
    ]);
    items.value = periods;
    if (cfg?.data) {
      cutOffDay.value = cfg.data.cut_off_day;
      paydayDay.value = cfg.data.payday_day;
    }
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

// ── Label & badge ──────────────────────────────────────────
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function monthLabel(periodMonth: string): string {
  const [y, m] = periodMonth.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

const STATUS_BADGE: Record<PayrollPeriod['status'], { label: string; cls: string }> = {
  OPEN: { label: 'Open', cls: 'bg-blue-100 text-blue-700' },
  LOCKED: { label: 'Terkunci', cls: 'bg-amber-100 text-amber-700' },
  PAID: { label: 'Dibayar', cls: 'bg-emerald-100 text-emerald-700' },
};

function fmtDate(v: string | null): string {
  if (!v) return '—';
  return v.slice(0, 10);
}

// ── Buat periode ───────────────────────────────────────────
const creating = ref(false);
const createError = ref<string | null>(null);
const newMonth = ref('');

function nextMonthValue(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function createPeriod() {
  const month = newMonth.value || nextMonthValue();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    createError.value = 'Pilih bulan periode (format YYYY-MM)';
    return;
  }
  creating.value = true;
  createError.value = null;
  try {
    await payrollService.periods.create(month);
    newMonth.value = '';
    await load();
  } catch (e) {
    createError.value = extractMessage(e);
  } finally {
    creating.value = false;
  }
}

// ── Aksi status ────────────────────────────────────────────
async function lockPeriod(p: PayrollPeriod) {
  if (
    !window.confirm(
      `Kunci absensi periode ${monthLabel(p.period_month)}? ` +
        `Setelah dikunci, input absensi ditutup (koreksi via Adjustment).`
    )
  )
    return;
  try {
    await payrollService.periods.lock(p.id);
    await load();
  } catch (e) {
    window.alert(extractMessage(e));
  }
}

async function payPeriod(p: PayrollPeriod) {
  if (
    !window.confirm(
      `Tandai periode ${monthLabel(p.period_month)} sudah DIBAYAR?`
    )
  )
    return;
  try {
    await payrollService.periods.pay(p.id);
    await load();
  } catch (e) {
    window.alert(extractMessage(e));
  }
}

async function removePeriod(p: PayrollPeriod) {
  if (
    !window.confirm(
      `Hapus periode ${monthLabel(p.period_month)}? Hanya periode OPEN tanpa data absensi.`
    )
  )
    return;
  try {
    await payrollService.periods.remove(p.id);
    await load();
  } catch (e) {
    window.alert(extractMessage(e));
  }
}

const hasPeriods = computed(() => items.value.length > 0);
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Periode Payroll</h1>
        <p class="text-sm text-gray-500 mt-1">
          Siklus gaji bulanan — absensi dikunci tgl {{ cutOffDay }}, pembayaran tgl
          {{ paydayDay }}. Mekanisme: Master Data → Periode → Generate → Review →
          Adjustment → Approval → Final → Output.
        </p>
      </div>
    </div>

    <!-- Milestone card -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <p class="text-xs uppercase tracking-wide text-gray-400">Cut-off Absensi</p>
        <p class="text-xl font-semibold text-gray-900 mt-1">Tgl {{ cutOffDay }}</p>
        <p class="text-xs text-gray-500 mt-1">
          Input 1–{{ cutOffDay - 1 }}, sisanya dianggap hadir
        </p>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <p class="text-xs uppercase tracking-wide text-gray-400">Pembayaran</p>
        <p class="text-xl font-semibold text-gray-900 mt-1">Tgl {{ paydayDay }}</p>
        <p class="text-xs text-gray-500 mt-1">File diserahkan ke finance sebelumnya</p>
      </div>
      <div class="bg-white rounded-xl border border-gray-100 p-4">
        <p class="text-xs uppercase tracking-wide text-gray-400">Total Periode</p>
        <p class="text-xl font-semibold text-gray-900 mt-1">{{ items.length }}</p>
        <p class="text-xs text-gray-500 mt-1">
          {{ items.filter((i) => i.status === 'OPEN').length }} open ·
          {{ items.filter((i) => i.status === 'LOCKED').length }} terkunci ·
          {{ items.filter((i) => i.status === 'PAID').length }} dibayar
        </p>
      </div>
    </div>

    <!-- Buat periode -->
    <div class="bg-white rounded-xl border border-gray-100 p-4">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Buat periode baru</label>
          <input
            v-model="newMonth"
            type="month"
            :min="'2020-01'"
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <button
          :disabled="creating"
          class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          @click="createPeriod"
        >
          {{ creating ? 'Membuat…' : 'Buat Periode' }}
        </button>
        <p v-if="createError" class="text-sm text-red-600">{{ createError }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3"
    >
      <svg class="w-8 h-8 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8H4z" />
      </svg>
      <p class="text-sm text-gray-500">Memuat periode…</p>
    </div>

    <!-- Error -->
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

    <!-- Tabel -->
    <div v-else class="bg-white rounded-xl border border-gray-100 overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <th class="px-5 py-3 font-medium">Periode</th>
            <th class="px-5 py-3 font-medium text-center">Status</th>
            <th class="px-5 py-3 font-medium text-center">Cut-off</th>
            <th class="px-5 py-3 font-medium text-center">Payday</th>
            <th class="px-5 py-3 font-medium text-center">Data Absensi</th>
            <th class="px-5 py-3 font-medium">Dikunci</th>
            <th class="px-5 py-3 font-medium">Dibayar</th>
            <th class="px-5 py-3 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="p in items" :key="p.id" class="hover:bg-gray-50">
            <td class="px-5 py-3 font-medium text-gray-900">{{ monthLabel(p.period_month) }}</td>
            <td class="px-5 py-3 text-center">
              <span class="text-xs font-medium px-2.5 py-1 rounded-full" :class="STATUS_BADGE[p.status].cls">
                {{ STATUS_BADGE[p.status].label }}
              </span>
            </td>
            <td class="px-5 py-3 text-center text-gray-600">tgl {{ p.cut_off_day }}</td>
            <td class="px-5 py-3 text-center text-gray-600">tgl {{ p.payday_day }}</td>
            <td class="px-5 py-3 text-center">
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="p.attendance_count > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'"
              >
                {{ p.attendance_count }}
              </span>
            </td>
            <td class="px-5 py-3 text-gray-500">{{ fmtDate(p.locked_at) }}</td>
            <td class="px-5 py-3 text-gray-500">{{ fmtDate(p.paid_at) }}</td>
            <td class="px-5 py-3 text-right whitespace-nowrap">
              <button
                v-if="p.status === 'OPEN'"
                class="text-amber-600 hover:text-amber-800 text-xs font-medium mr-3"
                title="Tutup input absensi"
                @click="lockPeriod(p)"
              >
                Kunci
              </button>
              <button
                v-if="p.status === 'OPEN'"
                class="text-red-500 hover:text-red-700 text-xs font-medium"
                title="Hapus periode (harus OPEN & tanpa data absensi)"
                @click="removePeriod(p)"
              >
                Hapus
              </button>
              <button
                v-if="p.status === 'LOCKED'"
                class="text-emerald-600 hover:text-emerald-800 text-xs font-medium mr-3"
                title="Tandai gaji sudah dibayarkan"
                @click="payPeriod(p)"
              >
                Tandai Dibayar
              </button>
              <span v-if="p.status === 'PAID'" class="text-xs text-gray-400">Selesai</span>
            </td>
          </tr>
          <tr v-if="!hasPeriods">
            <td colspan="8" class="px-5 py-10 text-center text-gray-400">
              Belum ada periode — buat periode pertama di atas.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
