import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

// Ensure data directory exists for permanent shared storage
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const PEGAWAI_FILE = path.join(DATA_DIR, 'pegawai.json');
const ABSENSI_FILE = path.join(DATA_DIR, 'absensi.json');

// Default initial staff if no data has been saved or imported yet
const DEFAULT_PEGAWAI = [
  { nama: 'Ir. Muhammad Rizal, M.Eng.', nip: '197805122002121001', jabatan: 'Pembina Utama Muda', unitKerja: 'Subdit Data & TI SDA' },
  { nama: 'Siti Rahmawati, S.T., M.Sc.', nip: '198503142008012003', jabatan: 'Penata Tk.I', unitKerja: 'Subdit Teknik Hidrologi' },
  { nama: 'Agus Setiawan, S.T.', nip: '199009182014021002', jabatan: 'Penata Muda Tk.I', unitKerja: 'Subdit Irigasi & Rawa' },
  { nama: 'Dewi Lestari, S.Kom.', nip: '199307252018012001', jabatan: 'Pranata Komputer Ahli', unitKerja: 'Bagian Tata Usaha' },
  { nama: 'Hendra Kurniawan, S.T.', nip: '198811052010121004', jabatan: 'Teknik Pengairan Muda', unitKerja: 'Subdit Bendungan & Danau' },
  { nama: 'Tri Wahyuni, S.A.P.', nip: '199204152015032002', jabatan: 'Pengelola Kepegawaian', unitKerja: 'Subbag Kepegawaian & ORTALA' },
  { nama: 'Fajar Nugroho, S.T., M.T.', nip: '198208192006041005', jabatan: 'Koordinator Teknik', unitKerja: 'Subdit Perencanaan Teknik' },
  { nama: 'Anisa Putri, S.E.', nip: '199512012019032005', jabatan: 'Bendahara Pengeluaran', unitKerja: 'Bagian Keuangan & BMN' },
  { nama: 'Bambang Supriyanto, S.T.', nip: '198402162009011003', jabatan: 'Teknik Pengairan Madya', unitKerja: 'Subdit Sungai & Pantai' },
  { nama: 'Rina Kusuma Astuti, S.T.', nip: '199106202015022001', jabatan: 'Penelaah Teknis SDA', unitKerja: 'Subdit Standar & Pedoman' }
];

if (!fs.existsSync(PEGAWAI_FILE)) {
  fs.writeFileSync(PEGAWAI_FILE, JSON.stringify(DEFAULT_PEGAWAI, null, 2), 'utf-8');
}

// 1. GET /api/pegawai - Get permanent shared employee database
app.get('/api/pegawai', (req, res) => {
  try {
    if (fs.existsSync(PEGAWAI_FILE)) {
      const content = fs.readFileSync(PEGAWAI_FILE, 'utf-8');
      return res.json(JSON.parse(content));
    }
    return res.json(DEFAULT_PEGAWAI);
  } catch (err: any) {
    console.error('Error reading pegawai.json:', err);
    return res.json(DEFAULT_PEGAWAI);
  }
});

// 2. POST /api/pegawai - Save permanent shared employee database (persistent across refreshes and shares)
app.post('/api/pegawai', (req, res) => {
  try {
    const list = req.body;
    if (!Array.isArray(list)) {
      return res.status(400).json({ error: 'Data harus berupa array pegawai' });
    }
    fs.writeFileSync(PEGAWAI_FILE, JSON.stringify(list, null, 2), 'utf-8');
    return res.json({ success: true, count: list.length });
  } catch (err: any) {
    console.error('Error saving pegawai.json:', err);
    return res.status(500).json({ error: 'Gagal menyimpan database pegawai di server' });
  }
});

// 3. GET /api/absensi - Get shared attendance records
app.get('/api/absensi', (req, res) => {
  try {
    if (fs.existsSync(ABSENSI_FILE)) {
      const content = fs.readFileSync(ABSENSI_FILE, 'utf-8');
      return res.json(JSON.parse(content));
    }
    return res.json([]);
  } catch {
    return res.json([]);
  }
});

// 4. POST /api/absensi - Save shared attendance records
app.post('/api/absensi', (req, res) => {
  try {
    const records = req.body;
    if (Array.isArray(records)) {
      fs.writeFileSync(ABSENSI_FILE, JSON.stringify(records, null, 2), 'utf-8');
    }
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Gagal menyimpan data absensi di server' });
  }
});

// 5. GET /api/bridge/domain-bridge.js - Download script jembatan domain
app.get('/api/bridge/domain-bridge.js', (req, res) => {
  const filePath = path.join(__dirname, 'domain-bridge.js');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="domain-bridge.js"');
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(filePath);
  }
  return res.status(404).send('File not found');
});

// 6. GET /api/bridge/cloudflare-worker.js - Download script Cloudflare Worker
app.get('/api/bridge/cloudflare-worker.js', (req, res) => {
  const filePath = path.join(__dirname, 'cloudflare-worker.js');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="cloudflare-worker.js"');
    res.setHeader('Content-Type', 'application/javascript');
    return res.sendFile(filePath);
  }
  return res.status(404).send('File not found');
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Absensi Bintek SDA running on port ${PORT}`);
  });
}

startServer();
