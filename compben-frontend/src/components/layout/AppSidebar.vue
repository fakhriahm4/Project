<script setup lang="ts">
import { allMenus, superAdminMenus, type MenuNode } from '@/constants/menu';
import { getRoleInfo } from '@/constants/roles';
import { useAppSettingsStore } from '@/stores/appSettings';
import { useAuthStore } from '@/stores/auth';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const app = useAppSettingsStore();

const isCollapsed = ref(false);
const expandedMenus = ref<string[]>(
  auth.hasRole('SUPER_ADMIN') ? ['user-management'] : ['master']
);

type MenuItem = MenuNode;

// Filter menu & submenu sesuai role
const menus = computed<MenuItem[]>(() => {
  const source = auth.hasRole('SUPER_ADMIN') ? superAdminMenus : allMenus;
  return source
    .filter((menu) => menu.roles.includes(auth.userRole))
    .map((menu) => {
      if (menu.children) {
        return {
          ...menu,
          children: menu.children.filter((child) =>
            child.roles.includes(auth.userRole)
          ),
        };
      }
      return menu;
    })
    .filter((menu) => !menu.children || menu.children.length > 0);
});

const roleInfo = computed(() => getRoleInfo(auth.userRole));

function isActive(path?: string): boolean {
  if (!path) return false;
  return route.path === path || route.path.startsWith(path + '/');
}

/** Anak menu yang tersorot: cocok persis dulu; fallback prefix (mis. /users/8/edit → Daftar User) */
function activeChild(menu: MenuItem): string | undefined {
  if (!menu.children) return undefined;
  const exact = menu.children.find((c) => c.path && route.path === c.path);
  if (exact?.path) return exact.path;
  return menu.children.find(
    (c) => c.path && route.path.startsWith(c.path + '/')
  )?.path;
}

function isMenuActive(menu: MenuItem): boolean {
  if (menu.path && isActive(menu.path)) return true;
  if (menu.children) {
    return menu.children.some((c) => isActive(c.path));
  }
  return false;
}

function toggleMenu(id: string) {
  const index = expandedMenus.value.indexOf(id);
  if (index > -1) {
    expandedMenus.value.splice(index, 1);
  } else {
    expandedMenus.value.push(id);
  }
}

function navigate(path?: string) {
  if (path) router.push(path);
}
</script>

<template>
  <aside
    class="bg-white text-gray-700 border-r border-gray-200 flex flex-col transition-all duration-300 h-screen sticky top-0"
    :class="isCollapsed ? 'w-20' : 'w-64'"
  >
    <!-- Logo -->
    <div class="h-16 flex items-center justify-between px-4 border-b border-gray-200">
      <div v-if="!isCollapsed" class="flex items-center gap-2 overflow-hidden">
        <div class="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div class="min-w-0">
          <p class="text-sm font-bold truncate text-gray-900">{{ app.companyName }}</p>
          <p class="text-xs text-gray-400 truncate">{{ app.appName }} System</p>
        </div>
      </div>
      <div v-else class="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center mx-auto">
        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>

      <button
        v-if="!isCollapsed"
        class="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
        @click="isCollapsed = !isCollapsed"
      >
        <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        </svg>
      </button>
    </div>

    <button
      v-if="isCollapsed"
      class="mx-2 mt-2 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
      @click="isCollapsed = !isCollapsed"
    >
      <svg class="w-4 h-4 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
      </svg>
    </button>

    <!-- Role Badge (jika tidak collapsed) -->
    <div v-if="!isCollapsed" class="px-3 py-2 mx-2 mt-3 rounded-lg border" :class="`${roleInfo.bgColor} ${roleInfo.borderColor}`">
      <p class="text-xs font-semibold" :class="roleInfo.textColor">
        {{ roleInfo.name }}
      </p>
    </div>

    <!-- Menu -->
    <nav class="flex-1 overflow-y-auto py-4 px-2 space-y-1">
      <template v-for="menu in menus" :key="menu.id">
        <!-- Single menu -->
        <button
          v-if="!menu.children"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="
            isActive(menu.path)
              ? 'bg-emerald-600 text-white'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          "
          :title="isCollapsed ? menu.label : ''"
          @click="navigate(menu.path)"
        >
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="menu.icon" />
          </svg>
          <span v-if="!isCollapsed" class="truncate">{{ menu.label }}</span>
        </button>

        <!-- Menu with children -->
        <div v-else>
          <button
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="
              isMenuActive(menu)
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            "
            :title="isCollapsed ? menu.label : ''"
            @click="toggleMenu(menu.id)"
          >
            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="menu.icon" />
            </svg>
            <template v-if="!isCollapsed">
              <span class="flex-1 text-left truncate">{{ menu.label }}</span>
              <svg
                class="w-4 h-4 transition-transform"
                :class="expandedMenus.includes(menu.id) ? 'rotate-90' : ''"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </template>
          </button>

          <div
            v-if="!isCollapsed && expandedMenus.includes(menu.id)"
            class="mt-1 ml-4 pl-3 border-l border-gray-200 space-y-1"
          >
            <button
              v-for="child in menu.children"
              :key="child.id"
              class="w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors"
              :class="
                activeChild(menu) === child.path
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              "
              @click="navigate(child.path)"
            >
              <span class="truncate">{{ child.label }}</span>
            </button>
          </div>
        </div>
      </template>
    </nav>

    <div v-if="!isCollapsed" class="p-4 border-t border-gray-200">
      <p class="text-xs text-gray-400 text-center">Version 1.0.0</p>
    </div>
  </aside>
</template>