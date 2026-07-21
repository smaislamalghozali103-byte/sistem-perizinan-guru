import React, { useState, useRef } from "react";
import {
  User,
  Phone,
  Mail,
  Camera,
  Shield,
  UploadCloud,
  Check,
  Loader,
  Briefcase,
  Smartphone,
  IdCard,
  Lock,
  Settings
} from "lucide-react";
import { SessionUser, Guru } from "../types";

interface MyProfileProps {
  user: SessionUser;
  onNotify: (message: string, type: "success" | "error" | "info") => void;
  onRefreshAllData: () => void;
  onUserUpdate: (updatedUser: SessionUser) => void;
}

export default function MyProfile({
  user,
  onNotify,
  onRefreshAllData,
  onUserUpdate,
}: MyProfileProps) {
  const teacher = user.teacher;

  // Form states
  const [phone, setPhone] = useState(teacher?.NoHP || "");
  const [email, setEmail] = useState(teacher?.Email || user.email || "");
  const [photoUrl, setPhotoUrl] = useState(teacher?.FotoUrl || "");
  
  // Password change states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Logo config states (only for Admin)
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(localStorage.getItem("alghozali_logo_url") || "");

  // UI states
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If no teacher record is linked, show a friendly warning but let them update their user email
  const hasLinkedTeacher = !!teacher;

  // Format initials for avatar placeholder
  const getInitials = () => {
    const name = teacher?.Nama || user.username;
    return name
      .replace("Ustadz ", "")
      .replace("Ustadzah ", "")
      .slice(0, 2)
      .toUpperCase();
  };

  // Trigger hidden input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Convert image and upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await uploadProfilePicture(file);
    }
  };

  const uploadProfilePicture = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      onNotify("Format file harus berupa gambar.", "error");
      return;
    }

    // Limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      onNotify("Ukuran gambar maksimal 5MB.", "error");
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;

        const response = await fetch("/api/permits/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: `profile_${teacher?.NIP || user.username}_${Date.now()}.${file.name.split(".").pop()}`,
            fileType: file.type,
            fileData: base64data,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setPhotoUrl(data.filePath);
            onNotify("Foto profil berhasil diunggah. Klik 'Simpan Perubahan' untuk mengonfirmasi.", "success");
          } else {
            onNotify(data.message || "Gagal mengunggah foto.", "error");
          }
        } else {
          onNotify("Gagal menghubungi server untuk unggah foto.", "error");
        }
      };
    } catch (e) {
      onNotify("Terjadi kesalahan saat mengunggah foto.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadProfilePicture(e.dataTransfer.files[0]);
    }
  };

  // Submit changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasLinkedTeacher) {
      onNotify("Profil Anda tidak terhubung dengan data guru. Perubahan detail tidak dapat disimpan ke 'DATA_GURU'.", "info");
      return;
    }

    if (!phone) {
      onNotify("Nomor HP/WhatsApp tidak boleh kosong.", "error");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Prepare updated guru record
      const updatedGuru: Guru = {
        ...teacher,
        NoHP: phone,
        Email: email,
        FotoUrl: photoUrl,
      };

      // 2. Call PUT API
      const response = await fetch("/api/db/DATA_GURU/NIP", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedGuru),
      });

      if (response.ok) {
        // 3. Update local session in React + LocalStorage
        const updatedUserSession: SessionUser = {
          ...user,
          email: email,
          teacher: updatedGuru,
        };
        onUserUpdate(updatedUserSession);

        onNotify("Profil Anda berhasil diperbarui dan disimpan.", "success");
        onRefreshAllData();
      } else {
        const errorData = await response.json();
        onNotify(errorData.message || "Gagal menyimpan perubahan profil.", "error");
      }
    } catch (e) {
      onNotify("Kesalahan jaringan saat memperbarui profil.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      onNotify("Password baru tidak boleh kosong.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      onNotify("Konfirmasi password tidak cocok.", "error");
      return;
    }
    if (newPassword.length < 4) {
      onNotify("Password minimal 4 karakter.", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/db/DATA_USER/Username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          Username: user.username,
          PasswordRaw: newPassword
        }),
      });

      if (response.ok) {
        onNotify("Password Anda berhasil diperbarui.", "success");
        setNewPassword("");
        setConfirmPassword("");
        onRefreshAllData();
      } else {
        const errorData = await response.json();
        onNotify(errorData.message || "Gagal mengubah password.", "error");
      }
    } catch (err) {
      onNotify("Kesalahan jaringan saat mengubah password.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveLogo = (e: React.FormEvent) => {
    e.preventDefault();
    if (schoolLogoUrl.trim()) {
      localStorage.setItem("alghozali_logo_url", schoolLogoUrl.trim());
      onNotify("Logo YPI Pondok Modern Al-Ghozali berhasil diperbarui secara sistem.", "success");
    } else {
      localStorage.removeItem("alghozali_logo_url");
      onNotify("Logo YPI Pondok Modern Al-Ghozali direset ke logo standar.", "success");
    }
    // Refresh page to apply logo change immediately
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="p-5 bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 rounded-2xl flex items-start space-x-3 transition-colors">
        <div className="p-2.5 bg-teal-600 rounded-xl text-white">
          <User className="w-5.5 h-5.5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Pengaturan Profil Saya</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Perbarui nomor kontak WhatsApp, alamat email, dan pas foto profil Anda yang terhubung dengan database guru.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Side: Avatar / Photo Upload Card */}
        <div className="md:col-span-5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center transition-colors">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 block">
            Foto Profil
          </span>

          {/* Interactive Profile Photo Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className={`relative group cursor-pointer w-32 h-32 rounded-full flex items-center justify-center border-2 border-dashed transition-all ${
              dragActive
                ? "border-teal-500 bg-teal-50/20 dark:bg-teal-950/20 scale-105"
                : photoUrl
                ? "border-transparent"
                : "border-slate-300 dark:border-slate-600 hover:border-teal-500 dark:hover:border-teal-400 bg-slate-50 dark:bg-slate-700/50"
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center justify-center space-y-1.5 text-teal-600 dark:text-teal-400">
                <Loader className="w-6 h-6 animate-spin" />
                <span className="text-[10px] font-bold font-mono">Mengunggah...</span>
              </div>
            ) : photoUrl ? (
              <>
                <img
                  src={photoUrl}
                  referrerPolicy="no-referrer"
                  alt="Foto Profil"
                  className="w-full h-full rounded-full object-cover shadow-md border border-slate-200 dark:border-slate-700"
                />
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 rounded-full flex flex-col items-center justify-center text-white transition-opacity duration-200">
                  <Camera className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-bold">Ubah Foto</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center p-3 text-slate-400 dark:text-slate-500 group-hover:text-teal-600 dark:group-hover:text-teal-400">
                <UploadCloud className="w-7 h-7 mb-1" />
                <span className="text-[10px] font-bold">Unggah Foto</span>
                <span className="text-[8px] mt-0.5">atau drag & drop</span>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Quick Details Below Photo */}
          <div className="mt-4">
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              {teacher?.Nama || user.username}
            </h4>
            <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 font-mono tracking-wider uppercase block mt-1">
              {user.role}
            </span>
            {hasLinkedTeacher && (
              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                NIP: {teacher.NIP}
              </span>
            )}
          </div>

          <div className="mt-5 w-full bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700 rounded-xl p-3 text-left">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">
              Informasi Tambahan
            </span>
            <div className="mt-2 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Unit: {teacher?.Unit || "-"}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Piket: {teacher?.IsPiket ? "Aktif" : "Tidak Aktif"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Profile Details Form */}
        <div className="md:col-span-7 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm transition-colors">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
              Detail Akun & Kontak
            </h4>

            {/* Nama Lengkap (Read Only) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center space-x-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Nama Lengkap (Sistem)</span>
              </label>
              <input
                type="text"
                disabled
                value={teacher?.Nama || user.username}
                className="w-full px-3 py-2 border border-slate-100 dark:border-slate-700/50 rounded-xl text-xs bg-slate-50 dark:bg-slate-700/40 text-slate-400 dark:text-slate-500 font-medium cursor-not-allowed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* NIP (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center space-x-1.5">
                  <IdCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>NIP</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={teacher?.NIP || "-"}
                  className="w-full px-3 py-2 border border-slate-100 dark:border-slate-700/50 rounded-xl text-xs bg-slate-50 dark:bg-slate-700/40 text-slate-400 dark:text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              {/* Lembaga / Unit (Read Only) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center space-x-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lembaga / Unit</span>
                </label>
                <input
                  type="text"
                  disabled
                  value={teacher?.Unit || "-"}
                  className="w-full px-3 py-2 border border-slate-100 dark:border-slate-700/50 rounded-xl text-xs bg-slate-50 dark:bg-slate-700/40 text-slate-400 dark:text-slate-500 font-medium cursor-not-allowed"
                />
              </div>
            </div>

            {/* No. HP / WhatsApp (Editable) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>No. HP / WhatsApp</span>
              </label>
              <input
                type="text"
                disabled={!hasLinkedTeacher}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={hasLinkedTeacher ? "Contoh: 628123456789" : "Tidak dapat diubah (Belum tertaut)"}
                className={`w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                  !hasLinkedTeacher ? "bg-slate-50 dark:bg-slate-700/40 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-100" : ""
                }`}
              />
              {hasLinkedTeacher && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                  *Gunakan format angka langsung tanpa spasi atau strip, misal 628123456789.
                </span>
              )}
            </div>

            {/* Alamat Email (Editable) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Alamat Surat Elektronik / Email</span>
              </label>
              <input
                type="email"
                disabled={!hasLinkedTeacher}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={hasLinkedTeacher ? "Contoh: ustadz@alghozali.sch.id" : "Tidak dapat diubah (Belum tertaut)"}
                className={`w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white ${
                  !hasLinkedTeacher ? "bg-slate-50 dark:bg-slate-700/40 text-slate-400 dark:text-slate-500 cursor-not-allowed border-slate-100" : ""
                }`}
              />
            </div>

            {/* Error/Warning Warning when profile is not linked to DATA_GURU */}
            {!hasLinkedTeacher && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed font-semibold">
                Peran "{user.role}" Anda tidak ditautkan dengan NIP di lembar DATA_GURU. Hanya asatidzah/guru terdaftar yang dapat memperbarui data kontak dan pas foto di database sistem.
              </div>
            )}

            {/* Save Button */}
            {hasLinkedTeacher && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-teal-600/10 transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Forms for Passwords and Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Change Password */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm transition-colors">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center space-x-2">
            <Lock className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Ubah Password Akun</h4>
          </div>
          
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Buat password baru yang aman untuk akun Anda agar terhindar dari akses yang tidak sah.
            </p>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center space-x-1">
                <span>Password Baru</span>
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center space-x-1">
                <span>Konfirmasi Password Baru</span>
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-600/50 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1"
            >
              {isChangingPassword ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Perbarui Password Saya</span>
            </button>
          </form>
        </div>

        {/* Card 2: Admin Settings (Only for Administrator role) */}
        {user.role === "Administrator" ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-6 shadow-sm transition-colors">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-3 mb-4 flex items-center space-x-2">
              <Settings className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Pengaturan Yayasan (Khusus Admin)</h4>
            </div>
            
            <form onSubmit={handleSaveLogo} className="space-y-4">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Konfigurasikan logo resmi YPI Pondok Modern Al-Ghozali. Tempelkan URL gambar logo asli untuk menggantikan lambang default sistem.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                  URL Logo YPI Pondok Modern Al-Ghozali
                </label>
                <input
                  type="url"
                  value={schoolLogoUrl}
                  onChange={(e) => setSchoolLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo-al-ghozali.png"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSchoolLogoUrl("");
                    localStorage.removeItem("alghozali_logo_url");
                    onNotify("Logo direset ke setelan standar.", "success");
                    setTimeout(() => window.location.reload(), 1000);
                  }}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
                >
                  Reset Logo
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Simpan Logo Yayasan
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center text-slate-400">
            <Settings className="w-8 h-8 text-slate-300 mb-2" />
            <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400">Pengaturan Yayasan Dikunci</h5>
            <p className="text-[10px] mt-1 max-w-xs leading-relaxed">
              Hanya akun ber-peran <b>Administrator</b> yang dapat mengubah dan mengunggah logo utama YPI Pondok Modern Al-Ghozali.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
