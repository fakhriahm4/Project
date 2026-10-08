<script setup lang="ts">
import dashboardService, {
  type DashboardSummary,
} from '../services/dashboardService';
import { useAuthStore } from '@/stores/auth';
import { formatDate } from '@/utils/format';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

const auth = useAuthStore();
const isSuperAdmin = auth.hasRole('SUPER_ADMIN');

const loading = ref(true);
const error = ref<string | null>(null);
const summary = ref<DashboardSummary | null>(null);

// Quick actions — hanya route yang benar-benar tersedia
const quickActions = [
  {
    label: 'Tambah User',
    icon: 'user-plus',
    color: 'emerald',
    path: '/users/create',
  },
  { label: 'Kelola User', icon: 'users', color: 'blue', path: '/users' },
  { label: 'Lihat Audit Log', icon: 'document', color: 'gray', path: '/audit' },
];

const today = new Date().toLocaleDateString('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Waktu relatif dalam Bahasa Indonesia: "5 menit lalu", "2 hari lalu", dst. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const menit = Math.floor((Date.now() - then) / 60000);
  if (menit < 1) return 'Baru saja';
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  return formatDate(iso);
}

function tableLabel(tableName: string | null): string {
  if (tableName === 'users') return 'user';
  return tableName ?? 'data';
}

/** Deskripsi aktivitas audit: "login ke sistem", "memperbarui user", dst. */
function actionVerb(action: string, tableName: string | null): string {
  switch (action) {
    case 'LOGIN':
      return 'login ke sistem';
    case 'CREATE':
      return `menambahkan ${tableLabel(tableName)}`;
    case 'UPDATE':
      return `memperbarui ${tableLabel(tableName)}`;
    case 'DELETE':
      return `menghapus ${tableLabel(tableName)}`;
    default:
      return action.toLowerCase();
  }
}

function actionColor(action: string): string {
  switch (action) {
    case 'LOGIN':
      return 'blue';
    case 'CREATE':
      return 'emerald';
    case 'UPDATE':
      return 'yellow';
    case 'DELETE':
      return 'red';
    default:
      return 'gray';
  }
}

function badgeClass(type: string): string {
  if (type === 'up') return 'bg-emerald-100 text-emerald-700';
  if (type === 'warn') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

function extractMessage(e: unknown): string {
  const err = e as { error?: unknown; message?: string };
  if (typeof err?.error === 'string') return err.error;
  if (err?.error && typeof err.error === 'object' && 'message' in err.error) {
    const m = (err.error as { message?: string }).message;
    if (m) return m;
  }
  return err?.message || 'Terjadi kesalahan yang tidak diketahui';
}

/** Kartu statistik utama — semua angka dari GET /dashboard/summary */
const cards = computed(() => {
  const s = summary.value?.stats;
  if (!s) return [];

  const persenAktif = s.total > 0 ? Math.round((s.active / s.total) * 100) : 0;
  const monthly = summary.value?.monthly_signups ?? [];
  const bulanIni = monthly[monthly.length - 1]?.total ?? 0;
  const bulanLalu = monthly[monthly.length - 2]?.total ?? 0;
  const delta = bulanIni - bulanLalu;

  return [
    {
      label: 'Total User',
      value: s.total,
      badge:
        s.never_logged_in > 0
          ? `${s.never_logged_in} belum login`
          : 'Semua sudah login',
      badgeType: s.never_logged_in > 0 ? 'warn' : 'up',
      icon: 'users',
      color: 'emerald',
    },
    {
      label: 'User Aktif',
      value: s.active,
      badge: `${persenAktif}% dari total`,
      badgeType: 'up',
      icon: 'check',
      color: 'blue',
    },
    {
      label: 'Baru Bulan Ini',
      value: s.new_this_month,
      badge: `${delta >= 0 ? '+' : ''}${delta} vs bulan lalu`,
      badgeType: delta > 0 ? 'up' : 'neutral',
      icon: 'plus',
      color: 'purple',
    },
    {
      label: 'Login Hari Ini',
      value: s.logins_today,
      badge: 'Aktivitas hari ini',
      badgeType: 'neutral',
      icon: 'login',
      color: 'yellow',
    },
  ];
});

/** Bar chart pengunjung (login) per hari — 30 hari terakhir */
const chartBars = computed(() => {
  const list = summary.value?.daily_visits ?? [];
  const max = Math.max(1, ...list.map((d) => d.total));
  return list.map((d, i) => ({
    key: d.day,
    label: String(Number(d.day.slice(8, 10))),
    showLabel: i % 3 === 0 || i === list.length - 1,
    value: d.total,
    height: d.total > 0 ? Math.max(4, (d.total / max) * 100) : 2,
  }));
});

/** Total kunjungan (login) 30 hari terakhir — utk header chart */
const totalVisits = computed(() =>
  (summary.value?.daily_visits ?? []).reduce((sum, d) => sum + d.total, 0)
);

/** Top pengunjung situs + persentase terhadap pengunjung terbanyak */
const visitorsView = computed(() => {
  const list = summary.value?.top_visitors ?? [];
  const max = Math.max(1, ...list.map((v) => v.visits));
  return list.map((v) => ({
    ...v,
    pct: Math.round((v.visits / max) * 100),
  }));
});

/** Distribusi user per role + persentase terhadap total */
const rolesView = computed(() => {
  const list = summary.value?.role_distribution ?? [];
  const max = Math.max(1, ...list.map((r) => r.total));
  const sum = list.reduce((acc, r) => acc + r.total, 0);
  return list.map((r) => ({
    ...r,
    width: Math.max(r.total > 0 ? 4 : 0, Math.round((r.total / max) * 100)),
    pct: sum > 0 ? Math.round((r.total / sum) * 100) : 0,
  }));
});

/** 5 user terbaru untuk daftar cepat */
const usersView = computed(() =>
  (summary.value?.recent_users ?? []).map((u) => ({
    id: u.id,
    nama: u.nama,
    username: u.username,
    role: u.role_nama,
    divisi: u.divisi_nama,
    is_active: u.is_active,
    created: timeAgo(u.created_at),
  }))
);

/** Aktivitas audit terbaru (siapa, apa, kapan) */
const activitiesView = computed(() =>
  (summary.value?.recent_activities ?? []).map((a) => ({
    id: a.id,
    user: a.user_name ?? a.username ?? 'Sistem',
    action: actionVerb(a.action, a.table_name),
    color: actionColor(a.action),
    time: timeAgo(a.created_at),
  }))
);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    summary.value = await dashboardService.summary();
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (isSuperAdmin) void load();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome Banner -->
    <div
      class="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white relative overflow-hidden"
    >
      <div
        class="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
      ></div>
      <div
        class="absolute -bottom-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"
      ></div>

      <div class="relative z-10 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-2xl font-bold mb-1">
            Selamat Datang, {{ auth.userName }}! 👋
          </h1>
          <p class="text-emerald-100">
            Berikut ringkasan sistem Compensation &amp; Benefit hari ini.
          </p>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <span
            v-if="auth.user"
            class="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>{{ auth.user.roleName }}</span>
          </span>
          <span
            class="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{{ today }}</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Non–Super Admin: endpoint dashboard khusus SUPER_ADMIN -->
    <div
      v-if="!isSuperAdmin"
      class="bg-white rounded-xl border border-gray-100 p-10 text-center"
    >
      <div
        class="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"
      >
        <svg
          class="w-7 h-7 text-emerald-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h7M9 16l2 2 4-4"
          />
        </svg>
      </div>
      <h2 class="text-lg font-semibold text-gray-900 mb-1">
        Dashboard untuk role {{ auth.user?.roleName ?? 'Anda' }} sedang disiapkan
      </h2>
      <p class="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        Halaman ringkasan ini untuk sementara hanya menampilkan data akses
        pengguna bagi Super Admin.
      </p>
      <RouterLink
        to="/payslip"
        class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        Buka Payslip Saya
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      </RouterLink>
    </div>

    <!-- Loading -->
    <div
      v-else-if="loading"
      class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3"
    >
      <svg
        class="w-8 h-8 text-emerald-600 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <p class="text-sm text-gray-500">Memuat data dashboard…</p>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div class="flex items-center gap-3">
        <svg
          class="w-6 h-6 text-red-500 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p class="font-medium text-red-800">Gagal memuat dashboard</p>
          <p class="text-sm text-red-600">{{ error }}</p>
        </div>
      </div>
      <button
        class="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        @click="load"
      >
        Coba Lagi
      </button>
    </div>

    <!-- Konten utama (Super Admin) -->
    <template v-else-if="summary">
      <!-- Stat Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="card in cards"
          :key="card.label"
          class="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg transition-shadow"
        >
          <div class="flex items-center justify-between mb-3">
            <div
              class="w-11 h-11 rounded-lg flex items-center justify-center"
              :class="{
                'bg-emerald-100': card.color === 'emerald',
                'bg-blue-100': card.color === 'blue',
                'bg-purple-100': card.color === 'purple',
                'bg-yellow-100': card.color === 'yellow',
              }"
            >
              <!-- Total User -->
              <svg
                v-if="card.icon === 'users'"
                class="w-6 h-6 text-emerald-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <!-- User Aktif -->
              <svg
                v-else-if="card.icon === 'check'"
                class="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <!-- Baru Bulan Ini -->
              <svg
                v-else-if="card.icon === 'plus'"
                class="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              <!-- Login Hari Ini -->
              <svg
                v-else
                class="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"
                />
              </svg>
            </div>
            <span
              class="text-xs font-medium px-2 py-1 rounded-full"
              :class="badgeClass(card.badgeType)"
            >
              {{ card.badge }}
            </span>
          </div>
          <p class="text-sm text-gray-500 mb-1">{{ card.label }}</p>
          <p class="text-2xl font-bold text-gray-900">
            {{ card.value.toLocaleString('id-ID') }}
          </p>
        </div>
      </div>

      <!-- Main Grid: chart + distribusi role -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Chart — Kolom kiri (2 span) -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">
                Pengunjung Situs
              </h2>
              <p class="text-sm text-gray-500">
                Login harian · 30 hari terakhir
              </p>
            </div>
            <span
              class="text-xs bg-emerald-100 text-emerald-700 font-medium px-2 py-1 rounded-full"
            >
              {{ totalVisits.toLocaleString('id-ID') }} kunjungan
            </span>
          </div>

          <!-- Simple Bar Chart -->
          <div
            v-if="chartBars.length"
            class="flex items-end justify-between gap-3 h-56"
          >
            <div
              v-for="bar in chartBars"
              :key="bar.key"
              class="flex-1 flex flex-col items-center gap-2"
              :title="`${bar.key}: ${bar.value} login`"
            >
              <span v-if="bar.value > 0" class="text-xs font-medium text-gray-700">{{
                bar.value
              }}</span>
              <div class="w-full flex-1 flex items-end">
                <div
                  class="w-full bg-gradient-to-t from-sky-500 to-sky-400 rounded-t-lg hover:from-sky-600 hover:to-sky-500 transition-colors"
                  :style="{ height: `${bar.height}%` }"
                ></div>
              </div>
              <span class="text-xs text-gray-500">{{
                bar.showLabel ? bar.label : ' '
              }}</span>
            </div>
          </div>
          <p
            v-else
            class="h-56 flex items-center justify-center text-sm text-gray-400"
          >
            Belum ada data pengunjungan.
          </p>

          <!-- Top pengunjung situs — user paling sering login 30 hari terakhir -->
          <div
            v-if="visitorsView.length"
            class="mt-6 pt-5 border-t border-gray-100"
          >
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold text-gray-900">
                Top Pengunjung · 30 hari
              </h3>
              <span
                class="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full"
              >
                {{ visitorsView.length }} user
              </span>
            </div>
            <div class="space-y-3">
              <div v-for="v in visitorsView" :key="v.id">
                <div class="flex items-center justify-between mb-1 gap-3">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="text-sm font-medium text-gray-900 truncate">
                      {{ v.nama }}
                    </span>
                    <span
                      class="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded truncate"
                    >
                      {{ v.username }}
                    </span>
                  </div>
                  <span class="text-xs text-gray-500 flex-shrink-0">
                    {{ v.visits }} login
                  </span>
                </div>
                <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full"
                    :style="{ width: `${v.pct}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Distribusi Akses per Role -->
        <div class="bg-white rounded-xl border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-lg font-semibold text-gray-900">
              Distribusi Akses per Role
            </h2>
            <span
              class="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-1 rounded-full"
            >
              {{ summary.stats.total_roles }} role
            </span>
          </div>

          <div v-if="rolesView.length" class="space-y-4">
            <div
              v-for="role in rolesView"
              :key="role.id"
              class="group"
            >
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-sm font-medium text-gray-900 truncate">
                    {{ role.nama }}
                  </span>
                  <span
                    class="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded"
                  >
                    {{ role.kode }}
                  </span>
                </div>
                <span class="text-xs text-gray-500 flex-shrink-0">
                  {{ role.total }} user · {{ role.pct }}%
                </span>
              </div>
              <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                  :style="{ width: `${role.width}%` }"
                ></div>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-gray-400">Belum ada role terdaftar.</p>
        </div>
      </div>

      <!-- Bottom Grid: aksi cepat + user terbaru + aktivitas -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Aksi Cepat -->
        <div class="bg-white rounded-xl border border-gray-100 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
          <div class="flex flex-col gap-3">
            <RouterLink
              v-for="action in quickActions"
              :key="action.label"
              :to="action.path"
              class="flex items-center gap-3 p-3.5 rounded-lg border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
            >
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0"
                :class="{
                  'bg-emerald-100': action.color === 'emerald',
                  'bg-blue-100': action.color === 'blue',
                  'bg-gray-100': action.color === 'gray',
                }"
              >
                <!-- user-plus -->
                <svg
                  v-if="action.icon === 'user-plus'"
                  class="w-5 h-5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
                <!-- users -->
                <svg
                  v-else-if="action.icon === 'users'"
                  class="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <!-- document -->
                <svg
                  v-else
                  class="w-5 h-5 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span
                class="text-sm font-medium text-gray-700 group-hover:text-emerald-700"
              >
                {{ action.label }}
              </span>
            </RouterLink>
          </div>
        </div>

        <!-- Pengguna Terbaru -->
        <div class="bg-white rounded-xl border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">
              Pengguna Terbaru
            </h2>
            <RouterLink
              to="/users"
              class="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Lihat semua
            </RouterLink>
          </div>

          <div v-if="usersView.length" class="space-y-1">
            <RouterLink
              v-for="user in usersView"
              :key="user.id"
              :to="`/users/${user.id}/edit`"
              class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div
                class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold"
              >
                {{ user.nama.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ user.nama }}
                </p>
                <p class="text-xs text-gray-400 truncate">
                  @{{ user.username }} · {{ user.role }}
                </p>
              </div>
              <span
                class="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                :class="
                  user.is_active
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                "
              >
                {{ user.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </RouterLink>
          </div>
          <p v-else class="text-sm text-gray-400">
            Belum ada user terdaftar.
          </p>
        </div>

        <!-- Aktivitas Terbaru -->
        <div class="bg-white rounded-xl border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">
              Aktivitas Terbaru
            </h2>
            <RouterLink
              to="/audit"
              class="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Lihat semua
            </RouterLink>
          </div>

          <div v-if="activitiesView.length" class="space-y-4">
            <div
              v-for="activity in activitiesView"
              :key="activity.id"
              class="flex items-start gap-3"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                :class="{
                  'bg-blue-100': activity.color === 'blue',
                  'bg-emerald-100': activity.color === 'emerald',
                  'bg-yellow-100': activity.color === 'yellow',
                  'bg-red-100': activity.color === 'red',
                  'bg-gray-100': activity.color === 'gray',
                }"
              >
                <svg
                  class="w-4 h-4"
                  :class="{
                    'text-blue-600': activity.color === 'blue',
                    'text-emerald-600': activity.color === 'emerald',
                    'text-yellow-600': activity.color === 'yellow',
                    'text-red-600': activity.color === 'red',
                    'text-gray-600': activity.color === 'gray',
                  }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-900">
                  <span class="font-medium">{{ activity.user }}</span>
                  <span class="text-gray-600"> {{ activity.action }}</span>
                </p>
                <p class="text-xs text-gray-400 mt-0.5">
                  {{ activity.time }}
                </p>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-gray-400">
            Belum ada aktivitas tercatat.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
