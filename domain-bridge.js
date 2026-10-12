/**
 * ============================================================================
 * BRIDGE PROXY DOMAIN KE GOOGLE AI STUDIO (NODE.JS STANDALONE)
 * ============================================================================
 * File ini berfungsi sebagai jembatan (Reverse Proxy) antara domain kustom Anda
 * (misal: presensi.domainanda.go.id atau absensi.perusahaan.com) ke aplikasi
 * Google AI Studio / Google Cloud Run.
 * 
 * KEUNGGULAN FILE INI:
 * 1. Zero Dependencies: Menggunakan modul bawaan Node.js (http, https, url).
 *    Tidak perlu menjalankan `npm install`, langsung jalankan dengan `node domain-bridge.js`.
 * 2. Mengubah header Host secara otomatis agar diterima oleh Google Cloud Run.
 * 3. Mendukung seluruh method HTTP (GET, POST, PUT, DELETE, PATCH, OPTIONS).
 * 4. Mendukung streaming data, upload file Excel/dokumen, dan websocket.
 * 5. Siap dijalankan di VPS (Ubuntu/Debian), cPanel Node.js Selector, Docker, atau PM2.
 * ============================================================================
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');

// ----------------------------------------------------------------------------
// KONFIGURASI TARGET & PORT
// ----------------------------------------------------------------------------
// URL tujuan AI Studio aplikasi Anda:
const DEFAULT_TARGET_URL = 'https://ais-pre-syrzvn5acgbsy3aya7d5sq-778659607362.asia-east1.run.app';
const TARGET_URL = process.env.TARGET_URL || DEFAULT_TARGET_URL;

// Port tempat proxy ini mendengarkan (default: 8080 atau PORT dari environment)
// Untuk VPS tanpa Nginx: gunakan 80 (atau 443 jika menggunakan SSL)
// Untuk cPanel / Passenger: port otomatis diatur oleh server
const PORT = parseInt(process.env.PORT || '8080', 10);

// Parse URL target AI Studio
const parsedTarget = new url.URL(TARGET_URL);
const isTargetHttps = parsedTarget.protocol === 'https:';
const targetClient = isTargetHttps ? https : http;

console.log('='.repeat(70));
console.log('🚀 JEMBATAN PROXY DOMAIN KE AI STUDIO TELAH AKTIF');
console.log('='.repeat(70));
console.log(`📡 URL Tujuan (AI Studio): ${TARGET_URL}`);
console.log(`🌐 Target Host           : ${parsedTarget.host}`);
console.log(`🔌 Port Lokal             : ${PORT}`);
console.log('='.repeat(70));

// ----------------------------------------------------------------------------
// SERVER PROXY
// ----------------------------------------------------------------------------
const server = http.createServer((clientReq, clientRes) => {
  const startTime = Date.now();
  const clientIp = clientReq.headers['x-forwarded-for'] || clientReq.socket.remoteAddress;

  // Endpoint pemeriksaan kesehatan (Health Check)
  if (clientReq.url === '/_bridge_health') {
    clientRes.writeHead(200, { 'Content-Type': 'application/json' });
    clientRes.end(JSON.stringify({
      status: 'ok',
      target: TARGET_URL,
      time: new Date().toISOString()
    }));
    return;
  }

  // Siapkan header yang akan dikirim ke AI Studio
  const proxyHeaders = { ...clientReq.headers };

  // KRUSIAL: Ubah header 'host' menjadi host AI Studio agar Cloud Run tidak menolak request
  proxyHeaders['host'] = parsedTarget.host;

  // Pertahankan informasi domain asli
  if (!proxyHeaders['x-forwarded-host']) {
    proxyHeaders['x-forwarded-host'] = clientReq.headers['host'] || '';
  }
  if (!proxyHeaders['x-forwarded-proto']) {
    proxyHeaders['x-forwarded-proto'] = clientReq.headers['x-forwarded-proto'] || 'http';
  }
  if (!proxyHeaders['x-forwarded-for']) {
    proxyHeaders['x-forwarded-for'] = clientIp;
  } else {
    proxyHeaders['x-forwarded-for'] = `${proxyHeaders['x-forwarded-for']}, ${clientIp}`;
  }

  // Opsi request ke server AI Studio
  const options = {
    protocol: parsedTarget.protocol,
    hostname: parsedTarget.hostname,
    port: parsedTarget.port || (isTargetHttps ? 443 : 80),
    method: clientReq.method,
    path: clientReq.url,
    headers: proxyHeaders,
    timeout: 60000 // 60 detik timeout
  };

  // Kirim request ke target AI Studio
  const proxyReq = targetClient.request(options, (targetRes) => {
    // Siapkan response header untuk browser klien
    const responseHeaders = { ...targetRes.headers };

    // Jika target mengembalikan redirect dengan domain internal, sesuaikan ke domain klien
    if (responseHeaders.location) {
      responseHeaders.location = responseHeaders.location.replace(
        parsedTarget.origin,
        ''
      );
    }

    // Kirim status code dan headers kembali ke browser
    clientRes.writeHead(targetRes.statusCode || 200, responseHeaders);

    // Salurkan data response ke browser klien (Streaming)
    targetRes.pipe(clientRes);

    targetRes.on('end', () => {
      const duration = Date.now() - startTime;
      console.log(
        `[${new Date().toLocaleTimeString('id-ID')}] ${clientReq.method} ${clientReq.url} -> ${targetRes.statusCode} (${duration}ms)`
      );
    });
  });

  // Tangani error koneksi ke AI Studio
  proxyReq.on('error', (err) => {
    console.error(`[ERROR PROXY] Gagal menghubungi ${TARGET_URL}:`, err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
      clientRes.end(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>502 Bad Gateway - Bridge Proxy AI Studio</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0F172A; color: #F8FAFC; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
            .card { background: #1E293B; border: 1px solid #334155; border-radius: 12px; padding: 32px; max-width: 520px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { font-size: 20px; color: #F59E0B; margin-top: 0; }
            p { font-size: 14px; color: #94A3B8; line-height: 1.6; }
            code { background: #0F172A; padding: 2px 6px; border-radius: 4px; color: #38BDF8; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>⚠️ Gagal Terhubung ke AI Studio</h1>
            <p>Jembatan proxy domain tidak dapat menghubungi server target di <code>${TARGET_URL}</code>.</p>
            <p><strong>Penyebab:</strong> ${err.message}</p>
            <p>Pastikan koneksi internet server stabil dan URL target aktif.</p>
          </div>
        </body>
        </html>
      `);
    }
  });

  // Salurkan body request (untuk upload file, form submit, JSON POST) ke AI Studio
  clientReq.pipe(proxyReq);
});

// Menangani upgrade untuk WebSocket (jika digunakan)
server.on('upgrade', (req, socket, head) => {
  console.log(`[UPGRADE] Meneruskan protokol Upgrade/WebSocket: ${req.url}`);
  const options = {
    hostname: parsedTarget.hostname,
    port: parsedTarget.port || (isTargetHttps ? 443 : 80),
    path: req.url,
    headers: { ...req.headers, host: parsedTarget.host },
    method: req.method
  };

  const proxyReq = targetClient.request(options);
  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
      Object.keys(proxyRes.headers)
        .map(h => `${h}: ${proxyRes.headers[h]}`)
        .join('\r\n') +
      '\r\n\r\n'
    );
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });
  proxyReq.on('error', () => {
    socket.destroy();
  });
  proxyReq.end();
});

// Jalankan Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server Jembatan aktif di http://0.0.0.0:${PORT}`);
  console.log('👉 Arahkan A record atau CNAME domain Anda ke IP server ini.');
});
