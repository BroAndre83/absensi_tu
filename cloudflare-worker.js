/**
 * ============================================================================
 * CLOUDFLARE WORKER: JEMBATAN DOMAIN KUSTOM KE GOOGLE AI STUDIO
 * ============================================================================
 * Jika domain Anda dikelola di Cloudflare (gratis), Anda tidak perlu menyewa VPS!
 * Cukup copy-paste kode ini ke Cloudflare Workers & Pages.
 * 
 * LANGKAH MUDAH:
 * 1. Buka dashboard Cloudflare (dash.cloudflare.com)
 * 2. Pilih menu "Workers & Pages" -> "Create application" -> "Create Worker"
 * 3. Hapus kode default dan ganti dengan seluruh kode di file ini
 * 4. Klik "Save and Deploy"
 * 5. Buka tab "Settings" -> "Domains & Routes" -> "Add Custom Domain"
 *    (misal: absensi.domainanda.com)
 * ============================================================================
 */

export default {
  async fetch(request, env, ctx) {
    // URL Target AI Studio Anda
    const TARGET_URL = 'https://ais-pre-syrzvn5acgbsy3aya7d5sq-778659607362.asia-east1.run.app';
    const targetOrigin = new URL(TARGET_URL);

    // Salin URL dari request pengguna tetapi ubah host dan protokolnya ke AI Studio
    const url = new URL(request.url);
    url.protocol = targetOrigin.protocol;
    url.hostname = targetOrigin.hostname;
    url.port = targetOrigin.port;

    // Buat header baru dengan mengubah 'Host' agar diterima Google Cloud Run
    const newHeaders = new Headers(request.headers);
    newHeaders.set('host', targetOrigin.host);
    newHeaders.set('x-forwarded-host', request.headers.get('host') || '');
    newHeaders.set('x-forwarded-proto', 'https');

    // Buat request baru ke target
    const modifiedRequest = new Request(url.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: 'manual'
    });

    try {
      // Kirim request ke AI Studio
      const response = await fetch(modifiedRequest);

      // Handle redirect jika target mengembalikan lokasi domain internal
      if ([301, 302, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (location && location.startsWith(targetOrigin.origin)) {
          const newResponseHeaders = new Headers(response.headers);
          const relativeLocation = location.replace(targetOrigin.origin, '');
          newResponseHeaders.set('location', relativeLocation);
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: newResponseHeaders
          });
        }
      }

      return response;
    } catch (err) {
      return new Response(
        `<!DOCTYPE html><html><body><h2>Gagal terhubung ke AI Studio</h2><p>${err.message}</p></body></html>`,
        {
          status: 502,
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      );
    }
  }
};
