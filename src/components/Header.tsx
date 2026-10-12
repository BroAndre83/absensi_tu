import React, { useState, useEffect } from 'react';
import {
  Clock,
  FileSpreadsheet,
  LogOut,
  Settings,
  ShieldCheck,
  Building2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { getCurrentWIBTimeStringWithSeconds, getIndonesianFormattedDate, getIndonesianDayName } from '../utils/dateUtils';
import { SheetConfig } from '../types';

interface HeaderProps {
  user: any;
  sheetConfig: SheetConfig | null;
  isConnectedToSheet: boolean;
  isLoading: boolean;
  onOpenSettings: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  sheetConfig,
  isConnectedToSheet,
  isLoading,
  onOpenSettings,
  onSignIn,
  onSignOut,
  onRefreshData,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [dayStr, setDayStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(getCurrentWIBTimeStringWithSeconds());
      setDateStr(getIndonesianFormattedDate());
      setDayStr(getIndonesianDayName());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-[#0F2E59] text-white shadow-xl border-b-4 border-[#F59E0B]">
      {/* Top Banner / Ministry Sub-bar */}
      <div className="bg-[#0A2040] px-4 sm:px-6 py-1.5 text-xs text-slate-300 border-b border-slate-700/50 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 tracking-wide font-medium">
          <Building2 className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>KEMENTERIAN PEKERJAAN UMUM • DIREKTORAT JENDERAL SUMBER DAYA AIR</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Zona Waktu Resmi: WIB (UTC+7)
          </span>
        </div>
      </div>

      {/* Main Header Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Brand & Organization Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-[#1E4E8C] to-[#0D2447] border-2 border-[#F59E0B] p-2 flex items-center justify-center shadow-inner shrink-0">
              {/* Emblem / Water Wave Symbol */}
              <div className="text-center font-black leading-none text-white">
                <span className="text-[#F59E0B] text-xl block">SDA</span>
                <span className="text-[9px] tracking-tighter text-slate-200 uppercase font-semibold">Bintek</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Absensi Pegawai Dit. Bintek SDA
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Bravo Sync
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Direktorat Bina Teknik Sumber Daya Air • Sinkronisasi Presensi Google Sheets
              </p>
            </div>
          </div>

          {/* Clock & Action Widgets */}
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {/* Live Clock Card */}
            <div className="bg-[#153B6E] border border-blue-400/20 px-3.5 py-2 rounded-xl flex items-center gap-3 shadow-sm">
              <div className="p-2 rounded-lg bg-blue-500/20 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] text-blue-200 font-medium">
                  {dayStr}, {dateStr}
                </div>
                <div className="text-base sm:text-lg font-mono font-bold text-white tracking-wider">
                  {timeStr || '--:--:--'} <span className="text-xs text-amber-400 font-sans font-semibold">WIB</span>
                </div>
              </div>
            </div>

            {/* Google Sheets Status Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenSettings}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isConnectedToSheet
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-amber-950/50 border-amber-500/40 text-amber-300 hover:bg-amber-900/50'
                }`}
                title="Konfigurasi Google Sheets"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isConnectedToSheet ? 'Sheets Terhubung' : 'Pilih Google Sheet'}
                </span>
                <span className="sm:hidden">Sheets</span>
                <Settings className="w-3.5 h-3.5 opacity-70" />
              </button>

              {sheetConfig?.spreadsheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheetConfig.spreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-[#153B6E] hover:bg-[#1C4E91] text-blue-200 hover:text-white rounded-xl border border-blue-400/20 transition-colors"
                  title="Buka Spreadsheet di Tab Baru"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                onClick={onRefreshData}
                disabled={isLoading}
                className="p-2 bg-[#153B6E] hover:bg-[#1C4E91] text-blue-200 hover:text-white rounded-xl border border-blue-400/20 transition-colors disabled:opacity-50"
                title="Sinkronkan Ulang Data"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Auth Button / Profile */}
            <div>
              {user ? (
                <div className="flex items-center gap-2.5 bg-[#0A2040] border border-blue-400/20 pl-2 pr-3 py-1.5 rounded-xl">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-7 h-7 rounded-full border border-amber-400 object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-xs font-bold text-white">
                      {user.displayName ? user.displayName.charAt(0) : 'U'}
                    </div>
                  )}
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold text-white max-w-[120px] truncate">
                      {user.displayName || user.email}
                    </div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Google Terverifikasi
                    </div>
                  </div>
                  <button
                    onClick={onSignOut}
                    className="ml-1 p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Keluar"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignIn}
                  className="flex items-center gap-2.5 px-3.5 py-2 bg-white text-slate-800 hover:bg-slate-100 font-medium text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer border border-slate-300"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Masuk Akun Google</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
