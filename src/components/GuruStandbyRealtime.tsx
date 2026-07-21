import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Clock,
  Calendar,
  Filter,
  Search,
  CheckCircle2,
  Phone,
  MessageSquare,
  ShieldCheck,
  Users,
  Award,
  RefreshCw,
  Sparkles,
  Zap,
  Info
} from "lucide-react";
import { Guru, Jadwal, SessionUser } from "../types";

interface Props {
  user: SessionUser | null;
  guruList: Guru[];
  jadwalList: Jadwal[];
  onNotify?: (message: string, type: "success" | "error" | "info") => void;
  onSelectSubstitute?: (guru: Guru, jamKe: number) => void;
}

export default function GuruStandbyRealtime({
  user,
  guruList,
  jadwalList,
  onNotify,
  onSelectSubstitute
}: Props) {
  // Current Day & Jam ke- auto detector
  const indonesianDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const currentDayName = indonesianDays[new Date().getDay()];
  const initialDay = currentDayName === "Minggu" ? "Senin" : currentDayName;

  const [selectedHari, setSelectedHari] = useState<string>(initialDay);
  const [selectedJamKe, setSelectedJamKe] = useState<number>(1);
  const [selectedUnit, setSelectedUnit] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Auto detect jam ke- based on current time
  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 7 && currentHour < 8) setSelectedJamKe(1);
    else if (currentHour >= 8 && currentHour < 9) setSelectedJamKe(2);
    else if (currentHour >= 9 && currentHour < 10) setSelectedJamKe(3);
    else if (currentHour >= 10 && currentHour < 11) setSelectedJamKe(4);
    else if (currentHour >= 11 && currentHour < 12) setSelectedJamKe(5);
    else if (currentHour >= 12 && currentHour < 13) setSelectedJamKe(6);
    else if (currentHour >= 13 && currentHour < 14) setSelectedJamKe(7);
    else if (currentHour >= 14 && currentHour < 15) setSelectedJamKe(8);
    else if (currentHour >= 15 && currentHour < 16) setSelectedJamKe(9);
    else if (currentHour >= 16) setSelectedJamKe(10);
  }, []);

  // Filter teachers with NO class schedule at selectedHari & selectedJamKe
  const busyTeacherNips = new Set(
    jadwalList
      .filter((j) => j.Hari === selectedHari && j.JamKe === Number(selectedJamKe))
      .map((j) => j.NIP)
  );

  const standbyTeachers = guruList.filter((guru) => {
    // Teacher must NOT have a class at this slot
    if (busyTeacherNips.has(guru.NIP)) return false;

    // Filter by unit
    if (selectedUnit !== "Semua" && guru.Unit !== selectedUnit) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = guru.Nama.toLowerCase().includes(q);
      const matchNip = guru.NIP.includes(q);
      const matchMapel = guru.MataPelajaran?.some((m) => m.toLowerCase().includes(q));
      if (!matchName && !matchNip && !matchMapel) return false;
    }

    return true;
  });

  const busyTeachers = guruList.filter((guru) => {
    if (!busyTeacherNips.has(guru.NIP)) return false;
    if (selectedUnit !== "Semua" && guru.Unit !== selectedUnit) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return guru.Nama.toLowerCase().includes(q) || guru.NIP.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Banner Aturan Kebijakan Piket */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 rounded-2xl p-6 text-white border border-emerald-800/60 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-300 shrink-0">
              <ShieldCheck className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-300/30 uppercase tracking-widest">
                  Kebijakan Resmi YPI Al-Ghozali 2026
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                MONITORING GURU STANDBY / CALON GURU PIKET REAL-TIME
              </h2>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                <strong className="text-emerald-300">Aturan Baru:</strong> Semua guru yang <u className="underline decoration-teal-400 font-semibold">tidak memiliki jadwal mengajar</u> pada jam KBM berjalan otomatis berstatus <strong>Guru Standby</strong> dan dapat ditugaskan sebagai <strong>Guru Piket/Pengganti</strong> untuk mendampingi kelas kosong.
              </p>
            </div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/80 p-3.5 rounded-2xl shrink-0 text-right space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
              Jam KBM Terpilih
            </span>
            <div className="flex items-center justify-end space-x-2 text-emerald-400 font-bold text-sm">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Hari {selectedHari} • Jam Ke-{selectedJamKe}</span>
            </div>
            <span className="text-[10px] font-mono text-amber-300 block">
              {standbyTeachers.length} Guru Standby Siap Bertugas
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Day, Jam Ke, Unit Filter, Search */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Day Selector */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-1">
              Hari KBM
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <select
                value={selectedHari}
                onChange={(e) => setSelectedHari(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((day) => (
                  <option key={day} value={day}>
                    {day} {day === currentDayName ? "(Hari Ini)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Jam Ke Selector */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-1">
              Jam Pelajaran Ke-
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <select
                value={selectedJamKe}
                onChange={(e) => setSelectedJamKe(Number(e.target.value))}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((jam) => (
                  <option key={jam} value={jam}>
                    Jam Ke-{jam}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit Filter */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-1">
              Unit Sekolah
            </label>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Semua">Semua Unit (SMP/SMA/TMMIA/Pondok)</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
                <option value="TMMIA">TMMIA</option>
                <option value="Pondok">Pondok</option>
              </select>
            </div>
          </div>

          {/* Search Query */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400 block mb-1">
              Pencarian Nama Guru
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari guru / mapel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Available Standby Teachers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-wide">
              Daftar Guru Standby ({standbyTeachers.length} Orang)
            </h3>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Tanpa Jadwal Mengajar pada {selectedHari} Jam Ke-{selectedJamKe}
          </span>
        </div>

        {standbyTeachers.length === 0 ? (
          <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center space-y-3">
            <Info className="w-8 h-8 text-amber-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Tidak Ditemukan Guru Standby
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Seluruh guru terdaftar sedang mengajar di kelas pada {selectedHari} Jam Ke-{selectedJamKe}, atau tidak ada yang sesuai filter pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {standbyTeachers.map((guru) => {
              const waNumber = guru.NoHP ? guru.NoHP.replace(/[^0-9]/g, "") : "";
              const waUrl = waNumber ? `https://wa.me/62${waNumber.startsWith("0") ? waNumber.substring(1) : waNumber}` : "#";

              return (
                <div
                  key={guru.NIP}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full pointer-events-none"></div>

                  <div className="space-y-3">
                    {/* Header Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 border border-emerald-300 dark:border-emerald-700">
                          {guru.Nama.split(" ")[1]?.[0] || guru.Nama[0]}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {guru.Nama}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            NIP: {guru.NIP}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono text-[9px] font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
                        {guru.Unit}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center space-x-1.5 p-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
                        Standby / Siap Piket Jam Ke-{selectedJamKe}
                      </span>
                    </div>

                    {/* Additional Info */}
                    <div className="text-[10.5px] text-slate-600 dark:text-slate-300 space-y-1">
                      {guru.MataPelajaran && guru.MataPelajaran.length > 0 && (
                        <p className="line-clamp-1">
                          <strong>Keahlian:</strong> {guru.MataPelajaran.join(", ")}
                        </p>
                      )}
                      <p>
                        <strong>Email:</strong> {guru.Email}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                    {guru.NoHP && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-semibold transition-all cursor-pointer"
                        title="Hubungi via WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Hubungi WA</span>
                      </a>
                    )}

                    {onSelectSubstitute && (
                      <button
                        onClick={() => {
                          onSelectSubstitute(guru, selectedJamKe);
                          if (onNotify) onNotify(`Guru ${guru.Nama} dipilih untuk penugasan jam ke-${selectedJamKe}.`, "success");
                        }}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-[11px] font-bold transition-all ml-auto cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Tugaskan Piket</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Busy Teachers List Collapsible Info */}
      <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
            Guru Sedang Mengajar / Berhalangan ({busyTeachers.length} Orang)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {selectedHari} Jam Ke-{selectedJamKe}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {busyTeachers.map((guru) => (
            <span
              key={guru.NIP}
              className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px] font-medium"
            >
              {guru.Nama.split(",")[0]} ({guru.Unit})
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
