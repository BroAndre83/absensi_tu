import * as XLSX from 'xlsx';
import { Pegawai } from '../types';

/**
 * Export Pegawai list to an Excel (.xlsx) file
 */
export function exportPegawaiToExcel(
  pegawaiList: Pegawai[],
  sheetName = 'Data_Pegawai',
  filename = 'Database_Pegawai_Dit_Bintek_SDA.xlsx'
) {
  const formattedData = pegawaiList.map((p, idx) => ({
    'No': idx + 1,
    'Nama Pegawai': p.nama,
    'NIP': p.nip,
    'Jabatan': p.jabatan || '-',
    'Unit Kerja / Subdit': p.unitKerja || 'Direktorat Bina Teknik Sumber Daya Air'
  }));

  const ws = XLSX.utils.json_to_sheet(formattedData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 35 }, // Nama Pegawai
    { wch: 25 }, // NIP
    { wch: 32 }, // Jabatan
    { wch: 32 }  // Unit Kerja
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31) || 'Data_Pegawai');
  XLSX.writeFile(wb, filename);
}

/**
 * Download standard Excel template for employee data import
 */
export function downloadTemplateExcel(filename = 'Template_Import_Pegawai_Bintek_SDA.xlsx') {
  const sampleData = [
    {
      'No': 1,
      'Nama Pegawai': 'Ir. Muhammad Rizal, M.Eng.',
      'NIP': '197805122002121001',
      'Jabatan': 'Pembina Utama Muda',
      'Unit Kerja / Subdit': 'Subdit Data & TI SDA'
    },
    {
      'No': 2,
      'Nama Pegawai': 'Siti Rahmawati, S.T., M.Sc.',
      'NIP': '198503142008012003',
      'Jabatan': 'Penata Tk.I',
      'Unit Kerja / Subdit': 'Subdit Teknik Hidrologi'
    },
    {
      'No': 3,
      'Nama Pegawai': 'Agus Setiawan, S.T.',
      'NIP': '199009182014021002',
      'Jabatan': 'Penata Muda Tk.I',
      'Unit Kerja / Subdit': 'Subdit Irigasi & Rawa'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 25 },
    { wch: 30 },
    { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template_Pegawai');
  XLSX.writeFile(wb, filename);
}

/**
 * Read and parse an Excel (.xlsx, .xls) or CSV file into Pegawai[]
 */
export function parseExcelFile(file: File): Promise<Pegawai[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });

        if (!wb.SheetNames.length) {
          throw new Error('File Excel tidak memiliki lembar kerja (sheet).');
        }

        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rawRows || rawRows.length <= 1) {
          throw new Error('File Excel kosong atau hanya berisi baris judul.');
        }

        // Header column detection
        const headerRow = rawRows[0].map((h) => String(h || '').toLowerCase().trim());
        let nameIdx = headerRow.findIndex((h) => h.includes('nama'));
        let nipIdx = headerRow.findIndex((h) => h.includes('nip'));
        let jabIdx = headerRow.findIndex((h) => h.includes('jabatan'));
        let unitIdx = headerRow.findIndex((h) => h.includes('unit') || h.includes('subdit') || h.includes('bagian'));

        // Fallbacks if header doesn't explicitly match
        if (nameIdx === -1 && rawRows[0].length >= 2) nameIdx = 1;
        if (nipIdx === -1 && rawRows[0].length >= 3) nipIdx = 2;
        if (nameIdx === -1) nameIdx = 0;
        if (nipIdx === -1) nipIdx = 1;

        const parsedList: Pegawai[] = [];

        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const nama = String(row[nameIdx] || '').trim();
          let nip = String(row[nipIdx] || '').trim();

          // Clean NIP scientific notations or spaces if any
          if (nip.includes('e+') || nip.includes('E+')) {
            nip = String(Number(nip));
          }

          if (nama && nama.toLowerCase() !== 'nama' && nama.toLowerCase() !== 'nama pegawai') {
            parsedList.push({
              nama,
              nip: nip || '-',
              jabatan: jabIdx !== -1 && row[jabIdx] ? String(row[jabIdx]).trim() : undefined,
              unitKerja: unitIdx !== -1 && row[unitIdx] ? String(row[unitIdx]).trim() : undefined,
            });
          }
        }

        if (parsedList.length === 0) {
          throw new Error('Tidak ditemukan data pegawai yang valid dalam file Excel tersebut.');
        }

        resolve(parsedList);
      } catch (err: any) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file dari komputer.'));
    };

    reader.readAsArrayBuffer(file);
  });
}
