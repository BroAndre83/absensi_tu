// Utilities for Indonesian Dates and WIB (UTC+7) rules

export const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Returns current Date in WIB timezone (UTC+7)
 */
export function getWIBDate(dateInput: Date = new Date()): Date {
  // Convert current time to WIB (Asia/Jakarta)
  const utc = dateInput.getTime() + (dateInput.getTimezoneOffset() * 60000);
  const wibOffset = 7 * 60 * 60 * 1000;
  return new Date(utc + wibOffset);
}

/**
 * Get Indonesian Day Name (e.g., "Senin", "Jum'at")
 */
export function getIndonesianDayName(date: Date = new Date()): string {
  const wib = getWIBDate(date);
  return DAYS_ID[wib.getDay()];
}

/**
 * Get Indonesian formatted date (e.g., "12 Oktober 2026")
 */
export function getIndonesianFormattedDate(date: Date = new Date()): string {
  const wib = getWIBDate(date);
  const day = wib.getDate();
  const month = MONTHS_ID[wib.getMonth()];
  const year = wib.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date as DD/MM/YYYY
 */
export function getShortFormattedDate(date: Date = new Date()): string {
  const wib = getWIBDate(date);
  const d = String(wib.getDate()).padStart(2, '0');
  const m = String(wib.getMonth() + 1).padStart(2, '0');
  const y = wib.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Get current time string in HH:mm format (WIB)
 */
export function getCurrentWIBTimeString(date: Date = new Date()): string {
  const wib = getWIBDate(date);
  const h = String(wib.getHours()).padStart(2, '0');
  const m = String(wib.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Get current time string with seconds HH:mm:ss (WIB)
 */
export function getCurrentWIBTimeStringWithSeconds(date: Date = new Date()): string {
  const wib = getWIBDate(date);
  const h = String(wib.getHours()).padStart(2, '0');
  const m = String(wib.getMinutes()).padStart(2, '0');
  const s = String(wib.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Check if Jam Pulang is allowed based on Bravo Dit Bintek SDA rules:
 * - Senin - Kamis: mulai jam 16:00 WIB
 * - Jum'at: mulai jam 16:30 WIB
 * - Sabtu/Minggu: Libur akhir pekan / lembur
 */
export function validateJamPulang(
  dayName: string,
  timeString?: string
): {
  isAllowed: boolean;
  minTime: string;
  ruleDescription: string;
  warningNotice: string;
} {
  const normalizedDay = dayName.toLowerCase().replace(/[^a-z]/g, '');
  const isFriday = normalizedDay.includes('jumat') || normalizedDay.includes('jum');
  const isMonToThu = ['senin', 'selasa', 'rabu', 'kamis'].includes(normalizedDay);
  const isWeekend = ['sabtu', 'minggu'].includes(normalizedDay);

  let minTime = '16:00';
  let ruleDescription = 'Senin - Kamis jam 16:00 WIB';

  if (isFriday) {
    minTime = '16:30';
    ruleDescription = "Jum'at jam 16:30 WIB";
  } else if (isWeekend) {
    minTime = '00:00';
    ruleDescription = 'Hari Libur / Akhir Pekan (Khusus Tugas Lembur)';
  }

  // Parse time
  const targetTime = timeString || getCurrentWIBTimeString();
  const [hours, minutes] = targetTime.split(':').map(Number);
  const totalMinutes = (hours || 0) * 60 + (minutes || 0);

  const [minH, minM] = minTime.split(':').map(Number);
  const requiredMinutes = minH * 60 + minM;

  const isAllowed = isWeekend || totalMinutes >= requiredMinutes;

  let warningNotice = '';
  if (!isAllowed) {
    warningNotice = `Jam Pulang untuk hari ${dayName} baru dibuka mulai pukul ${minTime} WIB (Sesuai ketentuan Aplikasi Bravo Bintek SDA).`;
  }

  return {
    isAllowed,
    minTime,
    ruleDescription,
    warningNotice,
  };
}

/**
 * Checks if Jam Masuk falls within the late interval 07:31 s/d 09:00 (marked in Yellow)
 */
export function isJamMasukTerlambatKuning(timeStr?: string): boolean {
  if (!timeStr || timeStr === '-') return false;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return false;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const totalMinutes = hours * 60 + minutes;

  const minMinutes = 7 * 60 + 31; // 07:31 = 451
  const maxMinutes = 9 * 60 + 0;  // 09:00 = 540

  return totalMinutes >= minMinutes && totalMinutes <= maxMinutes;
}

/**
 * Get styling and status for Jam Masuk
 */
export function getJamMasukStatusInfo(timeStr?: string): {
  isKuning: boolean;
  statusLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  cellBg: string;
} {
  if (!timeStr || timeStr === '-') {
    return {
      isKuning: false,
      statusLabel: '-',
      badgeBg: 'bg-slate-50',
      badgeText: 'text-slate-400',
      badgeBorder: 'border-slate-200',
      cellBg: 'bg-transparent',
    };
  }

  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return {
      isKuning: false,
      statusLabel: '-',
      badgeBg: 'bg-slate-50',
      badgeText: 'text-slate-500',
      badgeBorder: 'border-slate-200',
      cellBg: 'bg-transparent',
    };
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const totalMinutes = hours * 60 + minutes;

  const thresholdLate = 7 * 60 + 31; // 07:31
  const thresholdMax = 9 * 60 + 0;  // 09:00

  // Interval 07:31 s/d 09:00
  if (totalMinutes >= thresholdLate && totalMinutes <= thresholdMax) {
    return {
      isKuning: true,
      statusLabel: 'Terlambat (07:31 - 09:00)',
      badgeBg: 'bg-yellow-200',
      badgeText: 'text-yellow-950 font-bold',
      badgeBorder: 'border-yellow-400',
      cellBg: 'bg-yellow-100/90 text-yellow-950',
    };
  }

  // Jika lewat dari 09:00
  if (totalMinutes > thresholdMax) {
    return {
      isKuning: true,
      statusLabel: 'Terlambat (> 09:00)',
      badgeBg: 'bg-yellow-200',
      badgeText: 'text-yellow-950 font-bold',
      badgeBorder: 'border-yellow-400',
      cellBg: 'bg-yellow-100/90 text-yellow-950',
    };
  }

  // Tepat Waktu (<= 07:30)
  return {
    isKuning: false,
    statusLabel: 'Tepat Waktu (<= 07:30)',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800 font-bold',
    badgeBorder: 'border-emerald-200',
    cellBg: 'bg-emerald-50/20 text-emerald-800',
  };
}
