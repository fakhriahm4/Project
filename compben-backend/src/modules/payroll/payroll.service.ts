import { AppError } from '@/middleware/errorHandler';
import { settingsService } from '@/modules/settings/settings.service';
import { writeAuditLog } from '@/utils/audit';
import ExcelJS from 'exceljs';
import { payrollRepository } from './payroll.repository';
import type {
  CellInput,
  ImportResult,
  ImportRowError,
  PeriodResponse,
} from './payroll.types';

/**
 * Fase 1 — Payroll Period & Attendance.
 *
 * ATURAN KUNCI:
 *  - Hari kerja = Sen–Jumat (akhir pekan tak bisa diinput).
 *  - Lock EFEKTIF: tanggal >= cut_off (tgl 22) menutup tulis — tanpa cron,
 *    aturan tanggal dihitung server-side; tombol "Kunci" menutup lebih awal.
 *  - Sesi input: hari 1 s/d (cut_off − 1) = 1–21 ✓
 *  - Tanggal 22–akhir bulan TIDAK disimpan: dibaca sbg
 *    LOCKED_ASSUMED_PRESENT (lihat matrix), koreksi via Adjustment (Fase 2).
 *  - Baris absensi hanya utk pegawai include_in_payroll & aktif.
 */

// ── util tanggal ───────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0');
const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => fmtDate(new Date());

function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Tanggal lock = hari `cut_off_day` pada bulan periode (mis. 22) */
function lockDateOf(p: { period_month: string; cut_off_day: number }): Date {
  const [y, m] = p.period_month.split('-').map(Number);
  return new Date(y, m - 1, p.cut_off_day);
}

function isWeekend(tanggal: string): boolean {
  const dow = parseYmd(tanggal).getDay();
  return dow === 0 || dow === 6;
}

// ── parser Excel (impor dari alat fingerprint) ─────────────
function normHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nilai sel Excel → teks (dukung richText / formula / hyperlink) */
function cellText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText)) {
      return (o.richText as Array<{ text?: string }>).map((t) => t.text ?? '').join('');
    }
    if (o.text !== undefined) return cellText(o.text);
    if (o.result !== undefined) return cellText(o.result);
    if (o.error !== undefined) return '';
  }
  return String(v);
}

/** Sel tanggal → 'YYYY-MM-DD' (dukung Date ExcelJS, serial, ISO, D/M/YYYY) */
function parseDateCell(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    // ExcelJS membangun Date dari serial dgn epoch UTC → pakai getter UTC
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`;
  }
  if (typeof v === 'number' && isFinite(v)) {
    const ms = Math.round((v - 25569) * 86400000); // identik exceljs.excelToDate
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  if (typeof v === 'string') {
    const s = v.trim();
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
    if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
    // D/M/YYYY (format Indonesia); 2 digit tahun → 20xx
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[T\s].*)?$/);
    if (m) {
      let y = +m[3];
      if (y < 100) y += 2000;
      return `${y}-${pad(+m[2])}-${pad(+m[1])}`;
    }
    return null;
  }
  return null;
}

/** Sel jam → 'HH:MM' | null (dukung Date, serial, 'H:MM', 'H:MM AM/PM', datetime) */
function parseTimeCell(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) {
    return `${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}`;
  }
  if (typeof v === 'number' && isFinite(v)) {
    const frac = v > 1 ? v - Math.floor(v) : v; // serial datetime → ambil porsi hari
    const secs = Math.round(frac * 86400) % 86400;
    return `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?m\.?$/i);
  if (m) {
    let h = +m[1];
    const ap = m[3].toLowerCase();
    if (ap === 'p' && h < 12) h += 12;
    if (ap === 'a' && h === 12) h = 0;
    return h < 24 ? `${pad(h)}:${m[2]}` : null;
  }
  m = s.match(/(\d{1,2}):(\d{2})/);
  if (m && +m[1] < 24 && +m[2] < 60) return `${pad(+m[1])}:${m[2]}`;
  return null;
}

interface ParsedRow {
  empId: number;
  tanggal: string;
  jamMasuk: string | null;
  jamKeluar: string | null;
  keterangan: string | null;
}

// ── Guard aturan tulis ─────────────────────────────────────
function assertWritable(p: PeriodResponse): void {
  if (p.status !== 'OPEN') {
    throw new AppError(
      p.status === 'LOCKED'
        ? 'Periode sudah dikunci — koreksi absensi via Adjustment'
        : 'Periode sudah dibayar — data final, tidak bisa diubah',
      409
    );
  }
  const lock = lockDateOf(p);
  if (parseYmd(todayStr()) >= lock) {
    throw new AppError(
      `Absensi terkunci sejak tgl ${fmtDate(lock)} (cut-off) — koreksi via Adjustment bulan berikutnya`,
      409
    );
  }
}

function assertTanggalWritable(p: PeriodResponse, tanggal: string): void {
  const day = Number(tanggal.slice(8, 10));
  if (day > p.cut_off_day) {
    throw new AppError(
      `Tanggal melewati cut-off (tgl ${p.cut_off_day}) — dianggap LOCKED_ASSUMED_PRESENT`,
      409
    );
  }
}

// ── Periode ────────────────────────────────────────────────
export class PayrollPeriodService {
  list() {
    return payrollRepository.listPeriods();
  }

  detail(id: number) {
    return this.findOr404(id);
  }

  async findOr404(id: number): Promise<PeriodResponse> {
    const p = await payrollRepository.findPeriodById(id);
    if (!p) throw new AppError('Periode tidak ditemukan', 404);
    return p;
  }

  async create(input: { period_month: string }, userId: number) {
    if (await payrollRepository.findPeriodByMonth(input.period_month)) {
      throw new AppError('Periode bulan tersebut sudah ada', 400);
    }
    // Snapshot parameter saat periode dibuat (riwayat tetap bila parameter berubah)
    const cfg = await settingsService.get('cb_parameter');
    const row = await payrollRepository.insertPeriod(
      input.period_month,
      cfg.cut_off_day,
      cfg.payday_day,
      userId
    );
    if (!row) throw new AppError('Gagal membuat periode', 500);
    await writeAuditLog({
      user_id: userId,
      action: 'CREATE',
      table_name: 'payroll_periods',
      record_id: row.id,
      new_value: {
        period_month: row.period_month,
        cut_off_day: row.cut_off_day,
        payday_day: row.payday_day,
      },
    });
    return row;
  }

  async lock(id: number, userId: number) {
    const p = await this.findOr404(id);
    if (p.status !== 'OPEN') {
      throw new AppError(
        p.status === 'LOCKED' ? 'Periode sudah dikunci' : 'Periode sudah dibayar',
        400
      );
    }
    await payrollRepository.lockPeriod(id, userId);
    await writeAuditLog({
      user_id: userId,
      action: 'UPDATE',
      table_name: 'payroll_periods',
      record_id: id,
      old_value: { status: 'OPEN' },
      new_value: { status: 'LOCKED' },
    });
    return payrollRepository.findPeriodById(id);
  }

  async pay(id: number, userId: number) {
    const p = await this.findOr404(id);
    if (p.status !== 'LOCKED') {
      throw new AppError(
        p.status === 'OPEN'
          ? 'Kunci absensi dulu sebelum menandai dibayar'
          : 'Periode sudah ditandai dibayar',
        400
      );
    }
    await payrollRepository.payPeriod(id, userId);
    await writeAuditLog({
      user_id: userId,
      action: 'UPDATE',
      table_name: 'payroll_periods',
      record_id: id,
      old_value: { status: 'LOCKED' },
      new_value: { status: 'PAID' },
    });
    return payrollRepository.findPeriodById(id);
  }

  async remove(id: number, userId: number) {
    const p = await this.findOr404(id);
    if (p.status !== 'OPEN') {
      throw new AppError('Hanya periode OPEN yang bisa dihapus', 409);
    }
    const n = await payrollRepository.countAttendance(id);
    if (n > 0) {
      throw new AppError(
        `Periode masih berisi ${n} data absensi — kosongkan dulu sebelum hapus`,
        409
      );
    }
    await payrollRepository.deletePeriod(id);
    await writeAuditLog({
      user_id: userId,
      action: 'DELETE',
      table_name: 'payroll_periods',
      record_id: id,
      old_value: { period_month: p.period_month, status: p.status },
    });
    return { message: 'Periode berhasil dihapus' };
  }
}

// ── Absensi ────────────────────────────────────────────────
export class AttendanceService {
  /** Grid absensi per periode — termasuk hari terkunci (derived, tanpa baris) */
  async matrix(periodId: number) {
    const period = await payrollRepository.findPeriodById(periodId);
    if (!period) throw new AppError('Periode tidak ditemukan', 404);
    const [employees, entries] = await Promise.all([
      payrollRepository.matrixEmployees(),
      payrollRepository.listEntries(periodId),
    ]);
    const lockDate = lockDateOf(period);
    return {
      period,
      lock_date: fmtDate(lockDate),
      writable: period.status === 'OPEN' && parseYmd(todayStr()) < lockDate,
      employees,
      entries,
    };
  }

  /** Koreksi manual per sel (≤ cut-off, hari kerja, periode OPEN & belum lock) */
  async saveCell(input: CellInput, userId: number) {
    const period = await payrollRepository.findPeriodByDate(input.tanggal);
    if (!period) {
      throw new AppError('Periode bulan tersebut belum dibuat — buat periode dulu', 404);
    }
    assertWritable(period);
    assertTanggalWritable(period, input.tanggal);
    if (isWeekend(input.tanggal)) {
      throw new AppError('Bukan hari kerja (absensi hanya Sen–Jumat)', 400);
    }
    const emp = await payrollRepository.findPayrollEmployee(input.employee_id);
    if (!emp) {
      throw new AppError('Pegawai tidak ditemukan / tidak ikut payroll', 404);
    }

    const before = await payrollRepository.findEntry(input.employee_id, input.tanggal);
    const jamMasuk = input.status === 'HADIR' ? input.jam_masuk ?? null : null;
    const jamKeluar = input.status === 'HADIR' ? input.jam_keluar ?? null : null;
    const { id } = await payrollRepository.upsertEntry({
      period_id: period.id,
      employee_id: input.employee_id,
      tanggal: input.tanggal,
      status: input.status,
      jam_masuk: jamMasuk,
      jam_keluar: jamKeluar,
      keterangan: input.keterangan ?? null,
      source: 'MANUAL',
      user_id: userId,
    });
    const after = await payrollRepository.findEntry(input.employee_id, input.tanggal);
    await writeAuditLog({
      user_id: userId,
      action: before ? 'UPDATE' : 'CREATE',
      table_name: 'attendance',
      record_id: id,
      old_value: before ?? null,
      new_value: after,
    });
    return after;
  }

  /** Hapus data satu sel → kembali "Belum absen" */
  async deleteCell(employeeId: number, tanggal: string, userId: number) {
    const period = await payrollRepository.findPeriodByDate(tanggal);
    if (!period) {
      throw new AppError('Periode bulan tersebut belum dibuat', 404);
    }
    assertWritable(period);
    assertTanggalWritable(period, tanggal);

    const before = await payrollRepository.findEntry(employeeId, tanggal);
    if (!before) throw new AppError('Data absensi tidak ditemukan', 404);
    await payrollRepository.deleteEntry(employeeId, tanggal);
    await writeAuditLog({
      user_id: userId,
      action: 'DELETE',
      table_name: 'attendance',
      record_id: null,
      old_value: before,
    });
    return { message: 'Data absensi dihapus' };
  }

  /**
   * Impor hasil export alat fingerprint (Excel multipart field "file").
   * Auto-detect kolom; baris valid → HADIR + jam (source=IMPORT),
   * baris bermasalah dikumpulkan & dilaporkan (impor parsial, tdk gagal total).
   */
  async importFile(
    file: { buffer?: Buffer; originalname?: string } | undefined,
    periodIdRaw: unknown,
    userId: number
  ): Promise<ImportResult> {
    const periodId = Number(periodIdRaw);
    if (!periodIdRaw || !Number.isInteger(periodId) || periodId <= 0) {
      throw new AppError('period_id wajib (field form) — pilih periode dulu', 400);
    }
    const period = await payrollRepository.findPeriodById(periodId);
    if (!period) throw new AppError('Periode tidak ditemukan', 404);
    assertWritable(period);
    if (!file?.buffer) throw new AppError('File tidak ditemukan (field "file" wajib)', 400);

    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(file.buffer as any); // Buffer exceljs vs @types/node beda versi
    } catch {
      throw new AppError('File Excel tidak valid / gagal dibaca', 400);
    }
    const ws = wb.worksheets[0];
    if (!ws) throw new AppError('File tidak memiliki sheet', 400);

    // ── Header: auto-detect kolom (alias umum finger & template resmi) ──
    const headers: Array<{ col: number; norm: string }> = [];
    ws.getRow(1).eachCell({ includeEmpty: false }, (cell, colNum) => {
      headers.push({ col: colNum, norm: normHeader(cellText(cell.value)) });
    });
    const findCol = (aliases: string[]): number | undefined => {
      for (const a of aliases) {
        const hit = headers.find((h) => h.norm === normHeader(a));
        if (hit) return hit.col;
      }
      return undefined;
    };
    const nipCol = findCol([
      'nip', 'nik', 'employee id', 'id pegawai', 'no karyawan',
      'nrp', 'no', 'nomor', 'id',
    ]);
    const tglCol = findCol(['tanggal', 'tgl', 'date']);
    const inCol = findCol([
      'jam masuk', 'time in', 'check in', 'masuk', 'jam in', 'in',
    ]);
    const outCol = findCol([
      'jam keluar', 'time out', 'check out', 'keluar', 'jam out', 'out',
    ]);
    const ketCol = findCol(['keterangan', 'catatan', 'remark', 'remarks', 'note', 'ket']);

    const missing: string[] = [];
    if (nipCol === undefined) missing.push('NIP');
    if (tglCol === undefined) missing.push('Tanggal');
    if (missing.length) {
      throw new AppError(
        `Kolom ${missing.join(' & ')} tidak ditemukan. Kolom terbaca: ${
          headers.map((h) => h.norm).filter(Boolean).join(', ') || '(kosong)'
        }`,
        400
      );
    }

    // Pegawai yang ikut payroll → map NIP
    const employees = await payrollRepository.matrixEmployees();
    const byNip = new Map(employees.map((e) => [e.employee_id, e]));

    // ── Baca baris data ──
    const errors: ImportRowError[] = [];
    const rows: ParsedRow[] = [];
    const seen = new Set<string>();
    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const nip = cellText(row.getCell(nipCol!).value).trim();
      const tglVal = row.getCell(tglCol!).value;
      const hasData =
        nip !== '' ||
        (tglVal !== null && tglVal !== undefined && tglVal !== '') ||
        (inCol !== undefined && row.getCell(inCol).value !== null && row.getCell(inCol).value !== undefined && row.getCell(inCol).value !== '') ||
        (ketCol !== undefined && cellText(row.getCell(ketCol).value).trim() !== '');
      if (!hasData) continue; // baris kosong

      if (!nip) {
        errors.push({ row: r, message: 'NIP kosong' });
        continue;
      }
      const emp = byNip.get(nip);
      if (!emp) {
        errors.push({
          row: r,
          message: `NIP "${nip}" tidak dikenal / tidak ikut payroll`,
        });
        continue;
      }
      const tanggal = parseDateCell(tglVal);
      if (!tanggal) {
        errors.push({ row: r, message: 'Tanggal tidak terbaca (pakai YYYY-MM-DD)' });
        continue;
      }
      if (tanggal.slice(0, 7) !== period.period_month) {
        errors.push({
          row: r,
          message: `Tanggal di luar bulan periode (${period.period_month})`,
        });
        continue;
      }
      const day = Number(tanggal.slice(8, 10));
      if (day > period.cut_off_day) {
        errors.push({
          row: r,
          message: `Terkunci — lewat cut-off tgl ${period.cut_off_day}`,
        });
        continue;
      }
      if (isWeekend(tanggal)) {
        errors.push({ row: r, message: 'Bukan hari kerja (Sen–Jumat)' });
        continue;
      }
      const key = `${emp.id}|${tanggal}`;
      if (seen.has(key)) {
        errors.push({ row: r, message: 'Duplikat NIP+tanggal dalam file' });
        continue;
      }
      seen.add(key);
      rows.push({
        empId: emp.id,
        tanggal,
        jamMasuk: inCol !== undefined ? parseTimeCell(row.getCell(inCol).value) : null,
        jamKeluar: outCol !== undefined ? parseTimeCell(row.getCell(outCol).value) : null,
        keterangan:
          ketCol !== undefined
            ? cellText(row.getCell(ketCol).value).trim().slice(0, 200) || null
            : null,
      });
    }

    if (!rows.length && !errors.length) {
      throw new AppError('File tidak berisi data (mulai dari baris ke-2)', 400);
    }

    let imported = 0;
    let updated = 0;
    for (const r of rows) {
      const { inserted } = await payrollRepository.upsertEntry({
        period_id: period.id,
        employee_id: r.empId,
        tanggal: r.tanggal,
        status: 'HADIR',
        jam_masuk: r.jamMasuk,
        jam_keluar: r.jamKeluar,
        keterangan: r.keterangan,
        source: 'IMPORT',
        user_id: userId,
      });
      if (inserted) imported++;
      else updated++;
    }

    const filename = file.originalname || 'absensi.xlsx';
    await writeAuditLog({
      user_id: userId,
      action: 'IMPORT',
      table_name: 'attendance',
      record_id: period.id,
      new_value: {
        filename,
        total_rows: rows.length + errors.length,
        imported,
        updated,
        errors: errors.length,
      },
    });

    return {
      filename,
      total_rows: rows.length + errors.length,
      imported,
      updated,
      errors,
    };
  }

  /** Template Excel resmi (format kolom yang didukung auto-detect) */
  async templateBuffer(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Absensi');
    ws.columns = [
      { header: 'NIP', key: 'nip', width: 16 },
      { header: 'Tanggal', key: 'tanggal', width: 14 },
      { header: 'Jam Masuk', key: 'masuk', width: 12 },
      { header: 'Jam Keluar', key: 'keluar', width: 12 },
      { header: 'Keterangan', key: 'ket', width: 34 },
    ];
    ws.addRow({ nip: 'EMP-001', tanggal: '2026-10-01', masuk: '07:58', keluar: '17:03', ket: 'Contoh baris hadir (isi sesuai data finger)' });
    ws.addRow({ nip: 'EMP-001', tanggal: '2026-10-02', masuk: '', keluar: '', ket: 'Isi tanggal saja bila tak ada jam' });
    const header = ws.getRow(1);
    header.font = { bold: true };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD1FAE5' },
    };
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
  }
}

export const payrollPeriodService = new PayrollPeriodService();
export const attendanceService = new AttendanceService();
