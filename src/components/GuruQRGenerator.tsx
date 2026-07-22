import React, { useState, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Guru } from "../types";
import {
  QrCode,
  Download,
  Printer,
  Search,
  CheckCircle2,
  Sparkles,
  User,
  ShieldCheck,
  Building,
  CreditCard,
  FileText
} from "lucide-react";

interface Props {
  guruList: Guru[];
  onNotify: (message: string, type: "success" | "error" | "info") => void;
}

export default function GuruQRGenerator({ guruList, onNotify }: Props) {
  const [selectedNip, setSelectedNip] = useState<string>(guruList[0]?.NIP || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<string>("Semua");
  const [cardTheme, setCardTheme] = useState<"teal" | "slate" | "emerald">("teal");
  const cardRef = useRef<HTMLDivElement>(null);

  const selectedTeacher = guruList.find((g) => g.NIP === selectedNip) || guruList[0];

  // Filter teacher list for quick selection
  const filteredTeachers = guruList.filter((g) => {
    const matchesSearch =
      g.Nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.NIP.includes(searchQuery);
    const matchesUnit = selectedUnit === "Semua" || g.Unit === selectedUnit;
    return matchesSearch && matchesUnit;
  });

  // Payload encoded in QR Code
  const getQRPayload = (teacher: Guru) => {
    return JSON.stringify({
      nip: teacher.NIP,
      nama: teacher.Nama,
      unit: teacher.Unit,
      type: "ALGHOZALI_GURU_ID",
      issuedAt: "2026-07-21"
    });
  };

  // Download individual QR SVG
  const downloadQR = (teacher: Guru) => {
    const svgElement = document.getElementById(`qr-code-svg-${teacher.NIP}`);
    if (!svgElement) {
      onNotify("Gagal menemukan elemen QR Code.", "error");
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = 512;
      canvas.height = 512;
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, 512, 512);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR_Guru_${teacher.NIP}_${teacher.Nama.replace(/\s+/g, "_")}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
        onNotify(`QR Code untuk ${teacher.Nama.split(",")[0]} berhasil diunduh.`, "success");
      }
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Print all badges / selected badge
  const printBadges = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono text-[10px] font-bold uppercase tracking-wider">
              Generator Identitas Digital
            </span>
          </div>
          <h3 className="text-lg font-bold">Kartu ID & Generator QR Code Guru</h3>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Hasilkan dan cetak Kartu ID digital resmi Yayasan Pendidikan Islam Pondok Modern Al-Ghozali yang dilengkapi QR Code terenkripsi untuk presensi otomatis di gerbang utama sekolah.
          </p>
        </div>

        <button
          onClick={printBadges}
          className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center space-x-2 shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Semua Kartu ID</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Teacher Selector & Search */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
              <User className="w-4 h-4 text-teal-600" />
              <span>Pilih Data Guru ({filteredTeachers.length})</span>
            </h4>
          </div>

          {/* Unit Filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {["Semua", "SMP", "SMA", "TMMIA", "Pondok"].map((unit) => (
              <button
                key={unit}
                onClick={() => setSelectedUnit(unit)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  selectedUnit === unit
                    ? "bg-teal-700 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                {unit}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari NIP / Nama Guru..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Teacher List */}
          <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
            {filteredTeachers.map((teacher) => {
              const isSelected = selectedTeacher?.NIP === teacher.NIP;
              return (
                <div
                  key={teacher.NIP}
                  onClick={() => setSelectedNip(teacher.NIP)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? "bg-teal-50 dark:bg-teal-950/30 border-teal-500 shadow-sm"
                      : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                      {teacher.FotoUrl ? (
                        <img
                          src={teacher.FotoUrl}
                          alt={teacher.Nama}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        teacher.Nama.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {teacher.Nama}
                      </h5>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        NIP: {teacher.NIP} • {teacher.Unit}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        isSelected
                          ? "bg-teal-600 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {isSelected ? "Terpilih" : "Pilih"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Live Digital Card Preview & Actions */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                  <CreditCard className="w-4 h-4 text-teal-600" />
                  <span>Pratinjau Kartu ID Digital Guru</span>
                </h4>
                <p className="text-[11px] text-slate-400">Pilih tema warna kartu ID di bawah ini</p>
              </div>

              {/* Theme Switcher */}
              <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                <button
                  onClick={() => setCardTheme("teal")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    cardTheme === "teal" ? "bg-teal-700 text-white shadow-xs" : "text-slate-500"
                  }`}
                >
                  Teal
                </button>
                <button
                  onClick={() => setCardTheme("slate")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    cardTheme === "slate" ? "bg-slate-800 text-white shadow-xs" : "text-slate-500"
                  }`}
                >
                  Slate
                </button>
                <button
                  onClick={() => setCardTheme("emerald")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    cardTheme === "emerald" ? "bg-emerald-700 text-white shadow-xs" : "text-slate-500"
                  }`}
                >
                  Emerald
                </button>
              </div>
            </div>

            {/* THE CARD PREVIEW */}
            {selectedTeacher && (
              <div className="flex justify-center py-2">
                <div
                  ref={cardRef}
                  className={`w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden transition-all duration-300 border border-white/10 ${
                    cardTheme === "teal"
                      ? "bg-gradient-to-br from-teal-900 via-slate-900 to-teal-950"
                      : cardTheme === "slate"
                      ? "bg-gradient-to-br from-slate-900 via-slate-950 to-zinc-900"
                      : "bg-gradient-to-br from-emerald-900 via-slate-900 to-teal-950"
                  }`}
                >
                  {/* Decorative background watermarks */}
                  <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-teal-500/10 blur-2xl pointer-events-none"></div>
                  <div className="absolute -left-12 -top-12 w-40 h-40 rounded-full bg-emerald-500/10 blur-xl pointer-events-none"></div>

                  {/* Header Logo & Header Text */}
                  <div className="flex items-center space-x-3 border-b border-white/15 pb-4 relative z-10">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-1.5 flex items-center justify-center shrink-0">
                      <Building className="w-6 h-6 text-teal-300" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-teal-300 font-mono block">
                        YPI PONDOK MODERN AL-GHOZALI
                      </span>
                      <h4 className="text-xs font-black tracking-tight text-white leading-snug">
                        KARTU IDENTITAS RESMI GURU
                      </h4>
                      <span className="text-[8px] text-slate-300 font-mono block">
                        Presensi Gerbang & Integrasi KBM
                      </span>
                    </div>
                  </div>

                  {/* Card Body: Photo + Info + QR */}
                  <div className="mt-5 grid grid-cols-12 gap-4 items-center relative z-10">
                    {/* Left: Photo & Teacher Details */}
                    <div className="col-span-7 space-y-3">
                      <div className="w-16 h-20 rounded-xl border-2 border-teal-400/40 bg-slate-800 shadow-md overflow-hidden relative">
                        {selectedTeacher.FotoUrl ? (
                          <img
                            src={selectedTeacher.FotoUrl}
                            alt={selectedTeacher.Nama}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-teal-950 text-teal-300">
                            <User className="w-8 h-8" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-teal-950/80 text-[7px] text-center font-bold text-teal-200 py-0.5">
                          {selectedTeacher.Unit}
                        </div>
                      </div>

                      <div>
                        <h5 className="text-xs font-extrabold text-white leading-snug line-clamp-2">
                          {selectedTeacher.Nama}
                        </h5>
                        <p className="text-[10px] font-mono font-bold text-teal-300 mt-0.5">
                          NIP: {selectedTeacher.NIP}
                        </p>
                      </div>

                      <div className="text-[9px] text-slate-300 space-y-0.5 pt-1 border-t border-white/10">
                        <div className="flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Piket: {selectedTeacher.IsPiket ? "Aktif" : "Non-Piket"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Crisp QR Code Box */}
                    <div className="col-span-5 flex flex-col items-center justify-center space-y-2">
                      <div className="p-2.5 bg-white rounded-2xl shadow-xl border border-teal-200/50 flex items-center justify-center">
                        <QRCodeSVG
                          id={`qr-code-svg-${selectedTeacher.NIP}`}
                          value={getQRPayload(selectedTeacher)}
                          size={110}
                          level="H"
                          includeMargin={false}
                        />
                      </div>
                      <span className="text-[8px] font-mono text-teal-200 font-bold tracking-wider uppercase text-center">
                        SCAN DI GERBANG
                      </span>
                    </div>
                  </div>

                  {/* Card Footer Bar */}
                  <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[8px] text-slate-400 font-mono relative z-10">
                    <span>Sistem Informasi Perizinan Guru</span>
                    <span>Tahun Ajaran 2026/2027</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {selectedTeacher && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => downloadQR(selectedTeacher)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Gambar QR Code (.PNG)</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Kartu ID Ini</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable Badges Grid View for Window Print */}
      <div className="hidden print:block space-y-6">
        <div className="text-center pb-4 border-b">
          <h2 className="text-xl font-bold uppercase">Yayasan Pendidikan Islam Pondok Modern Al-Ghozali</h2>
          <p className="text-xs">Daftar Cetak Kartu ID & QR Code Presensi Guru</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {filteredTeachers.map((teacher) => (
            <div
              key={teacher.NIP}
              className="p-4 border-2 border-slate-800 rounded-2xl bg-white text-slate-900 space-y-3 page-break-inside-avoid"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <span className="text-[9px] font-bold uppercase block text-teal-800">YPI PONDOK MODERN AL-GHOZALI</span>
                  <h4 className="text-xs font-extrabold">KARTU PRESENSI GURU</h4>
                </div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-slate-100 border rounded">
                  {teacher.Unit}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h5 className="text-sm font-bold">{teacher.Nama}</h5>
                  <p className="text-xs font-mono font-bold">NIP: {teacher.NIP}</p>
                  <p className="text-[10px] text-slate-600">No. HP: {teacher.NoHP}</p>
                </div>

                <div className="p-2 border rounded-xl bg-white shrink-0">
                  <QRCodeSVG
                    value={getQRPayload(teacher)}
                    size={90}
                    level="H"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
