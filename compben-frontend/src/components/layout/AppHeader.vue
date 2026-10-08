<script setup lang="ts">
import { getRoleInfo } from '@/constants/roles';
import notificationsService, {
  type NotificationItem,
} from '@/modules/notifications/services/notificationsService';
import { useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/utils/format';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const auth = useAuthStore();

const isProfileOpen = ref(false);

const userName = computed(() => auth.userName);
const userRole = computed(() => auth.userRole);
const userInitial = computed(() => auth.userInitial);
const roleInfo = computed(() => getRoleInfo(userRole.value));

// ── Notifikasi in-app (bell) ──
const isNotifOpen = ref(false);
const notifItems = ref<NotificationItem[]>([]);
const unreadCount = ref(0);
let notifTimer: ReturnType<typeof setInterval> | null = null;

async function loadNotifications() {
  try {
    const { data } = await notificationsService.list();
    notifItems.value = data.items;
    unreadCount.value = data.unread_count;
  } catch {
    // diam-diam — jangan ganggu UI header
  }
}

function toggleNotif() {
  isNotifOpen.value = !isNotifOpen.value;
  if (isNotifOpen.value) void loadNotifications();
}

async function openNotif(n: NotificationItem) {
  if (!n.is_read) {
    try {
      await notificationsService.markRead(n.id);
      n.is_read = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    } catch {
      /* tetap lanjut navigasi */
    }
  }
  isNotifOpen.value = false;
  if (n.link) router.push(n.link);
}

async function markAllRead() {
  try {
    await notificationsService.markAllRead();
    notifItems.value.forEach((n) => (n.is_read = true));
    unreadCount.value = 0;
  } catch {
    /* abaikan */
  }
}

onMounted(() => {
  void loadNotifications();
  // Polling ringan tiap 60 detik selama user login
  notifTimer = setInterval(() => void loadNotifications(), 60_000);
});

onUnmounted(() => {
  if (notifTimer) clearInterval(notifTimer);
});

function toggleProfile() {
  isProfileOpen.value = !isProfileOpen.value;
}

function handleLogout() {
  isProfileOpen.value = false;
  auth.logout();
  window.location.href = '/login';
}
</script>

<template>
  <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
    <!-- Left -->
    <div>
      <slot name="breadcrumb">
        <h1 class="text-lg font-semibold text-gray-900">Dashboard</h1>
      </slot>
    </div>

    <!-- Right -->
    <div class="flex items-center gap-3">
      <!-- Role Badge -->
      <span
        class="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border"
        :class="`${roleInfo.bgColor} ${roleInfo.textColor} ${roleInfo.borderColor}`"
      >
        {{ roleInfo.name }}
      </span>

      <!-- Notification (bell) -->
      <div class="relative">
        <button
          class="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
          title="Notifikasi"
          @click="toggleNotif"
        >
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span
            v-if="unreadCount > 0"
            class="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center"
          >
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </button>

        <!-- Dropdown notifikasi -->
        <div
          v-if="isNotifOpen"
          class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
        >
          <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span class="text-sm font-semibold text-gray-900">Notifikasi</span>
            <button
              v-if="unreadCount > 0"
              class="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              @click="markAllRead"
            >
              Tandai semua dibaca
            </button>
          </div>

          <div class="max-h-80 overflow-y-auto">
            <div
              v-if="notifItems.length === 0"
              class="px-4 py-8 text-center text-sm text-gray-400"
            >
              Belum ada notifikasi.
            </div>
            <button
              v-for="n in notifItems"
              :key="n.id"
              class="w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 flex gap-3"
              :class="n.is_read ? '' : 'bg-emerald-50/50'"
              @click="openNotif(n)"
            >
              <span
                class="mt-1.5 w-2 h-2 rounded-full shrink-0"
                :class="n.is_read ? 'bg-gray-300' : 'bg-emerald-500'"
              ></span>
              <span class="min-w-0">
                <span class="block text-sm text-gray-800" :class="n.is_read ? '' : 'font-medium'">
                  {{ n.title }}
                </span>
                <span v-if="n.body" class="block text-xs text-gray-500 truncate">
                  {{ n.body }}
                </span>
                <span class="block text-[11px] text-gray-400 mt-0.5">
                  {{ formatDateTime(n.created_at) }}
                </span>
              </span>
            </button>
          </div>
        </div>

        <!-- Overlay: klik di luar dropdown untuk tutup -->
        <div
          v-if="isNotifOpen"
          class="fixed inset-0 z-40"
          @click="isNotifOpen = false"
        ></div>
      </div>

      <!-- ============================================
           PROFILE + LOGOUT (FIX)
           ============================================ -->
      <div class="relative">
        <!-- Profile Button -->
        <button
          class="flex items-center gap-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          @click="toggleProfile"
        >
          <div class="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center">
            <span class="text-white font-semibold text-sm">{{ userInitial }}</span>
          </div>
          <div class="hidden md:block text-left">
            <p class="text-sm font-medium text-gray-900 leading-tight">{{ userName }}</p>
            <p class="text-xs text-gray-500">{{ roleInfo.name }}</p>
          </div>
          <svg class="w-4 h-4 text-gray-400 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <!-- Dropdown -->
        <div
          v-if="isProfileOpen"
          class="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50"
        >
          <!-- User Info -->
          <div class="px-4 py-3 border-b border-gray-100">
            <p class="text-sm font-semibold text-gray-900">{{ userName }}</p>
            <p class="text-xs text-gray-500 truncate">{{ auth.user?.email }}</p>
            <span
              class="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-xs font-medium"
              :class="`${roleInfo.bgColor} ${roleInfo.textColor}`"
            >
              {{ roleInfo.name }}
            </span>
          </div>

          <!-- Menu Items -->
          <button
            class="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
            @click="isProfileOpen = false; router.push('/profile')"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profil Saya
          </button>

          <button
            class="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
            @click="isProfileOpen = false; router.push('/settings/account')"
          >
            <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Pengaturan
          </button>

          <!-- Divider -->
          <div class="border-t border-gray-100 my-1"></div>

          <!-- LOGOUT BUTTON -->
          <button
            class="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium"
            @click="handleLogout"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>

        <!-- Overlay: klik di luar dropdown untuk tutup -->
        <div
          v-if="isProfileOpen"
          class="fixed inset-0 z-40"
          @click="isProfileOpen = false"
        ></div>
      </div>
    </div>
  </header>
</template>