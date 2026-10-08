<script setup lang="ts">
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import { useAppSettingsStore } from '@/stores/appSettings';

const app = useAppSettingsStore();
</script>

<template>
  <div class="flex min-h-screen bg-gray-50">
    <AppSidebar />

    <div class="flex-1 flex flex-col min-w-0">
      <AppHeader />

      <main class="flex-1 p-6">
        <router-view />
      </main>

      <footer class="bg-white border-t border-gray-200 px-6 py-4">
        <p class="text-xs text-gray-500 text-center">
          © {{ new Date().getFullYear() }} {{ app.companyName }}. All rights reserved.
        </p>
      </footer>
    </div>
  </div>
</template>