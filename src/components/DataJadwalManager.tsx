import React, { useState, useEffect, useRef } from "react";
import {
  Calendar,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Search,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Download,
  Filter,
  Users,
  BookOpen,
  Layers,
  Save,
  X
} from "lucide-react";
import { Guru, Jadwal, Mapel, Kelas } from "../types";
import { parseUploadedFile } from "../lib/smartExtractor";

interface Props {
  jadwalList: Jadwal[];
  guruList: Guru[];
  mapelList: Mapel[];
  kelasList: Kelas[];
  onRefreshAllData: () => void;
  onNotify: (message: string, type: "success" | "error" | "info") => void;
}

interface ParsedItem {
  IdJadwal?: string;
  NIP: string;
  NamaGuruMatched?: string;
  Hari: string;
  JamKe: number;
  KodeMapel: string;
  KodeKelas: string;
}

export default function DataJadwalManager({
  jadwalList,
  guruList,
  mapelList,
  kelasList,
  onRefreshAllData,
  onNotify
}: Props) {
  // Filters & State
  const [selectedHari, setSelectedHari] = useState<string>("Semua");
  const [selectedUnit, setSelectedUnit] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedPreviewItems, setParsedPreviewItems] = useState<ParsedItem[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);

  // Add/Edit manual modal state
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Jadwal | null>(null);
  const [formData, setFormData] = useState<{
    IdJadwal?: string;
    NIP: string;
    Hari: string;
    JamKe: number;
    KodeMapel: string;
    KodeKelas: string;
  }>({
    NIP: "",
    Hari: "Senin",
    JamKe: 1,
    KodeMapel: "",
    KodeKelas: ""
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filtered List
  const filteredJadwal = jadwalList.filter((j) => {
    if (selectedHari !== "Semua" && j.Hari !== selectedHari) return false;

    // Filter by unit via class or teacher
    if (selectedUnit !== "Semua") {
      const guru = guruList.find((g) => g.NIP === j.NIP);
      if (guru && guru.Unit !== selectedUnit) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const guru = guruList.find((g) => g.NIP === j.NIP);
      const matchGuru = guru?.Nama.toLowerCase().includes(q) || j.NIP.includes(q);
      const matchMapel = j.KodeMapel.toLowerCase().includes(q);
      const matchKelas = j.KodeKelas.toLowerCase().includes(q);
      if (!matchGuru && !matchMapel && !matchKelas) return false;
    }

    return true;
  });

  // Handle File Upload and AI Gemini Parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsParsing(true);
    setShowUploadModal(true);

    try {
      let extractedItems: ParsedItem[] = [];

      // Try server AI parser first
      try {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/jadwal/upload-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileData: base64Data
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            extractedItems = data.items;
          }
        }
      } catch (srvErr) {
        console.warn("Server AI parse failed/unavailable, switching to smart client parser:", srvErr);
      }

      // Fallback to Smart Client-Side Extractor (supports PDF, Excel, CSV, JSON)
      if (extractedItems.length === 0) {
        const clientResult = await parseUploadedFile(
          file,
          ["IdJadwal", "NIP", "Hari", "JamKe", "KodeMapel", "KodeKelas"],
          "DATA_JADWAL"
        );
        extractedItems = clientResult.data as ParsedItem[];
      }

      setParsedPreviewItems(extractedItems);
      if (extractedItems.length > 0) {
        onNotify(`Pengekstrakan Pintar berhasil menemukan ${extractedItems.length} baris jadwal dari berkas ${file.name}!`, "success");
      } else {
        onNotify(`Tidak ditemukan tabel jadwal pada berkas ${file.name}. Silakan tinjau isi berkas.`, "info");
      }
    } catch (err: any) {
      onNotify(`Gagal membaca/mengurai berkas: ${err.message}`, "error");
    } finally {
      setIsParsing(false);
    }
  };

  // Handle Batch Save
  const handleBatchSave = async (replaceAll: boolean) => {
    if (parsedPreviewItems.length === 0) return;

    setIsSavingBatch(true);
    try {
      let savedViaServer = false;

      // 1. Attempt server save
      try {
        const res = await fetch("/api/jadwal/batch-save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: parsedPreviewItems,
            replaceAll
          })
        });
        if (res.ok) {
          savedViaServer = true;
        }
      } catch (e) {
        console.warn("Server batch-save failed/unavailable, using direct GAS / Client sync.");
      }

      // 2. Direct GAS (Google Apps Script) Endpoint Sync for Vercel
      const gasUrl = localStorage.getItem("gas_webapp_url") || "https://script.google.com/macros/s/AKfycbwDI7Z5nf8wemlqrBDNJSS43DXt8CoAr7HEsviNtBzueFD2gsvgnBwZH9hXxK-3J1drPg/exec";
      if (gasUrl) {
        for (const item of parsedPreviewItems) {
          try {
            await fetch(gasUrl, {
              method: "POST",
              mode: "no-cors",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "addTableRow",
                tableName: "DATA_JADWAL",
                keyColumn: "IdJadwal",
                keyValue: item.IdJadwal || `J-${Math.random().toString(36).substr(2, 6)}`,
                rowData: item
              })
            });
          } catch (e) {
            // ignore CORS no-response
          }
        }
      }

      onNotify(
        replaceAll
          ? `Database jadwal berhasil diperbarui dengan ${parsedPreviewItems.length} data baru.`
          : `Menambahkan ${parsedPreviewItems.length} jadwal baru ke database.`,
        "success"
      );

      setShowUploadModal(false);
      setParsedPreviewItems([]);
      onRefreshAllData();
    } catch (err: any) {
      onNotify(`Gagal menyimpan jadwal: ${err.message}`, "error");
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Manual Add or Edit Save
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.NIP || !formData.KodeMapel || !formData.KodeKelas) {
      onNotify("Mohon lengkapi seluruh field NIP, Mapel, dan Kelas.", "error");
      return;
    }

    try {
      if (editingItem) {
        // Edit existing
        const res = await fetch(`/api/db/DATA_JADWAL/IdJadwal`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          onNotify("Jadwal mengajar berhasil diperbarui.", "success");
        }
      } else {
        // Add new
        const newRecord = {
          ...formData,
          IdJadwal: `J-${Date.now()}`
        };
        const res = await fetch(`/api/db/DATA_JADWAL`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newRecord)
        });
        if (res.ok) {
          onNotify("Jadwal mengajar baru berhasil ditambahkan.", "success");
        }
      }

      setShowFormModal(false);
      setEditingItem(null);
      onRefreshAllData();
    } catch (err: any) {
      onNotify("Gagal menyimpan jadwal manual.", "error");
    }
  };

  // Handle Delete Item
  const handleDelete = async (idJadwal: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus jadwal ini dari database?")) return;

    try {
      const res = await fetch(`/api/db/DATA_JADWAL/IdJadwal/${idJadwal}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onNotify("Baris jadwal berhasil dihapus.", "success");
        onRefreshAllData();
      }
    } catch (e) {
      onNotify("Gagal menghapus jadwal.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner & Action Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping"></span>
            <span className="text-[10px] font-mono text-teal-300 uppercase font-extrabold tracking-widest">
              Ruang Administrator • Database KBM
            </span>
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            DATABASE & IMPORT JADWAL MENGAJAR (DATA_JADWAL)
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Kelola jadwal mengajar seluruh guru YPI Pondok Modern Al-Ghozali. Unggah berkas dokumen jadwal dalam format PDF, Word, Excel, Gambar, atau Markdown untuk diekstrak secara otomatis oleh AI Gemini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* File Upload Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp,.md,.txt"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-teal-500/20 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Jadwal (PDF/Word/Excel/Gambar/MD)</span>
          </button>

          {/* Manual Add Button */}
          <button
            onClick={() => {
              setEditingItem(null);
              setFormData({
                NIP: guruList[0]?.NIP || "",
                Hari: "Senin",
                JamKe: 1,
                KodeMapel: mapelList[0]?.KodeMapel || "",
                KodeKelas: kelasList[0]?.KodeKelas || ""
              });
              setShowFormModal(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Manual</span>
          </button>
        </div>
      </div>

      {/* Supported Document Formats Indicator Pills */}
      <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <span className="font-bold text-slate-700 dark:text-slate-300">Format Dokumen Didukung AI Gemini:</span>
        </div>
        <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200">
            📄 PDF (.pdf)
          </span>
          <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200">
            📝 Word (.docx, .doc)
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
            📊 Excel (.xlsx, .xls, .csv)
          </span>
          <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200">
            🖼️ Gambar (.jpg, .png)
          </span>
          <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200">
            📑 Markdown / Text (.md, .txt)
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Hari Filter */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Filter Hari
          </label>
          <select
            value={selectedHari}
            onChange={(e) => setSelectedHari(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="Semua">Semua Hari (Senin - Sabtu)</option>
            <option value="Senin">Senin</option>
            <option value="Selasa">Selasa</option>
            <option value="Rabu">Rabu</option>
            <option value="Kamis">Kamis</option>
            <option value="Jumat">Jumat</option>
            <option value="Sabtu">Sabtu</option>
          </select>
        </div>

        {/* Unit Filter */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Filter Unit
          </label>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            <option value="Semua">Semua Unit</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
            <option value="TMMIA">TMMIA</option>
            <option value="Pondok">Pondok</option>
          </select>
        </div>

        {/* Search */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Cari Guru / Mapel / Kelas
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Ketik kata kunci..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* DataTable of Schedule */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Total Jadwal Mengajar Terdaftar: {filteredJadwal.length} Sesi KBM
          </span>
          <button
            onClick={onRefreshAllData}
            className="p-1.5 text-slate-500 hover:text-teal-600 rounded-lg transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 uppercase font-mono text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">ID Jadwal</th>
                <th className="px-4 py-3">Nama Guru / NIP</th>
                <th className="px-4 py-3">Hari</th>
                <th className="px-4 py-3">Jam Ke</th>
                <th className="px-4 py-3">Mata Pelajaran</th>
                <th className="px-4 py-3">Kelas</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-200">
              {filteredJadwal.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Tidak ada data jadwal ditemukan.
                  </td>
                </tr>
              ) : (
                filteredJadwal.map((jadwal) => {
                  const guru = guruList.find((g) => g.NIP === jadwal.NIP);
                  const mapel = mapelList.find((m) => m.KodeMapel === jadwal.KodeMapel);
                  const kelas = kelasList.find((k) => k.KodeKelas === jadwal.KodeKelas);

                  return (
                    <tr key={jadwal.IdJadwal} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                        {jadwal.IdJadwal}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold block text-slate-900 dark:text-white">
                          {guru ? guru.Nama : "Guru NIP " + jadwal.NIP}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {jadwal.NIP}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold text-[10px]">
                          {jadwal.Hari}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold font-mono text-amber-600 dark:text-amber-400">
                        Jam Ke-{jadwal.JamKe}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold block">{mapel ? mapel.NamaMapel : jadwal.KodeMapel}</span>
                        <span className="text-[9px] font-mono text-slate-400">{jadwal.KodeMapel}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-[10px]">
                          {kelas ? kelas.NamaKelas : jadwal.KodeKelas}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setEditingItem(jadwal);
                              setFormData({
                                IdJadwal: jadwal.IdJadwal,
                                NIP: jadwal.NIP,
                                Hari: jadwal.Hari,
                                JamKe: jadwal.JamKe,
                                KodeMapel: jadwal.KodeMapel,
                                KodeKelas: jadwal.KodeKelas
                              });
                              setShowFormModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                            title="Edit Baris"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(jadwal.IdJadwal)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                            title="Hapus Baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Preview Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden animate-fadeIn">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-500/20 rounded-xl text-teal-300">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Hasil Ekstraksi AI Gemini ({uploadedFileName})</h3>
                  <p className="text-[11px] text-slate-300">
                    Tinjau data jadwal yang berhasil diekstrak sebelum disimpan ke database.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {isParsing ? (
                <div className="py-16 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-teal-500 animate-spin mx-auto" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                    AI Gemini sedang mengekstrak tabel jadwal mengajar...
                  </span>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Menganalisis baris, kolom hari, jam ke, mata pelajaran, dan mencocokkan NIP guru...
                  </p>
                </div>
              ) : parsedPreviewItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Tidak ada jadwal yang berhasil diekstrak dari berkas ini. Pastikan berkas memiliki tabel jadwal yang terbaca jelas.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{parsedPreviewItems.length} Sesi Jadwal Berhasil Diekstrak</span>
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 uppercase font-mono text-[9px]">
                        <tr>
                          <th className="p-2.5">No</th>
                          <th className="p-2.5">Guru Matched</th>
                          <th className="p-2.5">NIP</th>
                          <th className="p-2.5">Hari</th>
                          <th className="p-2.5">Jam Ke</th>
                          <th className="p-2.5">Mapel</th>
                          <th className="p-2.5">Kelas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {parsedPreviewItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="p-2.5 font-mono text-[10px] text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                              {item.NamaGuruMatched || item.NIP}
                            </td>
                            <td className="p-2.5 font-mono text-[10px]">{item.NIP}</td>
                            <td className="p-2.5 font-bold text-teal-600">{item.Hari}</td>
                            <td className="p-2.5 font-mono font-bold text-amber-600">Jam {item.JamKe}</td>
                            <td className="p-2.5">{item.KodeMapel}</td>
                            <td className="p-2.5 font-bold">{item.KodeKelas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Pilih metode penyimpanan ke database spreadsheet:
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleBatchSave(false)}
                  disabled={isSavingBatch || parsedPreviewItems.length === 0}
                  className="px-3.5 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingBatch ? "Menyimpan..." : "Tambahkan ke Database Existing"}
                </button>
                <button
                  onClick={() => handleBatchSave(true)}
                  disabled={isSavingBatch || parsedPreviewItems.length === 0}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingBatch ? "Menyimpan..." : "Timpa Seluruh Database Jadwal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Manual Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingItem ? "Edit Baris Jadwal Mengajar" : "Tambah Baris Jadwal Baru"}
              </h3>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveManual} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Guru (NIP)
                </label>
                <select
                  value={formData.NIP}
                  onChange={(e) => setFormData({ ...formData, NIP: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {guruList.map((g) => (
                    <option key={g.NIP} value={g.NIP}>
                      {g.Nama} ({g.Unit}) - NIP: {g.NIP}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Hari
                  </label>
                  <select
                    value={formData.Hari}
                    onChange={(e) => setFormData({ ...formData, Hari: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jam Ke-
                  </label>
                  <select
                    value={formData.JamKe}
                    onChange={(e) => setFormData({ ...formData, JamKe: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((jam) => (
                      <option key={jam} value={jam}>
                        Jam Ke-{jam}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Mata Pelajaran
                </label>
                <select
                  value={formData.KodeMapel}
                  onChange={(e) => setFormData({ ...formData, KodeMapel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {mapelList.map((m) => (
                    <option key={m.KodeMapel} value={m.KodeMapel}>
                      {m.NamaMapel} ({m.KodeMapel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Kelas
                </label>
                <select
                  value={formData.KodeKelas}
                  onChange={(e) => setFormData({ ...formData, KodeKelas: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  {kelasList.map((k) => (
                    <option key={k.KodeKelas} value={k.KodeKelas}>
                      {k.NamaKelas} ({k.KodeKelas})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-600 text-white rounded-xl font-bold shadow-md"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
