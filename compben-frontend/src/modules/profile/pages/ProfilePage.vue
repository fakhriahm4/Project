<script setup lang="ts">
import { authService, type MeProfile, type ProfileData } from '@/modules/auth/services/authService';
import { formatDateTime } from '@/utils/format';
import { onMounted, reactive, ref } from 'vue';

const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const me = ref<MeProfile | null>(null);
const completeness = ref(0);

const form = reactive<ProfileData>({
  nik: null,
  jenis_kelamin: null,
  tempat_lahir: null,
  tanggal_lahir: null,
  alamat: null,
  agama: null,
  status_kawin: null,
  kontak_darurat_nama: null,
  kontak_darurat_hubungan: null,
  kontak_darurat_hp: null,
  npwp: null,
  nama_bank: null,
  no_rekening: null,
  pendidikan_terakhir: null,
});

function extractMessage(e: unknown): string {
  const err = e as { error?: unknown; message?: string };
  if (typeof err?.error === 'string') return err.error;
  return err?.message || 'Terjadi kesalahan yang tidak diketahui';
}

function applyProfile(data: MeProfile) {
  me.value = data;
  completeness.value = data.completeness;
  for (const k of Object.keys(form) as (keyof ProfileData)[]) {
    form[k] = (data.profile?.[k] ?? null) as never;
  }
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    applyProfile(await authService.me());
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

async function save() {
  saving.value = true;
  error.value = null;
  success.value = null;
  try {
    // Kirim versi "ringkas" (string kosong → null di backend)
    const payload: Partial<ProfileData> = {};
    for (const [k, v] of Object.entries(form)) {
      payload[k as keyof ProfileData] = (v === '' ? null : v) as never;
    }
    const updated = await authService.updateProfile(payload);
    applyProfile(updated);
    success.value = 'Profil berhasil disimpan';
  } catch (e) {
    error.value = extractMessage(e);
  } finally {
    saving.value = false;
  }
}

const AGAMA = ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'];
const STATUS_KAWIN = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'];

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return d.slice(0, 10);
}

function fmtDateTime(d?: string | null): string {
  if (!d) return 'Belum pernah login';
  return formatDateTime(d);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Profil Saya</h1>
      <p class="text-sm text-gray-500 mt-1">
        Lengkapi data diri Anda — data ini menjadi rujukan admin HR (dapat ditarik dalam bentuk Excel).
      </p>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="bg-white rounded-xl border border-gray-100 p-12 flex flex-col items-center gap-3"
    >
      <svg class="w-8 h-8 text-emerald-600 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <p class="text-sm text-gray-500">Memuat profil…</p>
    </div>

    <template v-else>
      <!-- Kartu akun + progress -->
      <div class="bg-white rounded-xl border border-gray-100 p-6">
        <div class="flex items-start gap-4 flex-wrap">
          <div class="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center">
            <span class="text-white text-xl font-semibold">
              {{ (me?.nama || 'U').charAt(0).toUpperCase() }}
            </span>
          </div>
          <div class="flex-1 min-w-[200px]">
            <h2 class="text-lg font-semibold text-gray-900">{{ me?.nama }}</h2>
            <p class="text-sm text-gray-500">@{{ me?.username }} · {{ me?.email }}</p>
            <div class="flex flex-wrap gap-2 mt-2">
              <span class="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {{ me?.roleName }}
              </span>
              <span class="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {{ me?.divisiNama || '—' }}
              </span>
              <span class="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {{ me?.jabatanNama || '—' }}
              </span>
              <span class="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {{ me?.gradeNama || '—' }}
              </span>
            </div>
          </div>

          <!-- Progress kelengkapan -->
          <div class="w-full sm:w-64">
            <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Kelengkapan profil</span>
              <span class="font-semibold text-gray-700">{{ completeness }}%</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="completeness >= 100 ? 'bg-emerald-500' : 'bg-amber-400'"
                :style="{ width: completeness + '%' }"
              ></div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-5 border-t border-gray-100 text-sm">
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide">NIP</p>
            <p class="text-gray-800 font-medium mt-0.5">{{ me?.employeeId || '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide">Status</p>
            <p class="text-gray-800 font-medium mt-0.5">{{ me?.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide">Tanggal Masuk</p>
            <p class="text-gray-800 font-medium mt-0.5">{{ fmtDate(me?.tanggalMasuk) }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 uppercase tracking-wide">Login Terakhir</p>
            <p class="text-gray-800 font-medium mt-0.5">{{ fmtDateTime(me?.lastLogin) }}</p>
          </div>
        </div>
      </div>

      <!-- Form data diri -->
      <form class="bg-white rounded-xl border border-gray-100 p-6" @submit.prevent="save">
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Data Diri</h2>
        <p class="text-sm text-gray-500 mb-5">Isi sebagaimana identitas resmi Anda (KTP dsb.).</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">NIK (KTP)</label>
            <input
              v-model="form.nik"
              type="text"
              maxlength="30"
              placeholder="16 digit NIK"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
            <select
              v-model="form.jenis_kelamin"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option :value="null">— Pilih —</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
            <input
              v-model="form.tempat_lahir"
              type="text"
              maxlength="100"
              placeholder="mis. Surabaya"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
            <input
              v-model="form.tanggal_lahir"
              type="date"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Agama</label>
            <select
              v-model="form.agama"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option :value="null">— Pilih —</option>
              <option v-for="a in AGAMA" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Status Perkawinan</label>
            <select
              v-model="form.status_kawin"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option :value="null">— Pilih —</option>
              <option v-for="s in STATUS_KAWIN" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <textarea
              v-model="form.alamat"
              rows="2"
              maxlength="500"
              placeholder="Alamat lengkap sesuai KTP…"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Kontak Darurat</label>
            <input
              v-model="form.kontak_darurat_nama"
              type="text"
              maxlength="150"
              placeholder="mis. Siti Hartono"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Hubungan</label>
              <input
                v-model="form.kontak_darurat_hubungan"
                type="text"
                maxlength="50"
                placeholder="mis. Istri"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">No HP</label>
              <input
                v-model="form.kontak_darurat_hp"
                type="text"
                maxlength="20"
                placeholder="08…"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">NPWP</label>
            <input
              v-model="form.npwp"
              type="text"
              maxlength="30"
              placeholder="Nomor NPWP"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Pendidikan Terakhir</label>
            <input
              v-model="form.pendidikan_terakhir"
              type="text"
              maxlength="50"
              placeholder="mis. S1 Teknik"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nama Bank</label>
            <input
              v-model="form.nama_bank"
              type="text"
              maxlength="50"
              placeholder="mis. BCA"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">No Rekening</label>
            <input
              v-model="form.no_rekening"
              type="text"
              maxlength="30"
              placeholder="Nomor rekening"
              class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <p
          v-if="error"
          class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4"
        >
          {{ error }}
        </p>
        <p
          v-if="success"
          class="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-4"
        >
          {{ success }}
        </p>

        <div class="flex justify-end mt-5">
          <button
            type="submit"
            :disabled="saving"
            class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {{ saving ? 'Menyimpan…' : 'Simpan Profil' }}
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
