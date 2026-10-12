/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  UserCheck,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Layers,
  ChevronRight,
  Database,
  TableProperties
} from 'lucide-react';
import { Header } from './components/Header';
import { AbsensiForm } from './components/AbsensiForm';
import { AbsensiTable } from './components/AbsensiTable';
import { PegawaiManager } from './components/PegawaiManager';
import { LaporanMemanjang } from './components/LaporanMemanjang';
import { SheetSettingsModal } from './components/SheetSettingsModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { Pegawai, AbsensiRecord, SheetConfig, LaporanDayColumn } from './types';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  setCachedAccessToken
} from './services/firebase';
import {
  DEFAULT_PEGAWAI_LIST,
  fetchPegawaiFromSheet,
  fetchAbsensiFromSheet,
  appendAbsensiRecord,
  updateAbsensiRecord,
  appendPegawaiToSheet,
  writeMatrixLaporanToSheet,
  deletePegawaiRowFromSheet,
  clearAllPegawaiFromSheet,
  bulkWritePegawaiToSheet
} from './services/sheetsService';
import { getIndonesianDayName, getShortFormattedDate, getCurrentWIBTimeString } from './utils/dateUtils';

const STORAGE_KEY_CONFIG = 'bintek_sda_sheet_config';

export default function App() {
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // Active navigation tab: 'form' | 'table' | 'laporan' | 'pegawai'
  const [activeTab, setActiveTab] = useState<'form' | 'table' | 'laporan' | 'pegawai'>('form');

  // Sheet configuration state with preset from user's attached spreadsheet
  const [sheetConfig, setSheetConfig] = useState<SheetConfig | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) return JSON.parse(saved);
      return {
        spreadsheetId: '17OogG_pVtMvs2_rCDhsf9iUXPS37aeKNvXcQ0fp2-s0',
        pegawaiSheetName: 'Data_Pegawai',
        absensiSheetName: 'Absensi',
        spreadsheetTitle: 'ABsensi tu (Subbag TU Bintek SDA)',
      };
    } catch {
      return null;
    }
  });

  // Data states
  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>(DEFAULT_PEGAWAI_LIST);
  const [absensiList, setAbsensiList] = useState<AbsensiRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [pendingRecord, setPendingRecord] = useState<{ record: AbsensiRecord; rowIndex?: number } | null>(null);
  const [isSubmittingToSheet, setIsSubmittingToSheet] = useState<boolean>(false);

  // Modal for adding employee
  const [pendingPegawai, setPendingPegawai] = useState<Pegawai | null>(null);
  const [isConfirmPegawaiModalOpen, setIsConfirmPegawaiModalOpen] = useState<boolean>(false);

  // Modals for deleting employee rows
  const [pegawaiToDelete, setPegawaiToDelete] = useState<{ pegawai: Pegawai; index: number } | null>(null);
  const [isConfirmDeleteRowModalOpen, setIsConfirmDeleteRowModalOpen] = useState<boolean>(false);
  const [isConfirmDeleteAllModalOpen, setIsConfirmDeleteAllModalOpen] = useState<boolean>(false);
  const [isDeletingPegawai, setIsDeletingPegawai] = useState<boolean>(false);

  // Modal for syncing matrix report to sheet
  const [isConfirmMatrixModalOpen, setIsConfirmMatrixModalOpen] = useState<boolean>(false);
  const [pendingMatrixDays, setPendingMatrixDays] = useState<LaporanDayColumn[]>([]);
  const [isSyncingMatrix, setIsSyncingMatrix] = useState<boolean>(false);

  // Modal for bulk importing employees from Excel
  const [isConfirmImportModalOpen, setIsConfirmImportModalOpen] = useState<boolean>(false);
  const [pendingImportList, setPendingImportList] = useState<Pegawai[]>([]);
  const [pendingImportMode, setPendingImportMode] = useState<'replace' | 'append'>('append');
  const [isImporting, setIsImporting] = useState<boolean>(false);

  // Show Toast helper
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // 1. Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) {
          setAccessToken(token);
        }
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken(null);
        setIsAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Fetch data from Google Sheet when config and token are available
  const loadSheetData = useCallback(async (token: string, config: SheetConfig) => {
    if (!token || !config.spreadsheetId) return;

    setIsLoadingData(true);
    setDataError('');

    try {
      // 1. Fetch Pegawai List
      const fetchedPegawai = await fetchPegawaiFromSheet(
        config.spreadsheetId,
        config.pegawaiSheetName || 'Nama_NIP',
        token
      );
      if (fetchedPegawai && fetchedPegawai.length > 0) {
        setPegawaiList(fetchedPegawai);
      }

      // 2. Fetch Absensi List
      const fetchedAbsensi = await fetchAbsensiFromSheet(
        config.spreadsheetId,
        config.absensiSheetName || 'Absensi',
        token
      );
      setAbsensiList(fetchedAbsensi || []);
    } catch (err: any) {
      console.warn('Error fetching data from Google Sheet:', err);
      setDataError(err.message || 'Gagal memuat data dari Google Sheets.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  // Load data whenever token or sheetConfig changes
  useEffect(() => {
    if (accessToken && sheetConfig) {
      loadSheetData(accessToken, sheetConfig);
    }
  }, [accessToken, sheetConfig, loadSheetData]);

  // Handle Google Sign In
  const handleSignIn = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        showToast(`Selamat datang, ${res.user.displayName || 'Pengguna'}! Akun Google terhubung.`, 'success');
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      showToast('Gagal masuk dengan Google: ' + (err.message || 'Izin dibatalkan'), 'error');
    }
  };

  // Handle Sign Out
  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken(null);
      showToast('Anda telah keluar dari akun Google.', 'info');
    } catch (err: any) {
      console.error('Sign out failed:', err);
    }
  };

  // Save new Sheet Config
  const handleSaveConfig = (newConfig: SheetConfig) => {
    setSheetConfig(newConfig);
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    showToast(`Pengaturan Google Sheet berhasil disimpan: ${newConfig.spreadsheetTitle || newConfig.spreadsheetId}`, 'success');

    if (accessToken) {
      loadSheetData(accessToken, newConfig);
    }
  };

  // Handle form submission request -> triggers Confirmation Dialog first (Workspace Rule)
  const handleRequestSubmitAbsensi = (record: AbsensiRecord, existingRowIndex?: number) => {
    setPendingRecord({ record, rowIndex: existingRowIndex });
    setIsConfirmModalOpen(true);
  };

  // Execute attendance write to Google Sheet after user confirms in dialog
  const handleConfirmSaveAbsensi = async () => {
    if (!pendingRecord) return;
    const { record, rowIndex } = pendingRecord;

    setIsSubmittingToSheet(true);

    try {
      if (accessToken && sheetConfig?.spreadsheetId) {
        if (rowIndex) {
          // Update existing row (e.g. Absen Pulang)
          await updateAbsensiRecord(
            sheetConfig.spreadsheetId,
            sheetConfig.absensiSheetName || 'Absensi',
            rowIndex,
            record,
            accessToken
          );
          showToast(`Berhasil memperbarui Jam Pulang untuk ${record.nama} di Google Sheet!`, 'success');
        } else {
          // Append new record
          const nextNo = absensiList.length + 1;
          await appendAbsensiRecord(
            sheetConfig.spreadsheetId,
            sheetConfig.absensiSheetName || 'Absensi',
            record,
            nextNo,
            accessToken
          );
          showToast(`Absensi untuk ${record.nama} berhasil dicatat di Google Sheet!`, 'success');
        }

        // Refresh attendance table
        await loadSheetData(accessToken, sheetConfig);
      } else {
        // Fallback local update if Google Sheet is not yet connected
        if (rowIndex) {
          setAbsensiList((prev) =>
            prev.map((item) => (item.rowIndex === rowIndex ? { ...record, rowIndex } : item))
          );
        } else {
          setAbsensiList((prev) => [
            { ...record, id: `local-${Date.now()}`, rowIndex: prev.length + 2 },
            ...prev
          ]);
        }
        showToast(
          `Data tersimpan di memori lokal. Hubungkan Google Sheet untuk menyimpan permanen ke tab Absensi.`,
          'info'
        );
      }

      setIsConfirmModalOpen(false);
      setPendingRecord(null);
      setActiveTab('table'); // Switch to table view to see updated record
    } catch (err: any) {
      showToast(`Gagal menyimpan ke Google Sheet: ${err.message}`, 'error');
    } finally {
      setIsSubmittingToSheet(false);
    }
  };

  // Handle adding new employee -> triggers confirmation dialog
  const handleRequestAddPegawai = (newPegawai: Pegawai) => {
    setPendingPegawai(newPegawai);
    setIsConfirmPegawaiModalOpen(true);
  };

  const handleConfirmAddPegawai = async () => {
    if (!pendingPegawai) return;

    try {
      if (accessToken && sheetConfig?.spreadsheetId) {
        await appendPegawaiToSheet(
          sheetConfig.spreadsheetId,
          sheetConfig.pegawaiSheetName || 'Nama_NIP',
          pendingPegawai,
          accessToken
        );
        showToast(`Pegawai ${pendingPegawai.nama} berhasil ditambahkan ke Google Sheet (${sheetConfig.pegawaiSheetName})!`, 'success');
        await loadSheetData(accessToken, sheetConfig);
      } else {
        setPegawaiList((prev) => [...prev, pendingPegawai]);
        showToast(`Pegawai ditambahkan ke daftar lokal.`, 'info');
      }

      setIsConfirmPegawaiModalOpen(false);
      setPendingPegawai(null);
    } catch (err: any) {
      showToast(`Gagal menambahkan pegawai: ${err.message}`, 'error');
    }
  };

  // Handle request delete a single employee row -> triggers Confirmation Dialog
  const handleRequestDeletePegawai = (pegawai: Pegawai, index: number) => {
    setPegawaiToDelete({ pegawai, index });
    setIsConfirmDeleteRowModalOpen(true);
  };

  // Execute single employee row deletion
  const handleConfirmDeletePegawai = async () => {
    if (!pegawaiToDelete) return;
    const { pegawai, index } = pegawaiToDelete;

    setIsDeletingPegawai(true);
    const updatedList = pegawaiList.filter((_, i) => i !== index);

    try {
      if (accessToken && sheetConfig?.spreadsheetId) {
        await deletePegawaiRowFromSheet(
          sheetConfig.spreadsheetId,
          sheetConfig.pegawaiSheetName || 'Data_Pegawai',
          updatedList,
          accessToken
        );
        setPegawaiList(updatedList);
        showToast(
          `Baris pegawai "${pegawai.nama}" berhasil dihapus dari Google Sheet (${sheetConfig.pegawaiSheetName || 'Data_Pegawai'})!`,
          'success'
        );
      } else {
        setPegawaiList(updatedList);
        showToast(`Baris pegawai "${pegawai.nama}" dihapus dari daftar lokal.`, 'info');
      }

      setIsConfirmDeleteRowModalOpen(false);
      setPegawaiToDelete(null);
    } catch (err: any) {
      showToast(`Gagal menghapus baris pegawai: ${err.message}`, 'error');
    } finally {
      setIsDeletingPegawai(false);
    }
  };

  // Handle request delete ALL employee rows -> triggers Confirmation Dialog
  const handleRequestDeleteAllPegawai = () => {
    setIsConfirmDeleteAllModalOpen(true);
  };

  // Execute ALL employee rows deletion
  const handleConfirmDeleteAllPegawai = async () => {
    setIsDeletingPegawai(true);
    const count = pegawaiList.length;

    try {
      if (accessToken && sheetConfig?.spreadsheetId) {
        await clearAllPegawaiFromSheet(
          sheetConfig.spreadsheetId,
          sheetConfig.pegawaiSheetName || 'Data_Pegawai',
          accessToken
        );
        setPegawaiList([]);
        showToast(`Seluruh baris pegawai (${count} orang) berhasil dihapus dari Google Sheet!`, 'success');
      } else {
        setPegawaiList([]);
        showToast(`Seluruh baris pegawai (${count} orang) dihapus dari daftar lokal.`, 'info');
      }

      setIsConfirmDeleteAllModalOpen(false);
    } catch (err: any) {
      showToast(`Gagal menghapus seluruh baris pegawai: ${err.message}`, 'error');
    } finally {
      setIsDeletingPegawai(false);
    }
  };

  // Handle request bulk import employees from Excel -> triggers Confirmation Dialog
  const handleRequestImportPegawai = (importedList: Pegawai[], mode: 'replace' | 'append') => {
    setPendingImportList(importedList);
    setPendingImportMode(mode);
    setIsConfirmImportModalOpen(true);
  };

  // Confirm Excel import execution
  const handleConfirmImportPegawai = async () => {
    if (pendingImportList.length === 0) return;

    setIsImporting(true);
    const count = pendingImportList.length;

    try {
      if (accessToken && sheetConfig?.spreadsheetId) {
        await bulkWritePegawaiToSheet(
          sheetConfig.spreadsheetId,
          sheetConfig.pegawaiSheetName || 'Data_Pegawai',
          pendingImportList,
          pendingImportMode,
          pegawaiList.length,
          accessToken
        );

        if (pendingImportMode === 'replace') {
          setPegawaiList(pendingImportList);
        } else {
          setPegawaiList((prev) => [...prev, ...pendingImportList]);
        }

        showToast(
          `Berhasil mengimpor ${count} pegawai ke Google Sheet (${sheetConfig.pegawaiSheetName || 'Data_Pegawai'})!`,
          'success'
        );
      } else {
        if (pendingImportMode === 'replace') {
          setPegawaiList(pendingImportList);
        } else {
          setPegawaiList((prev) => [...prev, ...pendingImportList]);
        }
        showToast(`Berhasil mengimpor ${count} pegawai ke daftar lokal.`, 'info');
      }

      setIsConfirmImportModalOpen(false);
      setPendingImportList([]);
    } catch (err: any) {
      showToast(`Gagal mengimpor data pegawai: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // Quick action from table to record Jam Pulang
  const handleQuickCheckout = (record: AbsensiRecord) => {
    const currentTime = getCurrentWIBTimeString();
    handleRequestSubmitAbsensi(
      {
        ...record,
        jamPulang: currentTime,
        status: 'Hadir Tepat Waktu',
      },
      record.rowIndex
    );
  };

  // Matrix Sync request from Laporan tab -> triggers Confirmation Modal first
  const handleRequestSyncMatrix = (days: LaporanDayColumn[]) => {
    setPendingMatrixDays(days);
    setIsConfirmMatrixModalOpen(true);
  };

  // Confirm Matrix Sync to Google Sheet
  const handleConfirmSyncMatrix = async () => {
    if (!accessToken || !sheetConfig?.spreadsheetId || pendingMatrixDays.length === 0) return;

    setIsSyncingMatrix(true);
    try {
      await writeMatrixLaporanToSheet(
        sheetConfig.spreadsheetId,
        sheetConfig.absensiSheetName || 'Absensi',
        pegawaiList,
        pendingMatrixDays,
        absensiList,
        accessToken
      );
      showToast(
        `Tabel Laporan Memanjang (${pendingMatrixDays.length} hari) berhasil disimpan ke tab "${sheetConfig.absensiSheetName}" di Google Sheet!`,
        'success'
      );
      setIsConfirmMatrixModalOpen(false);
    } catch (err: any) {
      showToast(`Gagal menyimpan tabel laporan ke Google Sheet: ${err.message}`, 'error');
    } finally {
      setIsSyncingMatrix(false);
    }
  };

  const isConnected = Boolean(user && accessToken && sheetConfig?.spreadsheetId);

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans">
      {/* Header */}
      <Header
        user={user}
        sheetConfig={sheetConfig}
        isConnectedToSheet={isConnected}
        isLoading={isLoadingData}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onRefreshData={() => {
          if (accessToken && sheetConfig) {
            loadSheetData(accessToken, sheetConfig);
            showToast('Menyinkronkan data dengan Google Sheets...', 'info');
          } else {
            setIsSettingsOpen(true);
          }
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Toast Notification Alert */}
        {toastMessage && (
          <div
            className={`p-4 rounded-xl shadow-lg border text-sm flex items-center justify-between transition-all animate-in slide-in-from-top duration-300 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toastMessage.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              {toastMessage.type === 'error' && <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />}
              {toastMessage.type === 'info' && <Info className="w-5 h-5 text-blue-600 shrink-0" />}
              <span className="font-medium">{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs font-semibold px-2 py-1 rounded hover:bg-black/5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Connection Notice Banner if Not Connected */}
        {!isConnected && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Google Sheets Belum Terhubung Sepenuhnya
                </h3>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  {!user
                    ? 'Silakan klik Masuk Akun Google di sudut kanan atas, lalu hubungkan Google Sheet Anda untuk membaca database Nama_NIP dan menyimpan data Absensi.'
                    : !sheetConfig?.spreadsheetId
                    ? 'Akun Google telah masuk. Silakan tentukan Google Sheet tujuan atau klik tombol di bawah untuk membuat Google Sheet baru otomatis.'
                    : 'Menghubungkan ke Google Sheet...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!user ? (
                <button
                  onClick={handleSignIn}
                  className="px-4 py-2.5 bg-[#0F2E59] hover:bg-[#1B365D] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
                  Masuk Akun Google
                </button>
              ) : (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2.5 bg-[#0F2E59] hover:bg-[#1B365D] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#F59E0B]" />
                  Atur Google Sheet
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'form'
                ? 'border-[#0F2E59] text-[#0F2E59] bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Formulir Presensi</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'table'
                ? 'border-[#0F2E59] text-[#0F2E59] bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Riwayat Presensi ({absensiList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('laporan')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'laporan'
                ? 'border-[#0F2E59] text-[#0F2E59] bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <TableProperties className="w-4 h-4 text-[#F59E0B]" />
            <span>Laporan (Tabel Memanjang)</span>
          </button>

          <button
            onClick={() => setActiveTab('pegawai')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'pegawai'
                ? 'border-[#0F2E59] text-[#0F2E59] bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Database Pegawai ({pegawaiList.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'form' && (
          <div className="space-y-6">
            <AbsensiForm
              pegawaiList={pegawaiList}
              todayRecords={absensiList}
              isSubmitting={isSubmittingToSheet}
              onSubmitAbsensi={handleRequestSubmitAbsensi}
              onOpenPegawaiModal={() => setActiveTab('pegawai')}
            />

            {/* Quick Preview of Today's Attendance below form */}
            <div className="pt-2">
              <AbsensiTable
                records={absensiList}
                isLoading={isLoadingData}
                onQuickCheckout={handleQuickCheckout}
              />
            </div>
          </div>
        )}

        {activeTab === 'table' && (
          <AbsensiTable
            records={absensiList}
            isLoading={isLoadingData}
            onQuickCheckout={handleQuickCheckout}
          />
        )}

        {activeTab === 'laporan' && (
          <LaporanMemanjang
            pegawaiList={pegawaiList}
            records={absensiList}
            spreadsheetId={sheetConfig?.spreadsheetId}
            sheetName={sheetConfig?.absensiSheetName || 'Absensi'}
            isConnectedToSheet={isConnected}
            onSyncMatrixToSheet={handleRequestSyncMatrix}
          />
        )}

        {activeTab === 'pegawai' && (
          <PegawaiManager
            pegawaiList={pegawaiList}
            isLoading={isLoadingData}
            sheetName={sheetConfig?.pegawaiSheetName || 'Data_Pegawai'}
            onAddPegawai={handleRequestAddPegawai}
            onDeletePegawai={handleRequestDeletePegawai}
            onDeleteAllPegawai={handleRequestDeleteAllPegawai}
            onImportPegawai={handleRequestImportPegawai}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            Direktorat Bina Teknik Sumber Daya Air • Direktorat Jenderal Sumber Daya Air
          </p>
          <p>
            Kementerian Pekerjaan Umum • Sistem Presensi Pegawai Terintegrasi Google Sheets & Aplikasi Bravo
          </p>
        </div>
      </footer>

      {/* Confirmation Modal for Attendance Submission */}
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        title={pendingRecord?.rowIndex ? 'Konfirmasi Pembaruan Jam Pulang' : 'Konfirmasi Simpan Presensi Pegawai'}
        message={
          pendingRecord?.rowIndex
            ? 'Apakah Anda yakin ingin memperbarui data jam pulang untuk pegawai berikut ke Google Sheets?'
            : 'Apakah Anda yakin ingin menambahkan data presensi pegawai berikut ke Google Sheets?'
        }
        details={
          pendingRecord
            ? [
                { label: 'Nama Pegawai', value: pendingRecord.record.nama },
                { label: 'NIP', value: pendingRecord.record.nip },
                { label: 'Hari / Tanggal', value: `${pendingRecord.record.hari}, ${pendingRecord.record.tanggal}` },
                { label: 'Jam Masuk (Bravo)', value: pendingRecord.record.jamMasuk || '-' },
                { label: 'Jam Pulang (Bravo)', value: pendingRecord.record.jamPulang || '-' },
                { label: 'Status Kehadiran', value: pendingRecord.record.status },
                { label: 'Keterangan', value: pendingRecord.record.keterangan || '-' },
                {
                  label: 'Sheet Tujuan',
                  value: sheetConfig?.absensiSheetName || 'Absensi (Google Sheet)',
                },
              ]
            : []
        }
        confirmText="Ya, Simpan ke Google Sheet"
        cancelText="Periksa Kembali"
        isLoading={isSubmittingToSheet}
        onConfirm={handleConfirmSaveAbsensi}
        onCancel={() => {
          setIsConfirmModalOpen(false);
          setPendingRecord(null);
        }}
      />

      {/* Confirmation Modal for Matrix Report Sync */}
      <ConfirmationModal
        isOpen={isConfirmMatrixModalOpen}
        title="Konfirmasi Simpan Laporan Memanjang ke Google Sheet"
        message={`Tabel matriks presensi memanjang dengan ${pendingMatrixDays.length} kolom hari akan ditulis ke tab "${sheetConfig?.absensiSheetName || 'Absensi'}" di Google Sheets sesuai format resmi Subbag Tata Usaha.`}
        details={[
          { label: 'Target Tab Sheet', value: sheetConfig?.absensiSheetName || 'Absensi' },
          { label: 'Jumlah Hari', value: `${pendingMatrixDays.length} Hari Kerja` },
          { label: 'Jumlah Pegawai', value: `${pegawaiList.length} Pegawai` },
          {
            label: 'Periode',
            value:
              pendingMatrixDays.length > 0
                ? `${pendingMatrixDays[0].tanggalStr} s/d ${pendingMatrixDays[pendingMatrixDays.length - 1].tanggalStr}`
                : '-',
          },
        ]}
        confirmText="Ya, Sinkronkan Tabel Memanjang"
        cancelText="Batal"
        isLoading={isSyncingMatrix}
        onConfirm={handleConfirmSyncMatrix}
        onCancel={() => {
          setIsConfirmMatrixModalOpen(false);
          setPendingMatrixDays([]);
        }}
      />

      {/* Confirmation Modal for Adding New Employee */}
      <ConfirmationModal
        isOpen={isConfirmPegawaiModalOpen}
        title="Konfirmasi Tambah Pegawai Baru"
        message="Pegawai baru berikut akan ditambahkan ke database master pada Google Sheet tab Data_Pegawai:"
        details={
          pendingPegawai
            ? [
                { label: 'Nama Lengkap', value: pendingPegawai.nama },
                { label: 'NIP', value: pendingPegawai.nip },
                { label: 'Jabatan', value: pendingPegawai.jabatan || '-' },
                { label: 'Unit Kerja / Subdit', value: pendingPegawai.unitKerja || '-' },
                {
                  label: 'Sheet Master',
                  value: sheetConfig?.pegawaiSheetName || 'Data_Pegawai',
                },
              ]
            : []
        }
        confirmText="Ya, Tambahkan ke Master Sheet"
        cancelText="Batal"
        isLoading={false}
        onConfirm={handleConfirmAddPegawai}
        onCancel={() => {
          setIsConfirmPegawaiModalOpen(false);
          setPendingPegawai(null);
        }}
      />

      {/* Confirmation Modal for Single Row Deletion */}
      <ConfirmationModal
        isOpen={isConfirmDeleteRowModalOpen}
        isDestructive={true}
        title="Konfirmasi Hapus Baris Pegawai"
        message={`Apakah Anda yakin ingin menghapus data pegawai berikut dari sheet "${sheetConfig?.pegawaiSheetName || 'Data_Pegawai'}"? Tindakan ini akan menghapus baris tersebut dari Google Sheet.`}
        details={
          pegawaiToDelete
            ? [
                { label: 'Nama Pegawai', value: pegawaiToDelete.pegawai.nama },
                { label: 'NIP', value: pegawaiToDelete.pegawai.nip },
                { label: 'Jabatan', value: pegawaiToDelete.pegawai.jabatan || '-' },
                { label: 'Unit Kerja', value: pegawaiToDelete.pegawai.unitKerja || '-' },
                { label: 'Sheet Target', value: sheetConfig?.pegawaiSheetName || 'Data_Pegawai' },
              ]
            : []
        }
        confirmText="Ya, Hapus Baris Ini"
        cancelText="Batalkan"
        isLoading={isDeletingPegawai}
        onConfirm={handleConfirmDeletePegawai}
        onCancel={() => {
          setIsConfirmDeleteRowModalOpen(false);
          setPegawaiToDelete(null);
        }}
      />

      {/* Confirmation Modal for ALL Rows Deletion */}
      <ConfirmationModal
        isOpen={isConfirmDeleteAllModalOpen}
        isDestructive={true}
        title="Konfirmasi Hapus SEMUA Baris Pegawai"
        message={`PERINGATAN KERAS: Apakah Anda yakin ingin menghapus SEMUA ${pegawaiList.length} baris pegawai dari Google Sheet tab "${sheetConfig?.pegawaiSheetName || 'Data_Pegawai'}"? Seluruh data nama dan NIP pegawai di sheet tersebut akan dikosongkan (header kolom tetap dipertahankan).`}
        details={[
          { label: 'Jumlah Pegawai Dihapus', value: `${pegawaiList.length} Orang Pegawai` },
          { label: 'Sheet Target', value: sheetConfig?.pegawaiSheetName || 'Data_Pegawai' },
          { label: 'Status Header Baris 1', value: 'Tetap Dipertahankan' },
        ]}
        confirmText="Ya, Hapus SEMUA Baris Sekarang"
        cancelText="Batal, Jangan Hapus"
        isLoading={isDeletingPegawai}
        onConfirm={handleConfirmDeleteAllPegawai}
        onCancel={() => {
          setIsConfirmDeleteAllModalOpen(false);
        }}
      />

      {/* Confirmation Modal for Excel Import */}
      <ConfirmationModal
        isOpen={isConfirmImportModalOpen}
        isDestructive={pendingImportMode === 'replace'}
        title={
          pendingImportMode === 'replace'
            ? 'Konfirmasi Ganti Seluruh Data dengan Hasil Import Excel'
            : 'Konfirmasi Tambahkan Data dari Hasil Import Excel'
        }
        message={
          pendingImportMode === 'replace'
            ? `PERINGATAN: Anda memilih mode "Gantikan Semua". Seluruh data pegawai lama di tab "${sheetConfig?.pegawaiSheetName || 'Data_Pegawai'}" akan diganti dengan ${pendingImportList.length} data pegawai baru dari file Excel.`
            : `Sebanyak ${pendingImportList.length} pegawai dari file Excel akan ditambahkan ke tab "${sheetConfig?.pegawaiSheetName || 'Data_Pegawai'}" di Google Sheets.`
        }
        details={[
          { label: 'Jumlah Pegawai Diimpor', value: `${pendingImportList.length} Orang Pegawai` },
          {
            label: 'Metode Impor',
            value: pendingImportMode === 'replace' ? 'Gantikan Seluruh Data (Replace)' : 'Tambahkan ke Bawah (Append)',
          },
          { label: 'Target Sheet', value: sheetConfig?.pegawaiSheetName || 'Data_Pegawai' },
          {
            label: 'Contoh Pegawai Pertama',
            value: pendingImportList.length > 0 ? `${pendingImportList[0].nama} (${pendingImportList[0].nip})` : '-',
          },
        ]}
        confirmText={
          pendingImportMode === 'replace'
            ? 'Ya, Gantikan Seluruh Data'
            : 'Ya, Tambahkan Data Import'
        }
        cancelText="Batalkan"
        isLoading={isImporting}
        onConfirm={handleConfirmImportPegawai}
        onCancel={() => {
          setIsConfirmImportModalOpen(false);
          setPendingImportList([]);
        }}
      />

      {/* Settings Modal */}
      <SheetSettingsModal
        isOpen={isSettingsOpen}
        currentConfig={sheetConfig}
        accessToken={accessToken}
        onSaveConfig={handleSaveConfig}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
