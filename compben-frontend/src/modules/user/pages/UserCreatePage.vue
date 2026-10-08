<script setup lang="ts">
import UserForm from '@/modules/user/components/UserForm.vue';
import type { CreateUserPayload } from '@/modules/user/types/user';
import userService from '@/modules/user/services/userService';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isLoading = ref(false);
const errorMessage = ref('');

const form = ref<CreateUserPayload>({
  employee_id: '',
  username: '',
  nama: '',
  email: '',
  no_hp: '',
  password: '',
  divisi_id: 0,
  jabatan_id: 0,
  grade_id: 0,
  role_id: 0,
  status: 'ACTIVE',
  tanggal_masuk: new Date().toISOString().split('T')[0],
});

async function handleSubmit() {
  errorMessage.value = '';
  isLoading.value = true;
  try {
    await userService.create(form.value);
    alert('User berhasil dibuat');
    await router.push('/users');
  } catch (error: any) {
    // Backend: { success:false, error:'NIP sudah terdaftar', ... }
    errorMessage.value =
      error?.error || error?.message || 'Gagal menyimpan user';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button
        class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        @click="router.push('/users')"
      >
        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Tambah User</h1>
        <p class="text-sm text-gray-500">Buat akun pengguna baru</p>
      </div>
    </div>

    <!-- Error banner -->
    <div
      v-if="errorMessage"
      class="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <UserForm
      v-model="form"
      :is-loading="isLoading"
      @submit="handleSubmit"
      @cancel="router.push('/users')"
    />
  </div>
</template>