import React, { useState } from 'react';
import {
  Globe,
  X,
  Copy,
  Check,
  Download,
  Terminal,
  Cloud,
  Server,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Code
} from 'lucide-react';

interface CustomDomainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TARGET_URL = 'https://ais-pre-syrzvn5acgbsy3aya7d5sq-778659607362.asia-east1.run.app';

const NODEJS_CODE = `/**
 * BRIDGE PROXY DOMAIN KE GOOGLE AI STUDIO (NODE.JS STANDALONE)
 * Jalankan langsung dengan: node domain-bridge.js
 * Atau dengan PM2: pm2 start domain-bridge.js --name "absensi-bridge"
 */

const http = require('http');
const https = require('https');
const url = require('url');

// URL Sasaran AI Studio Anda
const TARGET_URL = process.env.TARGET_URL || '${TARGET_URL}';
const PORT = parseInt(process.env.PORT || '8080', 10);

const parsedTarget = new url.URL(TARGET_URL);
const isTargetHttps = parsedTarget.protocol === 'https:';
const targetClient = isTargetHttps ? https : http;

console.log('🚀 Jembatan Domain AI Studio Aktif');
console.log('📡 Menjembatani ke : ' + TARGET_URL);
console.log('🔌 Port Lokal      : ' + PORT);

const server = http.createServer((clientReq, clientRes) => {
  const clientIp = clientReq.headers['x-forwarded-for'] || clientReq.socket.remoteAddress;

  if (clientReq.url === '/_bridge_health') {
    clientRes.writeHead(200, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({ status: 'ok', target: TARGET_URL }));
    return;
  }

  const proxyHeaders = { ...clientReq.headers };
  // PENTING: Ubah host agar Google Cloud Run menerima koneksi
  proxyHeaders['host'] = parsedTarget.host;
  proxyHeaders['x-forwarded-host'] = clientReq.headers['host'] || '';
  proxyHeaders['x-forwarded-proto'] = clientReq.headers['x-forwarded-proto'] || 'http';
  proxyHeaders['x-forwarded-for'] = clientIp;

  const options = {
    protocol: parsedTarget.protocol,
    hostname: parsedTarget.hostname,
    port: parsedTarget.port || (isTargetHttps ? 443 : 80),
    method: clientReq.method,
    path: clientReq.url,
    headers: proxyHeaders,
    timeout: 60000
  };

  const proxyReq = targetClient.request(options, (targetRes) => {
    const responseHeaders = { ...targetRes.headers };
    if (responseHeaders.location) {
      responseHeaders.location = responseHeaders.location.replace(parsedTarget.origin, '');
    }

    clientRes.writeHead(targetRes.statusCode || 200, responseHeaders);
    targetRes.pipe(clientRes);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy Error:', err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      clientRes.end('502 Bad Gateway: Gagal terhubung ke AI Studio (' + err.message + ')');
    }
  });

  clientReq.pipe(proxyReq);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('✅ Server siap melayani permintaan domain di port ' + PORT);
});
`;

const CLOUDFLARE_CODE = `/**
 * CLOUDFLARE WORKER: JEMBATAN DOMAIN KE AI STUDIO
 * Paste kode ini di Workers & Pages pada Dashboard Cloudflare
 */

export default {
  async fetch(request) {
    const TARGET_URL = '${TARGET_URL}';
    const targetOrigin = new URL(TARGET_URL);

    const url = new URL(request.url);
    url.protocol = targetOrigin.protocol;
    url.hostname = targetOrigin.hostname;
    url.port = targetOrigin.port;

    const newHeaders = new Headers(request.headers);
    newHeaders.set('host', targetOrigin.host);
    newHeaders.set('x-forwarded-host', request.headers.get('host') || '');
    newHeaders.set('x-forwarded-proto', 'https');

    const modifiedRequest = new Request(url.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: 'manual'
    });

    const response = await fetch(modifiedRequest);

    if ([301, 302, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (location && location.startsWith(targetOrigin.origin)) {
        const newResponseHeaders = new Headers(response.headers);
        newResponseHeaders.set('location', location.replace(targetOrigin.origin, ''));
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newResponseHeaders
        });
      }
    }

    return response;
  }
};
`;

const NGINX_CODE = `server {
    listen 80;
    server_name presensi.domainanda.go.id; # Ganti dengan domain Anda

    location / {
        proxy_pass ${TARGET_URL};
        proxy_ssl_server_name on;
        
        # PENTING: Gunakan host AI Studio agar Cloud Run menerima request
        proxy_set_header Host ais-pre-syrzvn5acgbsy3aya7d5sq-778659607362.asia-east1.run.app;
        
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # Dukungan WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
`;

export const CustomDomainModal: React.FC<CustomDomainModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'nodejs' | 'cloudflare' | 'nginx'>('nodejs');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Modal */}
        <div className="bg-[#0F2E59] text-white p-5 flex items-center justify-between border-b-4 border-[#F59E0B]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-400/30 text-amber-300">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Jembatan Custom Domain ke AI Studio
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-normal">
                  File Siap Pakai
                </span>
              </h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Gunakan domain instansi Anda sendiri (misal: <span className="font-mono text-amber-300">presensi.pu.go.id</span>) untuk mengakses aplikasi ini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Target App URL Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                URL Asli AI Studio (Shared App)
              </span>
              <div className="font-mono text-xs sm:text-sm text-blue-900 font-semibold break-all select-all">
                {TARGET_URL}
              </div>
            </div>
            <button
              onClick={() => handleCopy(TARGET_URL, 'target-url')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium shadow-sm transition-all shrink-0"
            >
              {copiedKey === 'target-url' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin URL</span>
                </>
              )}
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-2">
            <button
              onClick={() => setActiveTab('nodejs')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'nodejs'
                  ? 'border-[#0F2E59] text-[#0F2E59] bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4 text-emerald-600" />
              <span>1. Node.js Standalone (Rekomendasi VPS/cPanel)</span>
            </button>
            <button
              onClick={() => setActiveTab('cloudflare')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'cloudflare'
                  ? 'border-[#0F2E59] text-[#0F2E59] bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Cloud className="w-4 h-4 text-orange-500" />
              <span>2. Cloudflare Worker (Gratis & Tanpa Server)</span>
            </button>
            <button
              onClick={() => setActiveTab('nginx')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'nginx'
                  ? 'border-[#0F2E59] text-[#0F2E59] bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Server className="w-4 h-4 text-slate-700" />
              <span>3. Nginx Config</span>
            </button>
          </div>

          {/* Tab 1: Node.js Standalone */}
          {activeTab === 'nodejs' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-950">File: domain-bridge.js (Tersedia di Root Project)</h4>
                  <p className="mt-1 leading-relaxed">
                    File ini tidak memerlukan library pihak ketiga (Zero Dependencies). Cukup Node.js versi apa saja di server/hosting Anda. File ini otomatis menerjemahkan Host header dan menyalurkan request browser secara real-time.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-blue-600" />
                  <span>Kodingan Lengkap: domain-bridge.js</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadFile('domain-bridge.js', NODEJS_CODE)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F2E59] hover:bg-[#1A457E] text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download domain-bridge.js</span>
                  </button>
                  <button
                    onClick={() => handleCopy(NODEJS_CODE, 'nodejs-code')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-all"
                  >
                    {copiedKey === 'nodejs-code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Salin Kodingan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code Viewer */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>domain-bridge.js</span>
                  <span className="text-emerald-400">Node.js ES5/CommonJS</span>
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-80 leading-relaxed">
                  {NODEJS_CODE}
                </pre>
              </div>

              {/* Cara Menjalankan */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-slate-600" />
                  Cara Menjalankan di Server / VPS:
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span>node domain-bridge.js</span>
                    <button
                      onClick={() => handleCopy('node domain-bridge.js', 'run-cmd-1')}
                      className="text-slate-400 hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span>pm2 start domain-bridge.js --name "absensi-bridge"</span>
                    <button
                      onClick={() => handleCopy('pm2 start domain-bridge.js --name "absensi-bridge"', 'run-cmd-2')}
                      className="text-slate-400 hover:text-white"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Cloudflare Worker */}
          {activeTab === 'cloudflare' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950">Metode Paling Mudah & 100% Gratis (Tanpa Sewa VPS)</h4>
                  <p className="mt-1 leading-relaxed">
                    Jika domain Anda terhubung di Cloudflare, cukup buat 1 Worker di Cloudflare Workers & Pages, paste script berikut, lalu kaitkan ke domain/subdomain Anda (misal: <code>presensi.domainanda.com</code>). SSL otomatis aktif!
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-orange-500" />
                  <span>Kodingan: cloudflare-worker.js</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadFile('cloudflare-worker.js', CLOUDFLARE_CODE)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-slate-900 rounded-lg text-xs font-semibold shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Script Worker</span>
                  </button>
                  <button
                    onClick={() => handleCopy(CLOUDFLARE_CODE, 'cf-code')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-all"
                  >
                    {copiedKey === 'cf-code' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Salin Kodingan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Code Viewer */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>cloudflare-worker.js</span>
                  <span className="text-amber-400">Cloudflare Workers V8</span>
                </div>
                <pre className="p-4 text-xs font-mono text-amber-300 overflow-x-auto max-h-80 leading-relaxed">
                  {CLOUDFLARE_CODE}
                </pre>
              </div>

              {/* Langkah Cloudflare */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-700">
                <h4 className="font-bold text-slate-900">4 Langkah Pasang di Cloudflare:</h4>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Buka <strong>dash.cloudflare.com</strong> &rarr; menu <strong>Workers & Pages</strong> &rarr; <strong>Create application</strong>.</li>
                  <li>Beri nama worker (misal: <code>presensi-sda-bridge</code>) lalu klik <strong>Deploy</strong>.</li>
                  <li>Klik <strong>Edit Code</strong>, hapus kode lama, paste script di atas, lalu klik <strong>Save and Deploy</strong>.</li>
                  <li>Buka tab <strong>Settings</strong> &rarr; <strong>Domains & Routes</strong> &rarr; <strong>Add Custom Domain</strong>, masukkan subdomain Anda. Selesai!</li>
                </ol>
              </div>
            </div>
          )}

          {/* Tab 3: Nginx Config */}
          {activeTab === 'nginx' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
                <Server className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-blue-950">Konfigurasi Reverse Proxy Nginx</h4>
                  <p className="mt-1 leading-relaxed">
                    Jika server Anda sudah memiliki Nginx web server terpasang, cukup masukkan blok konfigurasi berikut ke <code>/etc/nginx/sites-available/presensi.conf</code>.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-blue-600" />
                  <span>Blok Server Nginx</span>
                </div>
                <button
                  onClick={() => handleCopy(NGINX_CODE, 'nginx-code')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold transition-all"
                >
                  {copiedKey === 'nginx-code' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Salin Nginx Config</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Viewer */}
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>/etc/nginx/conf.d/presensi.conf</span>
                  <span className="text-cyan-400">Nginx Config</span>
                </div>
                <pre className="p-4 text-xs font-mono text-cyan-300 overflow-x-auto max-h-80 leading-relaxed">
                  {NGINX_CODE}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>File <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono">domain-bridge.js</code> siap pakai di direktori aplikasi</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
