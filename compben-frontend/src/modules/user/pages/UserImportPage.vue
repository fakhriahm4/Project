<script setup lang="ts">
import {
  extractErrorMessage,
  userService,
  type ImportResult,
} from '@/modules/user/services/userService';
import { ref } from 'vue';

const file = ref<File | null>(null);
const uploading = ref(false);
const error = ref<string | null>(null);
const result = ref<ImportResult | null>(null);
const copiedBaris = ref<number | null>(null);
/** Mode password import: 'dob' = tanggal lahir DDMMYYYY (default) */
const passwordMode = ref<'dob' | 'random'>('dob');
const downloadingRekap = ref(false);
const rekapError = ref<string | null>(null);

function onPick(e: Event) {
  const input = e.target as HTMLInputElement;
  file.value = input.files?.[0] ?? null;
  result.value = null;
  error.value = null;
}

async function downloadTemplate() {
  error.value = null;
  try {
    await userService.downloadTemplate();
  } catch (e) {
    error.value = await extractErrorMessage(e);
  }
}

async function upload() {
  if (!file.value) {
    error.value = 'Pilih file Excel terlebih dahulu';
    return;
  }
  uploading.value = true;
  error.value = null;
  result.value = null;
  rekapError.value = null;
  try {
    result.value = await userService.importFromExcel(file.value, passwordMode.value);
  } catch (e) {
    error.value = await extractErrorMessage(e);
  } finally {
    uploading.value = false;
  }
}

/** Unduh rekap akun+password (xlsx) dari hasil import di layar ini */
async function downloadRekap() {
  if (!result.value?.accounts.length) return;
  rekapError.value = null;
  downloadingRekap.value = true;
  try {
    await userService.exportCredentials(
      result.value.accounts.map((a) => ({
        employee_id: a.employee_id,
        username: a.username,
        nama: a.nama,
        password: a.password,
      }))
    );
  } catch (e) {
    rekapError.value = await extractErrorMessage(e);
  } finally {
    downloadingRekap.value = false;
  }
}

function reset() {
  file.value = null;
  result.value = null;
  error.value = null;
  const input = document.getElementById('import-file') as HTMLInputElement | null;
  if (input) input.value = '';
}

async function copy(text: string, baris?: number) {
  try {
    await navigator.clipboard.writeText(text);
    if (baris !== undefined) {
      copiedBaris.value = baris;
      setTimeout(() => (copiedBaris.value = null), 1500);
    }
  } catch {
    /* clipboard tidak tersedia — abaikan */
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Import User (Excel)</h1>
        <p class="text-sm text-gray-500 mt-1">
          Tambahkan banyak user sekaligus dari file Excel — tanpa input manual satu per satu.
        </p>
      </div>
      <button
        class="inline-flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        @click="downloadTemplate"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Unduh Template
      </button>
    </div>

    <!-- Langkah -->
    <div class="bg-white rounded-xl border border-gray-100 p-6">
      <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Cara Pakai</h2>
      <ol class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <li class="flex gap-3">
          <span class="w-6 h-6 flex-shrink-0 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
          <span class="text-gray-600">Unduh template, lalu isi datanya. Jangan ubah nama kolom.</span>
        </li>
        <li class="flex gap-3">
          <span class="w-6 h-6 flex-shrink-0 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
          <span class="text-gray-600">Upload file (.xlsx, maks 2MB / 1000 baris).</span>
        </li>
        <li class="flex gap-3">
          <span class="w-6 h-6 flex-shrink-0 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
          <span class="text-gray-600">
            Baris valid dibuatkan akunnya; password awal = tanggal lahir (DDMMYYYY) lalu
            wajib diganti user saat login pertama. Baris bermasalah dilaporkan per nomor.
          </span>
        </li>
      </ol>
    </div>

    <!-- Upload -->
    <div class="bg-white rounded-xl border border-gray-100 p-6">
      <!-- Mode password -->
      <fieldset class="mb-5">
        <legend class="text-sm font-semibold text-gray-900 mb-2">Password Awal Akun</legend>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label
            class="flex items-start gap-3 border rounded-lg p-4 cursor-pointer transition-colors"
            :class="passwordMode === 'dob' ? 'border-emerald-400 bg-emerald-50/60' : 'border-gray-200 hover:bg-gray-50'"
          >
            <input
              v-model="passwordMode"
              type="radio"
              value="dob"
              class="mt-0.5 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <span class="block text-sm font-medium text-gray-800">Tanggal Lahir (DDMMYYYY)</span>
              <span class="block text-xs text-gray-500 mt-0.5">
                Contoh: lahir 1 Jan 2000 → password <code class="font-mono">01012000</code>.
                Praktis — cukup umumkan aturannya sekali ke semua karyawan.
              </span>
            </span>
          </label>
          <label
            class="flex items-start gap-3 border rounded-lg p-4 cursor-pointer transition-colors"
            :class="passwordMode === 'random' ? 'border-emerald-400 bg-emerald-50/60' : 'border-gray-200 hover:bg-gray-50'"
          >
            <input
              v-model="passwordMode"
              type="radio"
              value="random"
              class="mt-0.5 border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <span class="block text-sm font-medium text-gray-800">Acak Otomatis (12 karakter)</span>
              <span class="block text-xs text-gray-500 mt-0.5">
                Password unik per akun — Sebarkan lewat rekap Excel yang diunduh.
              </span>
            </span>
          </label>
        </div>
        <p v-if="passwordMode === 'dob'" class="text-xs text-amber-600 mt-2">
          ⚠ Mode ini mensyaratkan kolom <b>Tanggal Lahir</b> terisi di semua baris —
          baris kosong akan dilaporkan gagal.
        </p>
      </fieldset>

      <label
        for="import-file"
        class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors"
      >
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span class="text-sm text-gray-600">
          <span class="font-medium text-emerald-700">Klik untuk memilih file</span> atau seret ke sini
        </span>
        <span class="text-xs text-gray-400">Format .xlsx / .xls, maksimal 2MB</span>
        <input
          id="import-file"
          type="file"
          accept=".xlsx,.xls"
          class="hidden"
          @change="onPick"
        />
      </label>

      <div v-if="file" class="flex items-center justify-between gap-3 mt-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <div class="flex items-center gap-3 min-w-0">
          <svg class="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="text-sm text-gray-800 truncate">{{ file.name }}</span>
          <span class="text-xs text-gray-400 flex-shrink-0">{{ (file.size / 1024).toFixed(0) }} KB</span>
        </div>
        <button
          :disabled="uploading"
          class="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex-shrink-0"
          @click="upload"
        >
          {{ uploading ? 'Mengimport…' : 'Import Sekarang' }}
        </button>
      </div>

      <p
        v-if="error"
        class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4"
      >
        {{ error }}
      </p>
    </div>

    <!-- Hasil import -->
    <template v-if="result">
      <!-- Ringkasan -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl border border-gray-100 p-5">
          <p class="text-xs uppercase tracking-wide text-gray-400">Total Baris</p>
          <p class="text-2xl font-bold text-gray-900 mt-1">{{ result.summary.total }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 p-5">
          <p class="text-xs uppercase tracking-wide text-gray-400">Berhasil Dibuat</p>
          <p class="text-2xl font-bold text-emerald-600 mt-1">{{ result.summary.imported }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-100 p-5">
          <p class="text-xs uppercase tracking-wide text-gray-400">Gagal</p>
          <p class="text-2xl font-bold text-red-500 mt-1">{{ result.summary.failed }}</p>
        </div>
      </div>

      <!-- Akun baru + password -->
      <div v-if="result.accounts.length" class="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 class="text-sm font-semibold text-gray-900 uppercase tracking-wide">Akun Baru & Password</h2>
            <p v-if="result.password_mode === 'random'" class="text-xs text-amber-600 mt-1">
              ⚠ Password acak hanya ditampilkan sekali di sini — unduh rekap, sebararkan ke pemilik akun, lalu hapus file-nya.
            </p>
            <p v-else class="text-xs text-amber-600 mt-1">
              ⚠ Password awal = Tanggal Lahir (DDMMYYYY). Umumkan aturannya ke karyawan;
              mereka wajib mengganti password saat login pertama.
            </p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              :disabled="downloadingRekap"
              @click="downloadRekap"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {{ downloadingRekap ? 'Menyiapkan…' : 'Unduh Rekap (Excel)' }}
            </button>
            <button
              class="text-xs font-medium text-emerald-700 hover:text-emerald-900 border border-emerald-200 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
              @click="copy(result.accounts.map((a) => `${a.employee_id}\t${a.username}\t${a.password}`).join('\n'))"
            >
              Salin Semua (NIP · Username · Password)
            </button>
          </div>
        </div>
        <p
          v-if="rekapError"
          class="text-xs text-red-600 bg-red-50 border-t border-red-100 px-5 py-2"
        >
          {{ rekapError }}
        </p>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="px-5 py-3 font-medium">Baris</th>
                <th class="px-5 py-3 font-medium">NIP</th>
                <th class="px-5 py-3 font-medium">Username</th>
                <th class="px-5 py-3 font-medium">Nama</th>
                <th class="px-5 py-3 font-medium">Password</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="a in result.accounts" :key="a.employee_id" class="hover:bg-gray-50">
                <td class="px-5 py-3 text-gray-400">{{ a.baris }}</td>
                <td class="px-5 py-3 font-mono text-xs">{{ a.employee_id }}</td>
                <td class="px-5 py-3 font-medium text-gray-900">{{ a.username }}</td>
                <td class="px-5 py-3 text-gray-600">{{ a.nama }}</td>
                <td class="px-5 py-3">
                  <div class="flex items-center gap-2">
                    <code class="font-mono text-xs bg-gray-100 px-2 py-1 rounded select-all">{{ a.password }}</code>
                    <button
                      class="text-xs font-medium transition-colors"
                      :class="copiedBaris === a.baris ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'"
                      @click="copy(a.password, a.baris)"
                    >
                      {{ copiedBaris === a.baris ? 'Tersalin ✓' : 'Salin' }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Baris gagal -->
      <div v-if="result.errors.length" class="bg-white rounded-xl border border-red-100 overflow-hidden">
        <div class="px-5 py-4 border-b border-red-100 bg-red-50">
          <h2 class="text-sm font-semibold text-red-700 uppercase tracking-wide">
            Baris Bermasalah ({{ result.errors.length }})
          </h2>
          <p class="text-xs text-red-500 mt-1">Perbaiki baris di bawah lalu upload ulang file-nya.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th class="px-5 py-3 font-medium w-20">Baris</th>
                <th class="px-5 py-3 font-medium">Masalah</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="err in result.errors" :key="err.baris" class="hover:bg-gray-50">
                <td class="px-5 py-3 text-gray-400">{{ err.baris }}</td>
                <td class="px-5 py-3 text-gray-700">{{ err.pesan }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="flex justify-end">
        <button
          class="text-sm font-medium text-gray-600 hover:text-gray-800 border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
          @click="reset"
        >
          Import Lagi
        </button>
      </div>
    </template>
  </div>
</template>
