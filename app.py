import os
import datetime
import random
import json
import streamlit as st
import pandas as pd
import plotly.express as px
from PIL import Image

# Import database and AI helpers
from database import db_instance, UPLOAD_DIR
from ai_helper import ai_helper

# Configure Page
st.set_page_config(
    page_title="SIPEG - YPI Pondok Modern Al-Ghozali",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Premium CSS Injection (Emerald and Amber Theme + Glassmorphism Cards)
st.markdown("""
<style>
    /* Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Outfit', sans-serif;
    }
    
    /* Main Background & Theme */
    .stApp {
        background: linear-gradient(135deg, #f0fdfa 0%, #fffbeb 100%);
    }
    
    /* Sidebar styling */
    section[data-testid="stSidebar"] {
        background-color: #064e3b !important;
        color: #ffffff !important;
    }
    section[data-testid="stSidebar"] .stMarkdown, section[data-testid="stSidebar"] label {
        color: #f3f4f6 !important;
    }
    section[data-testid="stSidebar"] button {
        background-color: #047857 !important;
        color: #ffffff !important;
        border-radius: 8px !important;
        border: 1px solid #059669 !important;
    }
    section[data-testid="stSidebar"] button:hover {
        background-color: #059669 !important;
        border-color: #10b981 !important;
    }
    
    /* Glassmorphism KPI Cards */
    .kpi-card {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 8px 32px 0 rgba(4, 120, 87, 0.08);
        text-align: center;
        transition: transform 0.3s ease;
    }
    .kpi-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 40px 0 rgba(4, 120, 87, 0.15);
    }
    
    /* Header Accent */
    h1, h2, h3 {
        color: #064e3b;
        font-weight: 700;
    }
    
    /* Emerald badges */
    .badge-emerald {
        background-color: #d1fae5;
        color: #065f46;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        display: inline-block;
    }
    
    /* Amber badges */
    .badge-amber {
        background-color: #fef3c7;
        color: #92400e;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        display: inline-block;
    }
    
    /* Red badges */
    .badge-red {
        background-color: #fee2e2;
        color: #991b1b;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        display: inline-block;
    }
    
    /* Blue badges */
    .badge-blue {
        background-color: #dbeafe;
        color: #1e40af;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 600;
        display: inline-block;
    }
    
    /* Table modifications */
    .stDataFrame {
        border-radius: 12px;
        overflow: hidden;
    }
    
    /* Chat bubbles styling */
    .chat-user {
        background-color: #d1fae5;
        padding: 12px;
        border-radius: 12px 12px 0px 12px;
        margin-bottom: 10px;
        max-width: 80%;
        margin-left: auto;
        color: #064e3b;
        border: 1px solid #a7f3d0;
    }
    .chat-assistant {
        background-color: #ffffff;
        padding: 12px;
        border-radius: 12px 12px 12px 0px;
        margin-bottom: 10px;
        max-width: 80%;
        color: #1f2937;
        border: 1px solid #e5e7eb;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
</style>
""", unsafe_allow_html=True)

# ----------------- SESSION STATE SETUP -----------------
if "emails" not in st.session_state:
    st.session_state.emails = [
        {
            "id": "EM-982301",
            "timestamp": "2026-07-19T06:00:00Z",
            "to": "ahmad.fauzi@alghozali.sch.id",
            "subject": "[Perizinan Guru] Pengajuan Perizinan Diajukan - IZ-20260719-001",
            "body": "Yth. Ustadz Ahmad Fauzi, M.Pd.,\n\nPengajuan perizinan Anda (Izin Pribadi) untuk tanggal 2026-07-19 telah diajukan ke sistem. Status saat ini: Menunggu Persetujuan.\n\nAlasan: Mengantar orang tua kontrol kesehatan berkala di rumah sakit rujukan."
        },
        {
            "id": "EM-982302",
            "timestamp": "2026-07-19T06:01:00Z",
            "to": "anwar.sadad@alghozali.sch.id",
            "subject": "[Perizinan Guru] Pengajuan Baru Menunggu Verifikasi - IZ-20260719-001",
            "body": "Yth. Guru Piket (Ustadz Anwar Sadad, S.Ag.),\n\nAda pengajuan perizinan baru dari Ustadz Ahmad Fauzi, M.Pd. (SMA) pada tanggal 2026-07-19.\n\nHarap segera login ke sistem untuk melakukan pemeriksaan dan memberikan verifikasi."
        }
    ]

if "logged_in" not in st.session_state:
    st.session_state.logged_in = False
    st.session_state.user = None

if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

# Helper to send email notification simulation
def send_simulated_email(to: str, subject: str, body: str):
    email = {
        "id": f"EM-{str(random.randint(100000, 999999))}",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "to": to,
        "subject": subject,
        "body": body
    }
    st.session_state.emails.insert(0, email)


# ----------------- SIDEBAR: LOGIN & EMAIL BOX -----------------
with st.sidebar:
    # App Logo and Title
    st.markdown("""
    <div style='text-align: center; margin-bottom: 20px;'>
        <div style='background: linear-gradient(135deg, #f59e0b 0%, #10b981 100%); width: 70px; height: 70px; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2); border: 2px solid #fff;'>
            <span style='color: #fff; font-size: 24px; font-weight: bold;'>🎓</span>
        </div>
        <h3 style='color: #ffffff; margin-top: 10px; font-size: 20px; font-weight: bold;'>SIPEG AL-GHOZALI</h3>
        <p style='color: #a7f3d0; font-size: 11px; margin-top: -5px;'>Sistem Informasi Perizinan Guru</p>
    </div>
    """, unsafe_allow_html=True)

    db = db_instance.get_all()

    if not st.session_state.logged_in:
        st.markdown("### 🔐 Masuk ke Sistem")
        
        # Select Role
        roles_list = [
            "Guru", "Guru Piket", "Waka Kurikulum", 
            "Kepala Bidang Pendidikan", "Administrator", "Guru Pengganti"
        ]
        selected_role = st.selectbox("Pilih Peran Anda", roles_list)

        # Select User based on Role
        # Find usernames matching role
        users_for_role = [u for u in db.get("DATA_USER", []) if u.get("Role") == selected_role]
        
        # Fallback if no matching user found
        if not users_for_role:
            username_options = ["Admin" if selected_role == "Administrator" else "User"]
        else:
            username_options = [u.get("Username") for u in users_for_role]

        username_input = st.selectbox("Pilih Nama Pengguna", username_options)
        
        # Special input for Subject (Mapel) if role is Guru
        mapel_input = None
        if selected_role == "Guru":
            mapel_list = db.get("DATA_MAPEL", [])
            mapel_options = {m.get("KodeMapel"): m.get("NamaMapel") for m in mapel_list}
            selected_mapel_id = st.selectbox(
                "Pilih Mata Pelajaran Mengajar (Sesi Ini)", 
                options=list(mapel_options.keys()),
                format_func=lambda x: f"{x} - {mapel_options[x]}"
            )
            mapel_input = selected_mapel_id

        # Password
        password_input = st.text_input("Sandi Pengguna", type="password")

        # Login action
        if st.button("Masuk Sekarang 🚀", use_container_width=True):
            if not username_input or not password_input:
                st.error("Nama pengguna dan sandi tidak boleh kosong.")
            else:
                # Retrieve matching user account
                matched_user = next((
                    u for u in db.get("DATA_USER", []) 
                    if u.get("Username").lower() == username_input.lower() and u.get("Role") == selected_role
                ), None)

                # Check if password matches
                if matched_user and matched_user.get("PasswordRaw") == password_input:
                    # Retrieve teacher info if available
                    teacher_info = None
                    nip = matched_user.get("NIP")
                    if nip != "-":
                        teacher_info = next((g for g in db.get("DATA_GURU", []) if g.get("NIP") == nip), None)

                    # For Guru role, verify if they have schedules for the selected mapel
                    teaches_subject = True
                    if selected_role == "Guru" and nip != "-":
                        teaches_subject = any(
                            j.get("NIP") == nip and j.get("KodeMapel") == mapel_input
                            for j in db.get("DATA_JADWAL", [])
                        )
                        
                        if not teaches_subject and teacher_info:
                            subject_name = next((m.get("NamaMapel") for m in db.get("DATA_MAPEL", []) if m.get("KodeMapel") == mapel_input), mapel_input)
                            st.sidebar.error(f"Guru {teacher_info.get('Nama').split(',')[0]} tidak memiliki jadwal mengajar untuk mata pelajaran {subject_name} hari ini.")
                    
                    if teaches_subject:
                        st.session_state.logged_in = True
                        st.session_state.user = {
                            "username": matched_user.get("Username"),
                            "role": matched_user.get("Role"),
                            "nip": matched_user.get("NIP"),
                            "email": matched_user.get("Email"),
                            "teacher": teacher_info,
                            "loginMapel": mapel_input
                        }
                        # System Log
                        db_instance.log(
                            matched_user.get("Username"), 
                            "Login", 
                            f"Berhasil masuk dengan peran {selected_role}" + (f" - Mapel: {mapel_input}" if mapel_input else "")
                        )
                        st.success(f"Selamat Datang, {username_input}!")
                        st.rerun()
                else:
                    st.error("Sandi salah atau akun tidak ditemukan.")
    else:
        # Display Logged In User details
        st.markdown("### 👤 Pengguna Aktif")
        st.markdown(f"**Nama**: {st.session_state.user['username']}")
        st.markdown(f"**Peran**: {st.session_state.user['role']}")
        if st.session_state.user['nip'] != "-":
            st.markdown(f"**NIP**: `{st.session_state.user['nip']}`")
        if st.session_state.user['loginMapel']:
            st.markdown(f"**Mapel**: `{st.session_state.user['loginMapel']}`")

        if st.button("Keluar Sistem 🚪", use_container_width=True):
            db_instance.log(st.session_state.user['username'], "Logout", "Berhasil keluar dari sistem.")
            st.session_state.logged_in = False
            st.session_state.user = None
            st.rerun()

    st.markdown("---")

    # Mailbox simulator
    with st.expander("✉️ Kotak Masuk Simulasi Email", expanded=False):
        st.markdown("<p style='font-size: 12px; color: #a7f3d0;'>Menyimulasikan pemberitahuan Gmail (GmailApp) secara realtime.</p>", unsafe_allow_html=True)
        if not st.session_state.emails:
            st.markdown("*Tidak ada email terkirim.*")
        else:
            for mail in st.session_state.emails:
                st.markdown(f"""
                <div style='background-color: rgba(255,255,255,0.1); border-left: 3px solid #f59e0b; padding: 8px; border-radius: 4px; margin-bottom: 8px;'>
                    <b style='color: #fbbf24; font-size: 11px;'>Ke: {mail['to']}</b><br/>
                    <b style='color: #fff; font-size: 12px;'>{mail['subject']}</b><br/>
                    <span style='color: #e5e7eb; font-size: 10px;'>{mail['timestamp'][:19].replace('T', ' ')}</span>
                    <pre style='color: #d1d5db; font-size: 10px; white-space: pre-wrap; font-family: sans-serif; background: none; border: none; padding:0; margin: 4px 0 0 0;'>{mail['body']}</pre>
                </div>
                """, unsafe_allow_html=True)


# ----------------- PUBLIC WELCOME PAGE (IF NOT LOGGED IN) -----------------
if not st.session_state.logged_in:
    st.markdown("""
    <div style='background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); border-radius: 20px; padding: 50px 30px; text-align: center; color: white; margin-bottom: 30px; border: 2px solid #fbbf24;'>
        <h1 style='color: #fbbf24; margin-bottom: 10px;'>Selamat Datang di SIPEG</h1>
        <h3 style='color: #ffffff; font-weight: 300;'>Sistem Informasi Perizinan Guru YPI Pondok Modern Al-Ghozali</h3>
        <p style='color: #a7f3d0; max-width: 700px; margin: 20px auto; line-height: 1.6;'>
            SIPEG menyederhanakan proses pengajuan izin mengajar bagi guru, pemilihan otomatis guru pengganti yang luang, 
            verifikasi kehadiran realtime oleh Guru Piket, serta persetujuan bertingkat dari Waka Kurikulum dan Kepala Bidang Pendidikan.
        </p>
        <div style='font-size: 13px; color: #fbbf24; background: rgba(255,255,255,0.1); display: inline-block; padding: 8px 16px; border-radius: 9999px; border: 1px solid rgba(251, 191, 36, 0.3);'>
            💡 Silakan pilih Peran, Username, dan masukkan Sandi di sidebar sebelah kiri untuk masuk.
        </div>
    </div>
    """, unsafe_allow_html=True)

    # Public stats dashboard
    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f"""
        <div class='kpi-card'>
            <h5 style='color: #6b7280; font-size: 14px;'>Total Guru</h5>
            <h2 style='color: #047857; margin: 10px 0;'>{len(db.get("DATA_GURU", []))}</h2>
            <span class='badge-emerald'>Aktif Mengajar</span>
        </div>
        """, unsafe_allow_html=True)
    with c2:
        total_permits = len(db.get("DATA_IZIN", []))
        st.markdown(f"""
        <div class='kpi-card'>
            <h5 style='color: #6b7280; font-size: 14px;'>Total Pengajuan Izin</h5>
            <h2 style='color: #047857; margin: 10px 0;'>{total_permits}</h2>
            <span class='badge-blue'>Tercatat di DB</span>
        </div>
        """, unsafe_allow_html=True)
    with c3:
        today_date = "2026-07-19"  # Simulator default today date
        pending_permits = len([i for i in db.get("DATA_IZIN", []) if i.get("Status") == "Menunggu Persetujuan"])
        st.markdown(f"""
        <div class='kpi-card'>
            <h5 style='color: #6b7280; font-size: 14px;'>Menunggu Persetujuan</h5>
            <h2 style='color: #d97706; margin: 10px 0;'>{pending_permits}</h2>
            <span class='badge-amber'>Perlu Verifikasi</span>
        </div>
        """, unsafe_allow_html=True)
    with c4:
        piket_teachers = len([g for g in db.get("DATA_GURU", []) if g.get("IsPiket")])
        st.markdown(f"""
        <div class='kpi-card'>
            <h5 style='color: #6b7280; font-size: 14px;'>Guru Piket Hari Ini</h5>
            <h2 style='color: #047857; margin: 10px 0;'>{piket_teachers}</h2>
            <span class='badge-emerald'>Standby di Piket</span>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("### 📅 Guru Standby Realtime (Hari Ini)")
    
    # Query Standby Teachers for Monday (Senin) Jam Ke-1
    st.info("Berikut adalah daftar guru yang tidak mengajar atau bertugas sebagai Guru Piket pada Jam Ke-1 (Hari Senin).")
    available_guru = db_instance.get_available_substitutes("Senin", [1], exclude_nip="")
    
    if not available_guru:
        st.write("*Tidak ada guru standby.*")
    else:
        guru_df = pd.DataFrame(available_guru)[["NIP", "Nama", "Unit", "NoHP", "Email", "IsPiket"]]
        # Display as a styled table
        st.dataframe(
            guru_df.rename(columns={
                "Nama": "Nama Lengkap",
                "IsPiket": "Petugas Piket"
            }),
            use_container_width=True,
            hide_index=True
        )
    st.stop()


# ----------------- MAIN LOGGED IN APP LAYOUT -----------------
role = st.session_state.user["role"]
username = st.session_state.user["username"]
nip = st.session_state.user["nip"]
teacher_info = st.session_state.user["teacher"]

st.markdown(f"# 🏛️ Portal Utama SIPEG: {role}")
st.markdown("---")

# ----------------- GURU DASHBOARD & PAGES -----------------
if role == "Guru":
    menu_tabs = st.tabs(["📋 Dashboard", "✍️ Ajukan Perizinan", "📜 Riwayat Perizinan", "👤 Profil & QR Code", "🤖 Asisten AI"])
    
    # 1. Guru Dashboard
    with menu_tabs[0]:
        st.subheader("Ringkasan Status Anda")
        
        # Filter personal permits
        my_permits = [i for i in db.get("DATA_IZIN", []) if i.get("NIP") == nip]
        
        c1, c2, c3, c4 = st.columns(4)
        with c1:
            st.metric("Total Izin Diajukan", len(my_permits))
        with c2:
            pending = len([i for i in my_permits if i.get("Status") == "Menunggu Persetujuan"])
            st.metric("Menunggu Persetujuan", pending)
        with c3:
            approved = len([i for i in my_permits if i.get("Status") in ["Disetujui", "Selesai"]])
            st.metric("Disetujui / Selesai", approved)
        with c4:
            rejected = len([i for i in my_permits if i.get("Status") == "Ditolak"])
            st.metric("Ditolak", rejected)

        st.markdown("### 🔔 Panduan Perizinan Guru")
        st.info("""
        1. **Ajukan Izin**: Buka tab 'Ajukan Perizinan' dan lengkapi detail absen mengajar Anda.
        2. **Guru Pengganti Otomatis**: Sistem secara otomatis hanya akan memunculkan guru pengganti yang sedang luang (tidak mengajar) pada jam pelajaran yang Anda tinggalkan.
        3. **Alur Persetujuan**: Pengajuan akan melalui verifikasi **Guru Piket** -> Persetujuan **Waka Kurikulum** -> Persetujuan Akhir **Kepala Bidang**.
        4. **Pemberitahuan**: Email konfirmasi akan secara otomatis dikirim ke alamat email Anda dan guru pengganti setelah perizinan disetujui.
        """)

    # 2. Ajukan Perizinan Form
    with menu_tabs[1]:
        st.subheader("Formulir Pengajuan Izin Baru")
        
        # Query schedules for this Guru to check which days/hours conflict
        my_schedules = [j for j in db.get("DATA_JADWAL", []) if j.get("NIP") == nip]
        
        if not my_schedules:
            st.warning("Anda tidak terdaftar dalam database jadwal mengajar. Hubungi Administrator untuk mendaftarkan jadwal mengajar Anda.")
        else:
            with st.form("form_pengajuan_izin"):
                # Input date
                tanggal_input = st.date_input("Tanggal Perizinan", min_value=datetime.date.today())
                
                # Determine Day of Week (Indonesia)
                days_en_to_id = {
                    "Monday": "Senin", "Tuesday": "Selasa", "Wednesday": "Rabu",
                    "Thursday": "Kamis", "Friday": "Jumat", "Saturday": "Sabtu", "Sunday": "Minggu"
                }
                day_en = tanggal_input.strftime("%A")
                hari_id = days_en_to_id.get(day_en, "Senin")
                
                st.write(f"**Hari**: {hari_id}")
                
                # Check schedules for the selected day
                schedules_today = [j for j in my_schedules if j.get("Hari") == hari_id]
                
                jenis_izin = st.selectbox("Jenis Izin", ["Izin Sakit", "Izin Kedinasan", "Izin Pribadi"])
                alasan = st.text_area("Alasan Perizinan", placeholder="Jelaskan alasan secara lengkap...")
                
                # Upload attachment
                uploaded_file = st.file_uploader("Unggah Surat Keterangan / Lampiran Pendukung (PDF/Gambar)", type=["pdf", "png", "jpg", "jpeg"])
                
                st.markdown("### 🤝 Pilih Guru Pengganti untuk Jam Mengajar Hari Ini:")
                
                # Render inputs for substitute teachers for each scheduled period today
                substitute_selections = {}
                
                if not schedules_today:
                    st.markdown(f"*Tidak ada jadwal mengajar rutin Anda pada hari **{hari_id}**. Anda tetap dapat mengajukan izin untuk absen harian.*")
                else:
                    for idx, j in enumerate(schedules_today):
                        jam = j.get("JamKe")
                        kelas = j.get("KodeKelas")
                        mapel = j.get("KodeMapel")
                        
                        st.markdown(f"**Jam Ke-{jam} | Kelas: {kelas} | Mapel: {mapel}**")
                        
                        # Find available substitute teachers for this specific period
                        available_subs = db_instance.get_available_substitutes(hari_id, [jam], exclude_nip=nip)
                        
                        if not available_subs:
                            st.warning(f"⚠️ Tidak ada guru pengganti yang luang pada Jam Ke-{jam}. Anda dapat memilih Guru Piket/Standby umum.")
                            # Fallback to all teachers (excluding self)
                            available_subs = [g for g in db.get("DATA_GURU", []) if g.get("NIP") != nip]
                        
                        sub_options = {g.get("NIP"): g.get("Nama") for g in available_subs}
                        
                        col1, col2 = st.columns(2)
                        with col1:
                            sub_nip = st.selectbox(
                                f"Pilih Guru Pengganti (Jam Ke-{jam})", 
                                options=list(sub_options.keys()),
                                format_func=lambda x: sub_options[x],
                                key=f"sub_nip_{jam}_{idx}"
                            )
                        with col2:
                            materi = st.text_input(f"Materi / Topik Pembelajaran", placeholder="Misal: Persamaan Kuadrat", key=f"materi_{jam}_{idx}")
                        
                        col3, col4, col5 = st.columns(3)
                        with col3:
                            tugas = st.text_input(f"Tugas Siswa", placeholder="Latihan halaman 10", key=f"tugas_{jam}_{idx}")
                        with col4:
                            halaman = st.text_input(f"Halaman Buku", placeholder="Hal. 10-12", key=f"halaman_{jam}_{idx}")
                        with col5:
                            target = st.text_input(f"Target Pencapaian", placeholder="Memahami rumus abc", key=f"target_{jam}_{idx}")
                            
                        instruksi = st.text_area(f"Instruksi Tambahan untuk Guru Pengganti", placeholder="Kumpulkan tugas di meja guru...", key=f"instruksi_{jam}_{idx}", rows=2)
                        
                        st.markdown("---")
                        
                        substitute_selections[jam] = {
                            "NIPPengganti": sub_nip,
                            "KodeKelas": kelas,
                            "KodeMapel": mapel,
                            "Materi": materi,
                            "Tugas": tugas,
                            "HalamanBuku": halaman,
                            "TargetPembelajaran": target,
                            "Instruksi": instruksi
                        }

                submit_button = st.form_submit_button("Kirim Pengajuan Izin 📮")
                
                if submit_button:
                    if not alasan:
                        st.error("Alasan perizinan wajib diisi.")
                    else:
                        # Save attachment file if present
                        lampiran_url = ""
                        lampiran_nama = ""
                        if uploaded_file:
                            safe_name = f"{nip}_{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}_{uploaded_file.name.replace(' ', '_')}"
                            file_path = os.path.join(UPLOAD_DIR, safe_name)
                            with open(file_path, "wb") as f:
                                f.write(uploaded_file.getbuffer())
                            lampiran_url = f"/uploads/{safe_name}"
                            lampiran_nama = uploaded_file.name

                        # Generate Permit ID
                        date_str = tanggal_input.strftime("%Y%m%d")
                        existing_today = len([i for i in db.get("DATA_IZIN", []) if i.get("Tanggal") == str(tanggal_input)])
                        id_izin = f"IZ-{date_str}-{str(existing_today + 1).zfill(3)}"

                        # Create new permit object
                        new_permit = {
                            "IdIzin": id_izin,
                            "Tanggal": str(tanggal_input),
                            "Hari": hari_id,
                            "NIP": nip,
                            "Unit": teacher_info.get("Unit", "SMP") if teacher_info else "SMP",
                            "JenisIzin": jenis_izin,
                            "Alasan": alasan,
                            "Status": "Menunggu Persetujuan",
                            "LampiranUrl": lampiran_url,
                            "LampiranNama": lampiran_nama,
                            "CreatedAt": datetime.datetime.utcnow().isoformat() + "Z"
                        }

                        # Save Permit to DB
                        db.get("DATA_IZIN", []).insert(0, new_permit)

                        # Save substitutes log to DB
                        for jam, details in substitute_selections.items():
                            new_sub = {
                                "IdIzin": id_izin,
                                "JamKe": int(jam),
                                "NIPOriginal": nip,
                                "NIPPengganti": details["NIPPengganti"],
                                "KodeKelas": details["KodeKelas"],
                                "KodeMapel": details["KodeMapel"],
                                "Materi": details["Materi"],
                                "Tugas": details["Tugas"],
                                "HalamanBuku": details["HalamanBuku"],
                                "TargetPembelajaran": details["TargetPembelajaran"],
                                "Instruksi": details["Instruksi"]
                            }
                            db.get("DATA_GURU_PENGGANTI", []).append(new_sub)

                        db_instance.save()
                        db_instance.log(username, "Pengajuan Izin", f"Mengajukan perizinan {id_izin} ({jenis_izin})")

                        # Send Emails Simulations
                        requester_name = teacher_info.get("Nama", username) if teacher_info else username
                        requester_email = st.session_state.user["email"]

                        # 1. Email to Guru
                        send_simulated_email(
                            requester_email,
                            f"[Perizinan Guru] Pengajuan Perizinan Diajukan - {id_izin}",
                            f"Yth. {requester_name},\n\nPengajuan perizinan Anda ({jenis_izin}) untuk tanggal {tanggal_input} telah diajukan ke sistem. Status saat ini: Menunggu Persetujuan.\n\nAlasan: {alasan}"
                        )

                        # 2. Email to Guru Piket
                        piket_teachers = [g for g in db.get("DATA_GURU", []) if g.get("IsPiket")]
                        for p in piket_teachers:
                            send_simulated_email(
                                p.get("Email"),
                                f"[Perizinan Guru] Pengajuan Baru Menunggu Verifikasi - {id_izin}",
                                f"Yth. Guru Piket ({p.get('Nama')}),\n\nAda pengajuan perizinan baru dari {requester_name} ({new_permit['Unit']}) pada tanggal {tanggal_input}.\n\nHarap segera login ke sistem untuk melakukan pemeriksaan dan memberikan verifikasi."
                            )

                        # 3. Email to substitutes
                        for jam, details in substitute_selections.items():
                            sub_teacher = next((g for g in db.get("DATA_GURU", []) if g.get("NIP") == details["NIPPengganti"]), None)
                            if sub_teacher:
                                send_simulated_email(
                                    sub_teacher.get("Email"),
                                    f"[Perizinan Guru] Penugasan Guru Pengganti - {id_izin}",
                                    f"Yth. {sub_teacher.get('Nama')},\n\nAnda telah dipilih oleh {requester_name} sebagai Guru Pengganti untuk Jam Ke-{jam} pada tanggal {tanggal_input}.\n\nMateri: {details['Materi']}\nTugas: {details['Tugas']}\nHalaman: {details['HalamanBuku']}\n\nHarap bersiap mengampu kelas tersebut."
                                )

                        st.success(f"Pengajuan perizinan dengan ID {id_izin} berhasil dikirim!")
                        st.rerun()

    # 3. Riwayat Perizinan
    with menu_tabs[2]:
        st.subheader("Daftar Pengajuan Izin Anda")
        
        my_permits = [i for i in db.get("DATA_IZIN", []) if i.get("NIP") == nip]
        
        if not my_permits:
            st.write("*Belum ada riwayat pengajuan izin.*")
        else:
            for permit in my_permits:
                status = permit.get("Status")
                
                # Badge styling
                badge_class = "badge-emerald" if status == "Selesai" else ("badge-amber" if status == "Menunggu Persetujuan" else ("badge-blue" if status == "Disetujui" else "badge-red"))
                
                with st.expander(f"📌 {permit['IdIzin']} | Tanggal: {permit['Tanggal']} ({permit['Hari']}) | Status: {status}"):
                    st.markdown(f"""
                    <div>
                        <span class='{badge_class}'>{status}</span>
                        <p style='margin-top: 10px;'><b>Jenis Izin</b>: {permit['JenisIzin']}</p>
                        <p><b>Alasan</b>: {permit['Alasan']}</p>
                        <p><b>Diajukan Pada</b>: {permit['CreatedAt'][:19].replace('T', ' ')} UTC</p>
                    </div>
                    """, unsafe_allow_html=True)
                    
                    if permit.get("LampiranUrl"):
                        st.markdown(f"📎 **Lampiran**: [Unduh Berkas]({permit['LampiranUrl']}) ({permit['LampiranNama']})")
                    
                    # Substitutes lists
                    subs_for_permit = [s for s in db.get("DATA_GURU_PENGGANTI", []) if s.get("IdIzin") == permit["IdIzin"]]
                    if subs_for_permit:
                        st.markdown("#### 🤝 Guru Pengganti Ditugaskan:")
                        for s in subs_for_permit:
                            sub_teacher = next((g for g in db.get("DATA_GURU", []) if g.get("NIP") == s["NIPPengganti"]), None)
                            sub_name = sub_teacher.get("Nama") if sub_teacher else s["NIPPengganti"]
                            st.write(f"- **Jam Ke-{s['JamKe']} ({s['KodeKelas']} - {s['KodeMapel']})**: Diampu oleh **{sub_name}**")
                            st.write(f"  *Materi*: {s.get('Materi') or '-'} | *Tugas*: {s.get('Tugas') or '-'} | *Buku*: Halaman {s.get('HalamanBuku') or '-'}")
                            if s.get("Instruksi"):
                                st.write(f"  *Instruksi*: *\"{s['Instruksi']}\"*")
                    
                    # Approvals workflow
                    approvals = [a for a in db.get("DATA_APPROVAL", []) if a.get("IdIzin") == permit["IdIzin"]]
                    if approvals:
                        st.markdown("#### ⏳ Kronologi Persetujuan:")
                        for a in approvals:
                            a_status = a.get("Status")
                            a_badge = "badge-emerald" if a_status == "Disetujui" else "badge-red"
                            st.markdown(f"""
                            <div style='background-color: #f9fafb; border-left: 2px solid #d1d5db; padding: 6px 12px; margin-bottom: 6px; border-radius: 4px;'>
                                <span class='{a_badge}'>{a_status}</span> &nbsp;
                                <b>{a['ApproverRole']}</b> ({a['ApproverName']}) <br/>
                                <span style='font-size: 11px; color: #6b7280;'>Tanggal: {a['TanggalApproval'][:19].replace('T', ' ')}</span><br/>
                                <span style='font-size: 13px;'>Catatan: <i>"{a.get('Catatan') or '-'}"</i></span>
                            </div>
                            """, unsafe_allow_html=True)
                            
                    # Download Printable Report
                    # Create simulated print HTML
                    html_report = f"""
                    <html>
                    <body style='font-family: sans-serif; padding: 20px; color: #333;'>
                        <div style='text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px;'>
                            <h2>YAYASAN PENDIDIKAN ISLAM PONDOK MODERN AL-GHOZALI</h2>
                            <p>SURAT KETERANGAN PERIZINAN GURU (SIPEG)</p>
                        </div>
                        <table style='width: 100%; margin-top: 20px; border-collapse: collapse;'>
                            <tr><td style='width: 150px;'><b>ID Izin</b></td><td>: {permit['IdIzin']}</td></tr>
                            <tr><td><b>Nama Guru</b></td><td>: {teacher_info.get('Nama') if teacher_info else username}</td></tr>
                            <tr><td><b>NIP</b></td><td>: {nip}</td></tr>
                            <tr><td><b>Tanggal Absen</b></td><td>: {permit['Tanggal']} ({permit['Hari']})</td></tr>
                            <tr><td><b>Jenis Izin</b></td><td>: {permit['JenisIzin']}</td></tr>
                            <tr><td><b>Alasan</b></td><td>: {permit['Alasan']}</td></tr>
                            <tr><td><b>Status Akhir</b></td><td>: {status}</td></tr>
                        </table>
                        <br/>
                        <h4>Tembusan Guru Pengganti:</h4>
                        <ul>
                    """
                    for s in subs_for_permit:
                        sub_teacher = next((g for g in db.get("DATA_GURU", []) if g.get("NIP") == s["NIPPengganti"]), None)
                        sub_name = sub_teacher.get("Nama") if sub_teacher else s["NIPPengganti"]
                        html_report += f"<li>Jam Ke-{s['JamKe']} ({s['KodeKelas']} - {s['KodeMapel']}): {sub_name} (Materi: {s.get('Materi')})</li>"
                    html_report += """
                        </ul>
                        <div style='margin-top: 50px; float: right; width: 250px; text-align: center;'>
                            <p>Mengetahui,</p>
                            <p style='margin-top: 60px;'><b>Kepala Bidang Pendidikan</b></p>
                        </div>
                    </body>
                    </html>
                    """
                    st.download_button(
                        "📄 Unduh Surat Izin (HTML/Cetak)",
                        data=html_report,
                        file_name=f"Surat_Izin_{permit['IdIzin']}.html",
                        mime="text/html",
                        key=f"dl_{permit['IdIzin']}"
                    )

    # 4. Profil & QR
    with menu_tabs[3]:
        st.subheader("Profil Guru & QR Presensi")
        
        if teacher_info:
            col1, col2 = st.columns([2, 1])
            with col1:
                st.markdown(f"### {teacher_info.get('Nama')}")
                st.write(f"**NIP**: `{teacher_info.get('NIP')}`")
                st.write(f"**Unit Mengajar**: {teacher_info.get('Unit')}")
                st.write(f"**No. HP / WhatsApp**: {teacher_info.get('NoHP')}")
                st.write(f"**Alamat Surat Elektronik (Email)**: {teacher_info.get('Email')}")
                
                # Render subjects taught
                my_classes = list(set([j.get("KodeMapel") for j in my_schedules]))
                st.markdown("**Daftar Mata Pelajaran Diajar:**")
                for c in my_classes:
                    mapel_name = next((m.get("NamaMapel") for m in db.get("DATA_MAPEL", []) if m.get("KodeMapel") == c), c)
                    st.write(f"- {c} - {mapel_name}")
            with col2:
                # Generate QR code URL using standard public QR API
                qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={nip}"
                st.image(qr_url, caption="QR Absensi Guru (Tunjukkan saat masuk/piket)", width=220)
        else:
            st.warning("Data guru tidak ditemukan di profil database.")

    # 5. Asisten AI
    with menu_tabs[4]:
        st.subheader("Asisten Pintar Al-Ghozali")
        st.write("Tanyakan tentang analisis bentrok jadwal, penyusunan jadwal piket, kebijakan perizinan, atau minta saran materi mengajar pengganti.")
        
        # Opsi Mode AI
        ai_mode = st.selectbox(
            "Pilih Mode Analisis AI", 
            ["fast", "complex", "thinking", "search", "maps"],
            format_func=lambda x: {
                "fast": "Kilat / Low-Latency (gemini-2.5-flash)",
                "complex": "Kompleks / Kualitas Tinggi (gemini-3.5-flash)",
                "thinking": "Penalaran Mendalam / Reasoning (High Thinking)",
                "search": "Koneksi Google Search (Grounding)",
                "maps": "Koneksi Google Maps (Grounding)"
            }[x]
        )
        
        chat_container = st.container()
        
        # Display history
        with chat_container:
            for msg in st.session_state.chat_history:
                role_class = "chat-user" if msg["role"] == "user" else "chat-assistant"
                role_label = "👤 Anda" if msg["role"] == "user" else "🤖 AI"
                st.markdown(f"""
                <div class='{role_class}'>
                    <b>{role_label}</b>: {msg['text']}
                </div>
                """, unsafe_allow_html=True)
                
        user_msg = st.chat_input("Tanyakan sesuatu ke Asisten AI...")
        
        if user_msg:
            # Add to history
            st.session_state.chat_history.append({"role": "user", "text": user_msg})
            st.rerun()
            
        # Trigger reply if user message is new
        if st.session_state.chat_history and st.session_state.chat_history[-1]["role"] == "user":
            with st.spinner("Asisten AI Al-Ghozali sedang menganalisis..."):
                reply, chunks, model_used = ai_helper.chat(
                    messages=st.session_state.chat_history,
                    mode=ai_mode,
                    system_instruction="Anda adalah Asisten Pintar SIPG YPI Al-Ghozali. Berikan solusi ramah dan profesional mengenai perizinan sekolah."
                )
                
                # Append grounding references if available
                if chunks:
                    reply += "\n\n**Referensi Google Search:**\n"
                    for chunk in chunks:
                        reply += f"- [{chunk['title']}]({chunk['uri']})\n"
                        
                st.session_state.chat_history.append({"role": "model", "text": reply})
                st.rerun()


# ----------------- GURU PIKET DASHBOARD & PAGES -----------------
elif role == "Guru Piket":
    menu_tabs = st.tabs(["📋 Dashboard", "✔️ Verifikasi Perizinan", "⏰ Daftar Guru Standby", "📸 Presensi QR / Scanner", "🤖 Asisten AI"])
    
    # 1. Dashboard Piket
    with menu_tabs[0]:
        st.subheader("Ringkasan Tugas Piket")
        
        pending_list = [i for i in db.get("DATA_IZIN", []) if i.get("Status") == "Menunggu Persetujuan"]
        
        col1, col2 = st.columns(2)
        with col1:
            st.markdown(f"""
            <div class='kpi-card'>
                <h5 style='color: #6b7280; font-size: 14px;'>Menunggu Verifikasi Piket</h5>
                <h2 style='color: #d97706; margin: 10px 0;'>{len(pending_list)}</h2>
                <span class='badge-amber'>Segera Verifikasi</span>
            </div>
            """, unsafe_allow_html=True)
        with col2:
            my_verified = len([a for a in db.get("DATA_APPROVAL", []) if a.get("ApproverRole") == "Guru Piket"])
            st.markdown(f"""
            <div class='kpi-card'>
                <h5 style='color: #6b7280; font-size: 14px;'>Izin Anda Verifikasi</h5>
                <h2 style='color: #047857; margin: 10px 0;'>{my_verified}</h2>
                <span class='badge-emerald'>Tercatat Log</span>
            </div>
            """, unsafe_allow_html=True)

    # 2. Verifikasi Perizinan
    with menu_tabs[1]:
        st.subheader("Pengajuan Izin Menunggu Verifikasi")
        
        if not pending_list:
            st.write("*Tidak ada perizinan yang menunggu verifikasi.*")
        else:
            for permit in pending_list:
                req_guru = next((g for g in db.get("DATA_GURU", []) if g.get("NIP") == permit["NIP"]), None)
                req_name = req_guru.get("Nama") if req_guru else permit["NIP"]
                
                with st.expander(f"📌 {permit['IdIzin']} | Guru: {req_name} ({permit['Unit']}) | Tanggal: {permit['Tanggal']}"):
                    st.write(f"**Jenis Izin**: {permit['JenisIzin']}")
                    st.write(f"**Alasan**: {permit['Alasan']}")
                    
                    if permit.get("LampiranUrl"):
                        st.markdown(f"📎 **Lampiran**: [Buka Berkas]({permit['LampiranUrl']}) ({permit['LampiranNama']})")
                    
                    # Substitutes
                    subs = [s for s in db.get("DATA_GURU_PENGGANTI", []) if s.get("IdIzin") == permit["IdIzin"]]
                    if subs:
                        st.markdown("**Guru Pengganti yang Dipilih:**")
                        for s in subs:
                            sub_teacher = next((g for g in db.get("DATA_GURU", []) if g.get("NIP") == s["NIPPengganti"]), None)
                            sub_name = sub_teacher.get("Nama") if sub_teacher else s["NIPPengganti"]
                            st.write(f"- **Jam Ke-{s['JamKe']}**: {sub_name} (Mapel: {s['KodeMapel']})")
                            st.write(f"  *Materi*: {s.get('Materi')} | *Tugas*: {s.get('Tugas')}")
                    
                    # AI Document Analysis helper inside expander!
                    if permit.get("LampiranUrl") and st.button("🔍 Analisis Lampiran Otomatis dengan AI", key=f"ai_parse_img_{permit['IdIzin']}"):
                        file_path = os.path.join(os.getcwd(), permit["LampiranUrl"].lstrip("/"))
                        if os.path.exists(file_path):
                            try:
                                with open(file_path, "rb") as img_file:
                                    img_bytes = img_file.read()
                                mime = "application/pdf" if permit["LampiranNama"].endswith(".pdf") else "image/jpeg"
                                
                                with st.spinner("AI sedang mendiagnosa isi dokumen..."):
                                    res_ai = ai_helper.analyze_image(
                                        image_bytes=img_bytes,
                                        mime_type=mime,
                                        prompt="Analisis dokumen surat ini secara teliti. Ekstrak data: Nama, Tanggal/Hari, Alasan Utama, Diagnosa (jika ada), dan apakah dokumen ini tampak resmi dan sah untuk perizinan."
                                    )
                                    st.markdown(f"""
                                    <div style='background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin: 10px 0;'>
                                        <b>💡 Hasil Analisis Dokumen AI:</b><br/>{res_ai}
                                    </div>
                                    """, unsafe_allow_html=True)
                            except Exception as ex:
                                st.error(f"Gagal memproses dokumen dengan AI: {str(ex)}")
                        else:
                            st.error("File lampiran fisik tidak ditemukan di server.")

                    # Form persetujuan
                    with st.form(f"form_verify_{permit['IdIzin']}"):
                        komentar = st.text_input("Catatan / Komentar Verifikasi", placeholder="Dokumen valid, disetujui...")
                        col_a, col_b = st.columns(2)
                        with col_a:
                            approve_btn = st.form_submit_button("✔️ Setujui (Lanjutkan ke Waka)")
                        with col_b:
                            reject_btn = st.form_submit_button("❌ Tolak Pengajuan")
                            
                        if approve_btn or reject_btn:
                            new_status = "Disetujui" if approve_btn else "Ditolak"
                            
                            # Create approval log
                            ap_id = f"AP-{str(len(db.get('DATA_APPROVAL', [])) + 1).zfill(3)}"
                            new_approval = {
                                "IdApproval": ap_id,
                                "IdIzin": permit["IdIzin"],
                                "ApproverRole": "Guru Piket",
                                "ApproverName": teacher_info.get("Nama", username) if teacher_info else username,
                                "Status": new_status,
                                "TanggalApproval": datetime.datetime.utcnow().isoformat() + "Z",
                                "Catatan": komentar
                            }
                            db.get("DATA_APPROVAL", []).append(new_approval)
                            
                            # Log and progression
                            if new_status == "Ditolak":
                                permit["Status"] = "Ditolak"
                                db_instance.log(username, "Penolakan Izin", f"Menolak perizinan {permit['IdIzin']} oleh Guru Piket")
                                
                                # Email to requester
                                send_simulated_email(
                                    req_guru.get("Email") if req_guru else "guru@alghozali.sch.id",
                                    f"[Perizinan Guru] Pengajuan Perizinan Ditolak - {permit['IdIzin']}",
                                    f"Yth. {req_name},\n\nDengan hormat, pengajuan perizinan Anda untuk tanggal {permit['Tanggal']} telah Ditolak oleh Guru Piket.\n\nKomentar: {komentar or '-'}"
                                )
                            else:
                                # Status remains pending but advances to Waka
                                db_instance.log(username, "Verifikasi Piket", f"Menyetujui perizinan {permit['IdIzin']} (Lanjut ke Waka)")
                                
                                # Email to Waka Kurikulum
                                waka_users = [u for u in db.get("DATA_USER", []) if u.get("Role") == "Waka Kurikulum"]
                                for w in waka_users:
                                    send_simulated_email(
                                        w.get("Email"),
                                        f"[Perizinan Guru] Menunggu Persetujuan Waka Kurikulum - {permit['IdIzin']}",
                                        f"Yth. Waka Kurikulum,\n\nPengajuan perizinan dari {req_name} tanggal {permit['Tanggal']} telah diverifikasi oleh Guru Piket.\n\nHarap segera login untuk memproses persetujuan tingkat 2."
                                    )
                                    
                            db_instance.save()
                            st.success(f"Perizinan {permit['IdIzin']} berhasil diproses!")
                            st.rerun()

    # 3. Daftar Guru Standby
    with menu_tabs[2]:
        st.subheader("Cek Guru Standby & Piket")
        hari_select = st.selectbox("Pilih Hari", ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"])
        jam_select = st.slider("Pilih Jam Ke-", 1, 10, 1)
        
        available = db_instance.get_available_substitutes(hari_select, [jam_select], exclude_nip="")
        
        if not available:
            st.info("*Tidak ada guru standby yang luang pada jam ini.*")
        else:
            st.write(f"Guru Standby pada hari **{hari_select}** Jam Ke-**{jam_select}**:")
            df_std = pd.DataFrame(available)[["NIP", "Nama", "Unit", "NoHP", "Email", "IsPiket"]]
            st.dataframe(df_std, use_container_width=True, hide_index=True)

    # 4. Scanner Presensi
    with menu_tabs[3]:
        st.subheader("Pencatatan Kehadiran Guru (Presensi)")
        
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("#### Mode 1: Manual Check-In")
            with st.form("manual_checkin_form"):
                guru_pilih = st.selectbox("Pilih Guru", options=[g.get("NIP") for g in db.get("DATA_GURU", [])], format_func=lambda x: next(g.get("Nama") for g in db.get("DATA_GURU", []) if g.get("NIP") == x))
                status_hadir = st.selectbox("Status Kehadiran", ["Hadir Tepat Waktu", "Terlambat", "Izin", "Dinas Luar"])
                lokasi = st.text_input("Lokasi Scan", "Gerbang Utama YPI Al-Ghozali")
                catatan = st.text_input("Catatan Tambahan", "Dicatat manual oleh Guru Piket")
                
                checkin_btn = st.form_submit_button("Catat Kehadiran 📝")
                
                if checkin_btn:
                    g_info = next(g for g in db.get("DATA_GURU", []) if g.get("NIP") == guru_pilih)
                    
                    pres_id = f"PRS-{datetime.date.today().strftime('%Y%m%d')}-{str(len(db.get('DATA_PRESENSI', [])) + 1).zfill(3)}"
                    new_presensi = {
                        "IdPresensi": pres_id,
                        "NIP": guru_pilih,
                        "NamaGuru": g_info.get("Nama"),
                        "Unit": g_info.get("Unit"),
                        "Tanggal": str(datetime.date.today()),
                        "WaktuMasuk": datetime.datetime.now().strftime("%H:%M:%S"),
                        "StatusHadir": status_hadir,
                        "PetugasPiket": teacher_info.get("Nama", username) if teacher_info else username,
                        "Lokasi": lokasi,
                        "Catatan": catatan
                    }
                    db.get("DATA_PRESENSI", []).insert(0, new_presensi)
                    db_instance.save()
                    db_instance.log(username, "Pencatatan Presensi", f"Mencatat kehadiran guru {g_info.get('Nama')} - {status_hadir}")
                    st.success(f"Presensi {g_info.get('Nama')} berhasil dicatat!")
                    
        with col2:
            st.markdown("#### Mode 2: QR Scanner Simulator")
            st.info("Unggah foto kode QR guru untuk menyimulasikan scanning.")
            uploaded_qr = st.file_uploader("Unggah Gambar QR Code Guru", type=["png", "jpg", "jpeg"])
            
            if uploaded_qr:
                st.success("QR Code terdeteksi!")
                # Extract a mock NIP from the image filename, or just select randomly from DB as a simulation
                mock_nip = random.choice([g.get("NIP") for g in db.get("DATA_GURU", [])])
                g_info = next(g for g in db.get("DATA_GURU", []) if g.get("NIP") == mock_nip)
                
                st.write(f"**NIP Terdeteksi**: `{mock_nip}`")
                st.write(f"**Nama Guru**: {g_info.get('Nama')}")
                
                if st.button("Konfirmasi Hasil Scan QR & Catat 📲"):
                    pres_id = f"PRS-{datetime.date.today().strftime('%Y%m%d')}-{str(len(db.get('DATA_PRESENSI', [])) + 1).zfill(3)}"
                    new_pres = {
                        "IdPresensi": pres_id,
                        "NIP": mock_nip,
                        "NamaGuru": g_info.get("Nama"),
                        "Unit": g_info.get("Unit"),
                        "Tanggal": str(datetime.date.today()),
                        "WaktuMasuk": datetime.datetime.now().strftime("%H:%M:%S"),
                        "StatusHadir": "Hadir Tepat Waktu",
                        "PetugasPiket": teacher_info.get("Nama", username) if teacher_info else username,
                        "Lokasi": "Pintu Gerbang Utama Al-Ghozali",
                        "Catatan": "Discan lewat QR ID Simulator"
                    }
                    db.get("DATA_PRESENSI", []).insert(0, new_pres)
                    db_instance.save()
                    db_instance.log(username, "Pencatatan Presensi QR", f"Mencatat kehadiran QR guru {g_info.get('Nama')} - Hadir")
                    st.success(f"Presensi QR {g_info.get('Nama')} berhasil disimpan!")

    # 5. Asisten AI (Copy of AI tab for Piket)
    with menu_tabs[4]:
        st.subheader("Asisten Pintar Al-Ghozali (Guru Piket)")
        # Same chat logic
        ai_mode = st.selectbox("Pilih Mode Analisis AI", ["fast", "complex", "thinking", "search"])
        chat_container = st.container()
        with chat_container:
            for msg in st.session_state.chat_history:
                role_class = "chat-user" if msg["role"] == "user" else "chat-assistant"
                role_label = "👤 Anda" if msg["role"] == "user" else "🤖 AI"
                st.markdown(f"<div class='{role_class}'><b>{role_label}</b>: {msg['text']}</div>", unsafe_allow_html=True)
        user_msg = st.chat_input("Tanyakan sesuatu ke Asisten AI...", key="chat_piket_input")
        if user_msg:
            st.session_state.chat_history.append({"role": "user", "text": user_msg})
            st.rerun()
        if st.session_state.chat_history and st.session_state.chat_history[-1]["role"] == "user":
            with st.spinner("AI sedang berpikir..."):
                reply, chunks, model_used = ai_helper.chat(
                    messages=st.session_state.chat_history,
                    mode=ai_mode,
                    system_instruction="Anda adalah Asisten Pintar Guru Piket SIPG. Bantu verifikasi kelas kosong dan atur guru pengganti."
                )
                st.session_state.chat_history.append({"role": "model", "text": reply})
                st.rerun()


# ----------------- WAKA & KABID WORKFLOW DASHBOARD -----------------
elif role in ["Waka Kurikulum", "Kepala Bidang Pendidikan"]:
    menu_tabs = st.tabs(["📋 Dashboard & Statistik", "✔️ Persetujuan Tingkat Lanjut", "🤖 Asisten AI"])
    
    # 1. Dashboard & Stats
    with menu_tabs[0]:
        st.subheader("Statistik Perizinan Sekolah")
        
        # KPI calculations
        total_absent = len(db.get("DATA_IZIN", []))
        pending_waka = len([i for i in db.get("DATA_IZIN", []) if i.get("Status") == "Menunggu Persetujuan"])
        
        c1, c2, c3 = st.columns(3)
        with c1:
            st.metric("Total Guru Izin (Historis)", total_absent)
        with c2:
            st.metric("Izin Menunggu Persetujuan", pending_waka)
        with c3:
            approved_all = len([i for i in db.get("DATA_IZIN", []) if i.get("Status") == "Selesai"])
            st.metric("Izin Selesai Disetujui", approved_all)

        # Plotly charts
        st.markdown("#### Distribusi Jenis Izin")
        izin_df = pd.DataFrame(db.get("DATA_IZIN", []))
        if not izin_df.empty:
            fig = px.pie(izin_df, names="JenisIzin", title="Pembagian Jenis Izin Mengajar", color_discrete_sequence=px.colors.qualitative.Emerald)
            st.plotly_chart(fig, use_container_width=True)
            
            st.markdown("#### Tren Perizinan berdasarkan Tanggal")
            trend_df = izin_df.groupby("Tanggal").size().reset_index(name="Jumlah")
            fig2 = px.line(trend_df, x="Tanggal", y="Jumlah", title="Jumlah Guru Absen Per Tanggal", markers=True, color_discrete_sequence=["#d97706"])
            st.plotly_chart(fig2, use_container_width=True)
        else:
            st.write("*Tidak ada data grafik untuk ditampilkan.*")

    # 2. Persetujuan Tingkat Lanjut
    with menu_tabs[1]:
        st.subheader(f"Daftar Persetujuan - Tingkat {role}")
        
        # Filter permits depending on role
        # Waka approves permits where Guru Piket has approved, status is still pending (status is verified in logs)
        # In this simplified DB, DATA_APPROVAL contains the progression
        pending_level_permits = []
        for permit in db.get("DATA_IZIN", []):
            if permit.get("Status") == "Menunggu Persetujuan":
                approvals = [a for a in db.get("DATA_APPROVAL", []) if a.get("IdIzin") == permit["IdIzin"]]
                has_piket_approval = any(a.get("ApproverRole") == "Guru Piket" and a.get("Status") == "Disetujui" for a in approvals)
                has_waka_approval = any(a.get("ApproverRole") == "Waka Kurikulum" and a.get("Status") == "Disetujui" for a in approvals)
                
                if role == "Waka Kurikulum" and has_piket_approval and not has_waka_approval:
                    pending_level_permits.append(permit)
                elif role == "Kepala Bidang Pendidikan" and has_waka_approval:
                    pending_level_permits.append(permit)
                    
        if not pending_level_permits:
            st.write(f"*Tidak ada pengajuan izin yang menunggu persetujuan dari {role} saat ini.*")
        else:
            for permit in pending_level_permits:
                req_guru = next((g for g in db.get("DATA_GURU", []) if g.get("NIP") == permit["NIP"]), None)
                req_name = req_guru.get("Nama") if req_guru else permit["NIP"]
                
                with st.expander(f"📌 {permit['IdIzin']} | Guru: {req_name} | Jenis: {permit['JenisIzin']}"):
                    st.write(f"**Alasan**: {permit['Alasan']}")
                    if permit.get("LampiranUrl"):
                        st.markdown(f"📎 **Lampiran**: [Buka Berkas]({permit['LampiranUrl']})")
                        
                    # Pre-existing approvals
                    st.markdown("**Status Log Approval Sebelumnya:**")
                    approvals = [a for a in db.get("DATA_APPROVAL", []) if a.get("IdIzin") == permit["IdIzin"]]
                    for a in approvals:
                        st.write(f"- **{a['ApproverRole']}** ({a['ApproverName']}): {a['Status']} (Catatan: *\"{a.get('Catatan')}\"* )")
                        
                    # Form approval for Waka / Kabid
                    with st.form(f"form_advance_approve_{permit['IdIzin']}"):
                        catatan_adv = st.text_input("Komentar Persetujuan", placeholder="Disetujui, guru pengganti siap...")
                        col_x, col_y = st.columns(2)
                        with col_x:
                            btn_app = st.form_submit_button("✔️ Setujui Pengajuan")
                        with col_y:
                            btn_rej = st.form_submit_button("❌ Tolak Pengajuan")
                            
                        if btn_app or btn_rej:
                            decision = "Disetujui" if btn_app else "Ditolak"
                            
                            # Record Approval
                            ap_id = f"AP-{str(len(db.get('DATA_APPROVAL', [])) + 1).zfill(3)}"
                            new_ap = {
                                "IdApproval": ap_id,
                                "IdIzin": permit["IdIzin"],
                                "ApproverRole": role,
                                "ApproverName": username,
                                "Status": decision,
                                "TanggalApproval": datetime.datetime.utcnow().isoformat() + "Z",
                                "Catatan": catatan_adv
                            }
                            db.get("DATA_APPROVAL", []).append(new_ap)
                            
                            if decision == "Ditolak":
                                permit["Status"] = "Ditolak"
                                db_instance.log(username, "Penolakan Izin", f"Menolak perizinan {permit['IdIzin']} oleh {role}")
                                
                                # Email to requester
                                send_simulated_email(
                                    req_guru.get("Email") if req_guru else "guru@alghozali.sch.id",
                                    f"[Perizinan Guru] Pengajuan Perizinan Ditolak - {permit['IdIzin']}",
                                    f"Yth. {req_name},\n\nPengajuan perizinan Anda untuk tanggal {permit['Tanggal']} ditolak oleh {role} ({username}).\n\nKomentar: {catatan_adv}"
                                )
                            else:
                                if role == "Waka Kurikulum":
                                    # Notify Kabid for level 3
                                    db_instance.log(username, "Persetujuan Waka", f"Menyetujui perizinan {permit['IdIzin']} (Lanjut ke Kabid)")
                                    
                                    kabid_users = [u for u in db.get("DATA_USER", []) if u.get("Role") == "Kepala Bidang Pendidikan"]
                                    for k in kabid_users:
                                        send_simulated_email(
                                            k.get("Email"),
                                            f"[Perizinan Guru] Menunggu Persetujuan Final Kabid Pendidikan - {permit['IdIzin']}",
                                            f"Yth. Kepala Bidang Pendidikan,\n\nPengajuan perizinan dari {req_name} tanggal {permit['Tanggal']} telah disetujui oleh Waka Kurikulum.\n\nHarap segera login untuk memberikan persetujuan final."
                                        )
                                else: # Kepala Bidang Pendidikan (Final)
                                    permit["Status"] = "Selesai"
                                    db_instance.log(username, "Persetujuan Final", f"Menyetujui perizinan {permit['IdIzin']} (Persetujuan Final Selesai)")
                                    
                                    # Email to requester
                                    send_simulated_email(
                                        req_guru.get("Email") if req_guru else "guru@alghozali.sch.id",
                                        f"[Perizinan Guru] Pengajuan Perizinan Selesai Disetujui - {permit['IdIzin']}",
                                        f"Yth. {req_name},\n\nAlhamdulillah, pengajuan perizinan Anda untuk tanggal {permit['Tanggal']} telah disetujui sepenuhnya oleh Kepala Bidang Pendidikan.\n\nSemua proses selesai."
                                    )
                                    
                                    # Email to substitutes to confirm duty
                                    subs = [s for s in db.get("DATA_GURU_PENGGANTI", []) if s.get("IdIzin") == permit["IdIzin"]]
                                    for s in subs:
                                        sub_t = next((g for g in db.get("DATA_GURU", []) if g.get("NIP") == s["NIPPengganti"]), None)
                                        if sub_t:
                                            send_simulated_email(
                                                sub_t.get("Email"),
                                                f"[Perizinan Guru] Konfirmasi Penugasan Guru Pengganti Selesai - {permit['IdIzin']}",
                                                f"Yth. {sub_t.get('Nama')},\n\nPerizinan untuk {req_name} telah disetujui sepenuhnya. Penugasan Anda sebagai guru pengganti pada Jam Ke-{s['JamKe']} tanggal {permit['Tanggal']} resmi dikonfirmasi."
                                            )
                                            
                            db_instance.save()
                            st.success("Tindakan berhasil disimpan!")
                            st.rerun()

    # 3. Asisten AI
    with menu_tabs[2]:
        st.subheader("Asisten AI Al-Ghozali (Management Hub)")
        ai_mode = st.selectbox("Pilih Mode Analisis AI", ["fast", "complex", "thinking", "search"])
        chat_container = st.container()
        with chat_container:
            for msg in st.session_state.chat_history:
                role_class = "chat-user" if msg["role"] == "user" else "chat-assistant"
                role_label = "👤 Anda" if msg["role"] == "user" else "🤖 AI"
                st.markdown(f"<div class='{role_class}'><b>{role_label}</b>: {msg['text']}</div>", unsafe_allow_html=True)
        user_msg = st.chat_input("Tanyakan sesuatu ke Asisten AI...", key="chat_mgt_input")
        if user_msg:
            st.session_state.chat_history.append({"role": "user", "text": user_msg})
            st.rerun()
        if st.session_state.chat_history and st.session_state.chat_history[-1]["role"] == "user":
            with st.spinner("AI sedang berpikir..."):
                reply, chunks, model_used = ai_helper.chat(
                    messages=st.session_state.chat_history,
                    mode=ai_mode,
                    system_instruction="Anda adalah Asisten Pintar Kepala Bidang & Waka Kurikulum SIPG. Analisis produktivitas absen dan rancang jadwal yang seimbang."
                )
                st.session_state.chat_history.append({"role": "model", "text": reply})
                st.rerun()


# ----------------- ADMINISTRATOR VIEW & DATA CONTROL -----------------
elif role == "Administrator":
    menu_tabs = st.tabs(["📊 Sistem Log & Audit", "📝 Manajemen Data (CRUD)", "📅 Unggah Jadwal (AI Parser)", "⚙️ Kontrol Database", "📁 File Drive Explorer", "📄 Sumber GAS"])
    
    # 1. Audit logs
    with menu_tabs[0]:
        st.subheader("Log Aktivitas Sistem")
        st.write("Semua aktivitas login, perubahan data, dan persetujuan dicatat secara otomatis.")
        
        logs = db.get("DATA_LOG", [])
        if not logs:
            st.write("*Tidak ada log aktivitas.*")
        else:
            log_df = pd.DataFrame(logs)[["IdLog", "Timestamp", "User", "Activity", "Details"]]
            st.dataframe(log_df, use_container_width=True, hide_index=True)

    # 2. Manajemen Data (CRUD)
    with menu_tabs[1]:
        st.subheader("Edit Data Database Langsung")
        st.info("Pilih tabel yang ingin Anda manipulasi secara langsung. Perubahan akan disimpan kembali ke file db.json secara aman.")
        
        table_select = st.selectbox("Pilih Tabel", ["DATA_GURU", "DATA_MAPEL", "DATA_KELAS", "DATA_JADWAL", "DATA_USER"])
        
        table_data = db.get(table_select, [])
        if not table_data:
            st.write("*Tabel kosong atau tidak ditemukan.*")
        else:
            df_edit = pd.DataFrame(table_data)
            
            # Use st.data_editor for inline CRUD operations!
            edited_df = st.data_editor(
                df_edit, 
                num_rows="dynamic", 
                use_container_width=True, 
                key=f"editor_{table_select}"
            )
            
            if st.button("Simpan Perubahan Tabel 💾"):
                # Convert DataFrame back to list of dicts
                cleaned_list = edited_df.to_dict(orient="records")
                # Remove NaN values from records
                for r in cleaned_list:
                    for k in list(r.keys()):
                        if pd.isna(r[k]):
                            r[k] = ""
                            
                db[table_select] = cleaned_list
                db_instance.save()
                db_instance.log(username, "Ubah Data", f"Mengubah baris tabel {table_select} via editor.")
                st.success("Tabel database berhasil diperbarui dan disimpan!")
                st.rerun()

    # 3. Unggah Jadwal (AI Parser)
    with menu_tabs[2]:
        st.subheader("AI Parser Jadwal Mengajar")
        st.write("Unggah dokumen jadwal mengajar Anda (PDF, Gambar, atau file teks) dan biarkan Gemini AI mengekstrak data jadwal mengajar secara terstruktur.")
        
        upload_type = st.radio("Metode Timpa Data", ["Tambahkan Data (Append)", "Gantikan Semua Jadwal Lama (Overwrite)"])
        schedule_file = st.file_uploader("Unggah Dokumen Jadwal", type=["pdf", "png", "jpg", "jpeg", "txt", "csv", "md"])
        
        if schedule_file:
            file_bytes = schedule_file.read()
            
            if st.button("Mulai Parsing AI Gemini ⚙️"):
                with st.spinner("AI sedang mengurai data jadwal..."):
                    try:
                        parsed_items = ai_helper.parse_schedule_document(
                            file_bytes=file_bytes,
                            mime_type=schedule_file.type,
                            file_name=schedule_file.name
                        )
                        
                        st.success(f"Berhasil mengurai {len(parsed_items)} baris jadwal!")
                        
                        # Cross-reference with DB to resolve exact NIP and names
                        all_guru = db.get("DATA_GURU", [])
                        enriched_items = []
                        for idx, item in enumerate(parsed_items):
                            matched_guru = next((g for g in all_guru if g.get("NIP") == item.get("NIP")), None)
                            if not matched_guru and item.get("NamaGuru"):
                                clean_name = item.get("NamaGuru").lower().replace("ustadz", "").replace("ustadzah", "").replace("s.pd.", "").replace("m.pd.", "").strip()
                                matched_guru = next((g for g in all_guru if clean_name in g.get("Nama").lower()), None)
                                
                            enriched_items.append({
                                "IdJadwal": f"J-UP-{str(int(datetime.datetime.now().timestamp()))}-{idx + 1}",
                                "NIP": matched_guru.get("NIP") if matched_guru else item.get("NIP", "-"),
                                "NamaGuruMatched": matched_guru.get("Nama") if matched_guru else item.get("NamaGuru", "-"),
                                "Hari": item.get("Hari", "Senin"),
                                "JamKe": int(item.get("JamKe", 1)),
                                "KodeMapel": item.get("KodeMapel", "UMUM"),
                                "KodeKelas": item.get("KodeKelas", "UMUM")
                            })
                            
                        # Show preview
                        st.markdown("#### Pratinjau Jadwal yang Diekstrak:")
                        preview_df = pd.DataFrame(enriched_items)
                        st.dataframe(preview_df, use_container_width=True, hide_index=True)
                        
                        # Save action
                        if st.button("Konfirmasi dan Simpan Jadwal ke Database 💾"):
                            sanitized = [
                                {
                                    "IdJadwal": item["IdJadwal"],
                                    "NIP": item["NIP"],
                                    "Hari": item["Hari"],
                                    "JamKe": item["JamKe"],
                                    "KodeMapel": item["KodeMapel"],
                                    "KodeKelas": item["KodeKelas"]
                                } for item in enriched_items
                            ]
                            
                            if upload_type == "Gantikan Semua Jadwal Lama (Overwrite)":
                                db["DATA_JADWAL"] = sanitized
                            else:
                                db["DATA_JADWAL"].extend(sanitized)
                                
                            db_instance.save()
                            db_instance.log(username, "Upload Database Jadwal", f"Memperbarui database jadwal dengan {len(sanitized)} baris baru via AI Parser.")
                            st.success("Jadwal mengajar sekolah berhasil diperbarui!")
                            st.rerun()
                            
                    except Exception as ex:
                        st.error(f"Gagal melakukan penguraian: {str(ex)}")

    # 4. Database Control
    with menu_tabs[3]:
        st.subheader("Kontrol & Utilitas Database")
        
        col_d1, col_d2, col_d3 = st.columns(3)
        with col_d1:
            st.markdown("##### Atur Ulang Database")
            st.write("Mengembalikan seluruh data perizinan, guru, dan jadwal ke data awal bawaan.")
            if st.button("Reset Database ⚠️", use_container_width=True):
                db_instance.reset()
                st.success("Database berhasil diatur ulang ke kondisi awal!")
                st.rerun()
                
        with col_d2:
            st.markdown("##### Cadangkan Database")
            st.write("Unduh file cadangan db.json saat ini.")
            db_json_bytes = json.dumps(db, indent=2).encode('utf-8')
            st.download_button(
                "Backup Database 📥",
                data=db_json_bytes,
                file_name="sipg_database_backup.json",
                mime="application/json",
                use_container_width=True
            )
            
        with col_d3:
            st.markdown("##### Pulihkan Database")
            st.write("Unggah berkas backup JSON untuk mengganti seluruh data database.")
            restore_file = st.file_uploader("Unggah File Backup JSON", type=["json"])
            if restore_file:
                try:
                    restored_data = json.load(restore_file)
                    if st.button("Restore Database Sekarang ♻️", use_container_width=True):
                        db_instance.restore(restored_data)
                        st.success("Database berhasil dipulihkan dari cadangan!")
                        st.rerun()
                except Exception as err:
                    st.error(f"File backup tidak valid: {str(err)}")

    # 5. Google Drive Uploads Explorer
    with menu_tabs[4]:
        st.subheader("Penyimpanan Berkas (Uploads Folder)")
        st.write("Daftar file lampiran yang diunggah oleh guru di sistem perizinan.")
        
        try:
            files = os.listdir(UPLOAD_DIR)
            if not files:
                st.write("*Tidak ada berkas terunggah.*")
            else:
                file_list = []
                for file in files:
                    file_path = os.path.join(UPLOAD_DIR, file)
                    stat = os.stat(file_path)
                    file_list.append({
                        "Filename": file,
                        "Path": f"/uploads/{file}",
                        "Size (KB)": round(stat.st_size / 1024, 2),
                        "Created At": datetime.datetime.fromtimestamp(stat.st_ctime).strftime("%Y-%m-%d %H:%M:%S")
                    })
                
                df_files = pd.DataFrame(file_list)
                st.dataframe(df_files, use_container_width=True, hide_index=True)
                
                # Delete files action
                filename_to_delete = st.selectbox("Pilih berkas untuk dihapus", [""] + files)
                if filename_to_delete:
                    if st.button("Hapus berkas permanen 🗑️"):
                        file_del_path = os.path.join(UPLOAD_DIR, filename_to_delete)
                        if os.path.exists(file_del_path):
                            os.remove(file_del_path)
                            db_instance.log(username, "Hapus Berkas", f"Menghapus berkas {filename_to_delete} dari penyimpanan.")
                            st.success(f"Berkas {filename_to_delete} berhasil dihapus!")
                            st.rerun()
        except Exception as e:
            st.error(f"Gagal memuat berkas: {str(e)}")

    # 6. GAS Sources Reference View
    with menu_tabs[5]:
        st.subheader("Google Apps Script Source Codes")
        st.write("Gunakan berkas Google Apps Script berikut di Google Sheet Anda untuk menghubungkan perizinan dengan Google Sheets secara langsung.")
        
        # Load GASSources.ts source values
        # Since GAS_SOURCES is defined in React code, we include it here directly for reference
        st.markdown("**1. Code.gs** (Main Entry Point & User Sessions)")
        st.code("""
/**
 * SISTEM INFORMASI PERIZINAN GURU (SIPEG)
 * Entry Point Web App (Code.gs)
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Dashboard')
    .evaluate()
    .setTitle('SIPEG - Pondok Modern Al Ghozali')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function checkLogin(username, password, role) {
  // Login verification against sheets...
}
        """, language="javascript")
        
        st.markdown("**2. Database.gs** (Google Sheets Data Link & CRUD Engine)")
        st.code("""
/**
 * Database Engine - Google Sheets Integration
 */
var SPREADSHEET_ID = "1FWO_meYPe8qmQP0O0nEF142ke5J83Rt-O_wt46UGD_A";

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function setupDatabaseAndSheets() {
  // Automated sheet structure configurations...
}
        """, language="javascript")


# ----------------- GURU PENGGANTI DASHBOARD -----------------
elif role == "Guru Pengganti":
    st.subheader("Daftar Tugas Guru Pengganti Anda")
    st.write("Berikut adalah daftar kelas yang didelegasikan kepada Anda sebagai Guru Pengganti.")
    
    # Query duties where NIPPengganti == NIP and related permits are approved or finished
    my_duties = []
    all_izin = db.get("DATA_IZIN", [])
    all_pengganti = db.get("DATA_GURU_PENGGANTI", [])
    
    for p in all_pengganti:
        if p.get("NIPPengganti") == nip:
            # Check related permit status
            rel_iz = next((i for i in all_izin if i.get("IdIzin") == p.get("IdIzin")), None)
            if rel_iz and rel_iz.get("Status") in ["Disetujui", "Selesai"]:
                my_duties.append({
                    "IdIzin": p.get("IdIzin"),
                    "Tanggal": rel_iz.get("Tanggal"),
                    "Hari": rel_iz.get("Hari"),
                    "NIPOriginal": p.get("NIPOriginal"),
                    "JamKe": p.get("JamKe"),
                    "KodeKelas": p.get("KodeKelas"),
                    "KodeMapel": p.get("KodeMapel"),
                    "Materi": p.get("Materi"),
                    "Tugas": p.get("Tugas"),
                    "Instruksi": p.get("Instruksi")
                })
                
    if not my_duties:
        st.write("*Tidak ada tugas guru pengganti saat ini.*")
    else:
        for duty in my_duties:
            orig_guru = next((g for g in db.get("DATA_GURU", []) if g.get("NIP") == duty["NIPOriginal"]), None)
            orig_name = orig_guru.get("Nama") if orig_guru else duty["NIPOriginal"]
            
            with st.expander(f"📍 Jam Ke-{duty['JamKe']} | Kelas: {duty['KodeKelas']} | Tanggal: {duty['Tanggal']} ({duty['Hari']})"):
                st.markdown(f"""
                **Guru yang Digantikan**: {orig_name} <br/>
                **Mata Pelajaran**: {duty['KodeMapel']} <br/>
                **Materi Belajar**: {duty.get('Materi') or '-'} <br/>
                **Tugas Kelas**: {duty.get('Tugas') or '-'} <br/>
                """)
                if duty.get("Instruksi"):
                    st.info(f"**Instruksi Tambahan dari Guru Utama:**\n*\"{duty['Instruksi']}\"*")
