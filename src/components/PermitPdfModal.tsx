import React, { useRef, useState } from "react";
import { jsPDF } from "jspdf";
import { QRCodeSVG } from "qrcode.react";
import { Izin, Guru, Approval } from "../types";
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Calendar,
  User,
  Building,
  Check,
  Sparkles
} from "lucide-react";

interface Props {
  izin: Izin;
  guru?: Guru;
  approvals?: Approval[];
  onClose: () => void;
}

export default function PermitPdfModal({ izin, guru, approvals = [], onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Format Nomored document ID
  const nomorSurat = `0${izin.IdIzin.replace(/\D/g, "") || "102"}/SIPEG-SMA/AG/${izin.Tanggal.substring(5, 7)}/${izin.Tanggal.substring(0, 4)}`;

  // Find approver names
  const piketApp = approvals.find((a) => a.IdIzin === izin.IdIzin && a.ApproverRole === "Guru Piket");
  const wakaApp = approvals.find((a) => a.IdIzin === izin.IdIzin && a.ApproverRole === "Waka Kurikulum");
  const kabidApp = approvals.find((a) => a.IdIzin === izin.IdIzin && a.ApproverRole === "Kepala Bidang Pendidikan");

  // Handle direct browser print (optimized with @media print)
  const handleBrowserPrint = () => {
    window.print();
  };

  // Handle jsPDF download
  const handleDownloadPDF = async () => {
    try {
      setIsGenerating(true);
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Page background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 210, 297, "F");

      // Header Decorative Bar
      doc.setFillColor(13, 148, 136); // Teal 600
      doc.rect(0, 0, 210, 8, "F");

      // Kop Surat Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("YAYASAN PENDIDIKAN ISLAM AL-GHOZALI", 105, 20, { align: "center" });

      doc.setFontSize(16);
      doc.setTextColor(13, 148, 136);
      doc.text("SMA ISLAM AL-GHOZALI", 105, 27, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("Jl. Raya Ciampea No. 103, Kab. Bogor, Jawa Barat 16620", 105, 33, { align: "center" });
      doc.text("Telp: (0251) 8621103 | Website: smaialghozali.sch.id | Email: info@smaialghozali.sch.id", 105, 38, { align: "center" });

      // Double Line Divider
      doc.setDrawColor(13, 148, 136);
      doc.setLineWidth(0.8);
      doc.line(15, 42, 195, 42);
      doc.setLineWidth(0.2);
      doc.line(15, 43.5, 195, 43.5);

      // Document Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text("SURAT KETERANGAN PERIZINAN GURU", 105, 52, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Nomor: ${nomorSurat}`, 105, 58, { align: "center" });

      // Statement
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text("Yang bertanda tangan di bawah ini, Pimpinan Sekolah SMA Islam Al-Ghozali menerangkan bahwa:", 15, 68);

      // Teacher Info Box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(15, 72, 180, 42, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.text("A. IDENTITAS GURU / PEGAWAI", 20, 78);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);

      const guruNama = guru?.Nama || "Guru SMA Islam Al-Ghozali";
      const guruNip = izin.NIP || guru?.NIP || "-";
      const guruUnit = izin.Unit || guru?.Unit || "SMA Islam Al-Ghozali";
      const guruMapel = guru?.MataPelajaran || "Mata Pelajaran KBM";

      doc.text("Nama Lengkap", 22, 85);
      doc.text(`: ${guruNama}`, 65, 85);

      doc.text("NIP / NIK", 22, 91);
      doc.text(`: ${guruNip}`, 65, 91);

      doc.text("Unit Kerja / Tugas", 22, 97);
      doc.text(`: ${guruUnit}`, 65, 97);

      doc.text("Mata Pelajaran Utama", 22, 103);
      doc.text(`: ${guruMapel}`, 65, 103);

      // Permit Details Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(15, 118, 180, 46, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("B. RINCIAN PERIZINAN KBM", 20, 124);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);

      doc.text("ID Perizinan", 22, 131);
      doc.setFont("helvetica", "bold");
      doc.text(`: ${izin.IdIzin}`, 65, 131);

      doc.setFont("helvetica", "normal");
      doc.text("Kategori Jenis Izin", 22, 137);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(13, 148, 136);
      doc.text(`: ${izin.JenisIzin}`, 65, 137);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text("Hari & Tanggal Izin", 22, 143);
      doc.text(`: ${izin.Hari}, ${izin.Tanggal}`, 65, 143);

      doc.text("Alasan Pengajuan", 22, 149);
      const splitAlasan = doc.splitTextToSize(`: "${izin.Alasan}"`, 120);
      doc.text(splitAlasan, 65, 149);

      // Verification Flow Status
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("C. ALUR VERIFIKASI & PERSETUJUAN BERTI NGA T", 15, 172);

      // Status Table
      let currentY = 177;
      const col1 = 15;
      const col2 = 65;
      const col3 = 120;
      const col4 = 160;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(col1, currentY, 180, 7, "F");
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);

      doc.text("Tahapan Verifikasi", col1 + 3, currentY + 5);
      doc.text("Pejabat Verifikator", col2 + 3, currentY + 5);
      doc.text("Status", col3 + 3, currentY + 5);
      doc.text("Keterangan", col4 + 3, currentY + 5);

      currentY += 7;

      const steps = [
        {
          stage: "1. Absensi Guru Piket",
          officer: piketApp ? piketApp.ApproverName : "Guru Piket Harian",
          status: piketApp ? piketApp.Status : "Disetujui",
          note: piketApp?.Catatan || "Memenuhi syarat piket"
        },
        {
          stage: "2. Rekomendasi Kurikulum",
          officer: wakaApp ? wakaApp.ApproverName : "Waka Kurikulum",
          status: wakaApp ? wakaApp.Status : "Disetujui",
          note: wakaApp?.Catatan || "Tugas mandiri disiapkan"
        },
        {
          stage: "3. Persetujuan Final",
          officer: kabidApp ? kabidApp.ApproverName : "Kabid Pendidikan",
          status: kabidApp ? kabidApp.Status : izin.Status,
          note: kabidApp?.Catatan || "Permohonan disetujui"
        }
      ];

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      steps.forEach((st) => {
        doc.setDrawColor(226, 232, 240);
        doc.rect(col1, currentY, 180, 7);
        doc.text(st.stage, col1 + 3, currentY + 5);
        doc.text(st.officer.substring(0, 28), col2 + 3, currentY + 5);
        
        doc.setFont("helvetica", "bold");
        if (st.status === "Disetujui" || st.status === "Selesai") {
          doc.setTextColor(16, 185, 129); // green
        } else if (st.status === "Ditolak") {
          doc.setTextColor(244, 63, 94); // red
        } else {
          doc.setTextColor(245, 158, 11); // amber
        }
        doc.text(st.status, col3 + 3, currentY + 5);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(st.note.substring(0, 22), col4 + 3, currentY + 5);

        currentY += 7;
      });

      // Status Stamp Box
      currentY += 6;
      doc.setFillColor(236, 253, 245); // emerald-50
      doc.setDrawColor(16, 185, 129);
      doc.roundedRect(15, currentY, 180, 12, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(4, 120, 87);
      doc.text(`STATUS DOKUMEN: ${izin.Status.toUpperCase()} & TERVERIFIKASI SAH OLEH SISTEM SIPEG`, 105, currentY + 7.5, { align: "center" });

      // Signature & QR Code Section
      currentY += 20;

      // Left Column: QR Code
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("DIVERIFIKASI SECARA DIGITAL", 20, currentY);
      doc.setFont("helvetica", "normal");
      doc.text("Pindai QR Code untuk validasi keaslian:", 20, currentY + 4);

      doc.setDrawColor(203, 213, 225);
      doc.rect(20, currentY + 7, 24, 24);
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text("[QR CODE]", 25, currentY + 20);

      // Right Column: Official Signature
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("Bogor, " + izin.Tanggal, 145, currentY);
      doc.text("a.n. Kepala SMA Islam Al-Ghozali", 145, currentY + 5);
      doc.setFont("helvetica", "bold");
      doc.text("Kepala Bidang Pendidikan,", 145, currentY + 10);

      // Stamp placeholder / signature line
      doc.setFont("helvetica", "bold");
      doc.setTextColor(13, 148, 136);
      doc.text("[ TTD DIGITAL SIPEG ]", 145, currentY + 22);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("H. Ahmad Syahid, M.Pd.", 145, currentY + 32);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("NIP. 19780512 200501 1 004", 145, currentY + 36);

      // Footer
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Dokumen resmi ini diterbitkan secara elektronik oleh Sistem Informasi Perizinan Guru (SIPEG) SMA Islam Al-Ghozali.", 105, 285, { align: "center" });

      // Save PDF file
      doc.save(`Surat_Izin_${izin.IdIzin}_${(guruNama).replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("Error generating PDF", err);
      alert("Gagal mengunduh PDF, silakan gunakan tombol 'Cetak / Save as PDF'.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 dark:border-slate-700 overflow-hidden my-6 print:shadow-none print:border-none print:m-0 print:w-full print:max-w-none">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <span>Cetak / Unduh PDF Surat Izin</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/30 text-teal-300 text-[10px] font-mono font-bold">
                  {izin.IdIzin}
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Dokumen resmi perizinan guru siap cetak & unduh
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGenerating ? "Proses PDF..." : "Unduh PDF"}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handleBrowserPrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Save as PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper Area */}
        <div className="p-6 sm:p-10 max-h-[78vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0 bg-slate-100 dark:bg-slate-900/50 print:bg-white">
          <div
            ref={printRef}
            className="bg-white text-slate-900 p-8 sm:p-10 rounded-2xl shadow-lg border border-slate-200/80 mx-auto max-w-[210mm] min-h-[280mm] flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none font-serif"
          >
            {/* Header / Kop Surat */}
            <div className="space-y-4">
              <div className="flex items-center space-x-4 border-b-2 border-teal-700 pb-4">
                <div className="w-16 h-16 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                  AG
                </div>
                <div className="flex-1 text-center font-sans">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Yayasan Pendidikan Islam Al-Ghozali
                  </h2>
                  <h1 className="text-xl sm:text-2xl font-black text-teal-800 tracking-tight">
                    SMA ISLAM AL-GHOZALI BOGOR
                  </h1>
                  <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                    Jl. Raya Ciampea No. 103, Kab. Bogor, Jawa Barat 16620 | Telp: (0251) 8621103
                  </p>
                  <p className="text-[10px] font-mono text-teal-600 font-bold">
                    Website: smaialghozali.sch.id | Email: info@smaialghozali.sch.id
                  </p>
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center space-y-1 pt-2 font-sans">
                <h3 className="text-base font-extrabold text-slate-900 tracking-wide uppercase underline decoration-teal-600 underline-offset-4">
                  Surat Keterangan Perizinan Guru
                </h3>
                <p className="text-xs font-mono font-semibold text-slate-500">
                  Nomor: {nomorSurat}
                </p>
              </div>

              <p className="text-xs leading-relaxed text-slate-700 font-sans pt-2">
                Yang bertanda tangan di bawah ini, Pimpinan Sekolah SMA Islam Al-Ghozali menerangkan dengan sebenarnya bahwa:
              </p>

              {/* Teacher Identity Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 font-sans space-y-2 text-xs">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] text-teal-700 border-b border-slate-200 pb-1">
                  A. Identitas Guru / Pegawai
                </div>
                <div className="grid grid-cols-12 gap-y-1.5 pt-1">
                  <span className="col-span-4 font-medium text-slate-500">Nama Lengkap</span>
                  <span className="col-span-8 font-bold text-slate-900">{guru?.Nama || "Guru SMA Islam Al-Ghozali"}</span>

                  <span className="col-span-4 font-medium text-slate-500">NIP / NIK</span>
                  <span className="col-span-8 font-mono font-semibold text-slate-800">{izin.NIP}</span>

                  <span className="col-span-4 font-medium text-slate-500">Unit Kerja</span>
                  <span className="col-span-8 font-semibold text-slate-800">{izin.Unit || "SMA Islam Al-Ghozali"}</span>

                  <span className="col-span-4 font-medium text-slate-500">Mata Pelajaran Utama</span>
                  <span className="col-span-8 text-slate-800">{guru?.MataPelajaran || "KBM SMA"}</span>
                </div>
              </div>

              {/* Permit Details Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 font-sans space-y-2 text-xs">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] text-teal-700 border-b border-slate-200 pb-1">
                  B. Rincian Permohonan Izin
                </div>
                <div className="grid grid-cols-12 gap-y-1.5 pt-1">
                  <span className="col-span-4 font-medium text-slate-500">ID Registrasi</span>
                  <span className="col-span-8 font-mono font-bold text-teal-700">{izin.IdIzin}</span>

                  <span className="col-span-4 font-medium text-slate-500">Jenis Perizinan</span>
                  <span className="col-span-8 font-bold text-emerald-700">{izin.JenisIzin}</span>

                  <span className="col-span-4 font-medium text-slate-500">Hari & Tanggal</span>
                  <span className="col-span-8 font-bold font-mono text-slate-800">{izin.Hari}, {izin.Tanggal}</span>

                  <span className="col-span-4 font-medium text-slate-500">Alasan Permohonan</span>
                  <span className="col-span-8 text-slate-800 italic">"{izin.Alasan}"</span>
                </div>
              </div>

              {/* Multi-stage Approval Status */}
              <div className="font-sans space-y-2">
                <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px] text-teal-700 border-b border-slate-200 pb-1">
                  C. Rekapitulasi Alur Verifikasi & Persetujuan
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">Tahapan Verifikasi</th>
                        <th className="p-2.5">Pejabat Verifikator</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-[11px]">
                      <tr>
                        <td className="p-2.5 font-medium">1. Verifikasi Guru Piket</td>
                        <td className="p-2.5">{piketApp ? piketApp.ApproverName : "Guru Piket Harian"}</td>
                        <td className="p-2.5 font-bold text-emerald-600">Disetujui</td>
                        <td className="p-2.5 text-slate-500 italic">{piketApp?.Catatan || "Lengkap"}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">2. Rekomendasi Kurikulum</td>
                        <td className="p-2.5">{wakaApp ? wakaApp.ApproverName : "Waka Kurikulum"}</td>
                        <td className="p-2.5 font-bold text-emerald-600">Disetujui</td>
                        <td className="p-2.5 text-slate-500 italic">{wakaApp?.Catatan || "Tugas disiapkan"}</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">3. Persetujuan Kabid</td>
                        <td className="p-2.5">{kabidApp ? kabidApp.ApproverName : "Kabid Pendidikan"}</td>
                        <td className="p-2.5 font-bold text-emerald-600">{izin.Status}</td>
                        <td className="p-2.5 text-slate-500 italic">{kabidApp?.Catatan || "Izin disahkan"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Official Seal / Status Box */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between font-sans">
                <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>DOKUMEN RESMI SAH & DITERBITKAN OLEH SISTEM SIPEG</span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white font-mono text-[10px] font-extrabold uppercase">
                  {izin.Status}
                </span>
              </div>
            </div>

            {/* Bottom Signature & QR Code Area */}
            <div className="pt-8 border-t border-slate-200 font-sans grid grid-cols-12 gap-4 items-end">
              {/* Left: QR Code Verifier */}
              <div className="col-span-6 space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-white border border-slate-300 rounded-lg shadow-sm">
                    <QRCodeSVG
                      value={`https://smaialghozali.sch.id/verify-permit?id=${izin.IdIzin}&nip=${izin.NIP}`}
                      size={64}
                      level="M"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Verifikasi Digital</span>
                    <span className="text-[11px] font-extrabold text-teal-800 block">Sistem SIPEG Al-Ghozali</span>
                    <span className="text-[9px] text-slate-500 block font-mono mt-0.5">
                      Pindai QR untuk memeriksa keabsahan surat
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Signature Box */}
              <div className="col-span-6 text-right space-y-1">
                <p className="text-xs text-slate-600">Bogor, {izin.Tanggal}</p>
                <p className="text-xs text-slate-600">a.n. Kepala SMA Islam Al-Ghozali</p>
                <p className="text-xs font-bold text-slate-900">Kepala Bidang Pendidikan,</p>

                <div className="py-2 flex justify-end">
                  <div className="px-3 py-1 rounded border border-teal-200 bg-teal-50 text-teal-800 font-mono text-[10px] font-bold inline-flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>[ TTD DIGITAL SIPEG ]</span>
                  </div>
                </div>

                <p className="text-xs font-extrabold text-slate-900 underline">H. Ahmad Syahid, M.Pd.</p>
                <p className="text-[10px] font-mono text-slate-500">NIP. 19780512 200501 1 004</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
