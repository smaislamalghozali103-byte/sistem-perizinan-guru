import React, { useState } from "react";
import { SessionUser, Guru, Jadwal, Izin, GuruPengganti, Presensi, Mapel } from "../types";
import GuruPiketQRScanner from "./GuruPiketQRScanner";
import GuruQRGenerator from "./GuruQRGenerator";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import {
  QrCode,
  UserCheck,
  CreditCard,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Search,
  Filter,
  Trash2,
  FileText,
  Bookmark,
  Users,
  PieChart as PieChartIcon
} from "lucide-react";

interface Props {
  user: SessionUser;
  guruList: Guru[];
  jadwalList: Jadwal[];
  izinList: Izin[];
  substituteList: GuruPengganti[];
  mapelList: Mapel[];
  presensiList: Presensi[];
  onRefreshAllData: () => void;
  onNotify: (message: string, type: "success" | "error" | "info") => void;
}

export default function PiketManagementView({
  user,
  guruList,
  jadwalList,
  izinList,
  substituteList,
  mapelList,
  presensiList,
  onRefreshAllData,
  onNotify
}: Props) {
  const [activeSubTab, setActiveSubTab] = useState<"scanner" | "generator" | "permits" | "recap">("scanner");
  const [selectedDateFilter, setSelectedDateFilter] = useState("2026-07-19");
  const [recapSearch, setRecapSearch] = useState("");
  const [selectedUnitFilter, setSelectedUnitFilter] = useState("Semua");

  // Filter presensi list
  const filteredPresensi = presensiList.filter((p) => {
    const matchesDate = !selectedDateFilter || p.Tanggal === selectedDateFilter;
    const matchesSearch =
      p.NamaGuru.toLowerCase().includes(recapSearch.toLowerCase()) ||
      p.NIP.includes(recapSearch);
    const matchesUnit = selectedUnitFilter === "Semua" || p.Unit === selectedUnitFilter;
    return matchesDate && matchesSearch && matchesUnit;
  });

  // Calculate gate stats for selected date
  const totalGuru = guruList.length;
  const activeDatePresensi = presensiList.filter((p) => p.Tanggal === selectedDateFilter);
  const countTepatWaktu = activeDatePresensi.filter((p) => p.StatusHadir === "Hadir Tepat Waktu").length;
  const countTerlambat = activeDatePresensi.filter((p) => p.StatusHadir === "Terlambat").length;
  const countIzin = activeDatePresensi.filter((p) => p.StatusHadir === "Izin" || p.StatusHadir === "Dinas Luar").length;
  const countBelumHadir = Math.max(0, totalGuru - activeDatePresensi.length);

  const totalEvaluated = totalGuru > 0 ? totalGuru : 1;

  const pieChartData = [
    {
      name: "Hadir Tepat Waktu",
      value: countTepatWaktu,
      color: "#10b981",
      pct: ((countTepatWaktu / totalEvaluated) * 100).toFixed(1)
    },
    {
      name: "Terlambat",
      value: countTerlambat,
      color: "#f59e0b",
      pct: ((countTerlambat / totalEvaluated) * 100).toFixed(1)
    },
    {
      name: "Izin / Dinas Luar",
      value: countIzin,
      color: "#3b82f6",
      pct: ((countIzin / totalEvaluated) * 100).toFixed(1)
    },
    {
      name: "Tanpa Keterangan",
      value: countBelumHadir,
      color: "#f43f5e",
      pct: ((countBelumHadir / totalEvaluated) * 100).toFixed(1)
    }
  ];

  // Delete presensi row
  const handleDeletePresensi = async (idPresensi: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus catatan presensi ini?")) return;
    try {
      const res = await fetch(`/api/db/DATA_PRESENSI/IdPresensi/${idPresensi}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onNotify("Data presensi berhasil dihapus.", "success");
        onRefreshAllData();
      } else {
        onNotify("Gagal menghapus data presensi.", "error");
      }
    } catch (e) {
      onNotify("Kesalahan jaringan saat menghapus data.", "error");
    }
  };

  // Export presensi list to CSV
  const exportToCSV = () => {
    const headers = ["IdPresensi", "NIP", "NamaGuru", "Unit", "Tanggal", "WaktuMasuk", "StatusHadir", "PetugasPiket", "Catatan"];
    const rows = filteredPresensi.map((p) => [
      p.IdPresensi,
      p.NIP,
      `"${p.NamaGuru}"`,
      p.Unit,
      p.Tanggal,
      p.WaktuMasuk,
      p.StatusHadir,
      `"${p.PetugasPiket}"`,
      `"${p.Catatan || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Presensi_Gerbang_${selectedDateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify("Rekap presensi berhasil diunduh.", "success");
  };

  const todayPermits = izinList.filter((i) => i.Tanggal === "2026-07-19");

  return (
    <div className="space-y-6">
      {/* Sub Tab Segmented Navigation */}
      <div className="bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-wrap gap-2">
        <button
          onClick={() => setActiveSubTab("scanner")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
            activeSubTab === "scanner"
              ? "bg-teal-700 text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Pemindai QR Gerbang</span>
        </button>

        <button
          onClick={() => setActiveSubTab("generator")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
            activeSubTab === "generator"
              ? "bg-teal-700 text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Generator QR ID Guru</span>
        </button>

        <button
          onClick={() => setActiveSubTab("recap")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
            activeSubTab === "recap"
              ? "bg-teal-700 text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Rekap Presensi ({activeDatePresensi.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("permits")}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
            activeSubTab === "permits"
              ? "bg-teal-700 text-white shadow-md"
              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Perizinan & Guru Pengganti ({todayPermits.length})</span>
        </button>
      </div>

      {/* SUB TAB CONTENT 1: SCANNER */}
      {activeSubTab === "scanner" && (
        <GuruPiketQRScanner
          user={user}
          guruList={guruList}
          jadwalList={jadwalList}
          izinList={izinList}
          presensiList={presensiList}
          onRefreshAllData={onRefreshAllData}
          onNotify={onNotify}
        />
      )}

      {/* SUB TAB CONTENT 2: GENERATOR */}
      {activeSubTab === "generator" && (
        <GuruQRGenerator guruList={guruList} onNotify={onNotify} />
      )}

      {/* SUB TAB CONTENT 3: RECAP TABLE */}
      {activeSubTab === "recap" && (
        <div className="space-y-6">
          {/* Pie Chart & Gate Counters Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Pie Chart Card */}
            <div className="lg:col-span-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    <PieChartIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      Diagram Lingkaran Kehadiran Guru
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Persentase status presensi tanggal <span className="font-mono font-bold">{selectedDateFilter}</span>
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[10px] font-bold">
                  Total: {totalGuru} Guru
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* Recharts Pie Chart */}
                <div className="md:col-span-6 h-52 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          `${val} Guru (${((Number(val) / totalEvaluated) * 100).toFixed(1)}%)`,
                          name
                        ]}
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "12px",
                          color: "#fff",
                          fontSize: "12px",
                          fontWeight: "bold"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center Text Badge */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-slate-900 dark:text-white font-mono">
                      {(((countTepatWaktu + countTerlambat) / totalEvaluated) * 100).toFixed(0)}%
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Hadir
                    </span>
                  </div>
                </div>

                {/* Legend & Percentages List */}
                <div className="md:col-span-6 space-y-2">
                  {pieChartData.map((item) => (
                    <div
                      key={item.name}
                      className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px]">{item.name}</span>
                        </div>
                        <span className="font-extrabold font-mono text-[11px] text-slate-900 dark:text-white">
                          {item.value} ({item.pct}%)
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Gate Overview Quick Counters */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Hadir Tepat Waktu</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">
                    {countTepatWaktu} <span className="text-xs text-slate-400 font-normal">Guru ({pieChartData[0].pct}%)</span>
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Terlambat (&gt;07:15)</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">
                    {countTerlambat} <span className="text-xs text-slate-400 font-normal">Guru ({pieChartData[1].pct}%)</span>
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Izin / Dinas Luar</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">
                    {countIzin} <span className="text-xs text-slate-400 font-normal">Guru ({pieChartData[2].pct}%)</span>
                  </span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono">Tanpa Keterangan / Belum</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white block mt-0.5">
                    {countBelumHadir} <span className="text-xs text-slate-400 font-normal">Guru ({pieChartData[3].pct}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Log Rekapitulasi Presensi Gerbang Guru
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Daftar riwayat verifikasi pemindaian QR Code guru saat memasuki area pondok.
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                <input
                  type="date"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white cursor-pointer"
                />

                <select
                  value={selectedUnitFilter}
                  onChange={(e) => setSelectedUnitFilter(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white cursor-pointer"
                >
                  <option value="Semua">Semua Lembaga</option>
                  <option value="SMP">SMP</option>
                  <option value="SMA">SMA</option>
                  <option value="TMMIA">TMMIA</option>
                  <option value="Pondok">Pondok</option>
                </select>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari guru..."
                    value={recapSearch}
                    onChange={(e) => setRecapSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                  />
                </div>

                <button
                  onClick={exportToCSV}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer inline-flex items-center space-x-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Ekspor CSV</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-100 dark:border-slate-700">
                    <th className="p-3">ID Presensi</th>
                    <th className="p-3">Nama Guru & NIP</th>
                    <th className="p-3">Unit</th>
                    <th className="p-3">Waktu Masuk</th>
                    <th className="p-3">Status Hadir</th>
                    <th className="p-3">Petugas Piket</th>
                    <th className="p-3">Catatan</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-medium text-slate-700 dark:text-slate-200">
                  {filteredPresensi.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        Tidak ada data presensi untuk kriteria tanggal dan filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    filteredPresensi.map((p) => (
                      <tr key={p.IdPresensi} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                        <td className="p-3 font-mono font-bold text-teal-600 dark:text-teal-400 text-[11px]">
                          {p.IdPresensi}
                        </td>
                        <td className="p-3">
                          <span className="font-bold block text-slate-900 dark:text-white">{p.NamaGuru}</span>
                          <span className="text-[10px] text-slate-400 font-mono">NIP: {p.NIP}</span>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                            {p.Unit}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          {p.WaktuMasuk} WIB
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              p.StatusHadir === "Hadir Tepat Waktu"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : p.StatusHadir === "Terlambat"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                                : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                            }`}
                          >
                            {p.StatusHadir}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-500 dark:text-slate-400">
                          {p.PetugasPiket}
                        </td>
                        <td className="p-3 text-[11px] text-slate-500 italic max-w-xs truncate">
                          {p.Catatan || "-"}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeletePresensi(p.IdPresensi)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                            title="Hapus data presensi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB CONTENT 4: PERMITS & SUBSTITUTES */}
      {activeSubTab === "permits" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Perizinan & Guru Pengganti Hari Ini (2026-07-19)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mutaba'ah pengajuan izin harian dan konfirmasi guru pengganti di kelas KBM.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl shadow transition-all cursor-pointer inline-flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan Perizinan</span>
            </button>
          </div>

          {todayPermits.length === 0 ? (
            <div className="text-center py-14 text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Semua Guru Hadir Mengajar</p>
              <p className="text-xs mt-0.5">Alhamdulillah, tidak ada guru yang mengajukan izin KBM hari ini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayPermits.map((item) => {
                const teacher = guruList.find((g) => g.NIP === item.NIP);
                const relatedSubs = substituteList.filter((s) => s.IdIzin === item.IdIzin);

                return (
                  <div
                    key={item.IdIzin}
                    className="p-5 border border-slate-100 dark:border-slate-700/60 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-3">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                            {item.IdIzin}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-bold">({item.Unit})</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                          {teacher ? teacher.Nama : item.NIP}
                        </h4>
                      </div>
                      <div>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            item.Status === "Selesai" || item.Status === "Disetujui"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : item.Status === "Ditolak"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}
                        >
                          {item.Status}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                      <p><b>Jenis Izin:</b> {item.JenisIzin}</p>
                      <p><b>Alasan:</b> "{item.Alasan}"</p>
                    </div>

                    {relatedSubs.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-slate-400 font-mono block">
                          Tugas Guru Pengganti ({relatedSubs.length} Sesi)
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {relatedSubs.map((sub, idx) => {
                            const subTeacher = guruList.find((g) => g.NIP === sub.NIPPengganti);
                            return (
                              <div
                                key={idx}
                                className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/80 text-xs space-y-1"
                              >
                                <div className="flex justify-between items-center font-bold text-teal-600">
                                  <span>Jam Ke-{sub.JamKe} ({sub.KodeKelas})</span>
                                  <span>{sub.KodeMapel}</span>
                                </div>
                                <p className="text-slate-800 dark:text-slate-200 font-semibold">
                                  Pengganti: {subTeacher ? subTeacher.Nama : sub.NIPPengganti}
                                </p>
                                <p className="text-[10px] text-slate-500 italic">Materi: "{sub.Materi}"</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
