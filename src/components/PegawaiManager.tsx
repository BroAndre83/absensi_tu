import React, { useState, useRef } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Building,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
  Trash2,
  AlertTriangle,
  Download,
  Upload,
  FileDown,
  CheckCircle,
  X,
  FileCheck
} from 'lucide-react';
import { Pegawai } from '../types';
import { exportPegawaiToExcel, downloadTemplateExcel, parseExcelFile } from '../utils/excelUtils';

interface PegawaiManagerProps {
  pegawaiList: Pegawai[];
  isLoading: boolean;
  sheetName: string;
  onAddPegawai: (pegawai: Pegawai) => void;
  onDeletePegawai: (pegawai: Pegawai, index: number) => void;
  onDeleteAllPegawai: () => void;
  onImportPegawai: (importedList: Pegawai[], mode: 'replace' | 'append') => void;
}

export const PegawaiManager: React.FC<PegawaiManagerProps> = ({
  pegawaiList,
  isLoading,
  sheetName,
  onAddPegawai,
  onDeletePegawai,
  onDeleteAllPegawai,
  onImportPegawai,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);

  // New employee form
  const [nama, setNama] = useState<string>('');
  const [nip, setNip] = useState<string>('');
  const [jabatan, setJabatan] = useState<string>('');
  const [unitKerja, setUnitKerja] = useState<string>('');

  // Import Excel Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Pegawai[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('append');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [importError, setImportError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = pegawaiList.filter((p) => {
    const q = searchTerm.toLowerCase();
    return (
      p.nama.toLowerCase().includes(q) ||
      p.nip.toLowerCase().includes(q) ||
      (p.unitKerja && p.unitKerja.toLowerCase().includes(q))
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !nip.trim()) {
      alert('Nama dan NIP wajib diisi.');
      return;
    }

    onAddPegawai({
      nama: nama.trim(),
      nip: nip.trim(),
      jabatan: jabatan.trim() || '-',
      unitKerja: unitKerja.trim() || 'Direktorat Bina Teknik SDA',
    });

    // Reset form
    setNama('');
    setNip('');
    setJabatan('');
    setUnitKerja('');
    setIsAdding(false);
  };

  // Export to Excel
  const handleExport = () => {
    if (pegawaiList.length === 0) {
      alert('Tidak ada data pegawai untuk diekspor.');
      return;
    }
    exportPegawaiToExcel(
      pegawaiList,
      sheetName,
      `Database_Pegawai_Dit_Bintek_SDA_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Handle file selection for import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsParsing(true);
    setImportError('');
    setParsedData([]);

    try {
      const data = await parseExcelFile(file);
      setParsedData(data);
    } catch (err: any) {
      setImportError(err.message || 'Gagal memproses file Excel.');
    } finally {
      setIsParsing(false);
    }
  };

  // Submit imported data
  const handleConfirmImport = () => {
    if (parsedData.length === 0) {
      setImportError('Tidak ada data pegawai yang valid untuk diimpor.');
      return;
    }

    onImportPegawai(parsedData, importMode);
    setIsImportModalOpen(false);
    setImportFile(null);
    setParsedData([]);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#0F2E59]" />
            Database Pegawai (Sheet: {sheetName})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
            <span>Daftar master Nama & NIP pegawai terintegrasi permanen.</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              Permanen (Tetap ada saat refresh & share)
            </span>
          </p>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Tombol Eksport Excel */}
          <button
            onClick={handleExport}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Unduh seluruh data pegawai dalam format Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Eksport Excel</span>
          </button>

          {/* Tombol Import Excel */}
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              setImportError('');
              setParsedData([]);
              setImportFile(null);
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Import data pegawai dari file Excel (.xlsx / .csv)"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Import Excel</span>
          </button>

          {/* Tombol Tambah Pegawai Baru */}
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3.5 py-2 bg-[#0F2E59] hover:bg-[#1B365D] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>{isAdding ? 'Tutup Formulir' : 'Tambah Baru'}</span>
          </button>

          {/* Tombol Hapus ALL Baris */}
          <button
            onClick={onDeleteAllPegawai}
            disabled={pegawaiList.length === 0}
            className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            title="Hapus semua baris pegawai di Google Sheet"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600" />
            <span>Hapus ALL</span>
          </button>
        </div>
      </div>

      {/* Add Employee Collapsible Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-6 bg-blue-50/50 border-b border-blue-100 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0F2E59] uppercase tracking-wide">
            <UserPlus className="w-4 h-4 text-[#F59E0B]" />
            Input Pegawai Baru ke Google Sheet ({sheetName})
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Nama Lengkap & Gelar: <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Ir. Budi Santoso, M.Eng."
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                NIP (18 Digit): <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: 198503142008012003"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Jabatan:
              </label>
              <input
                type="text"
                value={jabatan}
                onChange={(e) => setJabatan(e.target.value)}
                placeholder="Contoh: Penata Tk.I / Teknik Pengairan Muda"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Subdit / Bagian / Unit Kerja:
              </label>
              <input
                type="text"
                value={unitKerja}
                onChange={(e) => setUnitKerja(e.target.value)}
                placeholder="Contoh: Subdit Data & TI SDA / Bagian TU"
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0F2E59] hover:bg-[#1B365D] rounded-xl shadow-xs cursor-pointer"
            >
              Simpan ke Google Sheet
            </button>
          </div>
        </form>
      )}

      {/* Search Bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari pegawai berdasarkan nama, NIP, atau subdit..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Total Terdaftar: <b>{pegawaiList.length}</b> Pegawai
        </div>
      </div>

      {/* Table list */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4 w-14">No</th>
              <th className="py-3 px-4">Nama Pegawai</th>
              <th className="py-3 px-4">NIP</th>
              <th className="py-3 px-4">Jabatan</th>
              <th className="py-3 px-4">Unit Kerja / Subdit</th>
              <th className="py-3 px-4 text-right w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className="w-6 h-6 border-2 border-[#0F2E59] border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-xs">Memuat daftar pegawai dari Google Sheets...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <p className="font-medium">Tidak ada data pegawai yang terdaftar.</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Klik tombol "Import Excel" di atas untuk memasukkan data dari file Excel secara massal.
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const originalIndex = pegawaiList.findIndex((p) => p.nip === item.nip && p.nama === item.nama);
                const targetIdx = originalIndex !== -1 ? originalIndex : idx;

                return (
                  <tr key={item.nip || idx} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-4 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{item.nama}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {item.nip}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{item.jabatan || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-800 font-medium border border-blue-200">
                        {item.unitKerja || 'Dit. Bintek SDA'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => onDeletePegawai(item, targetIdx)}
                        className="px-2.5 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        title={`Hapus baris: ${item.nama}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Hapus</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Import Data Excel */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-[#0F2E59] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/20 text-[#F59E0B]">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Import Data Pegawai dari Excel</h3>
                  <p className="text-xs text-blue-200">
                    Mendukung format file .xlsx, .xls, dan .csv
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Template Download Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <FileDown className="w-4 h-4 text-amber-600" />
                    Belum punya format file yang sesuai?
                  </div>
                  <p className="text-amber-800 text-[11px] mt-0.5">
                    Gunakan template resmi kolom: No | Nama Pegawai | NIP | Jabatan | Unit Kerja
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadTemplateExcel()}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg text-xs shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template
                </button>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                  Pilih File Excel dari Komputer:
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#0F2E59] rounded-2xl p-6 text-center cursor-pointer bg-slate-50 hover:bg-blue-50/30 transition-all"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="p-3 bg-white rounded-full shadow-xs text-blue-700">
                      <Upload className="w-6 h-6" />
                    </div>
                    {importFile ? (
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{importFile.name}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {(importFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          Klik untuk memilih file Excel (.xlsx / .csv)
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Format kolom: Nama Pegawai, NIP, Jabatan, Unit Kerja
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Parsing status / Error */}
              {isParsing && (
                <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                  <span>Membaca dan memvalidasi baris Excel...</span>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Data Preview */}
              {parsedData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span>
                        Pratinjau Data ({parsedData.length} pegawai ditemukan):
                      </span>
                    </div>
                  </div>

                  {/* Mode Selection */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="font-semibold text-slate-700">Metode Impor ke Google Sheet:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="mt-0.5 text-[#0F2E59] focus:ring-[#0F2E59]"
                        />
                        <div>
                          <div className="font-bold text-slate-800">Tambahkan (Append)</div>
                          <div className="text-[11px] text-slate-500">
                            Menambahkan ke bawah daftar yang sudah ada
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer">
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5 text-red-600 focus:ring-red-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800">Gantikan Semua (Replace)</div>
                          <div className="text-[11px] text-slate-500">
                            Mengosongkan dan mengganti seluruh daftar saat ini
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 sticky top-0">
                        <tr>
                          <th className="py-2 px-3">No</th>
                          <th className="py-2 px-3">Nama Pegawai</th>
                          <th className="py-2 px-3">NIP</th>
                          <th className="py-2 px-3">Jabatan</th>
                          <th className="py-2 px-3">Unit Kerja</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-normal">
                        {parsedData.slice(0, 15).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-1.5 px-3 text-slate-400">{idx + 1}</td>
                            <td className="py-1.5 px-3 font-semibold text-slate-800">{p.nama}</td>
                            <td className="py-1.5 px-3 font-mono text-slate-600">{p.nip}</td>
                            <td className="py-1.5 px-3 text-slate-500">{p.jabatan || '-'}</td>
                            <td className="py-1.5 px-3 text-slate-500">{p.unitKerja || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 15 && (
                    <div className="text-[11px] text-slate-400 text-center italic">
                      ... dan {parsedData.length - 15} pegawai lainnya
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={parsedData.length === 0}
                className="px-5 py-2 text-xs font-semibold text-white bg-[#0F2E59] hover:bg-[#1B365D] rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <FileCheck className="w-4 h-4 text-[#F59E0B]" />
                <span>
                  {importMode === 'replace'
                    ? `Gantikan & Simpan (${parsedData.length} Pegawai)`
                    : `Tambahkan (${parsedData.length} Pegawai)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
