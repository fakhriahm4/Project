<script setup lang="ts">
import { useRoute } from 'vue-router';

/**
 * Halaman placeholder generik untuk modul yang belum dibangun.
 * Judul diambil dari `meta.title` pada route — tidak perlu membuat
 * file terpisah tiap menu.
 */
const route = useRoute();
const title = typeof route.meta.title === 'string' ? route.meta.title : 'Halaman';
</script>

<template>
  <div class="bg-white rounded-xl border border-gray-100 p-10 text-center">
    <div
      class="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4"
    >
      <svg
        class="w-7 h-7 text-slate-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </div>
    <h1 class="text-xl font-bold text-gray-900 mb-1">{{ title }}</h1>
    <p class="text-sm text-gray-500 mb-1">
      Halaman ini masih dalam pengembangan.
    </p>
    <p class="text-xs text-gray-400 mb-6 max-w-md mx-auto">
      Modul ini akan segera tersedia dan datanya akan dihubungkan ke database.
    </p>
    <RouterLink
      to="/dashboard"
      class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 19l-7-7m0 0l7-7m-7 7h14"
        />
      </svg>
      Kembali ke Dashboard
    </RouterLink>
  </div>
</template>
