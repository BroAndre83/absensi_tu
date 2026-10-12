export interface Pegawai {
  nama: string;
  nip: string;
  jabatan?: string;
  unitKerja?: string;
}

export interface AbsensiRecord {
  id?: string;
  rowIndex?: number; // Row index in Google Sheet for updates
  hari: string;
  tanggal: string; // Format e.g. "12/10/2026" or "12 Oktober 2026"
  nama: string;
  nip: string;
  jamMasuk: string; // HH:mm (Datang)
  jamIstirahat?: string; // HH:mm or e.g. "12:00"
  jamPulang: string; // HH:mm or "-" (Pulang)
  status: 'Hadir Tepat Waktu' | 'Terlambat' | 'Izin' | 'Dinas Luar' | 'Belum Pulang' | 'Lengkap' | 'Sakit' | 'Cuti';
  keterangan?: string;
  timestamp?: string;
}

export interface LaporanDayColumn {
  date: Date;
  hari: string;
  tanggalStr: string; // "12/10/2026"
  isWeekend?: boolean;
}

export interface SheetConfig {
  spreadsheetId: string;
  pegawaiSheetName: string; // e.g. "Nama_NIP"
  absensiSheetName: string; // e.g. "Absensi"
  spreadsheetTitle?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: {
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  } | null;
  token: string | null;
}
