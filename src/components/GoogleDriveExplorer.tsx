import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  FolderOpen,
  UploadCloud,
  Trash2,
  ExternalLink,
  RefreshCw,
  Search,
  Plus,
  LogOut,
  Sparkles,
  Database,
  File,
  Info
} from "lucide-react";
import { User } from "firebase/auth";
import { googleSignIn, logoutGoogle, getAccessToken } from "../lib/firebaseAuth";

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
}

interface Props {
  onNotify: (message: string, type: "success" | "error" | "info") => void;
  onSelectFile?: (fileUrl: string, fileName: string) => void;
}

export default function GoogleDriveExplorer({ onNotify, onSelectFile }: Props) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from session if already authorized
  useEffect(() => {
    const checkToken = async () => {
      const token = await getAccessToken();
      if (token) {
        setAccessToken(token);
      }
    };
    checkToken();
  }, []);

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setAccessToken(res.accessToken);
        onNotify("Berhasil terhubung dengan Google Drive!", "success");
        fetchDriveFiles(res.accessToken);
      }
    } catch (e: any) {
      console.error(e);
      onNotify("Gagal menghubungkan Google Drive: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setAccessToken(null);
    setFiles([]);
    onNotify("Koneksi Google Drive diputus.", "info");
  };

  const fetchDriveFiles = async (token = accessToken) => {
    if (!token) return;
    setLoading(true);
    try {
      // Fetch files list from v3
      const query = "mimeType != 'application/vnd.google-apps.folder' and trashed = false";
      const fields = "files(id, name, mimeType, size, webViewLink, iconLink, createdTime)";
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=30&orderBy=createdTime desc`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      } else {
        const errData = await res.json();
        console.error("Gagal fetch Drive files:", errData);
        // Token might have expired
        if (res.status === 401) {
          handleSignOut();
          onNotify("Sesi Google Drive telah berakhir, silakan hubungkan kembali.", "error");
        } else {
          onNotify("Gagal memuat berkas Google Drive.", "error");
        }
      }
    } catch (err: any) {
      console.error(err);
      onNotify("Terjadi kesalahan koneksi Google Drive.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchDriveFiles(accessToken);
    }
  }, [accessToken]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;

    // Check size limit (e.g. 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onNotify("Ukuran berkas tidak boleh melebihi 5MB.", "error");
      return;
    }

    setUploading(true);
    try {
      // Use Multipart upload
      const metadata = {
        name: file.name,
        mimeType: file.type
      };

      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", file);

      const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType,createdTime";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: form
      });

      if (res.ok) {
        const uploadedFile = await res.json();
        onNotify(`Berkas "${file.name}" berhasil diunggah ke Google Drive!`, "success");
        fetchDriveFiles(accessToken);
        
        // If there's a selection callback, pass the file URL
        if (onSelectFile && uploadedFile.webViewLink) {
          onSelectFile(uploadedFile.webViewLink, uploadedFile.name);
        }
      } else {
        const err = await res.json();
        console.error("Upload error:", err);
        onNotify("Gagal mengunggah berkas ke Google Drive.", "error");
      }
    } catch (err: any) {
      console.error(err);
      onNotify("Gagal mengunggah berkas ke Drive.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (!accessToken) return;

    // MANDATORY USER CONFIRMATION
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus berkas "${fileName}" dari Google Drive Anda? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (res.ok) {
        onNotify("Berkas berhasil dihapus dari Google Drive.", "success");
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        onNotify("Gagal menghapus berkas dari Google Drive.", "error");
      }
    } catch (e) {
      console.error(e);
      onNotify("Terjadi kesalahan saat menghapus berkas.", "error");
    }
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <span className="p-1.5 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400">
              <FolderOpen className="w-5 h-5" />
            </span>
            <span>Google Drive Storage Terintegrasi</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola dokumen pendukung perizinan KBM Anda langsung dari akun Google asli.
          </p>
        </div>

        {accessToken && (
          <button
            onClick={handleSignOut}
            className="self-start sm:self-center flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Putuskan Drive</span>
          </button>
        )}
      </div>

      {!accessToken ? (
        <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 rounded-full">
            <UploadCloud className="w-10 h-10" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Hubungkan Akun Google Anda</h3>
            <p className="text-xs text-slate-400">
              Sistem membutuhkan otorisasi untuk mengunggah surat izin sakit / dinas secara real-time ke folder Google Drive pribadi Anda.
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="gsi-material-button cursor-pointer"
            id="gsi-drive-login"
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents text-xs font-bold text-slate-700">Otorisasikan Google Drive</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search and Action Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari file di Google Drive..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="application/pdf,image/*"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-55 transition-colors shadow-md hover:shadow-teal-600/10"
              >
                {uploading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                <span>{uploading ? "Mengunggah..." : "Unggah Berkas Baru"}</span>
              </button>
              
              <button
                onClick={() => fetchDriveFiles(accessToken)}
                disabled={loading}
                className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
                title="Refresh berkas"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Files List display */}
          {loading && files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mb-2" />
              <span className="text-[10px] font-mono">Memuat file dari Google Drive...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-slate-400 border border-dashed border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50/40 dark:bg-slate-800/20">
              <File className="w-8 h-8 mx-auto text-slate-300 mb-1.5" />
              <span className="text-xs font-semibold block">Tidak ada file ditemukan</span>
              <span className="text-[10px] text-slate-400">Coba unggah berkas pendukung baru di atas.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
              {filteredFiles.map((file) => {
                const dateString = file.createdTime
                  ? new Date(file.createdTime).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })
                  : "-";
                const sizeKB = file.size
                  ? `${(Number(file.size) / 1024).toFixed(1)} KB`
                  : "Ukuran tidak diketahui";

                return (
                  <div
                    key={file.id}
                    className="p-3 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3 hover:border-slate-200 dark:hover:border-slate-600 transition-all group"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      {file.iconLink ? (
                        <img src={file.iconLink} alt="" className="w-4 h-4 shrink-0" referrerPolicy="no-referrer" />
                      ) : (
                        <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <span
                          className="text-xs font-semibold text-slate-800 dark:text-slate-100 block truncate cursor-pointer hover:text-teal-600"
                          title={file.name}
                          onClick={() => {
                            if (onSelectFile && file.webViewLink) {
                              onSelectFile(file.webViewLink, file.name);
                            }
                          }}
                        >
                          {file.name}
                        </span>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono mt-0.5">
                          <span>{sizeKB}</span>
                          <span>•</span>
                          <span>{dateString}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0">
                      {onSelectFile && file.webViewLink && (
                        <button
                          onClick={() => onSelectFile(file.webViewLink!, file.name)}
                          className="px-2 py-1 bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-400 text-[10px] font-bold rounded hover:bg-teal-200 dark:hover:bg-teal-900 cursor-pointer transition-colors"
                        >
                          Pilih
                        </button>
                      )}
                      
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-colors"
                          title="Buka di tab baru"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      <button
                        onClick={() => handleDeleteFile(file.id, file.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                        title="Hapus berkas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Informational footer */}
          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 text-[10.5px] rounded-xl text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-600" />
            <p className="leading-relaxed">
              Berkas yang Anda unggah melalui panel ini akan disimpan di Google Drive pribadi Anda, dan tautan akses publiknya dapat disematkan sebagai lampiran sah dokumen pendukung perizinan.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
