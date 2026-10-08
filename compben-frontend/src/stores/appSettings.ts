import settingsService from '@/modules/settings/services/settingsService';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

/**
 * Pengaturan publik aplikasi (identitas + preferensi tampilan).
 * Di-load sekali saat app mount dari GET /settings/public (tanpa auth).
 * Nilai default dipakai kalau request gagal (offline / server mati).
 */
export const useAppSettingsStore = defineStore('appSettings', () => {
  const appName = ref('CompBen');
  const appShortName = ref('CB');
  const companyName = ref('PT Reethau Cipta Energi');
  const timezone = ref('Asia/Jakarta');
  const dateFormat = ref('DD/MM/YYYY');
  const defaultPageSize = ref(10);
  const loaded = ref(false);

  /** Judul dokumen: "Halaman - Nama Perusahaan" */
  const documentTitle = computed(() => companyName.value);

  async function loadPublic() {
    if (loaded.value) return;
    try {
      const { data } = await settingsService.getPublic();
      appName.value = data.appName;
      appShortName.value = data.appShortName;
      companyName.value = data.companyName;
      timezone.value = data.timezone;
      dateFormat.value = data.dateFormat;
      defaultPageSize.value = data.defaultPageSize;
      loaded.value = true;
    } catch {
      /* fallback default — jangan blokir app */
    }
  }

  /** Set/pakai dari settings section general (setelah admin simpan) */
  function applyPublic(p: {
    appName: string;
    appShortName: string;
    companyName: string;
    timezone: string;
    dateFormat: string;
    defaultPageSize: number;
  }) {
    appName.value = p.appName;
    appShortName.value = p.appShortName;
    companyName.value = p.companyName;
    timezone.value = p.timezone;
    dateFormat.value = p.dateFormat;
    defaultPageSize.value = p.defaultPageSize;
    loaded.value = true;
  }

  return {
    appName,
    appShortName,
    companyName,
    timezone,
    dateFormat,
    defaultPageSize,
    loaded,
    documentTitle,
    loadPublic,
    applyPublic,
  };
});
