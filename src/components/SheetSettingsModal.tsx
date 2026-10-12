import React, { useState } from 'react';
import {
  FileSpreadsheet,
  PlusCircle,
  CheckCircle,
  AlertTriangle,
  X,
  ExternalLink,
  HelpCircle,
  Database,
  Sparkles
} from 'lucide-react';
import { SheetConfig } from '../types';
import { extractSpreadsheetId, getSpreadsheetMetadata, createNewAttendanceSpreadsheet } from '../services/sheetsService';

interface SheetSettingsModalProps {
  isOpen: boolean;
  currentConfig: SheetConfig | null;
  accessToken: string | null;
  onSaveConfig: (config: SheetConfig) => void;
  onClose: () => void;
}

export const SheetSettingsModal: React.FC<SheetSettingsModalProps> = ({
  isOpen,
  currentConfig,
  accessToken,
  onSaveConfig,
  onClose,
}) => {
  const [inputUrlOrId, setInputUrlOrId] = useState<string>(
    currentConfig?.spreadsheetId || '17OogG_pVtMvs2_rCDhsf9iUXPS37aeKNvXcQ0fp2-s0'
  );
  const [pegawaiSheet, setPegawaiSheet] = useState<string>(
    currentConfig?.pegawaiSheetName || 'Data_Pegawai'
  );
  const [absensiSheet, setAbsensiSheet] = useState<string>(
    currentConfig?.absensiSheetName || 'Absensi'
  );
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState<string>(
    currentConfig?.spreadsheetTitle || 'ABsensi tu'
  );

  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleApplyPreset = () => {
    setInputUrlOrId('17OogG_pVtMvs2_rCDhsf9iUXPS37aeKNvXcQ0fp2-s0');
    setPegawaiSheet('Data_Pegawai');
    setAbsensiSheet('Absensi');
    setSpreadsheetTitle('ABsensi tu (Subbag TU Bintek SDA)');
    setSuccessMsg('ID Spreadsheet dari lampiran berhasil dimuat!');
  };

  const handleTestConnection = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    const id = extractSpreadsheetId(inputUrlOrId);

    if (!id) {
      setErrorMsg('Harap masukkan URL atau ID Spreadsheet Google Sheets.');
      return;
    }

    if (!accessToken) {
      setErrorMsg('Silakan login dengan akun Google terlebih dahulu untuk menghubungkan Spreadsheet.');
      return;
    }

    setIsChecking(true);
    try {
      const meta = await getSpreadsheetMetadata(id, accessToken);
      setAvailableSheets(meta.sheets);
      setSpreadsheetTitle(meta.title);

      // Auto-pick sheet names if they match Data_Pegawai or Nama_NIP
      if (meta.sheets.includes('Data_Pegawai')) {
        setPegawaiSheet('Data_Pegawai');
      } else if (meta.sheets.includes('Nama_NIP')) {
        setPegawaiSheet('Nama_NIP');
      }

      if (meta.sheets.includes('Absensi')) {
        setAbsensiSheet('Absensi');
      }

      setSuccessMsg(`Berhasil terhubung ke spreadsheet: "${meta.title}" (${meta.sheets.length} sheets ditemukan)`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menghubungi Google Sheets. Pastikan ID benar dan akun memiliki akses.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      setErrorMsg('Silakan login dengan akun Google terlebih dahulu untuk membuat Spreadsheet baru.');
      return;
    }

    setIsCreating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await createNewAttendanceSpreadsheet(
        'Database Absensi Pegawai Dit. Bintek SDA',
        accessToken
      );
      setInputUrlOrId(result.spreadsheetId);
      setPegawaiSheet('Nama_NIP');
      setAbsensiSheet('Absensi');
      setSpreadsheetTitle('Database Absensi Pegawai Dit. Bintek SDA');
      setAvailableSheets(['Absensi', 'Nama_NIP']);

      setSuccessMsg('Spreadsheet baru berhasil dibuat dan disiapkan di Google Drive Anda!');

      // Automatically save config
      onSaveConfig({
        spreadsheetId: result.spreadsheetId,
        pegawaiSheetName: 'Nama_NIP',
        absensiSheetName: 'Absensi',
        spreadsheetTitle: 'Database Absensi Pegawai Dit. Bintek SDA',
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membuat Google Sheet baru.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSave = () => {
    const id = extractSpreadsheetId(inputUrlOrId);
    if (!id) {
      setErrorMsg('ID Spreadsheet wajib diisi.');
      return;
    }

    onSaveConfig({
      spreadsheetId: id,
      pegawaiSheetName: pegawaiSheet.trim() || 'Nama_NIP',
      absensiSheetName: absensiSheet.trim() || 'Absensi',
      spreadsheetTitle: spreadsheetTitle || 'Google Spreadsheet Terhubung',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F2E59] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/20 text-[#F59E0B]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Integrasi Google Sheets</h3>
              <p className="text-xs text-blue-200">
                Hubungkan database pegawai (Nama_NIP) dan riwayat kehadiran (Absensi)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Create Option */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-600" />
                Belum punya Google Sheet untuk Absensi?
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Buat otomatis Google Sheet terstruktur dengan tab <b>Nama_NIP</b> & <b>Absensi</b> siap pakai.
              </p>
            </div>
            <button
              onClick={handleCreateNewSheet}
              disabled={isCreating || !accessToken}
              className="px-4 py-2 bg-[#0F2E59] hover:bg-[#1B365D] text-white text-xs font-medium rounded-xl shadow-xs transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              {isCreating ? 'Membuat Sheet...' : 'Buat Sheet Otomatis'}
            </button>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Link atau ID Google Spreadsheet:
                </label>
                <button
                  type="button"
                  onClick={handleApplyPreset}
                  className="text-[11px] text-[#0F2E59] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-[#F59E0B]" />
                  Gunakan Spreadsheet dari Lampiran
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputUrlOrId}
                  onChange={(e) => setInputUrlOrId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit atau ID"
                  className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] focus:bg-white text-slate-900"
                />
                <button
                  onClick={handleTestConnection}
                  disabled={isChecking || !inputUrlOrId}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isChecking ? 'Memeriksa...' : 'Cek Sheet'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Cukup tempelkan URL dari browser Google Sheets Anda.
              </p>
            </div>

            {/* Sheets Tabs Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Tab Database Pegawai (Nama_NIP):
                </label>
                {availableSheets.length > 0 ? (
                  <select
                    value={pegawaiSheet}
                    onChange={(e) => setPegawaiSheet(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
                  >
                    {availableSheets.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={pegawaiSheet}
                    onChange={(e) => setPegawaiSheet(e.target.value)}
                    placeholder="Nama_NIP"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
                  />
                )}
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Sheet sumber daftar nama pegawai & NIP.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nama Tab Riwayat Presensi (Absensi):
                </label>
                {availableSheets.length > 0 ? (
                  <select
                    value={absensiSheet}
                    onChange={(e) => setAbsensiSheet(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
                  >
                    {availableSheets.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={absensiSheet}
                    onChange={(e) => setAbsensiSheet(e.target.value)}
                    placeholder="Absensi"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F2E59] text-slate-900"
                  />
                )}
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Sheet tujuan pencatatan jam masuk & pulang.
                </span>
              </div>
            </div>

            {/* Status Feedback */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Schema Guide info box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="font-semibold text-slate-800">Format Kolom pada Google Sheet:</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="font-medium text-[#0F2E59]">1. Sheet "Nama_NIP":</div>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                    No | Nama Pegawai | NIP | Jabatan | Unit Kerja
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="font-medium text-[#0F2E59]">2. Sheet "Absensi":</div>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                    No | Hari | Tanggal | Nama Pegawai | NIP | Jam Masuk | Jam Pulang | Status | Keterangan
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {inputUrlOrId ? (
            <a
              href={`https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(inputUrlOrId)}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#0F2E59] hover:underline flex items-center gap-1 font-medium"
            >
              Buka Google Sheet <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <div></div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0F2E59] hover:bg-[#1B365D] rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Simpan Pengaturan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
