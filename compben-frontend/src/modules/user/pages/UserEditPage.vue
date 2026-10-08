<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import UserForm from '../components/UserForm.vue';
import userService from '../services/userService';
import type { CreateUserPayload } from '../types/user';

const router = useRouter();
const route = useRoute();
const isLoading = ref(false);
const isLoadingData = ref(false);
const errorMessage = ref('');

const userId = Number(route.params.id);

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
  tanggal_masuk: '',
});

onMounted(async () => {
  isLoadingData.value = true;
  errorMessage.value = '';
  try {
    const res = await userService.detail(userId);
    const user = res.data; // shape persis UserResponse backend
    form.value = {
      employee_id: user.employee_id,
      username: user.username,
      nama: user.nama,
      email: user.email,
      no_hp: user.no_hp || '',
      password: '', // kosong = tidak diubah
      divisi_id: user.divisi_id,
      jabatan_id: user.jabatan_id,
      grade_id: user.grade_id,
      role_id: user.role_id,
      status: user.status,
      tanggal_masuk: user.tanggal_masuk,
    };
  } catch (error: any) {
    errorMessage.value = error?.error || error?.message || 'Gagal memuat data user';
  } finally {
    isLoadingData.value = false;
  }
});

async function handleSubmit() {
  errorMessage.value = '';
  isLoading.value = true;
  try {
    const payload: Partial<CreateUserPayload> = { ...form.value };
    // Password kosong = tidak diubah (backend: optional)
    if (!payload.password) delete payload.password;

    await userService.update(userId, payload);
    alert('User berhasil diupdate');
    await router.push('/users');
  } catch (error: any) {
    errorMessage.value = error?.error || error?.message || 'Gagal menyimpan perubahan';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
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
        <h1 class="text-2xl font-bold text-gray-900">Edit User</h1>
        <p class="text-sm text-gray-500">Ubah informasi pengguna</p>
      </div>
    </div>

    <!-- Error banner -->
    <div
      v-if="errorMessage"
      class="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
    >
      {{ errorMessage }}
    </div>

    <div
      v-if="isLoadingData"
      class="p-6 bg-white rounded-xl border border-gray-100 text-sm text-gray-500"
    >
      Memuat data user...
    </div>

    <UserForm
      v-else
      v-model="form"
      :is-edit="true"
      :is-loading="isLoading"
      @submit="handleSubmit"
      @cancel="router.push('/users')"
    />
  </div>
</template>