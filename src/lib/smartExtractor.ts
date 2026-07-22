import * as XLSX from "xlsx";

export interface ExtractionResult {
  data: any[];
  detectedFormat: string;
  mappedColumns: { [original: string]: string };
  totalRows: number;
  warnings: string[];
}

// Synonyms map for fuzzy field matching
const FIELD_SYNONYMS: { [targetKey: string]: string[] } = {
  NIP: ["nip", "no. induk", "nomor induk", "id guru", "nuptk", "no induk pegawai", "nik", "kode guru", "id", "nip/id"],
  Nama: ["nama", "nama guru", "nama lengkap", "ustadz", "ustadzah", "pengajar", "guru", "full name", "name", "person", "nama_guru"],
  Unit: ["unit", "lembaga", "tingkat", "jenjang", "sekolah", "smp", "sma", "tmmia", "pondok", "unit_sekolah"],
  NoHP: ["nohp", "no hp", "hp", "telepon", "wa", "whatsapp", "mobile", "phone", "no telp", "kontak", "handphone"],
  Email: ["email", "e-mail", "surel", "mail", "alamat email"],
  IsPiket: ["piket", "guru piket", "is piket", "piket?", "status piket", "ispiket"],
  MataPelajaran: ["mata pelajaran", "mapel", "pengampu", "mengajar", "subject", "pelajaran", "matapelajaran"],
  KodeMapel: ["kode mapel", "kodemapel", "kode", "id mapel", "kode pelajaran", "id_mapel"],
  NamaMapel: ["nama mapel", "namamapel", "nama pelajaran", "mata pelajaran", "mapel", "nama_mapel"],
  KodeKelas: ["kode kelas", "kodekelas", "kelas", "rombongan belajar", "rombel", "id kelas"],
  NamaKelas: ["nama kelas", "namakelas", "kelas", "ruang", "nama_kelas"],
  IdJadwal: ["id jadwal", "idjadwal", "jadwal id", "kode jadwal", "id"],
  Hari: ["hari", "day", "hari mengajar"],
  JamKe: ["jam ke", "jam", "jamke", "periode", "sesi", "ke"],
  Username: ["username", "user", "nama akun", "login", "id user"],
  PasswordRaw: ["password", "pass", "kata sandi", "pin", "passwordraw"],
  Role: ["role", "peran", "jabatan", "hak akses", "level"],
  Status: ["status", "keterangan", "persetujuan", "status izin"],
  Alasan: ["alasan", "keperluan", "alasan izin", "keterangan izin"],
  Materi: ["materi", "pembahasan", "topik", "bab"],
  Tugas: ["tugas", "instruksi", "soal", "tugas siswa"],
  HalamanBuku: ["halaman", "hal", "halaman buku", "halamanbuku"],
  TargetPembelajaran: ["target", "tujuan", "target pembelajaran", "capaian"],
  Instruksi: ["instruksi", "catatan", "pesan"],
  IdIzin: ["id izin", "idizin", "kode izin", "id"],
  Tanggal: ["tanggal", "date", "tgl"],
  JenisIzin: ["jenis izin", "jenisizin", "kategori izin", "tipe izin"],
  NamaGuru: ["nama guru", "namaguru", "guru", "nama"]
};

// Helper to normalize header string for comparison
function normalizeHeader(str: string): string {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
}

// Find best target column for a raw header name
function matchTargetColumn(rawHeader: string, targetSchemaColumns: string[]): string | null {
  const normRaw = normalizeHeader(rawHeader);

  // 1. Direct exact or normalized match with target column
  for (const col of targetSchemaColumns) {
    if (col === rawHeader || normalizeHeader(col) === normRaw) {
      return col;
    }
  }

  // 2. Match via field synonyms dictionary
  for (const col of targetSchemaColumns) {
    const synonyms = FIELD_SYNONYMS[col] || [];
    for (const syn of synonyms) {
      if (normalizeHeader(syn) === normRaw) {
        return col;
      }
    }
  }

  // 3. Partial substring matching
  for (const col of targetSchemaColumns) {
    const normTarget = normalizeHeader(col);
    if (normRaw.includes(normTarget) || normTarget.includes(normRaw)) {
      return col;
    }
  }

  return null;
}

// Smart extraction from Raw JavaScript Objects (from Excel, JSON, etc.)
export function extractDataFromObjects(
  rawRows: any[],
  targetSchemaColumns: string[],
  sheetName: string = "DATA_GURU"
): ExtractionResult {
  const warnings: string[] = [];
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return { data: [], detectedFormat: "Empty", mappedColumns: {}, totalRows: 0, warnings: ["Tidak ada data ditemukan."] };
  }

  // Inspect first row keys
  const sampleRow = rawRows[0];
  const rawHeaders = typeof sampleRow === "object" && sampleRow !== null ? Object.keys(sampleRow) : [];
  const columnMapping: { [orig: string]: string } = {};

  rawHeaders.forEach((raw) => {
    const mapped = matchTargetColumn(raw, targetSchemaColumns);
    if (mapped) {
      columnMapping[raw] = mapped;
    }
  });

  const processedData: any[] = [];

  rawRows.forEach((row, idx) => {
    if (typeof row !== "object" || row === null) return;

    const rowObj: any = {};

    // 1. Map known columns
    Object.keys(columnMapping).forEach((rawKey) => {
      const targetCol = columnMapping[rawKey];
      let val = row[rawKey];

      if (val !== undefined && val !== null) {
        if (targetCol === "IsPiket") {
          rowObj[targetCol] = String(val).toLowerCase() === "true" || String(val) === "1" || String(val).toLowerCase() === "ya";
        } else if (targetCol === "JamKe") {
          rowObj[targetCol] = Number(val) || 1;
        } else if (targetCol === "MataPelajaran" && typeof val === "string") {
          rowObj[targetCol] = val.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        } else {
          rowObj[targetCol] = String(val).trim();
        }
      }
    });

    // 2. Fill missing unmapped columns with intelligent defaults
    targetSchemaColumns.forEach((col) => {
      if (rowObj[col] === undefined) {
        // Fallback search in remaining unmapped raw keys
        let foundUnmappedVal: any = undefined;
        Object.keys(row).forEach((rk) => {
          if (!columnMapping[rk] && matchTargetColumn(rk, [col])) {
            foundUnmappedVal = row[rk];
          }
        });

        if (foundUnmappedVal !== undefined) {
          rowObj[col] = String(foundUnmappedVal).trim();
        } else {
          // Defaults based on target schema
          if (col === "NIP") {
            rowObj[col] = `2026${String(idx + 101).padStart(7, "0")}`;
          } else if (col === "KodeMapel") {
            rowObj[col] = `MAPEL-${String(idx + 1).padStart(3, "0")}`;
          } else if (col === "KodeKelas") {
            rowObj[col] = `KELAS-${String(idx + 1).padStart(2, "0")}`;
          } else if (col === "IdJadwal") {
            rowObj[col] = `J-${String(idx + 101).padStart(3, "0")}`;
          } else if (col === "Username") {
            const seedName = rowObj["Nama"] || `user${idx + 1}`;
            rowObj[col] = String(seedName).toLowerCase().replace(/[^a-z0-9]/g, "");
          } else if (col === "PasswordRaw") {
            rowObj[col] = "ypialghozali2026";
          } else if (col === "Role") {
            rowObj[col] = "Guru";
          } else if (col === "Unit") {
            rowObj[col] = "SMP";
          } else if (col === "IsPiket") {
            rowObj[col] = false;
          } else if (col === "JamKe") {
            rowObj[col] = 1;
          } else if (col === "Hari") {
            rowObj[col] = "Senin";
          } else if (col === "Status") {
            rowObj[col] = sheetName === "DATA_IZIN" ? "Menunggu Persetujuan" : "Aktif";
          } else if (col === "CreatedAt" || col === "Timestamp") {
            rowObj[col] = new Date().toISOString();
          } else {
            rowObj[col] = "";
          }
        }
      }
    });

    // Ensure row has at least some meaningful primary field (like Nama or NIP or Kode)
    const primaryValue = rowObj["Nama"] || rowObj["NIP"] || rowObj["KodeMapel"] || rowObj["KodeKelas"] || rowObj["Username"] || rowObj["IdIzin"];
    if (primaryValue) {
      processedData.push(rowObj);
    }
  });

  return {
    data: processedData,
    detectedFormat: "Tabel Terstruktur",
    mappedColumns: columnMapping,
    totalRows: processedData.length,
    warnings,
  };
}

// Smart extraction from Raw Text string (CSV, TSV, Unstructured text lines)
export function extractDataFromText(
  rawText: string,
  targetSchemaColumns: string[],
  sheetName: string = "DATA_GURU"
): ExtractionResult {
  const text = rawText.trim();
  if (!text) {
    return { data: [], detectedFormat: "Text Kosong", mappedColumns: {}, totalRows: 0, warnings: ["Teks masukan kosong."] };
  }

  // 1. Check if input is a valid JSON string
  if ((text.startsWith("[") && text.endsWith("]")) || (text.startsWith("{") && text.endsWith("}"))) {
    try {
      const parsed = JSON.parse(text);
      const rowsArray = Array.isArray(parsed) ? parsed : [parsed];
      return extractDataFromObjects(rowsArray, targetSchemaColumns, sheetName);
    } catch (e) {
      // Continue to line parsing if JSON parse failed
    }
  }

  // 2. Line by line parsing for CSV / TSV / Key-Value
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { data: [], detectedFormat: "Baris Kosong", mappedColumns: {}, totalRows: 0, warnings: ["Teks tidak berisi baris data."] };
  }

  // Detect delimiter
  const firstLine = lines[0];
  let delimiter = "\t"; // default paste from Excel / Google Sheets
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";")) delimiter = ";";
  else if (firstLine.includes(",")) delimiter = ",";
  else if (firstLine.includes("|")) delimiter = "|";

  // Check if first line contains headers
  const firstLineCells = firstLine.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
  const hasHeaders = firstLineCells.some((cell) => matchTargetColumn(cell, targetSchemaColumns) !== null);

  let dataLines = lines;
  let headers = targetSchemaColumns;

  if (hasHeaders) {
    headers = firstLineCells;
    dataLines = lines.slice(1);
  }

  const rawRows: any[] = [];

  dataLines.forEach((line) => {
    // Check if line is Key: Value format (e.g. "Nama: Ustadz Ahmad")
    if (line.includes(":") && !line.includes(delimiter)) {
      const parts = line.split(":");
      const key = parts[0].trim();
      const val = parts.slice(1).join(":").trim();
      rawRows.push({ [key]: val });
      return;
    }

    const cells = line.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const rowObj: any = {};
    cells.forEach((cell, idx) => {
      const headerName = headers[idx] || `Kolom_${idx + 1}`;
      rowObj[headerName] = cell;
    });
    rawRows.push(rowObj);
  });

  return extractDataFromObjects(rawRows, targetSchemaColumns, sheetName);
}

// Smart extraction directly from uploaded File (.xlsx, .xls, .csv, .txt, .json, .pdf)
export async function parseUploadedFile(
  file: File,
  targetSchemaColumns: string[],
  sheetName: string = "DATA_GURU"
): Promise<ExtractionResult> {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith(".pdf")) {
    try {
      const pdfText = await extractPdfText(file);
      if (sheetName === "DATA_JADWAL" || targetSchemaColumns.includes("JamKe")) {
        const scheduleItems = parseScheduleTextToItems(pdfText);
        return {
          data: scheduleItems,
          detectedFormat: `PDF Dokumen (${file.name})`,
          mappedColumns: { Text: "Tabel Jadwal" },
          totalRows: scheduleItems.length,
          warnings: scheduleItems.length === 0 ? ["Tidak ada pola jadwal yang terdeteksi secara langsung."] : []
        };
      } else {
        const result = extractDataFromText(pdfText, targetSchemaColumns, sheetName);
        result.detectedFormat = `PDF Dokumen (${file.name})`;
        return result;
      }
    } catch (e: any) {
      console.warn("Client PDF extraction error:", e);
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          const workbook = XLSX.read(buffer, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawObjects = XLSX.utils.sheet_to_json(worksheet);

          if (sheetName === "DATA_JADWAL" || targetSchemaColumns.includes("JamKe")) {
            // Also check if rawObjects contains tabular schedule or standard objects
            const stdResult = extractDataFromObjects(rawObjects, targetSchemaColumns, sheetName);
            if (stdResult.data.length > 0) {
              stdResult.detectedFormat = `Excel Spreadsheet (${file.name})`;
              resolve(stdResult);
              return;
            }
            // Fallback parse sheet text
            const csvText = XLSX.utils.sheet_to_csv(worksheet);
            const scheduleItems = parseScheduleTextToItems(csvText);
            resolve({
              data: scheduleItems,
              detectedFormat: `Excel Spreadsheet (${file.name})`,
              mappedColumns: { Sheet: "Matriks Jadwal" },
              totalRows: scheduleItems.length,
              warnings: []
            });
            return;
          }

          const result = extractDataFromObjects(rawObjects, targetSchemaColumns, sheetName);
          result.detectedFormat = `Excel Spreadsheet (${file.name})`;
          resolve(result);
        } catch (err) {
          reject(new Error("Gagal membaca berkas Excel. Pastikan format file tidak rusak."));
        }
      };
      reader.readAsBinaryString(file);
    } else {
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (sheetName === "DATA_JADWAL" || targetSchemaColumns.includes("JamKe")) {
            const stdResult = extractDataFromText(content, targetSchemaColumns, sheetName);
            if (stdResult.data.length > 0) {
              stdResult.detectedFormat = `Berkas Teks / CSV (${file.name})`;
              resolve(stdResult);
              return;
            }
            const scheduleItems = parseScheduleTextToItems(content);
            resolve({
              data: scheduleItems,
              detectedFormat: `Berkas Teks / CSV (${file.name})`,
              mappedColumns: { Text: "Matriks Jadwal" },
              totalRows: scheduleItems.length,
              warnings: []
            });
            return;
          }
          const result = extractDataFromText(content, targetSchemaColumns, sheetName);
          result.detectedFormat = `Berkas Teks / CSV (${file.name})`;
          resolve(result);
        } catch (err) {
          reject(new Error("Gagal membaca isi berkas teks."));
        }
      };
      reader.readAsText(file);
    }
  });
}

// Client-side PDF reader using pdfjs-dist
async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "3.11.174"}/pdf.worker.min.js`;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
      fullText += `\n--- Halaman ${i} ---\n` + pageText;
    }

    return fullText;
  } catch (err) {
    console.warn("pdfjs-dist parse error, attempting binary string fallback:", err);
    // Rough binary text extraction fallback
    const bytes = new Uint8Array(arrayBuffer);
    let str = "";
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] >= 32 && bytes[i] <= 126) {
        str += String.fromCharCode(bytes[i]);
      } else if (bytes[i] === 10 || bytes[i] === 13) {
        str += "\n";
      }
    }
    return str;
  }
}

// Intelligent schedule parser for unstructured texts (PDFs, docs, tables)
export function parseScheduleTextToItems(text: string): any[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: any[] = [];

  const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  let currentDay = "Senin";
  let currentGuru = "";
  let currentNip = "";

  lines.forEach((line, idx) => {
    // 1. Check for Day line
    for (const d of DAYS) {
      if (line.toLowerCase().includes(d.toLowerCase())) {
        currentDay = d;
        break;
      }
    }

    // 2. Check for NIP or Teacher Name
    const nipMatch = line.match(/(19\d{16}|20\d{16}|\d{18}|\d{10})/);
    if (nipMatch) {
      currentNip = nipMatch[1];
    }

    if (line.toLowerCase().includes("ustadz") || line.toLowerCase().includes("guru") || line.toLowerCase().includes("nama:")) {
      currentGuru = line.replace(/^(nama|guru|ustadz|ustadzah|pengajar)\s*:\s*/i, "").trim();
    }

    // 3. Extract time/hour & subject & class
    // Look for patterns like: "Jam 1 7A PAI" or "1 | 8B | Matematika" or "Jam ke 2: IPA (9C)"
    const jamMatch = line.match(/(?:jam\s*ke|jam\s*|\b)([1-9]|10)\b/i);
    if (jamMatch) {
      const jamKe = parseInt(jamMatch[1], 10);

      // Extract class like 7A, 8B, 9C, X-IPA, XI-IPS, TMMIA-1, 7-A
      const classMatch = line.match(/\b([789]|X|XI|XII|TMMIA)[-\s]?([A-Z0-9]+)?\b/i);
      const kodeKelas = classMatch ? classMatch[0].toUpperCase() : "7A";

      // Subject extraction
      let kodeMapel = line
        .replace(jamMatch[0], "")
        .replace(classMatch ? classMatch[0] : "", "")
        .replace(/(senin|selasa|rabu|kamis|jumat|sabtu)/gi, "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim();

      if (!kodeMapel || kodeMapel.length < 2) {
        kodeMapel = "Pelajaran Umum";
      }

      items.push({
        IdJadwal: `J-${String(items.length + 101).padStart(3, "0")}`,
        NIP: currentNip || `2026${String(items.length + 101).padStart(7, "0")}`,
        NamaGuruMatched: currentGuru || "Guru Pengajar",
        Hari: currentDay,
        JamKe: jamKe,
        KodeMapel: kodeMapel.substring(0, 20),
        KodeKelas: kodeKelas
      });
    }
  });

  // If no items were extracted via strict regex, create structured fallback from readable chunks
  if (items.length === 0 && lines.length > 0) {
    lines.forEach((l, i) => {
      if (l.length > 5) {
        const day = DAYS[i % DAYS.length];
        const hour = (i % 8) + 1;
        items.push({
          IdJadwal: `J-${String(i + 101).padStart(3, "0")}`,
          NIP: `2026${String(i + 101).padStart(7, "0")}`,
          NamaGuruMatched: "Guru Pengajar",
          Hari: day,
          JamKe: hour,
          KodeMapel: l.substring(0, 15),
          KodeKelas: "7A"
        });
      }
    });
  }

  return items;
}
