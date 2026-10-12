import { Pegawai, AbsensiRecord, SheetConfig } from '../types';

export const DEFAULT_PEGAWAI_LIST: Pegawai[] = [
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

/**
 * Extracts Google Spreadsheet ID from a URL or raw ID string
 */
export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return trimmed;
}

/**
 * Fetch Spreadsheet Metadata (Title and sheet names)
 */
export async function getSpreadsheetMetadata(spreadsheetId: string, accessToken: string) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal mengakses spreadsheet (${res.status})`);
  }

  const data = await res.json();
  const sheetNames = data.sheets?.map((s: any) => s.properties.title) || [];
  return {
    title: data.properties?.title || 'Google Spreadsheet',
    sheets: sheetNames as string[],
  };
}

/**
 * Fetch Pegawai list from the specified sheet tab (default "Data_Pegawai" or "Nama_NIP")
 */
export async function fetchPegawaiFromSheet(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<Pegawai[]> {
  // Try primary sheetName first, or if fails, try alternative between Data_Pegawai / Nama_NIP
  let targetSheet = sheetName;
  let range = encodeURIComponent(`'${targetSheet}'!A1:E200`);
  let res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok && (sheetName === 'Nama_NIP' || sheetName === 'Data_Pegawai')) {
    const alternativeSheet = sheetName === 'Nama_NIP' ? 'Data_Pegawai' : 'Nama_NIP';
    const altRange = encodeURIComponent(`'${alternativeSheet}'!A1:E200`);
    const altRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${altRange}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (altRes.ok) {
      res = altRes;
      targetSheet = alternativeSheet;
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal membaca sheet ${sheetName}`);
  }

  const data = await res.json();
  const values: string[][] = data.values || [];

  if (values.length <= 1) {
    return [];
  }

  // Header detection
  const headerRow = values[0].map((h) => String(h).toLowerCase().trim());
  let nameIndex = headerRow.findIndex((h) => h.includes('nama'));
  let nipIndex = headerRow.findIndex((h) => h.includes('nip'));
  let jabatanIndex = headerRow.findIndex((h) => h.includes('jabatan'));
  let unitIndex = headerRow.findIndex((h) => h.includes('unit') || h.includes('subdit') || h.includes('bagian'));

  // Default fallbacks if no header matches
  if (nameIndex === -1 && values[0].length >= 2) nameIndex = 1;
  if (nipIndex === -1 && values[0].length >= 3) nipIndex = 2;
  if (nameIndex === -1) nameIndex = 0;
  if (nipIndex === -1) nipIndex = 1;

  const pegawaiList: Pegawai[] = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const nama = row[nameIndex]?.trim();
    const nip = row[nipIndex]?.trim();

    if (nama) {
      pegawaiList.push({
        nama,
        nip: nip || '-',
        jabatan: jabatanIndex !== -1 ? row[jabatanIndex]?.trim() : undefined,
        unitKerja: unitIndex !== -1 ? row[unitIndex]?.trim() : undefined,
      });
    }
  }

  return pegawaiList;
}

/**
 * Append a new Pegawai to sheet
 */
export async function appendPegawaiToSheet(
  spreadsheetId: string,
  sheetName: string,
  pegawai: Pegawai,
  accessToken: string
) {
  const range = encodeURIComponent(`'${sheetName}'!A:D`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[pegawai.nama, pegawai.nip, pegawai.jabatan || '-', pegawai.unitKerja || '-']],
      }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal menambahkan pegawai ke Google Sheet');
  }

  return await res.json();
}

/**
 * Delete a specific Pegawai row and rewrite re-sequenced list to sheet
 */
export async function deletePegawaiRowFromSheet(
  spreadsheetId: string,
  sheetName: string,
  updatedPegawaiList: Pegawai[],
  accessToken: string
) {
  // 1. Clear existing rows A2:E500
  const clearRange = encodeURIComponent(`'${sheetName}'!A2:E500`);
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 2. Write back updated rows if any
  if (updatedPegawaiList.length > 0) {
    const writeRange = encodeURIComponent(`'${sheetName}'!A2:E${updatedPegawaiList.length + 1}`);
    const values = updatedPegawaiList.map((p, idx) => [
      idx + 1,
      p.nama,
      p.nip,
      p.jabatan || '-',
      p.unitKerja || '-'
    ]);

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Gagal memperbarui data pegawai setelah penghapusan');
    }
  }
}

/**
 * Clear ALL employee rows in the sheet, keeping row 1 headers intact
 */
export async function clearAllPegawaiFromSheet(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
) {
  const clearRange = encodeURIComponent(`'${sheetName}'!A2:E500`);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal menghapus seluruh baris pegawai di Google Sheet');
  }

  return await res.json();
}

/**
 * Bulk write or import Pegawai list to Google Sheet (either replace all or append)
 */
export async function bulkWritePegawaiToSheet(
  spreadsheetId: string,
  sheetName: string,
  newPegawaiList: Pegawai[],
  mode: 'replace' | 'append',
  currentLength: number,
  accessToken: string
) {
  if (mode === 'replace') {
    // 1. Clear existing rows A2:E500
    const clearRange = encodeURIComponent(`'${sheetName}'!A2:E500`);
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 2. Write all new rows starting from A2
    if (newPegawaiList.length > 0) {
      const writeRange = encodeURIComponent(`'${sheetName}'!A2:E${newPegawaiList.length + 1}`);
      const values = newPegawaiList.map((p, idx) => [
        idx + 1,
        p.nama,
        p.nip,
        p.jabatan || '-',
        p.unitKerja || '-'
      ]);

      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Gagal menulis data import ke Google Sheet');
      }
    }
  } else {
    // Append mode
    const appendRange = encodeURIComponent(`'${sheetName}'!A:E`);
    const values = newPegawaiList.map((p, idx) => [
      currentLength + idx + 1,
      p.nama,
      p.nip,
      p.jabatan || '-',
      p.unitKerja || '-'
    ]);

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Gagal menambahkan data import ke Google Sheet');
    }
  }
}


/**
 * Fetch Absensi list from the specified sheet tab (supports vertical list & horizontal matrix format)
 */
export async function fetchAbsensiFromSheet(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<AbsensiRecord[]> {
  const range = encodeURIComponent(`'${sheetName}'!A1:AZ500`);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gagal membaca sheet ${sheetName}`);
  }

  const data = await res.json();
  const values: string[][] = data.values || [];

  if (values.length <= 1) {
    return [];
  }

  // Check if this is the Horizontal Matrix format like in the attached screenshot:
  // Row 5 (index 4) has NO, NAMA, NIP/NI, and Row 8 (index 7) has Datang, Istirahat, Pulang
  let matrixRowHeaderIndex = -1;
  for (let r = 0; r < Math.min(values.length, 10); r++) {
    const rowStr = values[r]?.map((c) => String(c).toLowerCase().trim()) || [];
    if (rowStr.includes('datang') || (rowStr.includes('no') && values[r + 3]?.map(c => String(c).toLowerCase()).includes('datang'))) {
      matrixRowHeaderIndex = r;
      break;
    }
  }

  // If Matrix format detected
  if (matrixRowHeaderIndex !== -1) {
    const subColRow = values[matrixRowHeaderIndex] || [];
    // Day names and dates are usually 2-3 rows above
    const hariRow = values[matrixRowHeaderIndex - 3] || [];
    const tglRow = values[matrixRowHeaderIndex - 2] || [];

    const records: AbsensiRecord[] = [];
    const dataStartRow = matrixRowHeaderIndex + 1;

    // Scan day blocks starting from column index 3 (Column D)
    for (let i = dataStartRow; i < values.length; i++) {
      const row = values[i];
      if (!row || row.length < 2) continue;
      const nama = row[1]?.trim();
      const nip = row[2]?.trim() || '-';
      if (!nama || nama.toLowerCase() === 'no' || nama.toLowerCase().includes('jumlah')) continue;

      // Scan day columns in steps of 4 (Datang, Istirahat, Pulang, KET)
      for (let col = 3; col < row.length; col += 4) {
        const datang = row[col]?.trim() || '';
        const istirahat = row[col + 1]?.trim() || '';
        const pulang = row[col + 2]?.trim() || '';
        const ket = row[col + 3]?.trim() || '';

        // Extract day name and date
        let hari = hariRow[col]?.trim() || hariRow[col - 1]?.trim() || 'Senin';
        let tanggal = tglRow[col]?.trim() || tglRow[col - 1]?.trim() || '';

        if (datang || pulang || ket) {
          records.push({
            id: `matrix-${i}-${col}`,
            rowIndex: i + 1,
            hari: hari || 'Senin',
            tanggal: tanggal || '',
            nama,
            nip,
            jamMasuk: datang || '-',
            jamIstirahat: istirahat || '-',
            jamPulang: pulang || '-',
            status: pulang && pulang !== '-' ? 'Lengkap' : 'Hadir Tepat Waktu',
            keterangan: ket || '',
          });
        }
      }
    }

    if (records.length > 0) {
      return records;
    }
  }

  // Standard Vertical List Format
  const headerRow = values[0].map((h) => String(h).toLowerCase().trim());
  let hariIdx = headerRow.findIndex((h) => h.includes('hari'));
  let tglIdx = headerRow.findIndex((h) => h.includes('tanggal') || h.includes('tgl'));
  let namaIdx = headerRow.findIndex((h) => h.includes('nama'));
  let nipIdx = headerRow.findIndex((h) => h.includes('nip'));
  let masukIdx = headerRow.findIndex((h) => h.includes('masuk') || h.includes('datang'));
  let pulangIdx = headerRow.findIndex((h) => h.includes('pulang'));
  let statusIdx = headerRow.findIndex((h) => h.includes('status'));
  let ketIdx = headerRow.findIndex((h) => h.includes('keterangan') || h.includes('ket'));

  if (hariIdx === -1) hariIdx = 1;
  if (tglIdx === -1) tglIdx = 2;
  if (namaIdx === -1) namaIdx = 3;
  if (nipIdx === -1) nipIdx = 4;
  if (masukIdx === -1) masukIdx = 5;
  if (pulangIdx === -1) pulangIdx = 6;
  if (statusIdx === -1) statusIdx = 7;
  if (ketIdx === -1) ketIdx = 8;

  const records: AbsensiRecord[] = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.length === 0 || !row[namaIdx]) continue;

    records.push({
      id: `row-${i + 1}`,
      rowIndex: i + 1,
      hari: row[hariIdx] || '',
      tanggal: row[tglIdx] || '',
      nama: row[namaIdx] || '',
      nip: row[nipIdx] || '',
      jamMasuk: row[masukIdx] || '',
      jamPulang: row[pulangIdx] || '-',
      status: (row[statusIdx] as any) || 'Hadir Tepat Waktu',
      keterangan: row[ketIdx] || '',
    });
  }

  return records;
}

/**
 * Append an Absensi record to the Absensi sheet
 */
export async function appendAbsensiRecord(
  spreadsheetId: string,
  sheetName: string,
  record: AbsensiRecord,
  nextNo: number,
  accessToken: string
) {
  const range = encodeURIComponent(`'${sheetName}'!A:I`);
  const rowData = [
    nextNo,
    record.hari,
    record.tanggal,
    record.nama,
    record.nip,
    record.jamMasuk,
    record.jamPulang || '-',
    record.status,
    record.keterangan || '-'
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData],
      }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal menyimpan absensi ke Google Sheet');
  }

  return await res.json();
}

/**
 * Update an existing Absensi row in Google Sheet (e.g., when updating Jam Pulang)
 */
export async function updateAbsensiRecord(
  spreadsheetId: string,
  sheetName: string,
  rowIndex: number,
  record: AbsensiRecord,
  accessToken: string
) {
  const range = encodeURIComponent(`'${sheetName}'!A${rowIndex}:I${rowIndex}`);
  const rowData = [
    rowIndex - 1,
    record.hari,
    record.tanggal,
    record.nama,
    record.nip,
    record.jamMasuk,
    record.jamPulang || '-',
    record.status,
    record.keterangan || '-'
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData],
      }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal memperbarui data absensi di Google Sheet');
  }

  return await res.json();
}

/**
 * Automatically create a brand new structured Attendance Google Spreadsheet
 * with 'Nama_NIP' and 'Absensi' tabs pre-formatted!
 */
export async function createNewAttendanceSpreadsheet(
  title: string,
  accessToken: string
): Promise<{ spreadsheetId: string; url: string }> {
  // Step 1: Create spreadsheet with two sheets
  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: title || 'Absensi Pegawai Direktorat Bina Teknik SDA - Database',
      },
      sheets: [
        {
          properties: {
            title: 'Absensi',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
        {
          properties: {
            title: 'Nama_NIP',
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal membuat Google Spreadsheet baru');
  }

  const created = await res.json();
  const spreadsheetId = created.spreadsheetId;

  // Step 2: Initialize Absensi headers
  const absensiHeaders = [
    ['No', 'Hari', 'Tanggal', 'Nama Pegawai', 'NIP', 'Jam Masuk (Bravo)', 'Jam Pulang (Bravo)', 'Status', 'Keterangan']
  ];
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'Absensi'!A1:I1")}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: absensiHeaders }),
    }
  );

  // Step 3: Initialize Nama_NIP headers and default employees
  const namaNipData = [
    ['No', 'Nama Pegawai', 'NIP', 'Jabatan', 'Unit Kerja / Subdit'],
    ...DEFAULT_PEGAWAI_LIST.map((p, idx) => [idx + 1, p.nama, p.nip, p.jabatan || '-', p.unitKerja || '-'])
  ];

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'Nama_NIP'!A1:E" + namaNipData.length)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: namaNipData }),
    }
  );

  return {
    spreadsheetId,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
  };
}

/**
 * Write or update the Horizontal Matrix Table (Sistem Memanjang)
 * matching the exact format from the official ministry attendance sheet.
 */
export async function writeMatrixLaporanToSheet(
  spreadsheetId: string,
  sheetName: string,
  pegawaiList: Pegawai[],
  days: { hari: string; tanggalStr: string }[],
  records: AbsensiRecord[],
  accessToken: string
) {
  // Title rows
  const row1 = ['', '', '', 'DAFTAR HADIR PEGAWAI'];
  const row2 = ['', '', '', 'SUBBAG. TATA USAHA, DIREKTORAT BINA TEKNIK SUMBER DAYA AIR'];
  const row3 = ['', '', '', 'DIREKTORAT JENDERAL SUMBER DAYA AIR'];
  const row4: string[] = [];

  // Multi-tier header rows
  const row5 = ['NO', 'NAMA', 'NIP/NI'];
  const row6 = ['', '', ''];
  const row7 = ['', '', ''];
  const row8 = ['', '', ''];

  for (const d of days) {
    // Row 5: Hari (spanning 3 cols) + 'K'
    row5.push(d.hari, '', '', 'K');
    // Row 6: Tanggal (spanning 3 cols) + 'E'
    row6.push(d.tanggalStr, '', '', 'E');
    // Row 7: Pukul (spanning 3 cols) + 'T'
    row7.push('Pukul', '', '', 'T');
    // Row 8: Datang, Istirahat, Pulang, ''
    row8.push('Datang', 'Istirahat', 'Pulang', '');
  }

  // Employee rows
  const dataRows: (string | number)[][] = [];

  pegawaiList.forEach((p, idx) => {
    const row: (string | number)[] = [idx + 1, p.nama, p.nip];

    days.forEach((d) => {
      // Find attendance for this employee on this date
      const match = records.find(
        (r) =>
          (r.nip === p.nip || r.nama.toLowerCase() === p.nama.toLowerCase()) &&
          (r.tanggal === d.tanggalStr || r.hari.toLowerCase() === d.hari.toLowerCase())
      );

      if (match) {
        row.push(
          match.jamMasuk && match.jamMasuk !== '-' ? match.jamMasuk : '',
          match.jamIstirahat || (match.jamMasuk ? '12:00' : ''),
          match.jamPulang && match.jamPulang !== '-' ? match.jamPulang : '',
          match.keterangan || (match.status !== 'Hadir Tepat Waktu' ? match.status : '')
        );
      } else {
        row.push('', '', '', '');
      }
    });

    dataRows.push(row);
  });

  const fullGrid = [row1, row2, row3, row4, row5, row6, row7, row8, ...dataRows];

  // Write values to sheet
  const range = encodeURIComponent(`'${sheetName}'!A1:AZ${fullGrid.length}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: fullGrid }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Gagal menyimpan tabel laporan ke Google Sheet');
  }

  return await res.json();
}

