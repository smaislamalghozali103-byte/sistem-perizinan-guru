import { Guru, Mapel, Kelas, Jadwal, Izin, GuruPengganti, Approval, Presensi, UserAccount, Log } from "../types";

export interface DatabaseSchema {
  DATA_GURU: Guru[];
  DATA_MAPEL: Mapel[];
  DATA_KELAS: Kelas[];
  DATA_JADWAL: Jadwal[];
  DATA_IZIN: Izin[];
  DATA_GURU_PENGGANTI: GuruPengganti[];
  DATA_LOG: Log[];
  DATA_USER: UserAccount[];
  DATA_APPROVAL: Approval[];
  DATA_PRESENSI: Presensi[];
}

export const INITIAL_FALLBACK_DATA: DatabaseSchema = {
  DATA_GURU: [
    { NIP: "19780315007", Nama: "Ustadz Mursyid Anwar, M.Pd.", Unit: "Pondok", NoHP: "081234567899", Email: "mursyid.anwar@alghozali.sch.id", IsPiket: false, MataPelajaran: ["Reading & Grammar", "Bahasa Inggris SMP"] },
    { NIP: "19800115001", Nama: "Ustadz Ahmad Fauzi, M.Pd.", Unit: "SMA", NoHP: "081234567890", Email: "ahmad.fauzi@alghozali.sch.id", IsPiket: false, MataPelajaran: ["Matematika SMA"] },
    { NIP: "19850420002", Nama: "Ustadzah Fatimah Azzahra, S.Si.", Unit: "SMP", NoHP: "081234567891", Email: "fatimah.zahra@alghozali.sch.id", IsPiket: false, MataPelajaran: ["Sains Terpadu", "Matematika SMP"] },
    { NIP: "19900910003", Nama: "Ustadz Ihsan Kamil, Lc.", Unit: "TMMIA", NoHP: "081234567892", Email: "ihsan.kamil@alghozali.sch.id", IsPiket: false, MataPelajaran: ["Durusul Lughah", "Fikih Islam"] },
    { NIP: "19920211004", Nama: "Ustadz Anwar Sadad, S.Ag.", Unit: "SMA", NoHP: "081234567893", Email: "anwar.sadad@alghozali.sch.id", IsPiket: true, MataPelajaran: ["Bahasa Inggris SMA"] },
    { NIP: "19880707005", Nama: "Ustadzah Khadijah, S.Pd.", Unit: "SMP", NoHP: "081234567894", Email: "khadijah@alghozali.sch.id", IsPiket: false, MataPelajaran: ["Matematika SMP"] },
    { NIP: "19910515006", Nama: "Ustadz Hamzah Fansuri, M.A.", Unit: "TMMIA", NoHP: "081234567895", Email: "hamzah.fansuri@alghozali.sch.id", IsPiket: false, MataPelajaran: ["Tafsir Jalalain"] }
  ],
  DATA_MAPEL: [
    { KodeMapel: "ARA-01", NamaMapel: "Durusul Lughah (Bahasa Arab)", Unit: "TMMIA" },
    { KodeMapel: "FIQ-01", NamaMapel: "Fikih Islam", Unit: "TMMIA" },
    { KodeMapel: "MTK-01", NamaMapel: "Matematika SMA", Unit: "SMA" },
    { KodeMapel: "MTK-02", NamaMapel: "Matematika SMP", Unit: "SMP" },
    { KodeMapel: "IPA-01", NamaMapel: "Fisika SMA", Unit: "SMA" },
    { KodeMapel: "IPA-02", NamaMapel: "Sains Terpadu", Unit: "SMP" },
    { KodeMapel: "TAF-01", NamaMapel: "Tafsir Jalalain", Unit: "TMMIA" },
    { KodeMapel: "ENG-01", NamaMapel: "Bahasa Inggris SMA", Unit: "SMA" }
  ],
  DATA_KELAS: [
    { KodeKelas: "SMP-7A", NamaKelas: "7A SMP", Unit: "SMP" },
    { KodeKelas: "SMP-8A", NamaKelas: "8A SMP", Unit: "SMP" },
    { KodeKelas: "SMA-10A", NamaKelas: "X IPA SMA", Unit: "SMA" },
    { KodeKelas: "SMA-11A", NamaKelas: "XI IPA SMA", Unit: "SMA" },
    { KodeKelas: "TMMIA-1", NamaKelas: "Kelas 1 TMMIA", Unit: "TMMIA" },
    { KodeKelas: "TMMIA-2", NamaKelas: "Kelas 2 TMMIA", Unit: "TMMIA" }
  ],
  DATA_JADWAL: [
    { IdJadwal: "J-001", NIP: "19800115001", Hari: "Senin", JamKe: 1, KodeMapel: "MTK-01", KodeKelas: "SMA-11A" },
    { IdJadwal: "J-002", NIP: "19800115001", Hari: "Senin", JamKe: 2, KodeMapel: "MTK-01", KodeKelas: "SMA-11A" },
    { IdJadwal: "J-003", NIP: "19800115001", Hari: "Senin", JamKe: 3, KodeMapel: "MTK-01", KodeKelas: "SMA-10A" },
    { IdJadwal: "J-004", NIP: "19850420002", Hari: "Senin", JamKe: 1, KodeMapel: "IPA-02", KodeKelas: "SMP-7A" },
    { IdJadwal: "J-005", NIP: "19850420002", Hari: "Senin", JamKe: 2, KodeMapel: "IPA-02", KodeKelas: "SMP-7A" },
    { IdJadwal: "J-006", NIP: "19850420002", Hari: "Senin", JamKe: 4, KodeMapel: "MTK-02", KodeKelas: "SMP-8A" },
    { IdJadwal: "J-007", NIP: "19900910003", Hari: "Senin", JamKe: 3, KodeMapel: "ARA-01", KodeKelas: "TMMIA-1" },
    { IdJadwal: "J-008", NIP: "19900910003", Hari: "Senin", JamKe: 4, KodeMapel: "ARA-01", KodeKelas: "TMMIA-1" },
    { IdJadwal: "J-009", NIP: "19900910003", Hari: "Senin", JamKe: 5, KodeMapel: "FIQ-01", KodeKelas: "TMMIA-2" },
    { IdJadwal: "J-010", NIP: "19920211004", Hari: "Senin", JamKe: 5, KodeMapel: "ENG-01", KodeKelas: "SMA-10A" },
    { IdJadwal: "J-011", NIP: "19920211004", Hari: "Senin", JamKe: 6, KodeMapel: "ENG-01", KodeKelas: "SMA-10A" }
  ],
  DATA_IZIN: [
    {
      IdIzin: "IZ-20260715-001",
      Tanggal: "2026-07-15",
      Hari: "Rabu",
      NIP: "19850420002",
      Unit: "SMP",
      JenisIzin: "Izin Sakit",
      Alasan: "Demam tinggi dan sakit tenggorokan, dokter menyarankan istirahat 2 hari.",
      Status: "Selesai",
      LampiranUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80",
      LampiranNama: "surat_keterangan_dokter_rs_alghozali.jpg",
      CreatedAt: "2026-07-15T07:30:00.000Z"
    },
    {
      IdIzin: "IZ-20260718-001",
      Tanggal: "2026-07-18",
      Hari: "Sabtu",
      NIP: "19780315007",
      Unit: "Pondok",
      JenisIzin: "Izin Kedinasan",
      Alasan: "Menghadiri Rapat Koordinasi Pesantren dan Pendidikan Islama Se-Jawa Barat.",
      Status: "Disetujui",
      LampiranUrl: "",
      LampiranNama: "",
      CreatedAt: "2026-07-17T10:15:00.000Z"
    },
    {
      IdIzin: "IZ-20260719-001",
      Tanggal: "2026-07-19",
      Hari: "Minggu",
      NIP: "19800115001",
      Unit: "SMA",
      JenisIzin: "Izin Pribadi",
      Alasan: "Menghadiri acara wisuda kelulusan putra pertama di Universitas Indonesia.",
      Status: "Menunggu Persetujuan",
      LampiranUrl: "",
      LampiranNama: "",
      CreatedAt: "2026-07-19T06:00:00.000Z"
    }
  ],
  DATA_GURU_PENGGANTI: [
    {
      IdIzin: "IZ-20260719-001",
      JamKe: 1,
      NIPOriginal: "19800115001",
      NIPPengganti: "19920211004",
      KodeKelas: "SMA-11A",
      KodeMapel: "MTK-01",
      Materi: "Persamaan Kuadrat",
      Tugas: "Latihan Soal Sub-bab 2.3",
      HalamanBuku: "72",
      TargetPembelajaran: "Siswa mampu menyelesaikan persamaan kuadrat dengan rumus kuadratik (abc)",
      Instruksi: "Bantu siswa jika ada kesulitan, pastikan kondisi kelas kondusif."
    }
  ],
  DATA_LOG: [
    { IdLog: "L-001", Timestamp: "2026-07-15T07:30:00.000Z", User: "fatimah", Activity: "Pengajuan Izin", Details: "Mengajukan Izin Sakit untuk tanggal 2026-07-15" },
    { IdLog: "L-002", Timestamp: "2026-07-15T08:00:00.000Z", User: "anwar", Activity: "Verifikasi Piket", Details: "Guru Piket memverifikasi perizinan IZ-20260715-001" },
    { IdLog: "L-003", Timestamp: "2026-07-15T09:00:00.000Z", User: "waka", Activity: "Persetujuan Waka", Details: "Waka Kurikulum menyetujui perizinan IZ-20260715-001" },
    { IdLog: "L-004", Timestamp: "2026-07-15T10:00:00.000Z", User: "kabid", Activity: "Persetujuan Final", Details: "Kabid Pendidikan menyetujui perizinan IZ-20260715-001 (Selesai)" }
  ],
  DATA_USER: [
    { Username: "Mursyid", PasswordRaw: "alghozali2026", NIP: "19780315007", Role: "Administrator", Email: "mursyid.anwar@alghozali.sch.id" },
    { Username: "admin", PasswordRaw: "ypialghozali2026", NIP: "19780315007", Role: "Administrator", Email: "admin@alghozali.sch.id" },
    { Username: "ahmad", PasswordRaw: "ypialghozali2026", NIP: "19800115001", Role: "Guru", Email: "ahmad.fauzi@alghozali.sch.id" },
    { Username: "fatimah", PasswordRaw: "ypialghozali2026", NIP: "19850420002", Role: "Guru", Email: "fatimah.zahra@alghozali.sch.id" },
    { Username: "ihsan", PasswordRaw: "ypialghozali2026", NIP: "19900910003", Role: "Guru", Email: "ihsan.kamil@alghozali.sch.id" },
    { Username: "anwar", PasswordRaw: "ypialghozali2026", NIP: "19920211004", Role: "Guru Piket", Email: "anwar.sadad@alghozali.sch.id" },
    { Username: "waka", PasswordRaw: "ypialghozali2026", NIP: "-", Role: "Waka Kurikulum", Email: "waka.kurikulum@alghozali.sch.id" },
    { Username: "kabid", PasswordRaw: "ypialghozali2026", NIP: "-", Role: "Kepala Bidang Pendidikan", Email: "kabid.pendidikan@alghozali.sch.id" },
    { Username: "pengganti", PasswordRaw: "ypialghozali2026", NIP: "19880707005", Role: "Guru Pengganti", Email: "khadijah@alghozali.sch.id" }
  ],
  DATA_APPROVAL: [
    { IdApproval: "AP-001", IdIzin: "IZ-20260715-001", ApproverRole: "Guru Piket", ApproverName: "Ustadz Anwar Sadad, S.Ag.", Status: "Disetujui", TanggalApproval: "2026-07-15T08:00:00.000Z", Catatan: "Dokumen surat keterangan dokter valid." },
    { IdApproval: "AP-002", IdIzin: "IZ-20260715-001", ApproverRole: "Waka Kurikulum", ApproverName: "Ustadz H. Abdul Halim, Lc.", Status: "Disetujui", TanggalApproval: "2026-07-15T09:00:00.000Z", Catatan: "Disetujui. Guru pengganti sudah sesuai." },
    { IdApproval: "AP-003", IdIzin: "IZ-20260715-001", ApproverRole: "Kepala Bidang Pendidikan", ApproverName: "Dr. KH. Ghozali, M.A.", Status: "Disetujui", TanggalApproval: "2026-07-15T10:00:00.000Z", Catatan: "Semoga lekas sembuh." }
  ],
  DATA_PRESENSI: [
    { IdPresensi: "PRS-20260719-001", NIP: "19800115001", NamaGuru: "Ustadz Ahmad Fauzi, M.Pd.", Unit: "SMA", Tanggal: "2026-07-19", WaktuMasuk: "06:55:12", StatusHadir: "Hadir Tepat Waktu", PetugasPiket: "Ustadz Anwar Sadad, S.Ag.", Lokasi: "Gerbang Utama YPI Al-Ghozali", Catatan: "Discan lewat QR ID" },
    { IdPresensi: "PRS-20260719-002", NIP: "19850420002", NamaGuru: "Ustadzah Fatimah Azzahra, S.Si.", Unit: "SMP", Tanggal: "2026-07-19", WaktuMasuk: "07:02:40", StatusHadir: "Hadir Tepat Waktu", PetugasPiket: "Ustadz Anwar Sadad, S.Ag.", Lokasi: "Gerbang Utama YPI Al-Ghozali", Catatan: "Discan lewat QR ID" }
  ]
};
