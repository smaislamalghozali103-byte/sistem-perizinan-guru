import os
import json
import datetime
import random
import shutil

# Check if running on Vercel
IS_VERCEL = "VERCEL" in os.environ or os.environ.get("VERCEL") is not None
ORIGINAL_DB_FILE = os.path.join(os.getcwd(), "db.json")
DB_FILE = "/tmp/db.json" if IS_VERCEL else ORIGINAL_DB_FILE
UPLOAD_DIR = "/tmp/uploads" if IS_VERCEL else os.path.join(os.getcwd(), "uploads")

# Copy original db.json to /tmp/db.json if it doesn't exist on Vercel
if IS_VERCEL and not os.path.exists(DB_FILE):
    try:
        if os.path.exists(ORIGINAL_DB_FILE):
            shutil.copyfile(ORIGINAL_DB_FILE, DB_FILE)
    except Exception as err:
        print(f"Failed to copy initial db.json to /tmp: {err}")

# Ensure upload directory exists
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR, exist_ok=True)

INITIAL_DATABASE = {
    "DATA_GURU": [
        { "NIP": "19780315007", "Nama": "Ustadz Mursyid Anwar, M.Pd.", "Unit": "Pondok", "NoHP": "081234567899", "Email": "mursyid.anwar@alghozali.sch.id", "IsPiket": False },
        { "NIP": "19800115001", "Nama": "Ustadz Ahmad Fauzi, M.Pd.", "Unit": "SMA", "NoHP": "081234567890", "Email": "ahmad.fauzi@alghozali.sch.id", "IsPiket": False },
        { "NIP": "19850420002", "Nama": "Iswahyudin,SE", "Unit": "SMP", "NoHP": "081234567891", "Email": "iswahyudin@alghozali.sch.id", "IsPiket": False },
        { "NIP": "19900910003", "Nama": "Ustadz Ihsan Kamil, Lc.", "Unit": "TMMIA", "NoHP": "081234567892", "Email": "ihsan.kamil@alghozali.sch.id", "IsPiket": False },
        { "NIP": "19920211004", "Nama": "Ustadz Anwar Sadad, S.Ag.", "Unit": "SMA", "NoHP": "081234567893", "Email": "anwar.sadad@alghozali.sch.id", "IsPiket": True },
        { "NIP": "19880707005", "Nama": "Ustadzah Khadijah, S.Pd.", "Unit": "SMP", "NoHP": "081234567894", "Email": "khadijah@alghozali.sch.id", "IsPiket": False },
        { "NIP": "19910515006", "Nama": "Ustadz Hamzah Fansuri, M.A.", "Unit": "TMMIA", "NoHP": "081234567895", "Email": "hamzah.fansuri@alghozali.sch.id", "IsPiket": False }
    ],
    "DATA_MAPEL": [
        { "KodeMapel": "ARA-01", "NamaMapel": "Durusul Lughah (Bahasa Arab)", "Unit": "TMMIA" },
        { "KodeMapel": "FIQ-01", "NamaMapel": "Fikih Islam", "Unit": "TMMIA" },
        { "KodeMapel": "MTK-01", "NamaMapel": "Matematika", "Unit": "SMA" },
        { "KodeMapel": "MTK-02", "NamaMapel": "Matematika", "Unit": "SMP" },
        { "KodeMapel": "IPA-01", "NamaMapel": "Fisika", "Unit": "SMA" },
        { "KodeMapel": "IPA-02", "NamaMapel": "Sains Terpadu", "Unit": "SMP" },
        { "KodeMapel": "TAF-01", "NamaMapel": "Tafsir Jalalain", "Unit": "TMMIA" },
        { "KodeMapel": "ENG-01", "NamaMapel": "Bahasa Inggris", "Unit": "SMA" }
    ],
    "DATA_KELAS": [
        { "KodeKelas": "SMP-7A", "NamaKelas": "7A SMP", "Unit": "SMP" },
        { "KodeKelas": "SMP-8A", "NamaKelas": "8A SMP", "Unit": "SMP" },
        { "KodeKelas": "SMA-10A", "NamaKelas": "X IPA SMA", "Unit": "SMA" },
        { "KodeKelas": "SMA-11A", "NamaKelas": "XI IPA SMA", "Unit": "SMA" },
        { "KodeKelas": "TMMIA-1", "NamaKelas": "Kelas 1 TMMIA", "Unit": "TMMIA" },
        { "KodeKelas": "TMMIA-2", "NamaKelas": "Kelas 2 TMMIA", "Unit": "TMMIA" }
    ],
    "DATA_JADWAL": [
        { "IdJadwal": "J-001", "NIP": "19800115001", "Hari": "Senin", "JamKe": 1, "KodeMapel": "MTK-01", "KodeKelas": "SMA-11A" },
        { "IdJadwal": "J-002", "NIP: ": "19800115001", "Hari": "Senin", "JamKe": 2, "KodeMapel": "MTK-01", "KodeKelas": "SMA-11A" },
        { "IdJadwal": "J-003", "NIP": "19800115001", "Hari": "Senin", "JamKe": 3, "KodeMapel": "MTK-01", "KodeKelas": "SMA-10A" },
        { "IdJadwal": "J-004", "NIP": "19850420002", "Hari": "Senin", "JamKe": 1, "KodeMapel": "IPA-02", "KodeKelas": "SMP-7A" },
        { "IdJadwal": "J-005", "NIP": "19850420002", "Hari": "Senin", "JamKe": 2, "KodeMapel": "IPA-02", "KodeKelas": "SMP-7A" },
        { "IdJadwal": "J-006", "NIP": "19850420002", "Hari": "Senin", "JamKe": 4, "KodeMapel": "MTK-02", "KodeKelas": "SMP-8A" },
        { "IdJadwal": "J-007", "NIP": "19900910003", "Hari": "Senin", "JamKe": 3, "KodeMapel": "ARA-01", "KodeKelas": "TMMIA-1" },
        { "IdJadwal": "J-008", "NIP": "19900910003", "Hari": "Senin", "JamKe": 4, "KodeMapel": "ARA-01", "KodeKelas": "TMMIA-1" },
        { "IdJadwal": "J-009", "NIP": "19900910003", "Hari": "Senin", "JamKe": 5, "KodeMapel": "FIQ-01", "KodeKelas": "TMMIA-2" },
        { "IdJadwal": "J-010", "NIP": "19920211004", "Hari": "Senin", "JamKe": 5, "KodeMapel": "ENG-01", "KodeKelas": "SMA-10A" },
        { "IdJadwal": "J-011", "NIP": "19920211004", "Hari": "Senin", "JamKe": 6, "KodeMapel": "ENG-01", "KodeKelas": "SMA-10A" },
        { "IdJadwal": "J-012", "NIP": "19880707005", "Hari": "Senin", "JamKe": 3, "KodeMapel": "MTK-02", "KodeKelas": "SMP-7A" },
        { "IdJadwal": "J-013", "NIP": "19880707005", "Hari": "Senin", "JamKe": 4, "KodeMapel": "MTK-02", "KodeKelas": "SMP-7A" },
        { "IdJadwal": "J-014", "NIP": "19910515006", "Hari": "Senin", "JamKe": 1, "KodeMapel": "TAF-01", "KodeKelas": "TMMIA-2" },
        { "IdJadwal": "J-015", "NIP": "19910515006", "Hari": "Senin", "JamKe": 2, "KodeMapel": "TAF-01", "KodeKelas": "TMMIA-2" },
        { "IdJadwal": "J-016", "NIP": "19800115001", "Hari": "Selasa", "JamKe": 3, "KodeMapel": "MTK-01", "KodeKelas": "SMA-11A" },
        { "IdJadwal": "J-017", "NIP": "19850420002", "Hari": "Selasa", "JamKe": 1, "KodeMapel": "IPA-02", "KodeKelas": "SMP-8A" },
        { "IdJadwal": "J-018", "NIP": "19900910003", "Hari": "Selasa", "JamKe": 2, "KodeMapel": "TAF-01", "KodeKelas": "TMMIA-1" }
    ],
    "DATA_IZIN": [
        {
            "IdIzin": "IZ-20260715-001",
            "Tanggal": "2026-07-15",
            "Hari": "Rabu",
            "NIP": "19850420002",
            "Unit": "SMP",
            "JenisIzin": "Izin Sakit",
            "Alasan": "Demam tinggi, disarankan dokter istirahat total selama 2 hari.",
            "Status": "Selesai",
            "LampiranUrl": "/uploads/surat_dokter_fatimah.pdf",
            "LampiranNama": "surat_dokter_fatimah.pdf",
            "CreatedAt": "2026-07-15T07:30:00.000Z"
        },
        {
            "IdIzin": "IZ-20260718-001",
            "Tanggal": "2026-07-18",
            "Hari": "Sabtu",
            "NIP": "19900910003",
            "Unit": "TMMIA",
            "JenisIzin": "Izin Kedinasan",
            "Alasan": "Menghadiri Rapat Koordinasi Kurikulum Pondok Modern se-Jawa Barat di Bandung.",
            "Status": "Disetujui",
            "LampiranUrl": "/uploads/surat_tugas_ihsan.pdf",
            "LampiranNama": "surat_tugas_ihsan.pdf",
            "CreatedAt": "2026-07-17T10:15:00.000Z"
        },
        {
            "IdIzin": "IZ-20260719-001",
            "Tanggal": "2026-07-19",
            "Hari": "Senin",
            "NIP": "19800115001",
            "Unit": "SMA",
            "JenisIzin": "Izin Pribadi",
            "Alasan": "Mengantar orang tua kontrol kesehatan berkala di rumah sakit rujukan.",
            "Status": "Menunggu Persetujuan",
            "LampiranUrl": "",
            "LampiranNama": "",
            "CreatedAt": "2026-07-19T06:00:00.000Z"
        }
    ],
    "DATA_GURU_PENGGANTI": [
        {
            "IdIzin": "IZ-20260715-001",
            "JamKe": 1,
            "NIPOriginal": "19850420002",
            "NIPPengganti": "19880707005",
            "KodeKelas": "SMP-7A",
            "KodeMapel": "IPA-02",
            "Materi": "Suhu dan Kalor",
            "Tugas": "Mengerjakan latihan soal halaman 45 No. 1-5",
            "HalamanBuku": "45-46",
            "TargetPembelajaran": "Siswa memahami perpindahan kalor secara konduksi, konveksi, dan radiasi",
            "Instruksi": "Harap mendampingi siswa, mengumpulkan tugas di akhir jam pelajaran."
        },
        {
            "IdIzin": "IZ-20260719-001",
            "JamKe": 1,
            "NIPOriginal": "19800115001",
            "NIPPengganti": "19920211004",
            "KodeKelas": "SMA-11A",
            "KodeMapel": "MTK-01",
            "Materi": "Persamaan Kuadrat",
            "Tugas": "Latihan Soal Sub-bab 2.3",
            "HalamanBuku": "72",
            "TargetPembelajaran": "Siswa mampu menyelesaikan persamaan kuadrat dengan rumus kuadratik (abc)",
            "Instruksi": "Bantu siswa jika ada kesulitan, pastikan kondisi kelas kondusif."
        },
        {
            "IdIzin": "IZ-20260719-001",
            "JamKe": 2,
            "NIPOriginal": "19800115001",
            "NIPPengganti": "19920211004",
            "KodeKelas": "SMA-11A",
            "KodeMapel": "MTK-01",
            "Materi": "Fungsi Kuadrat",
            "Tugas": "Menggambar grafik fungsi kuadrat di buku milimeter blok",
            "HalamanBuku": "75",
            "TargetPembelajaran": "Siswa mampu menggambar sketsa grafik fungsi kuadrat sederhana",
            "Instruksi": "Bagikan kertas milimeter blok yang berada di lemari guru."
        }
    ],
    "DATA_LOG": [
        { "IdLog": "L-001", "Timestamp": "2026-07-15T07:30:00.000Z", "User": "fatimah", "Activity": "Pengajuan Izin", "Details": "Mengajukan Izin Sakit untuk tanggal 2026-07-15" },
        { "IdLog": "L-002", "Timestamp": "2026-07-15T08:00:00.000Z", "User": "anwar", "Activity": "Verifikasi Piket", "Details": "Guru Piket memverifikasi perizinan IZ-20260715-001" },
        { "IdLog": "L-003", "Timestamp": "2026-07-15T09:00:00.000Z", "User": "waka_kurikulum", "Activity": "Persetujuan Waka", "Details": "Waka Kurikulum menyetujui perizinan IZ-20260715-001" },
        { "IdLog": "L-004", "Timestamp": "2026-07-15T10:00:00.000Z", "User": "kabid_pendidikan", "Activity": "Persetujuan Final", "Details": "Kabid Pendidikan menyetujui perizinan IZ-20260715-001 (Selesai)" },
        { "IdLog": "L-005", "Timestamp": "2026-07-19T06:00:00.000Z", "User": "ahmad", "Activity": "Pengajuan Izin", "Details": "Mengajukan Izin Pribadi untuk tanggal 2026-07-19" }
    ],
    "DATA_USER": [
        { "Username": "Mursyid", "PasswordRaw": "alghozali2026", "NIP": "19780315007", "Role": "Administrator", "Email": "mursyid.anwar@alghozali.sch.id" },
        { "Username": "ahmad", "PasswordRaw": "ypialghozali2026", "NIP": "19800115001", "Role": "Guru", "Email": "ahmad.fauzi@alghozali.sch.id" },
        { "Username": "fatimah", "PasswordRaw": "ypialghozali2026", "NIP": "19850420002", "Role": "Guru", "Email": "fatimah.zahra@alghozali.sch.id" },
        { "Username": "ihsan", "PasswordRaw": "ypialghozali2026", "NIP": "19900910003", "Role": "Guru", "Email": "ihsan.kamil@alghozali.sch.id" },
        { "Username": "anwar", "PasswordRaw": "ypialghozali2026", "NIP": "19920211004", "Role": "Guru Piket", "Email": "anwar.sadad@alghozali.sch.id" },
        { "Username": "waka", "PasswordRaw": "ypialghozali2026", "NIP": "-", "Role": "Waka Kurikulum", "Email": "waka.kurikulum@alghozali.sch.id" },
        { "Username": "kabid", "PasswordRaw": "ypialghozali2026", "NIP": "-", "Role": "Kepala Bidang Pendidikan", "Email": "kabid.pendidikan@alghozali.sch.id" },
        { "Username": "pengganti", "PasswordRaw": "ypialghozali2026", "NIP": "19880707005", "Role": "Guru Pengganti", "Email": "khadijah@alghozali.sch.id" }
    ],
    "DATA_APPROVAL": [
        { "IdApproval": "AP-001", "IdIzin": "IZ-20260715-001", "ApproverRole": "Guru Piket", "ApproverName": "Ustadz Anwar Sadad, S.Ag.", "Status": "Disetujui", "TanggalApproval": "2026-07-15T08:00:00.000Z", "Catatan": "Dokumen surat keterangan dokter valid." },
        { "IdApproval": "AP-002", "IdIzin": "IZ-20260715-001", "ApproverRole": "Waka Kurikulum", "ApproverName": "Ustadz H. Abdul Halim, Lc.", "Status": "Disetujui", "TanggalApproval": "2026-07-15T09:00:00.000Z", "Catatan": "Disetujui. Guru pengganti sudah sesuai." },
        { "IdApproval": "AP-003", "IdIzin": "IZ-20260715-001", "ApproverRole": "Kepala Bidang Pendidikan", "ApproverName": "Dr. KH. Ghozali, M.A.", "Status": "Disetujui", "TanggalApproval: ": "2026-07-15T10:00:00.000Z", "Catatan": "Semoga lekas sembuh." },
        { "IdApproval": "AP-004", "IdIzin": "IZ-20260718-001", "ApproverRole": "Guru Piket", "ApproverName": "Ustadz Anwar Sadad, S.Ag.", "Status": "Disetujui", "TanggalApproval": "2026-07-17T11:00:00.000Z", "Catatan": "Agenda dinas pondok disetujui." },
        { "IdApproval": "AP-005", "IdIzin": "IZ-20260718-001", "ApproverRole": "Waka Kurikulum", "ApproverName": "Ustadz H. Abdul Halim, Lc.", "Status": "Disetujui", "TanggalApproval": "2026-07-17T14:30:00.000Z", "Catatan": "Penting untuk pengembangan kurikulum." }
    ],
    "DATA_PRESENSI": [
        { "IdPresensi": "PRS-20260719-001", "NIP": "19800115001", "NamaGuru": "Ustadz Ahmad Fauzi, M.Pd.", "Unit": "SMA", "Tanggal": "2026-07-19", "WaktuMasuk": "06:55:12", "StatusHadir": "Hadir Tepat Waktu", "PetugasPiket": "Ustadz Anwar Sadad, S.Ag.", "Lokasi": "Gerbang Utama YPI Al-Ghozali", "Catatan": "Discan lewat QR ID" },
        { "IdPresensi": "PRS-20260719-002", "NIP": "19850420002", "NamaGuru": "Ustadzah Fatimah Azzahra, S.Si.", "Unit": "SMP", "Tanggal": "2026-07-19", "WaktuMasuk": "07:02:40", "StatusHadir": "Hadir Tepat Waktu", "PetugasPiket": "Ustadz Anwar Sadad, S.Ag.", "Lokasi": "Gerbang Utama YPI Al-Ghozali", "Catatan": "Discan lewat QR ID" },
        { "IdPresensi": "PRS-20260719-003", "NIP": "19900910003", "NamaGuru": "Ustadz Ihsan Kamil, Lc.", "Unit": "TMMIA", "Tanggal": "2026-07-19", "WaktuMasuk": "07:22:15", "StatusHadir": "Terlambat", "PetugasPiket": "Ustadz Anwar Sadad, S.Ag.", "Lokasi": "Gerbang Utama YPI Al-Ghozali", "Catatan": "Lalin padat di persimpangan" }
    ]
}


class Database:
    def __init__(self):
        self.data = {}
        self.load()

    def load(self):
        """Loads database from file or sets initial state if missing"""
        try:
            if os.path.exists(DB_FILE):
                with open(DB_FILE, "r", encoding="utf-8") as f:
                    self.data = json.load(f)
            else:
                self.data = json.loads(json.dumps(INITIAL_DATABASE))
                self.save()
        except Exception as e:
            print(f"Error loading database: {e}")
            self.data = json.loads(json.dumps(INITIAL_DATABASE))

    def save(self):
        """Saves current database to file"""
        try:
            with open(DB_FILE, "w", encoding="utf-8") as f:
                json.dump(self.data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"Error saving database: {e}")

    def get_all(self):
        return self.data

    def restore(self, new_data):
        self.data = new_data
        self.save()
        self.log("SYSTEM", "Restore Database", "Database dipulihkan dari cadangan")

    def reset(self):
        self.data = json.loads(json.dumps(INITIAL_DATABASE))
        self.save()
        self.log("SYSTEM", "Reset Database", "Database diatur ulang ke kondisi awal")

    def log(self, user: str, activity: str, details: str):
        """Creates a system activity log"""
        if "DATA_LOG" not in self.data:
            self.data["DATA_LOG"] = []
        
        log_id = f"L-{str(len(self.data['DATA_LOG']) + 1).zfill(3)}"
        new_log = {
            "IdLog": log_id,
            "Timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "User": user,
            "Activity": activity,
            "Details": details
        }
        self.data["DATA_LOG"].insert(0, new_log)
        self.save()

    def get_available_substitutes(self, hari: str, jam_list: list, exclude_nip: str):
        """
        Returns list of Guru that are free during specific JamKe on specific Hari
        """
        all_guru = self.data.get("DATA_GURU", [])
        all_jadwal = self.data.get("DATA_JADWAL", [])
        all_izin = self.data.get("DATA_IZIN", [])
        all_pengganti = self.data.get("DATA_GURU_PENGGANTI", [])

        available_teachers = []

        for guru in all_guru:
            nip = guru.get("NIP")
            if nip == exclude_nip:
                continue

            # Check if this teacher has classes scheduled on any of these JamKe
            has_class = False
            for j in all_jadwal:
                # Normalizing NIP check since there could be weird spaces in keys or data
                j_nip = j.get("NIP") or j.get("NIP ") or j.get("NIPOriginal")
                if j_nip == nip and j.get("Hari") == hari and j.get("JamKe") in jam_list:
                    has_class = True
                    break

            if has_class:
                continue

            # Check if this teacher is already substituting on any of these JamKe for active permits
            is_substituting = False
            for p in all_pengganti:
                if p.get("NIPPengganti") == nip and p.get("JamKe") in jam_list:
                    # Check if related permit is pending or approved
                    related_izin = next((i for i in all_izin if i.get("IdIzin") == p.get("IdIzin")), None)
                    if related_izin and related_izin.get("Status") in ["Menunggu Persetujuan", "Disetujui"]:
                        is_substituting = True
                        break

            if is_substituting:
                continue

            available_teachers.append(guru)

        return available_teachers


# Singleton instance
db_instance = Database()
