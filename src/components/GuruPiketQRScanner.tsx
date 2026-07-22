import React, { useState, useEffect, useRef } from "react";
import jsQR from "jsqr";
import { Guru, Jadwal, Presensi, Izin } from "../types";
import {
  Camera,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Volume2,
  VolumeX,
  Upload,
  RefreshCw,
  Sparkles,
  Calendar,
  X,
  UserCheck,
  ShieldAlert,
  Search,
  Check
} from "lucide-react";

interface Props {
  user: { username: string; role: string; nip: string };
  guruList: Guru[];
  jadwalList: Jadwal[];
  izinList: Izin[];
  presensiList: Presensi[];
  onRefreshAllData: () => void;
  onNotify: (message: string, type: "success" | "error" | "info") => void;
}

export default function GuruPiketQRScanner({
  user,
  guruList,
  jadwalList,
  izinList,
  presensiList,
  onRefreshAllData,
  onNotify
}: Props) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSimTeacherNip, setSelectedSimTeacherNip] = useState<string>("");
  const [lastScannedResult, setLastScannedResult] = useState<{
    presensi: Presensi;
    guru: Guru;
    schedulesToday: Jadwal[];
    permitToday?: Izin;
    isNew: boolean;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [manualNote, setManualNote] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Audio Chime Synthesizer using Web Audio API
  const playChimeSound = (isSuccess: boolean) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (isSuccess) {
        // High dual-tone success chime (E5 -> A5)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc2.type = "sine";

        osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.12);
        osc2.start(ctx.currentTime + 0.12);
        osc2.stop(ctx.currentTime + 0.4);
      } else {
        // Lower warning beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn("Audio Context playback failed", e);
    }
  };

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setIsCameraActive(true);
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Kamera tidak dapat diakses atau izin ditolak. Silakan gunakan opsi simulator atau unggah berkas QR.");
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Frame tick scan loop
  const tickScan = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(tickScan);
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (canvas) {
      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert"
        });

        if (code && code.data && !isProcessing) {
          processDecodedQR(code.data);
          // Pause camera scanning briefly after detecting code
          setTimeout(() => {
            if (streamRef.current) {
              animationFrameRef.current = requestAnimationFrame(tickScan);
            }
          }, 2500);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(tickScan);
  };

  // Process Decoded QR String / Payload
  const processDecodedQR = async (qrData: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    let extractedNip = "";

    // 1. Try parsing JSON payload or NIP pattern
    try {
      if (qrData.startsWith("{")) {
        const parsed = JSON.parse(qrData);
        extractedNip = parsed.nip || parsed.NIP || "";
      } else if (qrData.includes("ALGHOZALI:")) {
        extractedNip = qrData.split("ALGHOZALI:")[1]?.trim();
      } else {
        // Look for digit sequence matching NIP (e.g. 19800115001)
        const nipMatch = qrData.match(/\d{9,18}/);
        if (nipMatch) {
          extractedNip = nipMatch[0];
        } else {
          extractedNip = qrData.trim();
        }
      }
    } catch (e) {
      extractedNip = qrData.trim();
    }

    if (!extractedNip) {
      onNotify("Format QR Code tidak dikenali.", "error");
      playChimeSound(false);
      setIsProcessing(false);
      return;
    }

    // 2. Lookup Teacher in DATA_GURU
    const teacher = guruList.find(
      (g) => g.NIP === extractedNip || g.NIP.replace(/\s+/g, "") === extractedNip.replace(/\s+/g, "")
    );

    if (!teacher) {
      onNotify(`Guru dengan NIP "${extractedNip}" tidak terdaftar di database yayasan.`, "error");
      playChimeSound(false);
      setIsProcessing(false);
      return;
    }

    // 3. Perform Check-In Logic
    await handleAttendanceCheckIn(teacher);
    setIsProcessing(false);
  };

  // File Upload QR Code Decoder
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (code && code.data) {
            processDecodedQR(code.data);
          } else {
            onNotify("Tidak ditemukan gambar QR Code yang valid dalam berkas.", "error");
            playChimeSound(false);
          }
        }
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  // Perform Check-in and save to database
  const handleAttendanceCheckIn = async (teacher: Guru) => {
    const todayStr = "2026-07-19"; // Standardized system date for consistency
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    // Check if teacher already has presensi today
    const existing = presensiList.find(
      (p) => p.NIP === teacher.NIP && p.Tanggal === todayStr
    );

    // Calculate arrival status (cut off at 07:15)
    let arrivalStatus: "Hadir Tepat Waktu" | "Terlambat" | "Izin" | "Dinas Luar" = "Hadir Tepat Waktu";

    // Check if teacher has an active permit today
    const activePermit = izinList.find(
      (iz) => iz.NIP === teacher.NIP && iz.Tanggal === todayStr && ["Disetujui", "Selesai"].includes(iz.Status)
    );

    if (activePermit) {
      arrivalStatus = activePermit.JenisIzin === "Izin Kedinasan" ? "Dinas Luar" : "Izin";
    } else {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const cutoffMinutes = 7 * 60 + 15; // 07:15 AM
      if (currentMinutes > cutoffMinutes) {
        arrivalStatus = "Terlambat";
      }
    }

    // Get today's schedule for this teacher
    const indonesianDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const dayName = indonesianDays[new Date(todayStr).getDay()];
    const schedulesToday = jadwalList.filter(
      (j) => j.NIP === teacher.NIP && (j.Hari === dayName || j.Hari === "Senin")
    );

    if (existing) {
      // Already scanned today -> update result view
      setLastScannedResult({
        presensi: existing,
        guru: teacher,
        schedulesToday,
        permitToday: activePermit,
        isNew: false
      });
      playChimeSound(true);
      onNotify(`Guru ${teacher.Nama.split(",")[0]} sudah melakukan presensi hari ini pada jam ${existing.WaktuMasuk}.`, "info");
      return;
    }

    // Create new Presensi Record
    const newPresensi: Presensi = {
      IdPresensi: `PRS-${todayStr.replace(/-/g, "")}-${String(presensiList.length + 1).padStart(3, "0")}`,
      NIP: teacher.NIP,
      NamaGuru: teacher.Nama,
      Unit: teacher.Unit,
      Tanggal: todayStr,
      WaktuMasuk: timeStr,
      StatusHadir: arrivalStatus,
      PetugasPiket: user.username,
      Lokasi: "Gerbang Utama YPI Al-Ghozali",
      Catatan: manualNote.trim() || "Validasi QR Code Gerbang"
    };

    try {
      const response = await fetch("/api/db/DATA_PRESENSI", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPresensi)
      });

      if (response.ok) {
        playChimeSound(true);
        onNotify(`PRESENSI BERHASIL: ${teacher.Nama.split(",")[0]} (${arrivalStatus})`, "success");
        setLastScannedResult({
          presensi: newPresensi,
          guru: teacher,
          schedulesToday,
          permitToday: activePermit,
          isNew: true
        });
        setManualNote("");
        onRefreshAllData();
      } else {
        onNotify("Gagal menyimpan presensi ke database.", "error");
        playChimeSound(false);
      }
    } catch (e) {
      onNotify("Kesalahan jaringan saat menyimpan presensi.", "error");
      playChimeSound(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Control Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/50 shrink-0">
            <QrCode className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Pemindai Presensi QR Gerbang Utama
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] font-extrabold uppercase font-mono">
                Real-Time Gate Validation
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Arahkan kamera ke QR Code Kartu ID Guru untuk memverifikasi kehadiran di gerbang secara instan.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3 w-full lg:w-auto justify-end">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
              soundEnabled
                ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/50"
                : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-700 dark:border-slate-600"
            }`}
            title={soundEnabled ? "Suara Bel Aktif" : "Suara Bel Mute"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {!isCameraActive ? (
            <button
              onClick={startCamera}
              className="px-5 py-2.5 bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2 shrink-0"
            >
              <Camera className="w-4 h-4" />
              <span>Buka Kamera Pemindai</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center space-x-2 shrink-0"
            >
              <X className="w-4 h-4" />
              <span>Tutup Kamera</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Camera Feed & Drag Upload */}
        <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 text-white flex flex-col items-center justify-center min-h-[380px] relative overflow-hidden">
          {/* Hidden Canvas for QR Extraction */}
          <canvas ref={canvasRef} className="hidden" />

          {isCameraActive ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
              />

              {/* Scanning Laser Box Overlay */}
              <div className="absolute inset-0 border-2 border-teal-500/40 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 border-2 border-dashed border-teal-400 rounded-2xl relative flex items-center justify-center shadow-2xl">
                  {/* Corner Target Accents */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-teal-400 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-teal-400 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-teal-400 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-teal-400 rounded-br-lg"></div>

                  {/* Animated Scanner Laser Bar */}
                  <div className="w-full h-0.5 bg-teal-400 shadow-[0_0_15px_#2dd4bf] animate-bounce"></div>
                </div>
              </div>

              <div className="absolute bottom-3 left-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-xl text-[11px] font-mono text-teal-300 text-center flex items-center justify-center space-x-2 border border-teal-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Mendeteksi QR Code Otomatis...</span>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-6 text-center py-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 shadow-inner">
                <Camera className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Pemindai Kamera Siap</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                  Klik tombol <b>"Buka Kamera Pemindai"</b> di atas untuk menyalakan kamera web/HP, atau gunakan opsi simulasi cepat & unggah gambar berkas QR di bawah.
                </p>
              </div>

              {cameraError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl text-xs max-w-md mx-auto flex items-start space-x-2 text-left">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Upload QR File Input */}
              <div className="pt-2">
                <label className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold rounded-xl border border-slate-700 cursor-pointer transition-all shadow-sm">
                  <Upload className="w-4 h-4" />
                  <span>Unggah Berkas QR Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Quick Gate Simulation Dropdown */}
          <div className="mt-6 w-full pt-4 border-t border-slate-800 text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
              Simulasi Cepat Presensi Gerbang (Pilih Guru)
            </span>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedSimTeacherNip}
                onChange={(e) => setSelectedSimTeacherNip(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              >
                <option value="">-- Pilih Guru Untuk Presensi Langsung --</option>
                {guruList.map((g) => (
                  <option key={g.NIP} value={g.NIP}>
                    {g.Nama} (NIP: {g.NIP}) - {g.Unit}
                  </option>
                ))}
              </select>

              <button
                disabled={!selectedSimTeacherNip}
                onClick={() => {
                  const teacher = guruList.find((g) => g.NIP === selectedSimTeacherNip);
                  if (teacher) handleAttendanceCheckIn(teacher);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0 flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulasi Validasi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Validation Result Card Overlay */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                <UserCheck className="w-4.5 h-4.5 text-teal-600" />
                <span>Hasil Validasi Gerbang Hari Ini</span>
              </h4>
              {lastScannedResult && (
                <span className="text-[10px] font-mono text-slate-400 font-bold">
                  {lastScannedResult.presensi.Tanggal}
                </span>
              )}
            </div>

            {lastScannedResult ? (
              <div className="space-y-5 animate-fadeIn">
                {/* Status Badge Banner */}
                <div
                  className={`p-4 rounded-2xl border flex items-center space-x-3.5 ${
                    lastScannedResult.presensi.StatusHadir === "Hadir Tepat Waktu"
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200"
                      : lastScannedResult.presensi.StatusHadir === "Terlambat"
                      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200"
                      : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50 text-blue-900 dark:text-blue-200"
                  }`}
                >
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider block font-mono">
                      {lastScannedResult.isNew ? "Presensi Baru Tercatat" : "Status Terdaftar Hari Ini"}
                    </span>
                    <h4 className="text-sm font-bold mt-0.5">
                      {lastScannedResult.presensi.StatusHadir}
                    </h4>
                  </div>
                </div>

                {/* Teacher Profile Card */}
                <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold text-lg flex items-center justify-center overflow-hidden border border-teal-200 dark:border-teal-800 shrink-0 shadow-sm">
                    {lastScannedResult.guru.FotoUrl ? (
                      <img
                        src={lastScannedResult.guru.FotoUrl}
                        alt={lastScannedResult.guru.Nama}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      lastScannedResult.guru.Nama.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-slate-900 dark:text-white text-sm truncate">
                      {lastScannedResult.guru.Nama}
                    </h4>
                    <span className="text-xs font-mono text-teal-600 dark:text-teal-400 font-bold block mt-0.5">
                      NIP: {lastScannedResult.guru.NIP}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold mt-0.5">
                      Lembaga: {lastScannedResult.guru.Unit} • No. HP: {lastScannedResult.guru.NoHP}
                    </span>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-400 text-[10px] block font-mono">WAKTU SCANNED:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                      {lastScannedResult.presensi.WaktuMasuk} WIB
                    </span>
                  </div>

                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-400 text-[10px] block font-mono">PETUGAS PIKET:</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate block">
                      {lastScannedResult.presensi.PetugasPiket}
                    </span>
                  </div>
                </div>

                {/* Today's Teaching Schedule for this Teacher */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                    Jadwal Mengajar Hari Ini ({lastScannedResult.schedulesToday.length} Jam KBM)
                  </span>

                  {lastScannedResult.schedulesToday.length === 0 ? (
                    <div className="p-3 bg-slate-50 dark:bg-slate-700/20 rounded-xl text-xs text-slate-500 italic">
                      Tidak ada jadwal KBM kelas untuk guru ini hari ini.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {lastScannedResult.schedulesToday.map((j) => (
                        <div
                          key={j.IdJadwal}
                          className="p-2.5 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 font-mono font-bold text-[10px]">
                              Jam Ke-{j.JamKe}
                            </span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              Kelas {j.KodeKelas}
                            </span>
                          </div>
                          <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                            Mapel: {j.KodeMapel}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                  <Search className="w-6 h-6" />
                </div>
                <h5 className="text-xs font-bold text-slate-600 dark:text-slate-300">Belum Ada QR Scanned</h5>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Silakan buka kamera atau pilih guru di menu simulasi di sebelah kiri untuk menampilkan hasil verifikasi presensi.
                </p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-right">
            <button
              onClick={onRefreshAllData}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center space-x-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan Database Presensi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
