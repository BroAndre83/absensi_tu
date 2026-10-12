import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Send,
  Sparkles,
  Info,
  Search,
  Lock,
  Unlock,
  Building,
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';
import { Pegawai, AbsensiRecord } from '../types';
import {
  getCurrentWIBTimeString,
  getIndonesianDayName,
  getShortFormattedDate,
  getIndonesianFormattedDate,
  validateJamPulang,
  isJamMasukTerlambatKuning,
  DAYS_ID
} from '../utils/dateUtils';

interface AbsensiFormProps {
  pegawaiList: Pegawai[];
  todayRecords: AbsensiRecord[];
  isSubmitting: boolean;
  onSubmitAbsensi: (record: AbsensiRecord, existingRowIndex?: number) => void;
  onOpenPegawaiModal?: () => void;
}

export const AbsensiForm: React.FC<AbsensiFormProps> = ({
  pegawaiList,
  todayRecords,
  isSubmitting,
  onSubmitAbsensi,
  onOpenPegawaiModal,
}) => {
  // Mode: 'masuk' (Clock-in only), 'pulang' (Clock-out), 'lengkap' (Both)
  const [formMode, setFormMode] = useState<'masuk' | 'pulang' | 'lengkap'>('masuk');

  // Input states
  const [selectedNama, setSelectedNama] = useState<string>('');
  const [nip, setNip] = useState<string>('');
  const [hari, setHari] = useState<string>(getIndonesianDayName());
  const [tanggal, setTanggal] = useState<string>(getShortFormattedDate());
  const [jamMasuk, setJamMasuk] = useState<string>(getCurrentWIBTimeString());
  const [jamPulang, setJamPulang] = useState<string>('');
  const [status, setStatus] = useState<AbsensiRecord['status']>('Hadir Tepat Waktu');
  const [keterangan, setKeterangan] = useState<string>('');
  const [allowEarlyCheckoutOverride, setAllowEarlyCheckoutOverride] = useState<boolean>(false);

  // Search filter for dropdown
  const [nameSearch, setNameSearch] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Update initial time and date
  useEffect(() => {
    setHari(getIndonesianDayName());
    setTanggal(getShortFormattedDate());
  }, []);

  // Filtered employees for dropdown
  const filteredPegawai = useMemo(() => {
    if (!nameSearch) return pegawaiList;
    const query = nameSearch.toLowerCase();
    return pegawaiList.filter(
      (p) => p.nama.toLowerCase().includes(query) || p.nip.toLowerCase().includes(query)
    );
  }, [pegawaiList, nameSearch]);

  // When an employee is chosen, automatically fill NIP
  const handleSelectPegawai = (p: Pegawai) => {
    setSelectedNama(p.nama);
    setNip(p.nip);
    setNameSearch(p.nama);
    setIsDropdownOpen(false);

    // Check if this employee already logged in today
    const existing = todayRecords.find(
      (r) => r.nip === p.nip || r.nama.toLowerCase() === p.nama.toLowerCase()
    );
    if (existing) {
      if (existing.jamMasuk && existing.jamPulang === '-') {
        // If they already clocked in but haven't clocked out, suggest Clock-out mode!
        setFormMode('pulang');
        setJamMasuk(existing.jamMasuk);
      }
    }
  };

  // If user types manual Nama, attempt auto-match with NIP
  const handleNamaInputChange = (value: string) => {
    setSelectedNama(value);
    setNameSearch(value);
    setIsDropdownOpen(true);

    const matched = pegawaiList.find(
      (p) => p.nama.toLowerCase() === value.trim().toLowerCase()
    );
    if (matched) {
      setNip(matched.nip);
    }
  };

  // If user types manual NIP, attempt auto-match with Nama
  const handleNipInputChange = (value: string) => {
    setNip(value);
    const matched = pegawaiList.find((p) => p.nip.replace(/\s+/g, '') === value.replace(/\s+/g, ''));
    if (matched) {
      setSelectedNama(matched.nama);
      setNameSearch(matched.nama);
    }
  };

  // Validate Jam Pulang conditions based on day and Bravo rules
  const pulangRule = validateJamPulang(hari, jamPulang || getCurrentWIBTimeString());

  // Check if existing record exists for this employee today
  const existingRecordToday = useMemo(() => {
    if (!selectedNama && !nip) return null;
    return todayRecords.find(
      (r) => (nip && r.nip === nip) || (selectedNama && r.nama.toLowerCase() === selectedNama.toLowerCase())
    );
  }, [selectedNama, nip, todayRecords]);

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedNama.trim()) {
      alert('Nama Pegawai wajib diisi atau dipilih dari database.');
      return;
    }
    if (!nip.trim()) {
      alert('NIP Pegawai wajib diisi.');
      return;
    }

    if ((formMode === 'masuk' || formMode === 'lengkap') && !jamMasuk) {
      alert('Jam Masuk wajib diisi.');
      return;
    }

    if ((formMode === 'pulang' || formMode === 'lengkap')) {
      if (!jamPulang) {
        alert('Jam Pulang wajib diisi.');
        return;
      }

      // Check Bravo rule
      if (!pulangRule.isAllowed && !allowEarlyCheckoutOverride) {
        alert(
          `Peringatan Bravo: ${pulangRule.warningNotice}\n\nJika ini adalah izin khusus kedinasan, centang opsi izin dispensasi khusus di bawah form.`
        );
        return;
      }
    }

    let finalJamMasuk = jamMasuk;
    let finalJamPulang = formMode === 'masuk' ? '-' : jamPulang;

    if (formMode === 'pulang' && existingRecordToday) {
      finalJamMasuk = existingRecordToday.jamMasuk || jamMasuk || '-';
    }

    const record: AbsensiRecord = {
      hari,
      tanggal,
      nama: selectedNama.trim(),
      nip: nip.trim(),
      jamMasuk: finalJamMasuk,
      jamPulang: finalJamPulang,
      status,
      keterangan: keterangan.trim(),
    };

    // If updating an existing row in Clock-out mode
    const rowIndexToUpdate =
      formMode === 'pulang' && existingRecordToday?.rowIndex
        ? existingRecordToday.rowIndex
        : undefined;

    onSubmitAbsensi(record, rowIndexToUpdate);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-[#0F2E59] to-[#1E3A8A] px-6 py-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#F59E0B]" />
            Formulir Presensi Pegawai Bintek SDA
          </h2>
          <p className="text-xs text-blue-200 mt-0.5">
            Sistem otomatis terhubung dengan database Nama_NIP dan sinkronisasi presensi Bravo.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-[#0A2040]/80 p-1 rounded-xl border border-blue-400/20 text-xs">
          <button
            type="button"
            onClick={() => {
              setFormMode('masuk');
              setJamMasuk(getCurrentWIBTimeString());
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              formMode === 'masuk'
                ? 'bg-[#F59E0B] text-slate-900 font-bold shadow-xs'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            Absen Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setFormMode('pulang');
              setJamPulang(getCurrentWIBTimeString());
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              formMode === 'pulang'
                ? 'bg-[#F59E0B] text-slate-900 font-bold shadow-xs'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            Absen Pulang
          </button>
          <button
            type="button"
            onClick={() => {
              setFormMode('lengkap');
              setJamMasuk(jamMasuk || '07:30');
              setJamPulang(jamPulang || getCurrentWIBTimeString());
            }}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              formMode === 'lengkap'
                ? 'bg-[#F59E0B] text-slate-900 font-bold shadow-xs'
                : 'text-slate-200 hover:text-white'
            }`}
          >
            Masuk & Pulang
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Existing Record Banner notification if already present */}
        {existingRecordToday && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Pegawai ini sudah memiliki catatan absensi hari ini (Masuk: <b>{existingRecordToday.jamMasuk}</b>, Pulang: <b>{existingRecordToday.jamPulang}</b>).
              </span>
            </div>
            {formMode !== 'pulang' && (
              <button
                type="button"
                onClick={() => {
                  setFormMode('pulang');
                  setJamPulang(getCurrentWIBTimeString());
                }}
                className="px-2.5 py-1 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
              >
                Ganti ke Absen Pulang
              </button>
            )}
          </div>
        )}

        {/* Section 1: Hari & Tanggal (Auto Populated from Google Sheet mode) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#0F2E59]" />
            Waktu & Tanggal Presensi (Otomatis Sesuai Database Google Sheet)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Hari:</label>
              <div className="relative">
                <select
                  value={hari}
                  onChange={(e) => setHari(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900 font-medium"
                >
                  {DAYS_ID.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <span className="absolute right-3 top-3 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                  Auto
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal:</label>
              <div className="relative">
                <input
                  type="text"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900 font-medium font-mono"
                />
                <span className="absolute right-3 top-3 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                  {getIndonesianFormattedDate()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Nama Pegawai & NIP (From Google Sheet Nama_NIP Database) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Nama Pegawai Input / Autocomplete */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-[#0F2E59]" />
                Nama Pegawai:
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Database: <b>{pegawaiList.length}</b> Pegawai
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={selectedNama}
                onChange={(e) => handleNamaInputChange(e.target.value)}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder="Ketik atau pilih nama pegawai..."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900 placeholder:text-slate-400 font-medium"
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Dropdown Auto-suggest from Sheet */}
            {isDropdownOpen && filteredPegawai.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                {filteredPegawai.map((p, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectPegawai(p)}
                    className="p-2.5 hover:bg-blue-50 cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{p.nama}</div>
                      <div className="text-slate-500 font-mono text-[11px]">NIP: {p.nip}</div>
                    </div>
                    {p.unitKerja && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {p.unitKerja}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] text-slate-500 mt-1">
              Jika sudah diisi manual, maka NIP otomatis terisi dari Database Google Sheet Nama_NIP.
            </p>
          </div>

          {/* NIP Input (Auto Filled) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#0F2E59]" />
                NIP (Nomor Induk Pegawai):
                <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Auto-sync
              </span>
            </div>

            <input
              type="text"
              value={nip}
              onChange={(e) => handleNipInputChange(e.target.value)}
              placeholder="Contoh: 198503142008012003"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] focus:bg-white text-slate-900 font-mono font-medium tracking-wider"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              NIP terisi otomatis berdasarkan kecocokan nama pegawai.
            </p>
          </div>
        </div>

        {/* Section 3: Jam Masuk & Jam Pulang with Bravo Messages & Timing Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* Jam Masuk */}
          {(formMode === 'masuk' || formMode === 'lengkap') && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  Jam Masuk:
                  <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setJamMasuk(getCurrentWIBTimeString())}
                  className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer"
                >
                  Ambil Waktu Sekarang (WIB)
                </button>
              </div>

              <input
                type="time"
                value={jamMasuk}
                onChange={(e) => {
                  const val = e.target.value;
                  setJamMasuk(val);
                  if (isJamMasukTerlambatKuning(val)) {
                    setStatus('Terlambat');
                  }
                }}
                className={`w-full px-3.5 py-2.5 text-base border rounded-xl focus:outline-none font-mono font-bold transition-colors ${
                  isJamMasukTerlambatKuning(jamMasuk)
                    ? 'bg-yellow-100 border-yellow-400 text-yellow-950 focus:ring-yellow-500'
                    : 'bg-white border-slate-300 text-slate-900 focus:ring-emerald-500'
                }`}
              />

              {/* Tanda Warna Kuning jika Jam Masuk lewat dari 07:31 s/d 09:00 */}
              {isJamMasukTerlambatKuning(jamMasuk) && (
                <div className="p-2.5 bg-yellow-100 border border-yellow-300 rounded-xl text-yellow-950 text-xs flex items-start gap-2 shadow-xs animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-yellow-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Tanda Warna Kuning (Terlambat):</span> Jam Masuk <b>{jamMasuk}</b> berada di antara pukul 07:31 s/d 09:00. Status otomatis diset sebagai <b>Terlambat</b>.
                  </div>
                </div>
              )}

              {/* Requirement message for Jam Masuk */}
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Pesan Ketentuan:</span> Jam Masuk Harus sesuai Aplikasi Bravo.
                </div>
              </div>
            </div>
          )}

          {/* Jam Pulang */}
          {(formMode === 'pulang' || formMode === 'lengkap') && (
            <div
              className={`border rounded-2xl p-4 space-y-3 ${
                pulangRule.isAllowed
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-amber-50/60 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#0F2E59]" />
                  Jam Pulang:
                  <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setJamPulang(getCurrentWIBTimeString())}
                  className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer"
                >
                  Ambil Waktu Sekarang (WIB)
                </button>
              </div>

              <input
                type="time"
                value={jamPulang}
                onChange={(e) => setJamPulang(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900 font-mono font-bold"
              />

              {/* Mandatory Requirement message for Jam Pulang */}
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-950 text-xs space-y-1">
                <div className="flex items-start gap-2 font-medium">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Pesan Ketentuan:</span> Jam Pulang Harus Sesuai Aplikasi Bravo.
                  </div>
                </div>
                <div className="text-[11px] text-blue-800 pl-6 space-y-0.5">
                  <div>• <b>Senin - Kamis:</b> Dimulai dari jam <b>16:00 WIB</b></div>
                  <div>• <b>Jum'at:</b> Dimulai dari jam <b>16:30 WIB</b></div>
                </div>
              </div>

              {/* Warning alert if attempting early checkout before threshold */}
              {!pulangRule.isAllowed && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs space-y-2">
                  <div className="flex items-start gap-2 font-medium">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Peringatan Jam Pulang:</span> {pulangRule.warningNotice}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-red-200/60">
                    <input
                      type="checkbox"
                      id="overrideCheck"
                      checked={allowEarlyCheckoutOverride}
                      onChange={(e) => setAllowEarlyCheckoutOverride(e.target.checked)}
                      className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                    />
                    <label htmlFor="overrideCheck" className="text-[11px] text-red-700 cursor-pointer font-medium">
                      Dispensasi Khusus / Izin Pulang Awal Resmi dengan Catatan
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 4: Status Kehadiran & Keterangan Tambahan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Status Presensi:
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
            >
              <option value="Hadir Tepat Waktu">Hadir Tepat Waktu</option>
              <option value="Terlambat">Terlambat</option>
              <option value="Dinas Luar">Dinas Luar (DL)</option>
              <option value="Izin">Izin Resmi</option>
              <option value="Belum Pulang">Belum Pulang</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Keterangan / Catatan Tambahan (Opsional):
            </label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Contoh: Rapat Teknis di Balai SDA / WFH Terjadwal"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Format database otomatis sesuai standar presensi Dit. Bina Teknik SDA.</span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 py-3 bg-[#0F2E59] hover:bg-[#1B365D] text-white font-semibold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <Send className="w-4 h-4 text-[#F59E0B]" />
            )}
            <span>
              {formMode === 'masuk'
                ? 'Simpan Absen Masuk'
                : formMode === 'pulang'
                ? 'Simpan Absen Pulang'
                : 'Simpan Data Absensi Lengkap'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
