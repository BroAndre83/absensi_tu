import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  Building,
  UploadCloud,
  Eye,
  Info
} from 'lucide-react';
import { Pegawai, AbsensiRecord, LaporanDayColumn } from '../types';
import {
  DAYS_ID,
  MONTHS_ID,
  getWIBDate,
  getShortFormattedDate,
  getIndonesianDayName,
  isJamMasukTerlambatKuning
} from '../utils/dateUtils';

interface LaporanMemanjangProps {
  pegawaiList: Pegawai[];
  records: AbsensiRecord[];
  spreadsheetId?: string;
  sheetName?: string;
  isConnectedToSheet: boolean;
  onSyncMatrixToSheet?: (days: LaporanDayColumn[]) => void;
  onQuickEditCell?: (pegawai: Pegawai, day: LaporanDayColumn, type: 'datang' | 'pulang') => void;
}

export const LaporanMemanjang: React.FC<LaporanMemanjangProps> = ({
  pegawaiList,
  records,
  spreadsheetId,
  sheetName = 'Absensi',
  isConnectedToSheet,
  onSyncMatrixToSheet,
  onQuickEditCell,
}) => {
  // Mode periode: 'minggu' (5 hari kerja), 'bulan' (semua hari kerja bulan ini), 'custom'
  const [periodMode, setPeriodMode] = useState<'minggu' | 'bulan'>('minggu');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [searchEmployee, setSearchEmployee] = useState<string>('');
  const [filterUnit, setFilterUnit] = useState<string>('all');

  // Compute days list based on selected period
  const dayColumns = useMemo<LaporanDayColumn[]>(() => {
    const cols: LaporanDayColumn[] = [];

    if (periodMode === 'minggu') {
      // Current week Monday to Friday (5 Work Days)
      const now = new Date();
      now.setDate(now.getDate() + weekOffset * 7);

      // Find Monday of this week (1 = Monday, 0 = Sunday)
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;

      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);

      for (let i = 0; i < 5; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dayIdx = d.getDay();
        const hari = DAYS_ID[dayIdx];
        const tanggalStr = getShortFormattedDate(d);

        cols.push({
          date: d,
          hari,
          tanggalStr,
          isWeekend: dayIdx === 0 || dayIdx === 6,
        });
      }
    } else {
      // Month mode: Monday to Friday for the entire month
      const totalDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();

      for (let day = 1; day <= totalDays; day++) {
        const d = new Date(selectedYear, selectedMonth, day);
        const dayIdx = d.getDay();
        // Include workdays Monday to Friday
        if (dayIdx >= 1 && dayIdx <= 5) {
          const hari = DAYS_ID[dayIdx];
          const tanggalStr = getShortFormattedDate(d);
          cols.push({
            date: d,
            hari,
            tanggalStr,
            isWeekend: false,
          });
        }
      }
    }

    return cols;
  }, [periodMode, weekOffset, selectedMonth, selectedYear]);

  // Unique units for filtering
  const units = useMemo(() => {
    const set = new Set<string>();
    pegawaiList.forEach((p) => {
      if (p.unitKerja) set.add(p.unitKerja);
    });
    return Array.from(set);
  }, [pegawaiList]);

  // Filtered employees
  const filteredPegawai = useMemo(() => {
    return pegawaiList.filter((p) => {
      if (searchEmployee) {
        const q = searchEmployee.toLowerCase();
        const matchesName = p.nama.toLowerCase().includes(q);
        const matchesNip = p.nip.toLowerCase().includes(q);
        if (!matchesName && !matchesNip) return false;
      }

      if (filterUnit !== 'all' && p.unitKerja !== filterUnit) {
        return false;
      }

      return true;
    });
  }, [pegawaiList, searchEmployee, filterUnit]);

  // Lookup helper for attendance cell
  const getAttendanceFor = (nip: string, nama: string, tanggalStr: string, hariStr: string) => {
    return records.find(
      (r) =>
        (r.nip === nip || r.nama.toLowerCase() === nama.toLowerCase()) &&
        (r.tanggal === tanggalStr || (dayColumns.length === 5 && r.hari.toLowerCase() === hariStr.toLowerCase()))
    );
  };

  // Export matrix to CSV (matching exact layout)
  const handleExportCSV = () => {
    const titleRows = [
      ['DAFTAR HADIR PEGAWAI'],
      ['SUBBAG. TATA USAHA, DIREKTORAT BINA TEKNIK SUMBER DAYA AIR'],
      ['DIREKTORAT JENDERAL SUMBER DAYA AIR'],
      []
    ];

    const row5 = ['NO', 'NAMA', 'NIP/NI'];
    const row6 = ['', '', ''];
    const row7 = ['', '', ''];
    const row8 = ['', '', ''];

    dayColumns.forEach((d) => {
      row5.push(d.hari, '', '', 'K');
      row6.push(d.tanggalStr, '', '', 'E');
      row7.push('Pukul', '', '', 'T');
      row8.push('Datang', 'Istirahat', 'Pulang', '');
    });

    const dataRows = filteredPegawai.map((p, idx) => {
      const row: (string | number)[] = [idx + 1, `"${p.nama.replace(/"/g, '""')}"`, `'${p.nip}`];

      dayColumns.forEach((d) => {
        const att = getAttendanceFor(p.nip, p.nama, d.tanggalStr, d.hari);
        if (att) {
          row.push(
            att.jamMasuk && att.jamMasuk !== '-' ? att.jamMasuk : '',
            att.jamIstirahat || (att.jamMasuk ? '12:00' : ''),
            att.jamPulang && att.jamPulang !== '-' ? att.jamPulang : '',
            att.keterangan || (att.status !== 'Hadir Tepat Waktu' ? att.status : '')
          );
        } else {
          row.push('', '', '', '');
        }
      });

      return row;
    });

    const allRows = [...titleRows, row5, row6, row7, row8, ...dataRows];
    const csvContent = 'data:text/csv;charset=utf-8,' + allRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = `Laporan_Absensi_Memanjang_${periodMode === 'minggu' ? 'Mingguan' : 'Bulanan'}_${Date.now()}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Controls & Toolbar (Hidden on print) */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-100 text-[#0F2E59]">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Laporan Presensi (Model Tabel Memanjang)
                </h3>
                <p className="text-xs text-slate-500">
                  Format tabel matriks horizontal sesuai lampiran presensi Subbag Tata Usaha Dit. Bintek SDA.
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {onSyncMatrixToSheet && (
              <button
                onClick={() => onSyncMatrixToSheet(dayColumns)}
                disabled={!isConnectedToSheet}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                title="Tulis tabel matriks ini langsung ke Google Sheet"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Simpan ke Google Sheet</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Ekspor CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-[#0F2E59] hover:bg-[#1B365D] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#F59E0B]" />
              <span>Cetak Laporan Resmi</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200">
          {/* Mode Switcher */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Mode Periode Laporan:
            </label>
            <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setPeriodMode('minggu')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  periodMode === 'minggu'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mingguan (5 Hari)
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode('bulan')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  periodMode === 'bulan'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bulanan (1 Bulan)
              </button>
            </div>
          </div>

          {/* Navigation Offset */}
          {periodMode === 'minggu' ? (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Pilih Minggu:
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
                  title="Minggu Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 text-center py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                  {weekOffset === 0
                    ? 'Minggu Berjalan'
                    : weekOffset > 0
                    ? `+${weekOffset} Minggu Depan`
                    : `${weekOffset} Minggu Lalu`}
                </div>
                <button
                  type="button"
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors"
                  title="Minggu Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {weekOffset !== 0 && (
                  <button
                    type="button"
                    onClick={() => setWeekOffset(0)}
                    className="px-2 py-1.5 text-[11px] text-[#0F2E59] hover:underline font-semibold"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Bulan & Tahun:
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
                >
                  {MONTHS_ID.map((m, idx) => (
                    <option key={idx} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-24 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
                >
                  {[2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Unit Kerja Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Unit / Subdit:
            </label>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
            >
              <option value="all">Semua Unit Kerja</option>
              {units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Search */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Cari Nama / NIP:
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchEmployee}
                onChange={(e) => setSearchEmployee(e.target.value)}
                placeholder="Cari pegawai..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Printable Table Container */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 print:p-0 print:border-none print:shadow-none overflow-hidden">
        {/* Institutional Official Letterhead (from exact attachment) */}
        <div className="text-center py-4 border-b-2 border-slate-800 space-y-1 mb-6">
          <h2 className="text-base sm:text-xl font-black tracking-wide text-slate-900 uppercase">
            DAFTAR HADIR PEGAWAI
          </h2>
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
            SUBBAG. TATA USAHA, DIREKTORAT BINA TEKNIK SUMBER DAYA AIR
          </h3>
          <h4 className="text-[11px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">
            DIREKTORAT JENDERAL SUMBER DAYA AIR
          </h4>
          <p className="text-[11px] text-slate-500 italic pt-1">
            Periode:{' '}
            {dayColumns.length > 0
              ? `${dayColumns[0].hari}, ${dayColumns[0].tanggalStr} s/d ${dayColumns[dayColumns.length - 1].hari}, ${dayColumns[dayColumns.length - 1].tanggalStr}`
              : '-'}
          </p>

          {/* Legend / Keterangan Tanda Warna Kuning */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider">Keterangan:</span>
            <span className="inline-flex items-center gap-1.5 text-slate-700 text-[11px] bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block"></span>
              <span>Tepat Waktu (≤ 07:30)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-yellow-950 text-[11px] font-bold bg-yellow-100 px-2.5 py-0.5 rounded-lg border border-yellow-300 shadow-2xs">
              <span className="w-3 h-3 rounded bg-yellow-300 border border-yellow-500 inline-block"></span>
              <span>Tanda Warna Kuning: Lewat dari 07:31 s/d 09:00 (Terlambat)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-700 text-[11px] bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block"></span>
              <span>Jam Pulang (Bravo)</span>
            </span>
          </div>
        </div>

        {/* Scrollable Horizontal Matrix Container */}
        <div className="overflow-x-auto relative rounded-xl border border-slate-300">
          <table className="w-full text-center border-collapse text-[11px] font-sans">
            <thead>
              {/* Row 1: NO, NAMA, NIP/NI and Hari names spanning 3 columns + KET */}
              <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                <th
                  rowSpan={4}
                  className="py-2 px-2.5 border-r border-slate-300 min-w-[36px] w-[36px] sticky left-0 bg-slate-100 z-20 shadow-xs"
                >
                  NO
                </th>
                <th
                  rowSpan={4}
                  className="py-2 px-4 border-r border-slate-300 min-w-[200px] text-left sticky left-[36px] bg-slate-100 z-20 shadow-xs"
                >
                  NAMA
                </th>
                <th
                  rowSpan={4}
                  className="py-2 px-3 border-r border-slate-400 min-w-[170px] sticky left-[236px] bg-slate-100 z-20 shadow-xs"
                >
                  NIP/NI
                </th>

                {/* Day Blocks: Hari */}
                {dayColumns.map((col, idx) => (
                  <React.Fragment key={`h-${idx}`}>
                    <th
                      colSpan={3}
                      className="py-1 px-2 border-r border-slate-300 bg-slate-200/90 text-slate-900 font-bold uppercase tracking-wider text-xs"
                    >
                      {col.hari}
                    </th>
                    <th
                      rowSpan={4}
                      className="py-1 px-2 border-r-2 border-slate-400 bg-slate-100 text-slate-800 font-bold min-w-[50px] w-[50px] text-[10px]"
                    >
                      <div className="flex flex-col items-center justify-center leading-tight">
                        <span>K</span>
                        <span>E</span>
                        <span>T</span>
                      </div>
                    </th>
                  </React.Fragment>
                ))}
              </tr>

              {/* Row 2: Tanggal */}
              <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                {dayColumns.map((col, idx) => (
                  <th
                    key={`t-${idx}`}
                    colSpan={3}
                    className="py-1 px-2 border-r border-slate-300 text-slate-800 font-mono text-[11px]"
                  >
                    {col.tanggalStr}
                  </th>
                ))}
              </tr>

              {/* Row 3: Pukul */}
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                {dayColumns.map((col, idx) => (
                  <th
                    key={`p-${idx}`}
                    colSpan={3}
                    className="py-0.5 px-2 border-r border-slate-300 text-[10px] uppercase font-bold text-slate-600"
                  >
                    Pukul
                  </th>
                ))}
              </tr>

              {/* Row 4: Datang, Istirahat, Pulang */}
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b-2 border-slate-400 text-[10px]">
                {dayColumns.map((col, idx) => (
                  <React.Fragment key={`sub-${idx}`}>
                    <th className="py-1 px-2 border-r border-slate-200 min-w-[62px] text-emerald-800 bg-emerald-50/50">
                      Datang
                    </th>
                    <th className="py-1 px-2 border-r border-slate-200 min-w-[58px] text-slate-600">
                      Istirahat
                    </th>
                    <th className="py-1 px-2 border-r border-slate-300 min-w-[62px] text-blue-900 bg-blue-50/50">
                      Pulang
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredPegawai.length === 0 ? (
                <tr>
                  <td
                    colSpan={3 + dayColumns.length * 4}
                    className="py-12 text-center text-slate-500 font-medium"
                  >
                    Tidak ada data pegawai yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filteredPegawai.map((p, pIdx) => {
                  return (
                    <tr
                      key={p.nip || pIdx}
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      {/* Fixed Left Columns: NO, NAMA, NIP/NI */}
                      <td className="py-2 px-2 border-r border-slate-300 text-slate-500 font-medium sticky left-0 bg-white group-hover:bg-amber-50/60 z-10 shadow-xs">
                        {pIdx + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-900 text-left sticky left-[36px] bg-white group-hover:bg-amber-50/60 z-10 shadow-xs whitespace-nowrap">
                        <div>{p.nama}</div>
                        {p.unitKerja && (
                          <div className="text-[9px] text-slate-400 font-normal">
                            {p.unitKerja}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2.5 border-r border-slate-400 font-mono text-slate-700 sticky left-[236px] bg-white group-hover:bg-amber-50/60 z-10 shadow-xs whitespace-nowrap">
                        {p.nip}
                      </td>

                      {/* Repeating Day Columns */}
                      {dayColumns.map((col, dIdx) => {
                        const att = getAttendanceFor(p.nip, p.nama, col.tanggalStr, col.hari);

                        return (
                          <React.Fragment key={`data-${pIdx}-${dIdx}`}>
                            {/* Datang */}
                            {(() => {
                              const isLateYellow = att?.jamMasuk && isJamMasukTerlambatKuning(att.jamMasuk);
                              return (
                                <td
                                  className={`py-2 px-1.5 border-r border-slate-200 font-mono text-[11px] font-semibold transition-colors ${
                                    isLateYellow
                                      ? 'bg-yellow-200 text-yellow-950 font-bold border-yellow-300 print:bg-yellow-200'
                                      : 'text-emerald-800 bg-emerald-50/20'
                                  }`}
                                  title={
                                    isLateYellow
                                      ? `Tanda Kuning: Jam Masuk lewat dari 07:31 s/d 09:00 (${att.jamMasuk})`
                                      : undefined
                                  }
                                >
                                  {att?.jamMasuk && att.jamMasuk !== '-' ? (
                                    isLateYellow ? (
                                      <span className="bg-yellow-300 px-1 py-0.5 rounded text-yellow-950 font-bold shadow-2xs">
                                        {att.jamMasuk}
                                      </span>
                                    ) : (
                                      att.jamMasuk
                                    )
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              );
                            })()}

                            {/* Istirahat */}
                            <td className="py-2 px-1.5 border-r border-slate-200 font-mono text-[11px] text-slate-500">
                              {att?.jamIstirahat ? (
                                att.jamIstirahat
                              ) : att?.jamMasuk && att.jamMasuk !== '-' ? (
                                col.hari.toLowerCase().includes('jum') ? '11:30' : '12:00'
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* Pulang */}
                            <td className="py-2 px-1.5 border-r border-slate-300 font-mono text-[11px] text-blue-900 font-semibold bg-blue-50/20">
                              {att?.jamPulang && att.jamPulang !== '-' ? (
                                att.jamPulang
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            {/* KET */}
                            <td className="py-2 px-1 border-r-2 border-slate-400 text-[10px] text-slate-700">
                              {att?.keterangan ? (
                                <span className="font-semibold text-amber-700" title={att.keterangan}>
                                  {att.keterangan}
                                </span>
                              ) : att?.status && att.status !== 'Hadir Tepat Waktu' ? (
                                <span className="font-semibold text-blue-700">
                                  {att.status === 'Dinas Luar' ? 'DL' : att.status}
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Table Footer Summary dashes (matching row 33-34 in attachment) */}
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-700 text-center">
                <td className="py-2 px-2 border-r border-slate-300 sticky left-0 bg-slate-100 z-10" colSpan={3}>
                  <span className="text-xs uppercase font-bold tracking-wider">Rekapitulasi Kehadiran</span>
                </td>
                {dayColumns.map((col, idx) => {
                  const dayRecords = records.filter(
                    (r) =>
                      r.tanggal === col.tanggalStr ||
                      (dayColumns.length === 5 && r.hari.toLowerCase() === col.hari.toLowerCase())
                  );
                  const countDatang = dayRecords.filter((r) => r.jamMasuk && r.jamMasuk !== '-').length;
                  const countPulang = dayRecords.filter((r) => r.jamPulang && r.jamPulang !== '-').length;

                  return (
                    <React.Fragment key={`tot-${idx}`}>
                      <td className="py-1.5 px-1 border-r border-slate-200 text-emerald-800 font-mono font-bold">
                        {countDatang > 0 ? countDatang : '-'}
                      </td>
                      <td className="py-1.5 px-1 border-r border-slate-200 text-slate-500 font-mono">
                        -
                      </td>
                      <td className="py-1.5 px-1 border-r border-slate-300 text-blue-900 font-mono font-bold">
                        {countPulang > 0 ? countPulang : '-'}
                      </td>
                      <td className="py-1.5 px-1 border-r-2 border-slate-400 text-slate-500 font-mono">
                        -
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Official Signature Section (For Print and Official Documentation) */}
        <div className="mt-8 pt-6 border-t border-slate-300 flex justify-between text-xs text-slate-800 px-6">
          <div className="space-y-16">
            <div>
              <p className="font-medium">Mengetahui,</p>
              <p className="font-bold">Kasubbag Tata Usaha</p>
              <p className="text-slate-500 text-[11px]">Direktorat Bina Teknik Sumber Daya Air</p>
            </div>
            <div>
              <p className="font-bold underline">________________________________</p>
              <p className="text-[11px] text-slate-600">NIP. ...................................................</p>
            </div>
          </div>

          <div className="space-y-16 text-right">
            <div>
              <p className="font-medium">Jakarta, {getShortFormattedDate()}</p>
              <p className="font-bold">Pengelola Presensi Pegawai</p>
              <p className="text-slate-500 text-[11px]">Subbag Tata Usaha</p>
            </div>
            <div>
              <p className="font-bold underline">________________________________</p>
              <p className="text-[11px] text-slate-600">NIP. ...................................................</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
