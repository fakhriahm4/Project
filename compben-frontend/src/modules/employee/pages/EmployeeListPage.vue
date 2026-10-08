<script setup lang="ts">
import CbMasterPage from '@/modules/cb/components/CbMasterPage.vue';
import cbService from '@/modules/cb/services/cbService';
import type { CbColumn, CbField } from '@/modules/cb/types/form';
import { lookupService, type LookupItem } from '@/services/lookupService';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { computed, onMounted, ref } from 'vue';

/**
 * Master Pegawai (tabel `employees`) — sumber data payroll Fase 0.
 * Satu halaman utk Super Admin & Admin C&B (sumber data sama); Admin C&B
 * melihat kolom detail payroll (gaji pokok, pajak, rekening, BPJS, driver).
 * Baris otomatis tersinkron dari akun user (trigger migrasi 008).
 * Tulis hanya ADMIN_CNB; baca juga untuk SUPER_ADMIN/HR_ADMIN/HR.
 * Saat mode HRIS aktif nanti, create/import otomatis disembunyikan via flag
 * (kode tidak dihapus) — data kepegawaian jadi read-only dari HRIS.
 */

const auth = useAuthStore();
const page = ref<InstanceType<typeof CbMasterPage> | null>(null);

const q = ref('');
const status = ref<'all' | 'active' | 'inactive'>('all');

const divisis = ref<LookupItem[]>([]);
const jabatans = ref<LookupItem[]>([]);
const grades = ref<LookupItem[]>([]);
const companies = ref<{ id: number; nama: string }[]>([]);

onMounted(async () => {
  try {
    const [lk, comps] = await Promise.all([
      lookupService.all(),
      api.get('/companies') as Promise<{ success: boolean; data: { id: number; nama: string }[] }>,
    ]);
    divisis.value = lk.divisi;
    jabatans.value = lk.jabatan;
    grades.value = lk.grade;
    companies.value = comps.data;
  } catch {
    /* lookup gagal → form tanpa select referensi */
  }
});

function reload() {
  void page.value?.reload();
}

/** Badge role — kunci = role_kode (String(value) saat render) */
const ROLE_BADGES: Record<string, { label: string; class: string }> = {
  SUPER_ADMIN: { label: 'Super Admin', class: 'bg-purple-100 text-purple-700' },
  ADMIN_CNB: { label: 'Admin C&B', class: 'bg-emerald-100 text-emerald-700' },
  HR_ADMIN: { label: 'HR Admin', class: 'bg-blue-100 text-blue-700' },
  HR: { label: 'HR', class: 'bg-sky-100 text-sky-700' },
  EMPLOYEE: { label: 'Karyawan', class: 'bg-gray-100 text-gray-600' },
};

const columns = computed<CbColumn[]>(() => {
  // Base = kolom identik dgn Manajemen User Super Admin
  const base: CbColumn[] = [
    { key: 'employee_id', label: 'NIP', type: 'code' },
    { key: 'nama', label: 'Nama' },
    { key: 'username', label: 'Username' },
    { key: 'email', label: 'Email' },
    { key: 'divisi_nama', label: 'Divisi' },
    { key: 'jabatan_nama', label: 'Jabatan' },
    { key: 'grade_kode', label: 'Grade', type: 'code' },
    { key: 'role_kode', label: 'Role', type: 'badge', badges: ROLE_BADGES },
    {
      key: 'status_pegawai',
      label: 'Status',
      type: 'badge',
      badges: {
        TETAP: { label: 'Tetap', class: 'bg-emerald-100 text-emerald-700' },
        KONTRAK: { label: 'Kontrak', class: 'bg-blue-100 text-blue-700' },
        PROBATION: { label: 'Probation', class: 'bg-amber-100 text-amber-700' },
      },
    },
    { key: 'tanggal_masuk', label: 'Masuk', type: 'date' },
  ];

  // Kedalaman berbeda: data sama, Admin C&B melihat detail payroll
  if (auth.hasRole('ADMIN_CNB')) {
    base.push(
      { key: 'gaji_pokok', label: 'Gaji Pokok', type: 'money', align: 'right' },
      { key: 'pph21_category', label: 'PPh 21', type: 'code' },
      { key: 'nama_bank', label: 'Bank' },
      { key: 'no_rekening', label: 'No. Rekening', type: 'code' },
      { key: 'bpjs_active', label: 'BPJS', type: 'bool', align: 'center' },
      { key: 'status_driver', label: 'Driver', type: 'bool', align: 'center' },
      {
        key: 'include_in_payroll',
        label: 'Ikut Gaji',
        type: 'badge',
        align: 'center',
        badges: {
          true: { label: 'Ya', class: 'bg-emerald-100 text-emerald-700' },
          false: { label: 'Tidak', class: 'bg-purple-100 text-purple-700' },
        },
      }
    );
  }

  base.push({ key: 'is_active', label: 'Status', type: 'bool', align: 'center' });
  return base;
});

const fields = computed<CbField[]>(() => [
  { key: 'employee_id', label: 'NIP', type: 'text', required: true, half: true, placeholder: 'mis. 00123' },
  { key: 'nama', label: 'Nama Lengkap', type: 'text', required: true, half: true },
  { key: 'email', label: 'Email', type: 'text', half: true, placeholder: 'nama@perusahaan.co.id' },
  { key: 'ktp', label: 'No. KTP', type: 'text', half: true },
  {
    key: 'company_id',
    label: 'Perusahaan',
    type: 'select',
    half: true,
    options: companies.value.map((c) => ({ value: c.id, label: c.nama })),
  },
  {
    key: 'divisi_id',
    label: 'Divisi',
    type: 'select',
    half: true,
    options: divisis.value.map((d) => ({ value: d.id, label: d.nama })),
  },
  {
    key: 'jabatan_id',
    label: 'Jabatan',
    type: 'select',
    half: true,
    options: jabatans.value.map((j) => ({ value: j.id, label: j.nama })),
  },
  {
    key: 'grade_id',
    label: 'Grade',
    type: 'select',
    half: true,
    options: grades.value.map((g) => ({ value: g.id, label: `${g.kode} — ${g.nama}` })),
    hint: 'Menentukan struktur compensation & aturan lembur.',
  },
  {
    key: 'status_pegawai',
    label: 'Status Pegawai',
    type: 'select',
    required: true,
    half: true,
    options: [
      { value: 'TETAP', label: 'Tetap' },
      { value: 'KONTRAK', label: 'Kontrak' },
      { value: 'PROBATION', label: 'Probation' },
    ],
  },
  { key: 'tanggal_masuk', label: 'Tanggal Masuk', type: 'date', half: true },
  { key: 'tanggal_keluar', label: 'Tanggal Keluar', type: 'date', half: true, hint: 'Kosongkan bila masih aktif' },
  {
    key: 'pph21_category',
    label: 'Kategori PPh 21',
    type: 'select',
    half: true,
    options: [
      { value: 'TER_A', label: 'TER A (TK/0)' },
      { value: 'TER_B', label: 'TER B (K/1)' },
    ],
  },
  { key: 'tax_status', label: 'Status Pajak', type: 'text', half: true, placeholder: 'mis. NORMAL' },
  { key: 'nama_bank', label: 'Nama Bank', type: 'text', half: true, placeholder: 'mis. BCA' },
  { key: 'no_rekening', label: 'No. Rekening', type: 'text', half: true },
  { key: 'status_driver', label: 'Driver (kena Tabungan Kecelakaan dsb.)', type: 'checkbox' },
  { key: 'bpjs_active', label: 'Aktif BPJS', type: 'checkbox' },
  {
    key: 'include_in_payroll',
    label: 'Ikut Perhitungan Gaji',
    type: 'checkbox',
    hint: 'Akun Super Admin otomatis tidak ikut payroll (khusus administrator).',
  },
  { key: 'is_active', label: 'Pegawai aktif', type: 'checkbox' },
]);
</script>

<template>
  <CbMasterPage
    ref="page"
    title="Master Pegawai"
    subtitle="Sumber data payroll: NIP, divisi/jabatan/grade, status, pajak, dan rekening — tersinkron otomatis dari akun user. Detail payroll (gaji pokok, PPh 21, rekening, BPJS) khusus tampilan Admin C&B."
    :columns="columns"
    :fields="fields"
    :load="() => cbService.employees.list({ q: q || undefined, status })"
    :create-fn="cbService.employees.create"
    :update-fn="cbService.employees.update"
    :remove-fn="cbService.employees.remove"
    entity-label="pegawai"
    empty-text="Tidak ada pegawai yang cocok dengan filter."
  >
    <template #toolbar>
      <div class="flex items-center gap-2">
        <input
          v-model="q"
          type="search"
          placeholder="Cari NIP / nama…"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm w-48 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          @keyup.enter="reload"
        />
        <select
          v-model="status"
          class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          @change="reload"
        >
          <option value="all">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <button
          class="border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 text-sm font-medium px-3 py-2 rounded-lg"
          @click="reload"
        >
          Cari
        </button>
      </div>
    </template>
  </CbMasterPage>
</template>
