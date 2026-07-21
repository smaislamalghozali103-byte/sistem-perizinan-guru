import React, { useState, useEffect } from "react";
import {
  FileQuestion,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Trash2,
  Eye,
  CheckSquare,
  List,
  MessageSquare,
  Sparkles,
  Info,
  ChevronRight,
  ClipboardList,
  Users,
  Calendar,
  AlertCircle,
  LogOut
} from "lucide-react";
import { User } from "firebase/auth";
import { googleSignIn, logoutGoogle, getAccessToken } from "../lib/firebaseAuth";

interface GoogleFormFile {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
}

interface FormItem {
  itemId: string;
  title: string;
  description?: string;
  questionItem?: {
    question: {
      questionId: string;
      required?: boolean;
      textQuestion?: any;
      choiceQuestion?: {
        type: string;
        options: { value: string }[];
      };
    };
  };
}

interface FormDetails {
  formId: string;
  info: {
    title: string;
    description?: string;
    documentTitle?: string;
  };
  responderUri: string;
  items?: FormItem[];
}

interface FormResponse {
  responseId: string;
  createTime: string;
  lastSubmittedTime: string;
  answers: Record<string, {
    questionId: string;
    textAnswers: {
      answers: { value: string }[];
    };
  }>;
}

interface Props {
  onNotify: (message: string, type: "success" | "error" | "info") => void;
}

export default function GoogleFormsManager({ onNotify }: Props) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [creating, setCreating] = useState<boolean>(false);
  
  // List of forms from Google Drive
  const [formsList, setFormsList] = useState<GoogleFormFile[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Selected Form details
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [formDetails, setFormDetails] = useState<FormDetails | null>(null);
  const [formResponses, setFormResponses] = useState<FormResponse[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<"preview" | "questions" | "responses">("preview");

  // Custom Form Creator state
  const [newFormTitle, setNewFormTitle] = useState<string>("");
  const [newFormDesc, setNewFormDesc] = useState<string>("");
  const [newFormTemplate, setNewFormTemplate] = useState<"kbm_feedback" | "piket_report" | "system_feedback">("kbm_feedback");

  // Auth checking
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
        onNotify("Berhasil terhubung dengan Google Forms & Drive!", "success");
        fetchGoogleForms(res.accessToken);
      }
    } catch (e: any) {
      console.error(e);
      onNotify("Gagal menghubungkan Google Forms: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logoutGoogle();
    setGoogleUser(null);
    setAccessToken(null);
    setFormsList([]);
    setSelectedFormId(null);
    setFormDetails(null);
    setFormResponses([]);
    onNotify("Koneksi Google Forms diputus.", "info");
  };

  // Fetch Google Forms files from Google Drive
  const fetchGoogleForms = async (token = accessToken) => {
    if (!token) return;
    setLoading(true);
    try {
      const query = "mimeType = 'application/vnd.google-apps.form' and trashed = false";
      const fields = "files(id, name, webViewLink, createdTime)";
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=30&orderBy=createdTime desc`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setFormsList(data.files || []);
      } else {
        const err = await res.json();
        console.error("Fetch forms failed:", err);
        if (res.status === 401) {
          handleSignOut();
          onNotify("Sesi Google Forms telah berakhir, silakan hubungkan kembali.", "error");
        } else {
          onNotify("Gagal mengambil daftar Google Forms.", "error");
        }
      }
    } catch (e) {
      console.error(e);
      onNotify("Terjadi kesalahan koneksi saat memuat forms.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchGoogleForms(accessToken);
    }
  }, [accessToken]);

  // Fetch individual Form Details (Questions and Structure) & Responses
  const fetchFormDetailsAndResponses = async (formId: string) => {
    if (!accessToken) return;
    setLoadingDetails(true);
    try {
      // 1. Get Form Structure
      const detailsRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        setFormDetails(detailsData);
      } else {
        console.error("Gagal memuat struktur Google Form");
        setFormDetails(null);
      }

      // 2. Get Form Responses (We swallow error if responses API is not setup, e.g. if form doesn't accept replies yet)
      const responsesRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (responsesRes.ok) {
        const responsesData = await responsesRes.json();
        setFormResponses(responsesData.responses || []);
      } else {
        setFormResponses([]);
      }
    } catch (e) {
      console.error("Error fetching form details:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (selectedFormId) {
      fetchFormDetailsAndResponses(selectedFormId);
    } else {
      setFormDetails(null);
      setFormResponses([]);
    }
  }, [selectedFormId]);

  // Create a customized new Google Form dynamically using templates
  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    const title = newFormTitle.trim() || "Formulir KBM Al Ghozali";
    const desc = newFormDesc.trim() || "Diisi oleh civitas akademika Pondok Modern Al Ghozali";

    setCreating(true);
    try {
      // Step 1: Create empty form
      const createRes = await fetch("https://forms.googleapis.com/v1/forms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          info: {
            title: title,
            documentTitle: title
          }
        })
      });

      if (!createRes.ok) {
        throw new Error("Gagal menginisialisasi formulir baru di Google Forms.");
      }

      const createdForm = await createRes.json();
      const formId = createdForm.formId;

      // Step 2: Set questions based on selected template
      let requests: any[] = [];

      // Update Form Description
      requests.push({
        updateFormInfo: {
          info: {
            description: desc
          },
          updateMask: "description"
        }
      });

      if (newFormTemplate === "kbm_feedback") {
        requests.push(
          {
            createItem: {
              item: {
                title: "Nama Lengkap Guru Pengajar / Pengganti",
                description: "Tuliskan nama lengkap beserta gelar akademis Anda",
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: {}
                  }
                }
              },
              location: { index: 0 }
            }
          },
          {
            createItem: {
              item: {
                title: "Tanggal & Sesi KBM",
                description: "Contoh: Senin, 20 Juli 2026 - Sesi 1 & 2",
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: {}
                  }
                }
              },
              location: { index: 1 }
            }
          },
          {
            createItem: {
              item: {
                title: "Kelas yang Diajar",
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "DROP_DOWN",
                      options: [
                        { value: "VII-A SMP" },
                        { value: "VII-B SMP" },
                        { value: "VIII-A SMP" },
                        { value: "VIII-B SMP" },
                        { value: "X-A SMA" },
                        { value: "XI-A SMA" },
                        { value: "XII-A SMA" }
                      ]
                    }
                  }
                }
              },
              location: { index: 2 }
            }
          },
          {
            createItem: {
              item: {
                title: "Seberapa Kondusif KBM Berlangsung?",
                description: "Berikan penilaian objektif tentang kedisiplinan dan suasana belajar santri di kelas tersebut",
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "RADIO",
                      options: [
                        { value: "Sangat Kondusif (Santri tertib dan antusias)" },
                        { value: "Kondusif (Ada kendala kecil namun materi tersampaikan)" },
                        { value: "Kurang Kondusif (Ramai, santri sulit diatur)" },
                        { value: "Sangat Kacau (Butuh penanganan Guru Piket)" }
                      ]
                    }
                  }
                }
              },
              location: { index: 3 }
            }
          },
          {
            createItem: {
              item: {
                title: "Rangkuman Materi & Catatan Tugas",
                description: "Sebutkan sub-bab materi atau kitab yang diajarkan, serta detail tugas mandiri yang diberikan kepada santri",
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: { paragraph: true }
                  }
                }
              },
              location: { index: 4 }
            }
          }
        );
      } else if (newFormTemplate === "piket_report") {
        requests.push(
          {
            createItem: {
              item: {
                title: "Nama Guru Piket yang Bertugas",
                questionItem: {
                  question: {
                    required: true,
                    textQuestion: {}
                  }
                }
              },
              location: { index: 0 }
            }
          },
          {
            createItem: {
              item: {
                title: "Shift Piket",
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "RADIO",
                      options: [
                        { value: "Shift Pagi (07.00 - 12.00)" },
                        { value: "Shift Siang (12.30 - 16.00)" }
                      ]
                    }
                  }
                }
              },
              location: { index: 1 }
            }
          },
          {
            createItem: {
              item: {
                title: "Apakah seluruh kelas terisi guru pengajar/pengganti?",
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "RADIO",
                      options: [
                        { value: "Ya, seluruh kelas berjalan lancar" },
                        { value: "Ada kelas kosong (guru absen dan belum ada pengganti)" }
                      ]
                    }
                  }
                }
              },
              location: { index: 2 }
            }
          },
          {
            createItem: {
              item: {
                title: "Daftar Kejadian Penting / Santri Melanggar",
                description: "Tuliskan jika ada santri yang terlambat, membolos, sakit berat, atau pelanggaran disiplin kelas lainnya",
                questionItem: {
                  question: {
                    required: false,
                    textQuestion: { paragraph: true }
                  }
                }
              },
              location: { index: 3 }
            }
          }
        );
      } else {
        // system feedback template
        requests.push(
          {
            createItem: {
              item: {
                title: "Bagaimana tanggapan Anda tentang Portal Perizinan KBM Digital ini?",
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "RADIO",
                      options: [
                        { value: "Sangat Membantu (Proses izin & ganti guru jauh lebih cepat)" },
                        { value: "Cukup Baik (Lebih baik dibanding kertas manual)" },
                        { value: "Biasa Saja" },
                        { value: "Sulit Digunakan (Butuh bimbingan penggunaan)" }
                      ]
                    }
                  }
                }
              },
              location: { index: 0 }
            }
          },
          {
            createItem: {
              item: {
                title: "Fitur apa yang paling sering membantu Anda sehari-hari?",
                questionItem: {
                  question: {
                    required: true,
                    choiceQuestion: {
                      type: "CHECKBOX",
                      options: [
                        { value: "Upload berkas surat sakit" },
                        { value: "Simulator notifikasi email" },
                        { value: "Status persetujuan multi-level real-time" },
                        { value: "Pencarian guru piket pengganti harian" }
                      ]
                    }
                  }
                }
              },
              location: { index: 1 }
            }
          },
          {
            createItem: {
              item: {
                title: "Kritik, Saran, & Masukan Pengembangan",
                questionItem: {
                  question: {
                    required: false,
                    textQuestion: { paragraph: true }
                  }
                }
              },
              location: { index: 2 }
            }
          }
        );
      }

      // Step 3: Run Batch Update to build the questions
      const batchRes = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ requests })
      });

      if (batchRes.ok) {
        onNotify(`Formulir "${title}" berhasil dideploy ke Google Forms!`, "success");
        setNewFormTitle("");
        setNewFormDesc("");
        fetchGoogleForms(accessToken);
        setSelectedFormId(formId);
      } else {
        const err = await batchRes.json();
        console.error("Batch update failed:", err);
        onNotify("Form berhasil dibuat kosong tapi gagal menambahkan pertanyaan.", "error");
      }
    } catch (err: any) {
      console.error(err);
      onNotify("Gagal meluncurkan formulir baru: " + err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteForm = async (formId: string, name: string) => {
    if (!accessToken) return;

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin memindahkan formulir "${name}" ke tempat sampah Google Drive Anda?`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${formId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (res.ok) {
        onNotify("Formulir berhasil dihapus dari Google Drive.", "success");
        setFormsList((prev) => prev.filter((f) => f.id !== formId));
        if (selectedFormId === formId) {
          setSelectedFormId(null);
        }
      } else {
        onNotify("Gagal menghapus formulir.", "error");
      }
    } catch (e) {
      console.error(e);
      onNotify("Gagal menghapus file dari Drive.", "error");
    }
  };

  const filteredForms = formsList.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header section */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 p-6 rounded-2xl text-white shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono text-teal-400 font-extrabold uppercase tracking-widest flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-teal-400 animate-pulse" />
            <span>Google Forms Integration Suite</span>
          </span>
          <h2 className="text-xl font-bold mt-1">Sistem Umpan Balik & Evaluasi KBM</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Integrasi langsung Google Forms API asli. Buat formulir pelaporan piket guru, evaluasi dars, atau kepuasan sistem, lalu pantau respon santri/guru secara instan di sini.
          </p>
        </div>
        {accessToken && (
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 cursor-pointer transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Putuskan Akun</span>
          </button>
        )}
      </div>

      {!accessToken ? (
        <div className="p-12 border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 bg-white dark:bg-slate-800 shadow-sm">
          <div className="p-4 bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 rounded-full">
            <ClipboardList className="w-12 h-12" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Hubungkan Ke Google Forms API</h3>
            <p className="text-xs text-slate-400">
              Otorisasikan aplikasi agar Anda dapat mengotomasi pembuatan formulir umpan balik, melihat daftar pertanyaan, dan menyedot data rekap jawaban (Form Responses) secara langsung dan aman.
            </p>
          </div>

          <button
            onClick={handleSignIn}
            disabled={loading}
            className="gsi-material-button cursor-pointer"
            id="gsi-forms-login"
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
              <span className="gsi-material-button-contents text-xs font-bold text-slate-700">Hubungkan Akun Google Forms</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left panel: Form List & Form Builder */}
          <div className="lg:col-span-4 space-y-6">
            {/* Form list builder */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <ClipboardList className="w-4 h-4 text-teal-600" />
                  <span>Daftar Formulir Aktif</span>
                </h3>
                <button
                  onClick={() => fetchGoogleForms(accessToken)}
                  disabled={loading}
                  className="p-1 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-slate-500 cursor-pointer"
                  title="Segarkan daftar"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari formulir..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-medium"
                />
              </div>

              {loading && formsList.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-[10px] font-mono">
                  Mengambil data Google Forms...
                </div>
              ) : filteredForms.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                  Tidak ada Google Forms ditemukan.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {filteredForms.map((form) => {
                    const isSelected = selectedFormId === form.id;
                    const createdDateStr = form.createdTime
                      ? new Date(form.createdTime).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short"
                        })
                      : "-";

                    return (
                      <div
                        key={form.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-teal-50 border-teal-200 dark:bg-teal-950/20 dark:border-teal-900"
                            : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700/30"
                        }`}
                        onClick={() => setSelectedFormId(form.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <span className={`text-[11.5px] font-bold block truncate ${
                            isSelected ? "text-teal-700 dark:text-teal-400" : "text-slate-800 dark:text-slate-200"
                          }`}>
                            {form.name}
                          </span>
                          <span className="text-[9px] text-slate-400 block font-mono mt-0.5">
                            Dibuat: {createdDateStr}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteForm(form.id, form.name);
                            }}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Hapus form"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form Creator Engine */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
                <Plus className="w-4 h-4 text-teal-600" />
                <span>Rancang Google Form Baru</span>
              </h3>

              <form onSubmit={handleCreateForm} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Judul Formulir
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Evaluasi KBM Pengganti Sesi 2"
                    value={newFormTitle}
                    onChange={(e) => setNewFormTitle(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Deskripsi Formulir
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tuliskan tujuan / petunjuk pengisian di sini..."
                    value={newFormDesc}
                    onChange={(e) => setNewFormDesc(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Template Struktur
                  </label>
                  <select
                    value={newFormTemplate}
                    onChange={(e) => setNewFormTemplate(e.target.value as any)}
                    className="w-full p-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold"
                  >
                    <option value="kbm_feedback">Feedback KBM & Substitution (Guru Pengganti)</option>
                    <option value="piket_report">Laporan Harian Guru Piket</option>
                    <option value="system_feedback">Survei Evaluasi Portal Perizinan Digital</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-teal-600/10 transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-55"
                >
                  {creating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>{creating ? "Mendeploy ke Google..." : "Deploy ke Google Forms"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right panel: Live views, structural breakdown, and live submissions */}
          <div className="lg:col-span-8">
            {selectedFormId ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
                {/* Header info of selected form */}
                <div className="p-5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-teal-600 font-mono block">
                      FORMULIR TERPILIH
                    </span>
                    <h2 className="text-base font-bold text-slate-800 dark:text-white truncate">
                      {formDetails?.info.title || "Memuat Detail..."}
                    </h2>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      ID: {selectedFormId}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {formDetails?.responderUri && (
                      <a
                        href={formDetails.responderUri}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-950/60 text-teal-700 dark:text-teal-400 text-xs font-semibold rounded-lg transition-colors"
                      >
                        <span>Buka Tab Baru</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => fetchFormDetailsAndResponses(selectedFormId)}
                      disabled={loadingDetails}
                      className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingDetails ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Sub Tab selection */}
                <div className="flex border-b border-slate-100 dark:border-slate-700/60 px-5 text-xs font-bold text-slate-500">
                  <button
                    onClick={() => setActiveSubTab("preview")}
                    className={`py-3 px-4 border-b-2 cursor-pointer transition-all ${
                      activeSubTab === "preview"
                        ? "border-teal-500 text-teal-600 dark:text-teal-400"
                        : "border-transparent hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 inline mr-1" />
                    Tampilan Live Formulir
                  </button>

                  <button
                    onClick={() => setActiveSubTab("questions")}
                    className={`py-3 px-4 border-b-2 cursor-pointer transition-all ${
                      activeSubTab === "questions"
                        ? "border-teal-500 text-teal-600 dark:text-teal-400"
                        : "border-transparent hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <List className="w-3.5 h-3.5 inline mr-1" />
                    Struktur Pertanyaan ({formDetails?.items?.length || 0})
                  </button>

                  <button
                    onClick={() => setActiveSubTab("responses")}
                    className={`py-3 px-4 border-b-2 cursor-pointer transition-all ${
                      activeSubTab === "responses"
                        ? "border-teal-500 text-teal-600 dark:text-teal-400"
                        : "border-transparent hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 inline mr-1" />
                    Rekap Tanggapan ({formResponses.length})
                  </button>
                </div>

                {/* Sub tab content area */}
                <div className="p-5 flex-1 min-h-[400px]">
                  {loadingDetails ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-teal-600 mb-2" />
                      <span className="text-[10px] font-mono">Menyelaraskan data Google Forms...</span>
                    </div>
                  ) : activeSubTab === "preview" ? (
                    <div className="w-full h-[520px] rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900 relative">
                      {formDetails?.responderUri ? (
                        <iframe
                          src={`${formDetails.responderUri}?embedded=true`}
                          className="w-full h-full border-0"
                          title="Form Live Preview"
                        >
                          Memuat formulir...
                        </iframe>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                          <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                          <span className="text-xs font-semibold">Tautan formulir belum tersedia.</span>
                          <span className="text-[10px] text-slate-400">Coba muat ulang struktur di kanan atas.</span>
                        </div>
                      )}
                    </div>
                  ) : activeSubTab === "questions" ? (
                    <div className="space-y-4">
                      {formDetails?.info.description && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/60 rounded-xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                          {formDetails.info.description}
                        </div>
                      )}

                      <div className="space-y-3">
                        {formDetails?.items && formDetails.items.length > 0 ? (
                          formDetails.items.map((item, i) => (
                            <div
                              key={item.itemId || i}
                              className="p-4 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <span className="text-[9px] font-mono font-bold text-teal-500 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded">
                                    Pertanyaan {i + 1}
                                  </span>
                                  <h4 className="text-xs font-black text-slate-800 dark:text-white mt-1.5">
                                    {item.title}
                                  </h4>
                                  {item.description && (
                                    <p className="text-[10.5px] text-slate-400 mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                </div>

                                {item.questionItem?.question.required && (
                                  <span className="text-[8px] font-extrabold uppercase bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 px-1.5 py-0.5 rounded font-mono">
                                    Wajib
                                  </span>
                                )}
                              </div>

                              {/* Question options if single/dropdown select */}
                              {item.questionItem?.question.choiceQuestion && (
                                <div className="mt-3 pl-2 border-l border-slate-200 dark:border-slate-600 space-y-1">
                                  {item.questionItem.question.choiceQuestion.options.map((opt, idx) => (
                                    <div key={idx} className="flex items-center space-x-2 text-[11px] text-slate-600 dark:text-slate-400">
                                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                      <span>{opt.value}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12 text-slate-400 text-xs">
                            Belum ada pertanyaan terdaftar di form ini.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* RESPONSES VIEW */
                    <div className="space-y-4">
                      {formResponses.length === 0 ? (
                        <div className="text-center py-16 border border-dashed border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50/20">
                          <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                          <span className="text-xs font-bold block text-slate-700 dark:text-slate-300">Belum Ada Jawaban Masuk</span>
                          <span className="text-[10.5px] text-slate-400">
                            Santri atau guru belum mengisi formulir umpan balik ini. Silakan bagikan live link di atas.
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>Menampilkan total {formResponses.length} respon yang berhasil ditarik langsung dari Google Forms API.</span>
                          </div>

                          <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
                            {formResponses.map((resp, idx) => {
                              const responseDateStr = new Date(resp.lastSubmittedTime).toLocaleString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                              });

                              return (
                                <div
                                  key={resp.responseId || idx}
                                  className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/60 text-xs space-y-3"
                                >
                                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700/40 pb-2">
                                    <span className="font-mono text-[9px] font-extrabold text-teal-600 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded">
                                      Respon #{idx + 1}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {responseDateStr}
                                    </span>
                                  </div>

                                  <div className="space-y-2.5">
                                    {formDetails?.items?.map((item) => {
                                      const questionId = item.questionItem?.question.questionId;
                                      if (!questionId) return null;
                                      const ansObj = resp.answers[questionId];
                                      const ansVal = ansObj?.textAnswers?.answers?.map(a => a.value).join(", ") || "-";

                                      return (
                                        <div key={item.itemId}>
                                          <span className="text-[10px] font-bold text-slate-400 block">
                                            {item.title}
                                          </span>
                                          <p className="text-[11.5px] text-slate-800 dark:text-slate-100 font-bold leading-relaxed mt-0.5">
                                            {ansVal}
                                          </p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm text-center flex flex-col items-center justify-center py-24 space-y-4 h-full">
                <div className="p-4 bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 rounded-full">
                  <FileQuestion className="w-10 h-10 animate-bounce" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Pilih / Buat Formulir</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Pilih salah satu formulir aktif dari sidebar kiri untuk melihat review live, daftar item pertanyaan, atau menyedot rekap tanggapan Google Forms asli.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
