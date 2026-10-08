import { query } from '@/config/database';
import { AppError } from '@/middleware/errorHandler';
import { writeAuditLog } from '@utils/audit';
import bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import { randomInt } from 'node:crypto';
import { AuthRepository } from '../auth/auth.repository';
import { UserRepository } from './user.repository';

const userRepository = new UserRepository();
const authRepository = new AuthRepository();

// ============================================
// KONFIGURASI
// ============================================

/** Header template import — key = field internal, nilai = judul kolom Excel */
const TEMPLATE_COLUMNS: { key: string; header: string; width: number; example: string }[] = [
  { key: 'employee_id', header: 'NIP', width: 14, example: '00001' },
  { key: 'username', header: 'Username', width: 18, example: 'rudi.hartono' },
  { key: 'nama', header: 'Nama Lengkap', width: 28, example: 'Rudi Hartono' },
  { key: 'email', header: 'Email', width: 28, example: 'rudi.hartono@reethau.co.id' },
  { key: 'no_hp', header: 'No HP', width: 16, example: '081234567890' },
  { key: 'tanggal_lahir', header: 'Tanggal Lahir', width: 15, example: '01012000' },
  { key: 'divisi_kode', header: 'Kode Divisi', width: 14, example: 'Human Resources' },
  { key: 'jabatan_kode', header: 'Kode Jabatan', width: 14, example: 'JAB-MGR' },
  { key: 'grade_kode', header: 'Kode Grade', width: 12, example: 'G5' },
  { key: 'role_kode', header: 'Kode Role', width: 14, example: 'HR' },
  { key: 'tanggal_masuk', header: 'Tanggal Masuk', width: 15, example: '2026-01-15' },
  { key: 'status', header: 'Status', width: 10, example: 'ACTIVE' },
];

/** Terima variasi penamaan header (case & spasi bebas) */
const HEADER_MAP: Record<string, string> = {
  nip: 'employee_id',
  employeeid: 'employee_id',
  username: 'username',
  nama: 'nama',
  namalengkap: 'nama',
  email: 'email',
  nohp: 'no_hp',
  notelepon: 'no_hp',
  tanggallahir: 'tanggal_lahir',
  tgllahir: 'tanggal_lahir',
  dob: 'tanggal_lahir',
  kodedivisi: 'divisi_kode',
  divisi: 'divisi_kode',
  kodejabatan: 'jabatan_kode',
  jabatan: 'jabatan_kode',
  kodegrade: 'grade_kode',
  grade: 'grade_kode',
  koderole: 'role_kode',
  role: 'role_kode',
  tanggalmasuk: 'tanggal_masuk',
  status: 'status',
};

const PROFILE_EXPORT_COLUMNS: { header: string; get: (r: any) => any }[] = [
  { header: 'NIP', get: (r) => r.employee_id },
  { header: 'Username', get: (r) => r.username },
  { header: 'Nama Lengkap', get: (r) => r.nama },
  { header: 'Email', get: (r) => r.email },
  { header: 'No HP', get: (r) => r.no_hp ?? '' },
  { header: 'Role', get: (r) => r.role_nama ?? '' },
  { header: 'Divisi', get: (r) => r.divisi_nama ?? '' },
  { header: 'Jabatan', get: (r) => r.jabatan_nama ?? '' },
  { header: 'Grade', get: (r) => r.grade_nama ?? '' },
  { header: 'Status', get: (r) => r.status },
  { header: 'Tanggal Masuk', get: (r) => r.tanggal_masuk ?? '' },
  { header: 'Last Login', get: (r) => r.last_login ?? '' },
  { header: 'NIK', get: (r) => r.nik ?? '' },
  { header: 'Jenis Kelamin', get: (r) => r.jenis_kelamin ?? '' },
  { header: 'Tempat Lahir', get: (r) => r.tempat_lahir ?? '' },
  { header: 'Tanggal Lahir', get: (r) => r.tanggal_lahir ?? '' },
  { header: 'Alamat', get: (r) => r.alamat ?? '' },
  { header: 'Agama', get: (r) => r.agama ?? '' },
  { header: 'Status Kawin', get: (r) => r.status_kawin ?? '' },
  { header: 'Kontak Darurat Nama', get: (r) => r.kontak_darurat_nama ?? '' },
  { header: 'Kontak Darurat Hubungan', get: (r) => r.kontak_darurat_hubungan ?? '' },
  { header: 'Kontak Darurat HP', get: (r) => r.kontak_darurat_hp ?? '' },
  { header: 'NPWP', get: (r) => r.npwp ?? '' },
  { header: 'Nama Bank', get: (r) => r.nama_bank ?? '' },
  { header: 'No Rekening', get: (r) => r.no_rekening ?? '' },
  { header: 'Pendidikan Terakhir', get: (r) => r.pendidikan_terakhir ?? '' },
];

const MAX_ROWS = 1000;

// ============================================
// HELPER
// ============================================

function normalizeHeader(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** Nilai sel Excel → string aman (date, formula, richText, number) */
function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    const o = v as any;
    if (o.text !== undefined) return String(o.text).trim();
    if (o.result !== undefined) return String(o.result ?? '').trim();
    if (Array.isArray(o.richText)) return o.richText.map((t: any) => t.text).join('');
  }
  if (typeof v === 'number') return String(v);
  return String(v).trim();
}

/**
 * Normalisasi No HP — jaring pengaman utk nilai yang telanjur jadi number
 * di Excel (0 di depan hilang):
 *  - buang spasi/tanda hubung: "0812-3456 7890" → "081234567890"
 *  - awalan internasional: "62812…" → "0812…" (9-12 digit setelah 62)
 *  - angka 9-12 digit tanpa 0 di depan → otomatis diberi 0
 *  - berisi "+" atau huruf → dibiarkan apa adanya (hanya spasi dibuang)
 */
function normalizePhone(raw: string): string {
  const s = raw.replace(/[\s\-.()]/g, '');
  if (!s) return '';
  if (!/^\d+$/.test(s)) return s; // format +62 / huruf — hormati apa adanya
  if (s.startsWith('62') && s.length >= 11) return '0' + s.slice(2);
  if (!s.startsWith('0') && s.length >= 9 && s.length <= 12) return '0' + s;
  return s;
}

/**
 * Parse Tanggal Lahir → ISO (YYYY-MM-DD) atau pesan error.
 * Format diterima: sel Excel Date, YYYY-MM-DD, DDMMYYYY, DD/MM/YYYY, DD-MM-YYYY.
 * Validasi: tanggal valid, bukan masa depan, tahun 1900–sekarang.
 */
function parseBirthDate(v: unknown): { iso: string } | { error: string } {
  if (v === null || v === undefined || v === '') return { error: 'Tanggal Lahir wajib diisi' };

  let iso: string | null = null;
  if (v instanceof Date) {
    // Hybrid: Date hasil baca file Excel (serial) umumnya UTC-midnight → pakai UTC;
    // Date dgn jam non-nol (round-trip exceljs menyimpan offset zona) → pakai lokal.
    const utcMidnight =
      v.getUTCHours() === 0 && v.getUTCMinutes() === 0 && v.getUTCSeconds() === 0;
    const y = utcMidnight ? v.getUTCFullYear() : v.getFullYear();
    const mo = (utcMidnight ? v.getUTCMonth() : v.getMonth()) + 1;
    const d = utcMidnight ? v.getUTCDate() : v.getDate();
    iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  } else {
    const s = cellToString(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      iso = s;
    } else if (/^\d{8}$/.test(s)) {
      // DDMMYYYY (contoh 01012000)
      iso = `${s.slice(4)}-${s.slice(2, 4)}-${s.slice(0, 2)}`;
    } else if (/^\d{7}$/.test(s)) {
      // Angka telanjur kehilangan 0 di depan (1012000 → 01012000)
      const p = '0' + s;
      iso = `${p.slice(4)}-${p.slice(2, 4)}-${p.slice(0, 2)}`;
    } else {
      const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
      if (m) iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      else return { error: 'Tanggal Lahir format tidak dikenal (pakai DDMMYYYY, mis. 01012000)' };
    }
  }

  const [y, mo, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return { error: 'Tanggal Lahir tidak valid' };
  }
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (dt.getTime() > today) return { error: 'Tanggal Lahir tidak boleh di masa depan' };
  if (y < 1900) return { error: 'Tanggal Lahir tahun minimal 1900' };

  return { iso };
}

/** ISO (YYYY-MM-DD) → DDMMYYYY (password mode dob) */
function isoToDdmmyyyy(iso: string): string {
  return `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`;
}

/** Password acak 12 karakter — campuran huruf besar/kecil/angka */
function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digit = '23456789';
  const pool = upper + lower + digit;

  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(upper), pick(lower), pick(digit), pick(digit)];
  while (chars.length < 12) chars.push(pick(pool));

  // Fisher–Yates kecil
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Error 23505 → pesan ramah (konsisten dgn user.service) */
function duplicateMessage(e: unknown): string | null {
  const err = e as { code?: string; constraint?: string };
  if (err?.code === '23505') {
    const c = err.constraint ?? '';
    if (c.includes('employee_id')) return 'NIP sudah terdaftar (termasuk user nonaktif)';
    if (c.includes('email')) return 'Email sudah terdaftar (termasuk user nonaktif)';
    if (c.includes('username')) return 'Username sudah terdaftar (termasuk user nonaktif)';
    return 'Data sudah terdaftar';
  }
  return null;
}

// ============================================
// SERVICE
// ============================================

export interface ImportError {
  baris: number;
  pesan: string;
}

export interface ImportAccount {
  baris: number;
  employee_id: string;
  username: string;
  nama: string;
  password: string;
}

export class UserBulkService {
  // ============================================
  // TEMPLATE (unduh)
  // ============================================
  async templateBuffer(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Users');

    ws.columns = TEMPLATE_COLUMNS.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width,
    }));

    // Format TEKS utk semua kolom identitas (kecuali Tanggal Masuk):
    // tanpa ini Excel mengubah "081234567890" / "0012" jadi angka dan
    // 0 di depannya hilang. Format kolom juga berlaku utk sel yang
    // diketik user belakangan di Excel (cegah angka jadi number).
    TEMPLATE_COLUMNS.forEach((c, i) => {
      if (c.key === 'tanggal_masuk') return;
      ws.getColumn(i + 1).numFmt = '@';
    });

    // Baris contoh
    const exampleRow = ws.addRow(Object.fromEntries(TEMPLATE_COLUMNS.map((c) => [c.key, c.example])));

    // Terapkan eksplisit pada sel baris contoh (template langsung tampil benar)
    TEMPLATE_COLUMNS.forEach((c, i) => {
      if (c.key === 'tanggal_masuk') return;
      exampleRow.getCell(i + 1).numFmt = '@';
    });

    // Header: tebal + abu-abu
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' }, // emerald-600
    };
    header.alignment = { horizontal: 'center' };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: TEMPLATE_COLUMNS.length } };

    // Sheet petunjuk
    const guide = wb.addWorksheet('Petunjuk');
    guide.getColumn(1).width = 100;
    const lines = [
      'PETUNJUK IMPORT USER',
      '',
      '1. Isi data pada sheet "Users" — jangan ubah nama kolom (header).',
      '2. Baris pertama adalah header; data mulai dari baris ke-2.',
      '3. Kolom NIP, Username, No HP, Tanggal Lahir, dan Kode diformat TEKS',
      '   — angka 0 di depan TIDAK hilang. Jangan diubah jadi format Angka.',
      '4. Tanggal Lahir format DDMMYYYY (contoh: 01012000 = 1 Januari 2000).',
      '   Dapat juga ditulis YYYY-MM-DD atau DD/MM/YYYY.',
      '5. PASSWORD AWAL = Tanggal Lahir dalam DDMMYYYY (contoh: 01012000).',
      '   Setelah login pertama, user DIWAJIBKAN mengganti password',
      '   di menu Pengaturan Akun.',
      '6. Kode Divisi/Jabatan/Grade/Role diisi dengan KODE (mis. HRGA, G5).',
      '   Boleh juga diisi dengan Nama lengkap, sistem menerima keduanya.',
      '7. Tanggal Masuk format YYYY-MM-DD (mis. 2026-01-15).',
      '8. Status: ACTIVE atau INACTIVE (kosong = ACTIVE).',
      '9. No HP dinormalisasi otomatis saat import: spasi/tanda hubung',
      '   dibuang, awalan 62xxx menjadi 0xxx, dan angka 9-12 digit tanpa',
      '   0 di depan otomatis diberi 0 di depan.',
      '10. Baris yang lolos validasi akan dibuatkan akunnya (import parsial),',
      '    baris bermasalah dilaporkan per nomor baris.',
      `11. Maksimal ${MAX_ROWS} baris per file, ukuran file maksimal 2MB (.xlsx).`,
    ];
    lines.forEach((t, i) => {
      const cell = guide.getCell(i + 1, 1);
      cell.value = t;
      if (i === 0) cell.font = { bold: true, size: 14 };
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
  }

  // ============================================
  // IMPORT
  // ============================================
  async importFromExcel(
    file: { buffer?: Buffer },
    currentUserId: number,
    passwordMode: 'dob' | 'random' = 'dob'
  ): Promise<{
    summary: { total: number; imported: number; failed: number };
    errors: ImportError[];
    accounts: ImportAccount[];
  }> {
    if (!file?.buffer) throw new AppError('File tidak ditemukan (field "file" wajib)', 400);

    let wb: ExcelJS.Workbook;
    try {
      wb = new ExcelJS.Workbook();
      await wb.xlsx.load(file.buffer as any);
    } catch {
      throw new AppError('File tidak valid atau bukan file Excel (.xlsx)', 400);
    }

    const ws = wb.worksheets[0];
    if (!ws) throw new AppError('File tidak memiliki sheet data', 400);

    // ── Map header → kolom ──
    const colOf: Record<string, number> = {};
    const headerRow = ws.getRow(1);
    headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
      const key = HEADER_MAP[normalizeHeader(cell.value)];
      if (key && !colOf[key]) colOf[key] = col;
    });

    const required = ['employee_id', 'username', 'nama', 'email', 'divisi_kode', 'jabatan_kode', 'grade_kode', 'role_kode', 'tanggal_masuk'];
    if (passwordMode === 'dob') required.push('tanggal_lahir');
    const missing = required.filter((k) => !colOf[k]);
    if (missing.length) {
      const names = TEMPLATE_COLUMNS.filter((c) => missing.includes(c.key)).map((c) => c.header);
      throw new AppError(`Kolom wajib tidak ditemukan: ${names.join(', ')}. Gunakan template resmi.`, 400);
    }

    const lastRow = ws.rowCount;
    if (lastRow < 2) throw new AppError('File tidak berisi data (hanya header)', 400);
    if (lastRow - 1 > MAX_ROWS) throw new AppError(`Maksimal ${MAX_ROWS} baris per import`, 400);

    // ── Lookup master: resolve kode/nama → id ──
    const lookups: Record<string, Map<string, number>> = {};
    for (const [field, table] of [
      ['divisi_kode', 'divisi'],
      ['jabatan_kode', 'jabatan'],
      ['grade_kode', 'grade'],
      ['role_kode', 'roles'],
    ] as const) {
      const res = await query(`SELECT id::int, kode, nama FROM ${table} WHERE is_active = TRUE`);
      const map = new Map<string, number>();
      for (const row of res.rows) {
        map.set(String(row.kode).toLowerCase(), row.id);
        map.set(String(row.nama).toLowerCase(), row.id);
      }
      lookups[field] = map;
    }

    // ── Duplikat vs DB: SEMUA baris (termasuk nonaktif) ──
    const existing = await query(`SELECT employee_id, username, email FROM users`);
    const dbSets = {
      employee_id: new Set<string>(),
      username: new Set<string>(),
      email: new Set<string>(),
    };
    for (const row of existing.rows) {
      dbSets.employee_id.add(String(row.employee_id).toLowerCase());
      dbSets.username.add(String(row.username).toLowerCase());
      dbSets.email.add(String(row.email).toLowerCase());
    }
    const fileSets = {
      employee_id: new Map<string, number>(),
      username: new Map<string, number>(),
      email: new Map<string, number>(),
    };

    // ── Validasi per baris ──
    const errors: ImportError[] = [];
    const validRows: { baris: number; data: any }[] = [];
    let total = 0;

    const addError = (baris: number, pesan: string) => errors.push({ baris, pesan });

    for (let r = 2; r <= lastRow; r++) {
      const row = ws.getRow(r);
      const val = (key: string) => (colOf[key] ? cellToString(row.getCell(colOf[key]).value) : '');

      // Tanggal Lahir: nilai ASLI sel (Date utk sel tanggal) — parseBirthDate
      // yang tentukan komponen tanggalnya (toISOString bisa meleset utk Date
      // hasil round-trip exceljs yang membawa offset zona).
      const rawLahir = colOf['tanggal_lahir'] ? row.getCell(colOf['tanggal_lahir']).value : '';

      const data = {
        employee_id: val('employee_id'),
        username: val('username'),
        nama: val('nama'),
        email: val('email'),
        no_hp: normalizePhone(val('no_hp')) || null,
        tanggal_lahir: rawLahir instanceof Date ? rawLahir : cellToString(rawLahir),
        divisi_kode: val('divisi_kode'),
        jabatan_kode: val('jabatan_kode'),
        grade_kode: val('grade_kode'),
        role_kode: val('role_kode'),
        tanggal_masuk: val('tanggal_masuk'),
        status: (val('status') || 'ACTIVE').toUpperCase(),
      };

      // Lewati baris benar-benar kosong
      if (!Object.values(data).some((v) => v && v !== 'ACTIVE')) continue;
      total++;

      const problems: string[] = [];

      // Tanggal lahir: wajib di mode dob (jadi sumber password),
      // opsional di mode random — tapi jika diisi harus valid.
      let birthIso: string | null = null;
      if (data.tanggal_lahir) {
        const parsed = parseBirthDate(data.tanggal_lahir);
        if ('error' in parsed) problems.push(parsed.error);
        else birthIso = parsed.iso;
      } else if (passwordMode === 'dob') {
        problems.push('Tanggal Lahir wajib diisi (sumber password awal, format DDMMYYYY)');
      }

      if (!data.employee_id) problems.push('NIP wajib diisi');
      else if (data.employee_id.length > 30) problems.push('NIP maksimal 30 karakter');

      if (!data.username) problems.push('Username wajib diisi');
      else if (data.username.length < 3) problems.push('Username minimal 3 karakter');
      else if (data.username.length > 50) problems.push('Username maksimal 50 karakter');

      if (!data.nama) problems.push('Nama wajib diisi');
      else if (data.nama.length > 150) problems.push('Nama maksimal 150 karakter');

      if (!data.email) problems.push('Email wajib diisi');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) problems.push('Format email tidak valid');

      if (data.no_hp && data.no_hp.length > 20) problems.push('No HP maksimal 20 karakter');

      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.tanggal_masuk)) {
        problems.push('Tanggal Masuk format YYYY-MM-DD');
      }

      if (!['ACTIVE', 'INACTIVE'].includes(data.status)) {
        problems.push('Status harus ACTIVE atau INACTIVE');
      }

      // Resolve kode → id
      const ids: Record<string, number> = {};
      for (const field of ['divisi_kode', 'jabatan_kode', 'grade_kode', 'role_kode'] as const) {
        const raw = data[field];
        if (!raw) {
          problems.push(`${TEMPLATE_COLUMNS.find((c) => c.key === field)?.header} wajib diisi`);
          continue;
        }
        const id = lookups[field].get(raw.toLowerCase());
        if (!id) {
          problems.push(`${TEMPLATE_COLUMNS.find((c) => c.key === field)?.header} "${raw}" tidak ditemukan`);
        } else {
          ids[field] = id;
        }
      }

      // Duplikat dalam file & vs DB
      for (const field of ['employee_id', 'username', 'email'] as const) {
        const v = data[field];
        if (!v) continue;
        const key = v.toLowerCase();
        const dupInFile = fileSets[field].get(key);
        if (dupInFile) {
          problems.push(`Terduplikat di baris ${dupInFile} dalam file yang sama`);
        } else {
          fileSets[field].set(key, r);
        }
        if (dbSets[field].has(key)) {
          const label = field === 'employee_id' ? 'NIP' : field === 'username' ? 'Username' : 'Email';
          problems.push(`${label} sudah terdaftar (termasuk user nonaktif)`);
        }
      }

      if (problems.length) {
        addError(r, problems.join('; '));
      } else {
        validRows.push({ baris: r, data: { ...data, _ids: ids, _birth: birthIso } });
      }
    }

    if (total === 0) throw new AppError('File tidak berisi data (hanya header)', 400);

    // ── Buat akun untuk baris valid (import parsial) ──
    const accounts: ImportAccount[] = [];
    let imported = 0;

    for (const { baris, data } of validRows) {
      // Password: mode dob = Tanggal Lahir DDMMYYYY, mode random = acak 12 char
      const password =
        passwordMode === 'dob' && data._birth ? isoToDdmmyyyy(data._birth) : generatePassword();
      try {
        const password_hash = await bcrypt.hash(password, 12);
        const id = await userRepository.create({
          employee_id: data.employee_id,
          username: data.username,
          nama: data.nama,
          email: data.email,
          no_hp: data.no_hp,
          password_hash,
          divisi_id: data._ids.divisi_kode,
          jabatan_id: data._ids.jabatan_kode,
          grade_id: data._ids.grade_kode,
          role_id: data._ids.role_kode,
          status: data.status,
          tanggal_masuk: data.tanggal_masuk,
          created_by: currentUserId,
          // Semua user hasil import wajib ganti password saat login pertama
          must_change_password: true,
        });

        // Tanggal lahir ikut terisi di profil (data diri utk export HR)
        if (data._birth) {
          await authRepository.upsertProfile(id, { tanggal_lahir: data._birth });
        }

        // Audit konsisten dgn create manual — password TIDAK pernah ikut
        await writeAuditLog({
          user_id: currentUserId,
          action: 'CREATE',
          table_name: 'users',
          record_id: id,
          new_value: {
            employee_id: data.employee_id,
            username: data.username,
            nama: data.nama,
            email: data.email,
            source: 'IMPORT_EXCEL',
          },
        });

        accounts.push({
          baris,
          employee_id: data.employee_id,
          username: data.username,
          nama: data.nama,
          password,
        });
        imported++;
      } catch (e) {
        addError(baris, duplicateMessage(e) || 'Gagal menyimpan ke database');
      }
    }

    return {
      summary: { total, imported, failed: errors.length },
      errors,
      accounts,
    };
  }

  // ============================================
  // REKAP AKUN + PASSWORD (unduhan, dibuat on-the-fly)
  // ============================================
  async credentialsBuffer(
    accounts: { employee_id: string; username: string; nama: string; password: string }[]
  ): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Akun Baru');

    const cols = ['NIP', 'Username', 'Nama Lengkap', 'Password'];
    ws.columns = cols.map((h) => ({ header: h, key: h, width: Math.max(14, h.length + 4) }));

    for (const a of accounts) {
      ws.addRow({ NIP: a.employee_id, Username: a.username, 'Nama Lengkap': a.nama, Password: a.password });
    }

    // Semua kolom format Teks — password/NIP tidak diutak-atik Excel
    cols.forEach((_, i) => ws.getColumn(i + 1).numFmt = '@');

    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    header.alignment = { horizontal: 'center' };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };

    // Sheet peringatan
    const info = wb.addWorksheet('Penting');
    info.getColumn(1).width = 100;
    const lines = [
      'REKAP AKUN HASIL IMPORT',
      '',
      '1. File ini berisi password akun — RAHASIA.',
      '2. Password TIDAK disimpan oleh sistem (hanya hash);',
      '   file ini satu-satunya salinan yang menampilkan password aslinya.',
      '3. Sebarkan password ke pemilik akun masing-masing, lalu HAPUS file ini.',
      '4. User wajib mengganti password saat login pertama.',
    ];
    lines.forEach((t, i) => {
      const cell = info.getCell(i + 1, 1);
      cell.value = t;
      if (i === 0) cell.font = { bold: true, size: 14 };
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
  }

  // ============================================
  // EXPORT PROFIL (untuk HR)
  // ============================================
  async exportProfileBuffer(status?: string): Promise<Buffer> {
    const params: any[] = [];
    // Fase 0.6: tanpa hardcode — ikut daftar (semua user); filter status → is_active
    let where = '';
    if (status) {
      params.push(status.toUpperCase() === 'ACTIVE');
      where = `WHERE u.is_active = $1`;
    }

    const res = await query(
      `SELECT
         u.employee_id, u.username, u.nama, u.email, u.no_hp,
         CASE WHEN u.is_active THEN 'ACTIVE' ELSE 'INACTIVE' END AS status,
         u.tanggal_masuk::text AS tanggal_masuk, u.last_login,
         r.nama AS role_nama, d.nama AS divisi_nama, j.nama AS jabatan_nama,
         g.kode AS grade_nama,
         p.nik, p.jenis_kelamin, p.tempat_lahir, p.tanggal_lahir::text AS tanggal_lahir,
         p.alamat, p.agama, p.status_kawin,
         p.kontak_darurat_nama, p.kontak_darurat_hubungan, p.kontak_darurat_hp,
         p.npwp, p.nama_bank, p.no_rekening, p.pendidikan_terakhir
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       LEFT JOIN divisi d ON u.divisi_id = d.id
       LEFT JOIN jabatan j ON u.jabatan_id = j.id
       LEFT JOIN grade g ON u.grade_id = g.id
       LEFT JOIN user_profiles p ON p.user_id = u.id
       ${where}
       ORDER BY u.nama ASC`,
      params
    );

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Profil User');

    ws.columns = PROFILE_EXPORT_COLUMNS.map((c) => ({
      header: c.header,
      key: c.header,
      width: Math.max(14, Math.min(30, c.header.length + 4)),
    }));

    for (const row of res.rows) {
      ws.addRow(Object.fromEntries(PROFILE_EXPORT_COLUMNS.map((c) => [c.header, c.get(row)])));
    }

    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' },
    };
    header.alignment = { horizontal: 'center' };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: PROFILE_EXPORT_COLUMNS.length },
    };

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.isBuffer(buf) ? buf : Buffer.from(buf as ArrayBuffer);
  }
}
