<script setup lang="ts">
import { authService } from '@/modules/auth/services/authService';
import { useAuthStore } from '@/stores/auth';
import { computed, onMounted, reactive, ref } from 'vue';

const auth = useAuthStore();
/** TRUE = login pertama setelah import → wajib ganti password */
const mustChange = computed(() => !!auth.user?.mustChangePassword);

function extractMessage(e: unknown): string {
  const err = e as { error?: unknown; message?: string };
  if (typeof err?.error === 'string') return err.error;
  return err?.message || 'Terjadi kesalahan yang tidak diketahui';
}

// ============================================
// GANTI PASSWORD
// ============================================
const pwForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' });
const pwSaving = ref(false);
const pwError = ref<string | null>(null);
const pwSuccess = ref<string | null>(null);

async function changePassword() {
  pwError.value = null;
  pwSuccess.value = null;

  if (pwForm.newPassword !== pwForm.confirmPassword) {
    pwError.value = 'Konfirmasi password baru tidak sama';
    return;
  }

  pwSaving.value = true;
  try {
    const res = await authService.changePassword({
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    });
    pwSuccess.value = res.message;
    pwForm.currentPassword = '';
    pwForm.newPassword = '';
    pwForm.confirmPassword = '';
    // Password awal sudah diganti → lepas flag wajib ganti (buka akses halaman lain)
    auth.clearMustChangePassword();
  } catch (e) {
    pwError.value = extractMessage(e);
  } finally {
    pwSaving.value = false;
  }
}

// ============================================
// PREFERENSI NOTIFIKASI
// ============================================
const prefs = reactive({ notif_email: true, notif_app: true });
const prefsSaving = ref(false);
const prefsError = ref<string | null>(null);
const prefsSuccess = ref<string | null>(null);

onMounted(async () => {
  try {
    const me = await authService.me();
    prefs.notif_email = me.preferences?.notif_email ?? true;
    prefs.notif_app = me.preferences?.notif_app ?? true;
  } catch {
    /* preferensi default — tidak mematikan halaman */
  }
});

async function savePreferences() {
  prefsError.value = null;
  prefsSuccess.value = null;
  prefsSaving.value = true;
  try {
    const res = await authService.savePreferences({ ...prefs });
    prefs.notif_email = res.preferences.notif_email;
    prefs.notif_app = res.preferences.notif_app;
    prefsSuccess.value = 'Preferensi disimpan';
  } catch (e) {
    prefsError.value = extractMessage(e);
  } finally {
    prefsSaving.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Pengaturan Akun</h1>
      <p class="text-sm text-gray-500 mt-1">
        Kelola keamanan akun dan preferensi notifikasi Anda.
      </p>
    </div>

    <!-- Banner wajib ganti (login pertama setelah import) -->
    <div
      v-if="mustChange"
      class="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
    >
      <span class="text-amber-500 text-lg leading-5">⚠</span>
      <div class="text-sm text-amber-800">
        <p class="font-semibold">Anda wajib mengganti password sebelum melanjutkan.</p>
        <p class="mt-0.5">
          Password awal Anda (tanggal lahir / hasil import) hanya berlaku sementara.
          Silakan ganti password di formulir sebelah, lalu simpan.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <!-- Ganti password -->
      <form class="bg-white rounded-xl border border-gray-100 p-6" @submit.prevent="changePassword">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Ganti Password</h2>
        <p class="text-sm text-gray-500 mb-5">
          Password lama wajib diverifikasi. Berlaku untuk login berikutnya.
        </p>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password Lama</label>
            <input
              v-model="pwForm.currentPassword"
              type="password"
              required
              autocomplete="current-password"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
            <input
              v-model="pwForm.newPassword"
              type="password"
              required
              autocomplete="new-password"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password Baru</label>
            <input
              v-model="pwForm.confirmPassword"
              type="password"
              required
              autocomplete="new-password"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <p
          v-if="pwError"
          class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4"
        >
          {{ pwError }}
        </p>
        <p
          v-if="pwSuccess"
          class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-4"
        >
          {{ pwSuccess }}
        </p>

        <div class="flex justify-end mt-5">
          <button
            type="submit"
            :disabled="pwSaving"
            class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {{ pwSaving ? 'Menyimpan…' : 'Ubah Password' }}
          </button>
        </div>
      </form>

      <!-- Preferensi notifikasi -->
      <form class="bg-white rounded-xl border border-gray-100 p-6" @submit.prevent="savePreferences">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Preferensi Notifikasi</h2>
        <p class="text-sm text-gray-500 mb-5">
          Pilih kanal notifikasi yang Anda inginkan.
        </p>

        <div class="space-y-3">
          <label class="flex items-start gap-3 border border-gray-100 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <input
              v-model="prefs.notif_email"
              type="checkbox"
              class="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <span class="block text-sm font-medium text-gray-800">Notifikasi via Email</span>
              <span class="block text-xs text-gray-500 mt-0.5">
                Kirim pemberitahuan penting (approval, perubahan data) ke email Anda.
              </span>
            </span>
          </label>

          <label class="flex items-start gap-3 border border-gray-100 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
            <input
              v-model="prefs.notif_app"
              type="checkbox"
              class="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <span class="block text-sm font-medium text-gray-800">Notifikasi di Aplikasi</span>
              <span class="block text-xs text-gray-500 mt-0.5">
                Tampilkan notifikasi dalam aplikasi saat Anda login.
              </span>
            </span>
          </label>
        </div>

        <p
          v-if="prefsError"
          class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4"
        >
          {{ prefsError }}
        </p>
        <p
          v-if="prefsSuccess"
          class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-4"
        >
          {{ prefsSuccess }}
        </p>

        <div class="flex justify-end mt-5">
          <button
            type="submit"
            :disabled="prefsSaving"
            class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {{ prefsSaving ? 'Menyimpan…' : 'Simpan Preferensi' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
