<script setup lang="ts">
import { authService } from '@/modules/auth/services/authService';
import { useAppSettingsStore } from '@/stores/appSettings';
import { useAuthStore } from '@/stores/auth';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const auth = useAuthStore();
const app = useAppSettingsStore();

const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

async function handleSubmit() {
  errorMessage.value = '';
  isLoading.value = true;

  try {
    if (!username.value || !password.value) {
      throw new Error('Username dan password wajib diisi');
    }

    const result = await authService.login({
      username: username.value.trim(),
      password: password.value,
    });

    auth.setAuth(result.accessToken, authService.toStoreUser(result.user));

    // Password awal (tgl lahir/acak) → langsung ke Pengaturan Akun utk ganti
    if (result.user.mustChangePassword) {
      await router.push('/settings/account');
    } else {
      await router.push('/dashboard');
    }
  } catch (error: any) {
    // Interceptor menolak dengan body backend: { success:false, error:'...' }
    errorMessage.value =
      error?.error || error?.message || 'Login gagal, silakan coba lagi';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-white">
    <!-- ============================================
         LEFT SIDE — LOGIN CARD
         ============================================ -->
    <div class="w-full lg:w-[45%] flex items-center justify-center p-6 lg:p-12 bg-gray-50">
      <div class="w-full max-w-md">
        <!-- Card -->
        <div class="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 lg:p-10">
          <!-- Logo & Title -->
          <div class="text-center mb-8">
            <img
              src="/images/logo-reethau.png"
              alt="Reethau Clean Energy"
              class="h-16 mx-auto mb-6 object-contain"
            />
            <h1 class="text-lg font-semibold text-gray-700 mb-1">
              Compensation & Benefit System
            </h1>
            <h2 class="text-3xl font-bold text-gray-900 mt-4">
              Sign In
            </h2>
          </div>

          <!-- Error Alert -->
          <div
            v-if="errorMessage"
            class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
          >
            <svg
              class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
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
            <p class="text-sm text-red-700">{{ errorMessage }}</p>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="space-y-5">
            <!-- User ID -->
            <div>
              <input
                v-model="username"
                type="text"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Username"
                autocomplete="username"
                required
              />
            </div>

            <!-- Password -->
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                class="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Password"
                autocomplete="current-password"
                required
              />
              <button
                type="button"
                class="absolute inset-y-0 right-0 pr-4 flex items-center"
                @click="showPassword = !showPassword"
              >
                <svg
                  v-if="!showPassword"
                  class="w-5 h-5 text-gray-400 hover:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <svg
                  v-else
                  class="w-5 h-5 text-gray-400 hover:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              </button>
            </div>

            <!-- Company Badge -->
            <div class="px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg">
              <p class="text-sm text-gray-600 truncate">{{ app.companyName }}</p>
            </div>

            <!-- Remember & Forgot -->
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="rememberMe"
                  type="checkbox"
                  class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span class="text-sm text-gray-600">Remember Me</span>
              </label>
              <a href="#" class="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Forgot password
              </a>
            </div>

            <!-- Submit -->
            <button
              type="submit"
              class="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              :disabled="isLoading"
            >
              <svg
                v-if="isLoading"
                class="w-5 h-5 animate-spin"
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
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>{{ isLoading ? 'Memproses...' : 'Login' }}</span>
            </button>
          </form>

          <!-- Dev hint (hapus sebelum production) -->
          <div class="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p class="text-xs font-semibold text-blue-900 mb-1">
              🔑 Akun awal
            </p>
            <p class="text-xs text-blue-700">
              <code class="font-mono">superadmin</code> /
              <code class="font-mono">admin123</code>
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================
         RIGHT SIDE — HEXAGON GALLERY
         ============================================ -->
    <div
      class="hidden lg:flex lg:w-[55%] relative bg-gradient-to-br from-blue-800 via-blue-900 to-slate-900 overflow-hidden items-center justify-center"
    >
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <!-- Decorative circles -->
      <div class="absolute -top-32 -right-32 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
      <div class="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500 rounded-full opacity-20 blur-3xl"></div>

      <!-- Hexagon Gallery -->
      <div class="relative z-10 w-full h-full flex items-center justify-center p-8">
        <div class="relative w-full max-w-2xl h-[700px]">
          <!-- Hexagon 1 — Top Center -->
          <div
            class="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-64 hexagon-wrapper animate-float"
            style="animation-delay: 0s"
          >
            <div class="hexagon">
              <img src="/images/photo-1.jpg" alt="Kegiatan 1" class="w-full h-full object-cover" />
            </div>
          </div>

          <!-- Hexagon 2 — Right Center -->
          <div
            class="absolute top-1/4 right-0 w-56 h-64 hexagon-wrapper animate-float"
            style="animation-delay: 0.5s"
          >
            <div class="hexagon">
              <img src="/images/photo-2.jpg" alt="Kegiatan 2" class="w-full h-full object-cover" />
            </div>
          </div>

          <!-- Hexagon 3 — Left Center -->
          <div
            class="absolute top-1/4 left-0 w-56 h-64 hexagon-wrapper animate-float"
            style="animation-delay: 1s"
          >
            <div class="hexagon">
              <img src="/images/photo-3.jpg" alt="Kegiatan 3" class="w-full h-full object-cover" />
            </div>
          </div>

          <!-- Hexagon 4 — Bottom Center -->
          <div
            class="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-64 hexagon-wrapper animate-float"
            style="animation-delay: 1.5s"
          >
            <div class="hexagon">
              <img src="/images/photo-4.jpg" alt="Kegiatan 4" class="w-full h-full object-cover" />
            </div>
          </div>

          <!-- Connecting Lines -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 700" fill="none">
            <path d="M 300 100 Q 400 150 450 250" stroke="rgba(255,255,255,0.15)" stroke-width="3" stroke-dasharray="8 8" fill="none" />
            <path d="M 300 100 Q 200 150 150 250" stroke="rgba(255,255,255,0.15)" stroke-width="3" stroke-dasharray="8 8" fill="none" />
            <path d="M 150 350 Q 200 500 300 600" stroke="rgba(255,255,255,0.15)" stroke-width="3" stroke-dasharray="8 8" fill="none" />
            <path d="M 450 350 Q 400 500 300 600" stroke="rgba(255,255,255,0.15)" stroke-width="3" stroke-dasharray="8 8" fill="none" />
          </svg>
        </div>
      </div>

      <!-- Bottom Text -->
      <div class="absolute bottom-8 left-0 right-0 text-center">
        <p class="text-white/60 text-sm">© 2026 {{ app.companyName }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ============================================
   HEXAGON SHAPE
   ============================================ */
.hexagon {
  width: 100%;
  height: 100%;
  position: relative;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  background: white;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
  overflow: hidden;
}

.hexagon:hover {
  transform: scale(1.05);
}

.hexagon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.hexagon:hover img {
  transform: scale(1.1);
}

/* ============================================
   FLOATING ANIMATION
   ============================================ */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}
</style>