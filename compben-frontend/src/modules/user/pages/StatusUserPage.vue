<script setup lang="ts">
import dashboardService, {
  type DashboardStats,
} from '@/modules/dashboard/services/dashboardService';
import userService, { type UserStats } from '@/modules/user/services/userService';
import { useAppSettingsStore } from '@/stores/appSettings';
import { formatDate } from '@/utils/format';
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import type { User } from '../types/user';

const appSettings = useAppSettingsStore();

const loading = ref(true);
const error = ref<string | null>(null);
const stats = ref<UserStats | null>(null);
/** Tambahan dari /dashboard/summary: never_logged_in + logins_today */
const extra = ref<DashboardStats | null>(null);
const inactiveUsers = ref<User[]>([]);
const inactiveTotal = ref(0);

function extractMessage(e: unknown): string {
  const err = e as { error?: unknown; message?: string };
  if (typeof err?.error === 'string') return err.error;
  if (err?.error && typeof err.error === 'object' && 'message' in err.error) {
    const m = (err.error as { message?: string }).message;
    if (m) return m;
  }
  return err?.message || 'Terjadi kesalahan yang tidak diketahui';
}

const pctAktif = computed(() => {
  const s = stats.value;
  if (!s || s.total === 0) return 0;
  return Math.round((s.active / s.total) * 100);
});

/** Kartu ringkasan status user — semua angka dari API */
const cards = computed(() => {
  const s = stats.value;
  const x = extra.value;
  if (!s) return [];
  return [
    {
      label: 'User Aktif',
      value: s.active,
      badge: `${pctAktif.value}% dari total`,
      badgeType: 'up',
      icon: 'check',
      color: 'emerald',
    },
    {
      label: 'User Nonaktif',
      value: s.inactive,
      badge: s.inactive > 0 ? 'Perlu dicek' : 'Tidak ada',
      badgeType: s.inactive > 0 ? 'warn' : 'neutral',
      icon: 'ban',
      color: 'red',
    },
    {
      label: 'Belum Pernah Login',
      value: x?.never_logged_in ?? 0,
      badge: (x?.never_logged_in ?? 0) > 0 ? 'Akun menganggur' : 'Semua sudah login',
      badgeType: (x?.never_logged_in ?? 0) > 0 ? 'warn' : 'up',
      icon: 'user-x',
      color: 'yellow',
    },
    {
      label: 'Login Hari Ini',
      value: x?.logins_today ?? 0,
      badge: 'Aktivitas hari ini',
      badgeType: 'neutral',
      icon: 'login',
      color: 'blue',
    },
  ];
});

function badgeClass(type: string): string {
  if (type === 'up') return 'bg-emerald-100 text-emerald-700';
  if (type === 'warn') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

function lastLoginLabel(u: User): string {
  if (!u.last_login) return 'Belum pernah login';
  return `Terakhir login ${formatDate(u.last_login)}`;
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const [s, summary, list] = await Promise.all([
      userService.stats(),
      dashboardService.summary(),
      userService.list({
        page: 1,
        limit: appSettings.defaultPageSize,
        status: 'INACTIVE',
        sort_by: 'created_at',
        sort_order: 'desc',
      }),
    ]);
    stats.value = s.data;
    extra.value = summary.stats;
    inactiveUsers.value = list.data;
    inactiveTotal.value = list.total;
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Status User</h1>
        <p class="text-sm text-gray-500 mt-1">
          Ringkasan kondisi akun: aktif, nonaktif, dan aktivitas login.
        </p>
      </div>
      <RouterLink
        to="/users"
        class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        Buka Daftar User
      </RouterLink>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3"
    >
      <svg class="w-8 h-8 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
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
      <p class="text-sm text-gray-500">Memuat status user…</p>
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
          <p class="font-medium text-red-800">Gagal memuat status user</p>
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

    <template v-else-if="stats">
      <!-- Kartu status -->
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
                'bg-red-100': card.color === 'red',
                'bg-yellow-100': card.color === 'yellow',
                'bg-blue-100': card.color === 'blue',
              }"
            >
              <!-- check -->
              <svg
                v-if="card.icon === 'check'"
                class="w-6 h-6 text-emerald-600"
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
              <!-- ban -->
              <svg
                v-else-if="card.icon === 'ban'"
                class="w-6 h-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
              <!-- user-x -->
              <svg
                v-else-if="card.icon === 'user-x'"
                class="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 9l3 3m0 0l3-3m-3 3V4"
                />
              </svg>
              <!-- login -->
              <svg
                v-else
                class="w-6 h-6 text-blue-600"
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

      <!-- Grid: bar status + user nonaktif -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Proporsi status -->
        <div class="bg-white rounded-xl border border-gray-100 p-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            Proporsi Status
          </h2>
          <div class="space-y-4">
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-sm text-gray-700">Aktif</span>
                <span class="text-xs text-gray-500"
                  >{{ stats.active }} user · {{ pctAktif }}%</span
                >
              </div>
              <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                  :style="{ width: `${pctAktif}%` }"
                ></div>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-sm text-gray-700">Nonaktif</span>
                <span class="text-xs text-gray-500"
                  >{{ stats.inactive }} user ·
                  {{ stats.total > 0 ? Math.round((stats.inactive / stats.total) * 100) : 0 }}%</span
                >
              </div>
              <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-2.5 bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all"
                  :style="{
                    width: `${
                      stats.total > 0 ? Math.max(stats.inactive > 0 ? 4 : 0, (stats.inactive / stats.total) * 100) : 0
                    }%`,
                  }"
                ></div>
              </div>
            </div>
            <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
              <span class="text-sm text-gray-700">Total user</span>
              <span class="text-sm font-semibold text-gray-900">
                {{ stats.total.toLocaleString('id-ID') }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-700">Total role dipakai</span>
              <span class="text-sm font-semibold text-gray-900">
                {{ stats.total_roles }}
              </span>
            </div>
          </div>
        </div>

        <!-- User nonaktif -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900">User Nonaktif</h2>
            <span
              class="text-xs bg-red-100 text-red-700 font-medium px-2 py-1 rounded-full"
            >
              {{ inactiveTotal }}
            </span>
          </div>

          <div v-if="inactiveUsers.length" class="space-y-1">
            <RouterLink
              v-for="user in inactiveUsers"
              :key="user.id"
              :to="`/users/${user.id}/edit`"
              class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div
                class="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0 text-sm font-semibold"
              >
                {{ user.nama.charAt(0).toUpperCase() }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ user.nama }}
                </p>
                <p class="text-xs text-gray-400 truncate">
                  @{{ user.username }} · {{ user.role_nama }} ·
                  {{ lastLoginLabel(user) }}
                </p>
              </div>
              <span
                class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex-shrink-0"
              >
                Nonaktif
              </span>
            </RouterLink>
            <p
              v-if="inactiveTotal > inactiveUsers.length"
              class="text-xs text-gray-400 pt-2"
            >
              Menampilkan {{ inactiveUsers.length }} dari
              {{ inactiveTotal }} user nonaktif —
              <RouterLink to="/users" class="text-emerald-600 hover:text-emerald-700"
                >lihat semua</RouterLink
              >.
            </p>
          </div>
          <div
            v-else
            class="py-10 text-center text-sm text-gray-400"
          >
            🎉 Tidak ada user nonaktif — semua akun aktif.
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
