import { useAppSettingsStore } from '@/stores/appSettings';

/**
 * Format tanggal & waktu mengikuti System Configuration
 * (General Settings → date_format + timezone).
 *
 * Dipakai di tempat yang me-render tanggal ke user; angka (rupiah/dst)
 * tetap memakai toLocaleString('id-ID') biasa.
 */

function toDate(value: string | Date | number): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Komponen tanggal per timezone settings → { y, m, d } */
function parts(value: string | Date | number) {
  const d = toDate(value);
  if (!d) return null;
  const app = useAppSettingsStore();
  // en-CA → format YYYY-MM-DD, mudah dipecah
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: app.timezone,
  }).format(d); // "2026-10-07"
  const [y, m, dd] = iso.split('-');
  return { y, m, dd, fmt: app.dateFormat as string };
}

/** Tanggal sesuai format settings (DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD) */
export function formatDate(value: string | Date | number | null | undefined): string {
  if (!value) return '—';
  const p = parts(value);
  if (!p) return String(value);
  const { y, m, dd, fmt } = p;
  if (fmt === 'YYYY-MM-DD') return `${y}-${m}-${dd}`;
  if (fmt === 'MM/DD/YYYY') return `${m}/${dd}/${y}`;
  return `${dd}/${m}/${y}`;
}

/** Tanggal + jam (HH:MM) sesuai timezone settings */
export function formatDateTime(
  value: string | Date | number | null | undefined
): string {
  if (!value) return '—';
  const d = toDate(value);
  if (!d) return String(value);
  const app = useAppSettingsStore();
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: app.timezone,
  }).format(d);
  const time = new Intl.DateTimeFormat('id-ID', {
    timeZone: app.timezone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return `${formatDate(date)} ${time.replace('.', ':')}`;
}
