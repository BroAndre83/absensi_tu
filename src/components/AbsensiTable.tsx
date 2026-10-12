import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Calendar,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { AbsensiRecord } from '../types';
import { getShortFormattedDate, isJamMasukTerlambatKuning } from '../utils/dateUtils';

interface AbsensiTableProps {
  records: AbsensiRecord[];
  isLoading: boolean;
  onQuickCheckout: (record: AbsensiRecord) => void;
}

export const AbsensiTable: React.FC<AbsensiTableProps> = ({
  records,
  isLoading,
  onQuickCheckout,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');

  const todayStr = getShortFormattedDate();

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Date filter
      if (dateFilter === 'today' && r.tanggal !== todayStr) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'belum_pulang' && (r.jamPulang !== '-' && r.jamPulang !== '')) {
          return false;
        }
        if (statusFilter === 'sudah_pulang' && (r.jamPulang === '-' || !r.jamPulang)) {
          return false;
        }
        if (statusFilter === 'tepat_waktu' && r.status !== 'Hadir Tepat Waktu') {
          return false;
        }
      }

      // Search term
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesNama = r.nama.toLowerCase().includes(query);
        const matchesNip = r.nip.toLowerCase().includes(query);
        return matchesNama || matchesNip;
      }

      return true;
    });
  }, [records, searchTerm, statusFilter, dateFilter, todayStr]);

  // Statistics calculation for today
  const stats = useMemo(() => {
    const todayList = records.filter((r) => r.tanggal === todayStr);
    const sudahPulangCount = todayList.filter((r) => r.jamPulang && r.jamPulang !== '-').length;
    const belumPulangCount = todayList.filter((r) => !r.jamPulang || r.jamPulang === '-').length;

    return {
      totalHariIni: todayList.length,
      sudahPulang: sudahPulangCount,
      belumPulang: belumPulangCount,
    };
  }, [records, todayStr]);

  const handleExportCSV = () => {
    if (records.length === 0) {
      alert('Tidak ada data absensi untuk diekspor.');
      return;
    }

    const headers = ['No', 'Hari', 'Tanggal', 'Nama Pegawai', 'NIP', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan'];
    const rows = filteredRecords.map((r, idx) => [
      idx + 1,
      r.hari,
      r.tanggal,
      `"${r.nama.replace(/"/g, '""')}"`,
      `'${r.nip}`,
      r.jamMasuk,
      r.jamPulang,
      r.status,
      `"${(r.keterangan || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Absensi_Bintek_SDA_${todayStr.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header and Summary stats */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#0F2E59]" />
              Riwayat Presensi Google Sheet
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Data absensi tersinkronisasi real-time dengan tab sheet "Absensi".
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 shadow-xs transition-colors flex items-center gap-2 self-start md:self-auto cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Ekspor Data CSV
          </button>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-50 text-[#0F2E59]">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Hadir Hari Ini</div>
              <div className="text-xl font-bold text-slate-900">{stats.totalHariIni} <span className="text-xs font-normal text-slate-500">Pegawai</span></div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Sudah Jam Pulang</div>
              <div className="text-xl font-bold text-emerald-700">{stats.sudahPulang} <span className="text-xs font-normal text-slate-500">Pegawai</span></div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Belum Absen Pulang</div>
              <div className="text-xl font-bold text-amber-700">{stats.belumPulang} <span className="text-xs font-normal text-slate-500">Pegawai</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama pegawai atau NIP..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Date Range toggle */}
          <div className="flex bg-slate-200/80 p-0.5 rounded-xl text-xs">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                dateFilter === 'today'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Hari Ini ({todayStr})
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                dateFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Riwayat
            </button>
          </div>

          {/* Status dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-700"
          >
            <option value="all">Semua Status</option>
            <option value="belum_pulang">Belum Pulang</option>
            <option value="sudah_pulang">Sudah Pulang</option>
            <option value="tepat_waktu">Hadir Tepat Waktu</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Menampilkan: <b>{filteredRecords.length}</b> data
        </div>
      </div>

      {/* Table Records */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">No</th>
              <th className="py-3 px-4">Hari / Tanggal</th>
              <th className="py-3 px-4">Nama Pegawai</th>
              <th className="py-3 px-4">NIP</th>
              <th className="py-3 px-4 text-emerald-800">Jam Masuk (Bravo)</th>
              <th className="py-3 px-4 text-blue-900">Jam Pulang (Bravo)</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Keterangan</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="w-6 h-6 border-2 border-[#0F2E59] border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-xs">Memuat data dari Google Sheets...</span>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Calendar className="w-8 h-8 text-slate-300" />
                    <p className="font-medium text-slate-600">Belum ada catatan presensi untuk filter ini.</p>
                    <p className="text-[11px] text-slate-400">
                      Gunakan formulir di atas untuk melakukan absensi pegawai.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((item, index) => {
                const needsCheckout = !item.jamPulang || item.jamPulang === '-';

                return (
                  <tr key={item.id || index} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-medium">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{item.hari}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{item.tanggal}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.nama}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {item.nip}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {isJamMasukTerlambatKuning(item.jamMasuk) ? (
                        <div
                          className="font-mono font-bold text-yellow-950 bg-yellow-200 border border-yellow-400 px-2 py-1 rounded inline-flex items-center gap-1.5 shadow-2xs"
                          title="Tanda Kuning: Jam Masuk lewat dari 07:31 s/d 09:00 (Terlambat)"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-600"></span>
                          <span>{item.jamMasuk}</span>
                          <span className="text-[9px] font-semibold bg-yellow-300 text-yellow-900 px-1 py-0.2 rounded">
                            Terlambat
                          </span>
                        </div>
                      ) : (
                        <div className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block">
                          {item.jamMasuk || '-'}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {needsCheckout ? (
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
                          Belum Pulang
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded inline-block">
                          {item.jamPulang}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold inline-block ${
                          item.status === 'Hadir Tepat Waktu'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'Terlambat'
                            ? 'bg-amber-100 text-amber-800'
                            : item.status === 'Dinas Luar'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[150px] truncate">
                      {item.keterangan || '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {needsCheckout && (
                        <button
                          onClick={() => onQuickCheckout(item)}
                          className="px-2.5 py-1 bg-[#0F2E59] hover:bg-[#1B365D] text-white rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Input Jam Pulang untuk pegawai ini"
                        >
                          <LogOut className="w-3 h-3 text-[#F59E0B]" />
                          Absen Pulang
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
