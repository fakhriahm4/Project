<script setup lang="ts">
import { lookupService, type LookupItem } from '@/services/lookupService';
import { onMounted, ref, watch } from 'vue';
import type { CreateUserPayload } from '../types/user';

interface Props {
  modelValue: CreateUserPayload;
  isEdit?: boolean;
  isLoading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isEdit: false,
  isLoading: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: CreateUserPayload];
  submit: [];
  cancel: [];
}>();

const form = ref<CreateUserPayload>({ ...props.modelValue });

watch(
  () => props.modelValue,
  (val) => {
    form.value = { ...val };
  },
  { deep: true }
);

watch(
  form,
  (val) => {
    emit('update:modelValue', { ...val });
  },
  { deep: true }
);

const errors = ref<Record<string, string>>({});

function validate(): boolean {
  errors.value = {};

  if (!form.value.employee_id) errors.value.employee_id = 'NIP wajib diisi';
  if (!form.value.username) errors.value.username = 'Username wajib diisi';
  if (form.value.username.length < 3) errors.value.username = 'Username minimal 3 karakter';
  if (!form.value.nama) errors.value.nama = 'Nama wajib diisi';
  if (!form.value.email) errors.value.email = 'Email wajib diisi';
  if (form.value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.value.email = 'Format email tidak valid';
  }
  if (!props.isEdit && !form.value.password) {
    errors.value.password = 'Password wajib diisi';
  }
  // Panjang minimum TIDAK divalidasi di sini — kebijakan (settings.general)
  // berlaku di backend, agar angka & pesan selalu akurat.
  if (!form.value.divisi_id) errors.value.divisi_id = 'Divisi wajib dipilih';
  if (!form.value.jabatan_id) errors.value.jabatan_id = 'Jabatan wajib dipilih';
  if (!form.value.grade_id) errors.value.grade_id = 'Grade wajib dipilih';
  if (!form.value.role_id) errors.value.role_id = 'Role wajib dipilih';
  if (!form.value.tanggal_masuk) errors.value.tanggal_masuk = 'Tanggal masuk wajib diisi';

  return Object.keys(errors.value).length === 0;
}

function handleSubmit() {
  if (validate()) {
    emit('submit');
  }
}

// Data master dari API (dropdown divisi/jabatan/grade/role)
const divisiList = ref<LookupItem[]>([]);
const jabatanList = ref<LookupItem[]>([]);
const gradeList = ref<LookupItem[]>([]);
const roleList = ref<LookupItem[]>([]);
const lookupsLoading = ref(false);
const lookupsError = ref('');

onMounted(async () => {
  lookupsLoading.value = true;
  lookupsError.value = '';
  try {
    const data = await lookupService.all();
    divisiList.value = data.divisi;
    jabatanList.value = data.jabatan;
    gradeList.value = data.grade;
    roleList.value = data.roles;
  } catch (error: any) {
    lookupsError.value =
      error?.error || error?.message || 'Gagal memuat data master';
  } finally {
    lookupsLoading.value = false;
  }
});
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Info status data master -->
    <div
      v-if="lookupsError"
      class="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
    >
      {{ lookupsError }}
    </div>
    <div
      v-else-if="lookupsLoading"
      class="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500"
    >
      Memuat data master...
    </div>

    <!-- Section: Informasi Pribadi -->
    <div class="bg-white rounded-xl border border-gray-100 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Informasi Pribadi</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- NIP -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            NIP / No. Induk Pegawai <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.employee_id"
            type="text"
            class="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            :class="errors.employee_id ? 'border-red-500' : 'border-gray-300'"
            placeholder="EMP-001"
          />
          <p v-if="errors.employee_id" class="text-xs text-red-500 mt-1">{{ errors.employee_id }}</p>
        </div>

        <!-- Nama -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Nama Lengkap <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.nama"
            type="text"
            class="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            :class="errors.nama ? 'border-red-500' : 'border-gray-300'"
            placeholder="Budi Santoso"
          />
          <p v-if="errors.nama" class="text-xs text-red-500 mt-1">{{ errors.nama }}</p>
        </div>

        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Email Perusahaan <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.email"
            type="email"
            class="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            :class="errors.email ? 'border-red-500' : 'border-gray-300'"
            placeholder="budi@reethau.co.id"
          />
          <p v-if="errors.email" class="text-xs text-red-500 mt-1">{{ errors.email }}</p>
        </div>

        <!-- No HP -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Nomor HP</label>
          <input
            v-model="form.no_hp"
            type="text"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            placeholder="081234567890"
          />
        </div>
      </div>
    </div>

    <!-- Section: Akun -->
    <div class="bg-white rounded-xl border border-gray-100 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Informasi Akun</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Username -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Username <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.username"
            type="text"
            class="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            :class="errors.username ? 'border-red-500' : 'border-gray-300'"
            placeholder="budi.santoso"
          />
          <p v-if="errors.username" class="text-xs text-red-500 mt-1">{{ errors.username }}</p>
        </div>

        <!-- Password -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Password <span v-if="!isEdit" class="text-red-500">*</span>
            <span v-else class="text-gray-400">(kosongkan jika tidak diubah)</span>
          </label>
          <input
            v-model="form.password"
            type="password"
            class="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            :class="errors.password ? 'border-red-500' : 'border-gray-300'"
            placeholder="Minimal 6 karakter"
          />
          <p v-if="errors.password" class="text-xs text-red-500 mt-1">{{ errors.password }}</p>
        </div>

        <!-- Role -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Role <span class="text-red-500">*</span>
          </label>
          <select
            v-model.number="form.role_id"
            class="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            :class="errors.role_id ? 'border-red-500' : 'border-gray-300'"
          >
            <option :value="0">Pilih Role</option>
            <option v-for="r in roleList" :key="r.id" :value="r.id">{{ r.nama }}</option>
          </select>
          <p v-if="errors.role_id" class="text-xs text-red-500 mt-1">{{ errors.role_id }}</p>
        </div>

        <!-- Status -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
          <select
            v-model="form.status"
            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Section: Kepegawaian -->
    <div class="bg-white rounded-xl border border-gray-100 p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Informasi Kepegawaian</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Divisi -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Divisi <span class="text-red-500">*</span>
          </label>
          <select
            v-model.number="form.divisi_id"
            class="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            :class="errors.divisi_id ? 'border-red-500' : 'border-gray-300'"
          >
            <option :value="0">Pilih Divisi</option>
            <option v-for="d in divisiList" :key="d.id" :value="d.id">{{ d.nama }}</option>
          </select>
          <p v-if="errors.divisi_id" class="text-xs text-red-500 mt-1">{{ errors.divisi_id }}</p>
        </div>

        <!-- Jabatan -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Jabatan <span class="text-red-500">*</span>
          </label>
          <select
            v-model.number="form.jabatan_id"
            class="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            :class="errors.jabatan_id ? 'border-red-500' : 'border-gray-300'"
          >
            <option :value="0">Pilih Jabatan</option>
            <option v-for="j in jabatanList" :key="j.id" :value="j.id">{{ j.nama }}</option>
          </select>
          <p v-if="errors.jabatan_id" class="text-xs text-red-500 mt-1">{{ errors.jabatan_id }}</p>
        </div>

        <!-- Grade -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Grade <span class="text-red-500">*</span>
          </label>
          <select
            v-model.number="form.grade_id"
            class="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            :class="errors.grade_id ? 'border-red-500' : 'border-gray-300'"
          >
            <option :value="0">Pilih Grade</option>
            <option v-for="g in gradeList" :key="g.id" :value="g.id">{{ g.nama }}</option>
          </select>
          <p v-if="errors.grade_id" class="text-xs text-red-500 mt-1">{{ errors.grade_id }}</p>
        </div>

        <!-- Tanggal Masuk -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">
            Tanggal Masuk <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.tanggal_masuk"
            type="date"
            class="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            :class="errors.tanggal_masuk ? 'border-red-500' : 'border-gray-300'"
          />
          <p v-if="errors.tanggal_masuk" class="text-xs text-red-500 mt-1">{{ errors.tanggal_masuk }}</p>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-end gap-3">
      <button
        type="button"
        class="px-5 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        @click="emit('cancel')"
      >
        Batal
      </button>
      <button
        type="submit"
        class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors shadow-sm inline-flex items-center gap-2 disabled:opacity-50"
        :disabled="isLoading"
      >
        <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        {{ isLoading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan User' }}
      </button>
    </div>
  </form>
</template>