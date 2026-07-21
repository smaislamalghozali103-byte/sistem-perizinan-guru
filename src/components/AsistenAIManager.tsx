import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Upload,
  Globe,
  MapPin,
  Brain,
  Zap,
  Image as ImageIcon,
  Bot,
  User,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lightbulb,
  Compass
} from "lucide-react";
import { SessionUser } from "../types";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  mode?: string;
  groundingChunks?: any[] | null;
  imagePreview?: string;
}

interface AsistenAIManagerProps {
  user: SessionUser | null;
}

export default function AsistenAIManager({ user }: AsistenAIManagerProps) {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      role: "model",
      text: `Assalamu'alaikum **${user?.teacher?.Nama.split(",")[0] || user?.username || "Bapak/Ibu Guru"}**!\n\nSaya adalah **Asisten AI Pintar SIPG YPI Pondok Modern Al-Ghozali** yang ditenagai oleh teknologi Gemini AI terbaru.\n\nApa yang bisa saya bantu hari ini? Anda dapat memilih mode AI di bawah ini:`,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      mode: "general"
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState("");
  const [selectedMode, setSelectedMode] = useState<"fast" | "general" | "complex" | "search" | "maps" | "thinking">("general");
  const [systemRole, setSystemRole] = useState("Asisten Perizinan Guru");
  const [loading, setLoading] = useState(false);

  // Image analysis state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [imageAnalysisResult, setImageAnalysisResult] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Handle send message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend.trim() && !uploadedImage) return;

    const userMsgId = "msg-" + Date.now();
    const newUserMsg: Message = {
      id: userMsgId,
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      mode: selectedMode,
      imagePreview: uploadedImage || undefined
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputPrompt("");
    setLoading(true);

    try {
      // If image is attached, call image analysis endpoint or include image in chat
      if (uploadedImage) {
        const res = await fetch("/api/ai/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: textToSend || "Mohon analisis gambar/dokumen yang dilampirkan ini secara detail.",
            imageBase64: uploadedImage,
            mimeType: imageMimeType
          })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const aiMsg: Message = {
          id: "ai-" + Date.now(),
          role: "model",
          text: data.text || "Gambar telah dianalisis.",
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          mode: "image-analysis"
        };
        setMessages((prev) => [...prev, aiMsg]);
        setUploadedImage(null);
      } else {
        // Multi-turn chat
        const historyForApi = messages
          .filter((m) => m.role === "user" || m.role === "model")
          .map((m) => ({
            role: m.role,
            parts: [{ text: m.text }]
          }));

        // Append latest user message
        historyForApi.push({
          role: "user",
          parts: [{ text: textToSend }]
        });

        const systemInstructionMap: Record<string, string> = {
          "Asisten Perizinan Guru": "Anda adalah Asisten Perizinan Guru YPI Pondok Modern Al-Ghozali. Berikan penjelasan perizinan, prosedur izin sakit/dinas, dan tata cara pengganti mengajar secara terstruktur dan sopan.",
          "Pakar Kurikulum & Jadwal": "Anda adalah Pakar Kurikulum dan Penjadwalan Sekolah YPI Pondok Modern Al-Ghozali. Bantu menganalisis jam bentrok, beban mengajar guru, jam piket, dan efektivitas pembelajaran.",
          "Analis Dokumen & Bukti Surat": "Anda adalah Analis Dokumen Resmi Sekolah. Bantu memverifikasi format surat, keabsahan dokumen izin, dan draft balasan resmi."
        };

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: historyForApi,
            mode: selectedMode,
            systemInstruction: systemInstructionMap[systemRole] || systemInstructionMap["Asisten Perizinan Guru"]
          })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const aiMsg: Message = {
          id: "ai-" + Date.now(),
          role: "model",
          text: data.text || "Maaf, tidak ada tanggapan yang dihasilkan.",
          timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          mode: data.modeUsed,
          groundingChunks: data.groundingChunks
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: "err-" + Date.now(),
        role: "model",
        text: `⚠️ **Gagal terhubung dengan Layanan AI:** ${err.message || "Terjadi kesalahan koneksi. Silakan coba lagi."}`,
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        mode: "error"
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // File Upload Handler for Photo/Document Analysis
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Mohon unggah berkas gambar (JPG, PNG, WEBP, GIF).");
      return;
    }

    setImageMimeType(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const clearChat = () => {
    setMessages([
      {
        id: "init-reset",
        role: "model",
        text: "Percakapan telah dibersihkan. Silakan ajukan pertanyaan atau instruksi baru!",
        timestamp: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        mode: "general"
      }
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-emerald-950 rounded-2xl p-6 text-white border border-teal-800/50 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-teal-500/10 to-transparent pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shadow-inner">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black tracking-tight text-white">ASISTEN AI PINTAR AL-GHOZALI</h2>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono font-bold border border-teal-400/30">
                  Gemini Powered
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Gunakan kecerdasan buatan Gemini untuk konsultasi perizinan, analisis dokumen, pencarian data Google Search/Maps, dan penalaran jadwal.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              title="Bersihkan Percakapan"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Reset Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Control Panel & Right Chat Box */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: AI Mode Selectors & Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          {/* Mode Selection Panel */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Pilih Mode AI Gemini</span>
            </h3>

            <div className="space-y-1.5">
              {/* Fast / Low-latency */}
              <button
                onClick={() => setSelectedMode("fast")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedMode === "fast"
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 shadow-sm"
                    : "border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <div className="text-left">
                    <span className="block leading-none font-bold">Respon Cepat</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">gemini-3.1-flash-lite</span>
                  </div>
                </div>
                {selectedMode === "fast" && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
              </button>

              {/* General */}
              <button
                onClick={() => setSelectedMode("general")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedMode === "general"
                    ? "bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200 shadow-sm"
                    : "border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-teal-500" />
                  <div className="text-left">
                    <span className="block leading-none font-bold">Asisten Umum</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">gemini-3.5-flash</span>
                  </div>
                </div>
                {selectedMode === "general" && <CheckCircle2 className="w-4 h-4 text-teal-500" />}
              </button>

              {/* Complex */}
              <button
                onClick={() => setSelectedMode("complex")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedMode === "complex"
                    ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 shadow-sm"
                    : "border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  <div className="text-left">
                    <span className="block leading-none font-bold">Kecerdasan Tinggi</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">gemini-3.1-pro-preview</span>
                  </div>
                </div>
                {selectedMode === "complex" && <CheckCircle2 className="w-4 h-4 text-purple-500" />}
              </button>

              {/* Google Search Grounding */}
              <button
                onClick={() => setSelectedMode("search")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedMode === "search"
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 shadow-sm"
                    : "border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <div className="text-left">
                    <span className="block leading-none font-bold">Google Search Data</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Search Grounding</span>
                  </div>
                </div>
                {selectedMode === "search" && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
              </button>

              {/* Google Maps Grounding */}
              <button
                onClick={() => setSelectedMode("maps")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedMode === "maps"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 shadow-sm"
                    : "border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <div className="text-left">
                    <span className="block leading-none font-bold">Google Maps Data</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Maps Grounding</span>
                  </div>
                </div>
                {selectedMode === "maps" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              </button>

              {/* High Thinking Mode */}
              <button
                onClick={() => setSelectedMode("thinking")}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  selectedMode === "thinking"
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 shadow-sm"
                    : "border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Brain className="w-4 h-4 text-indigo-500" />
                  <div className="text-left">
                    <span className="block leading-none font-bold">High Thinking Mode</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">gemini-3.1-pro + HIGH</span>
                  </div>
                </div>
                {selectedMode === "thinking" && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
              </button>
            </div>
          </div>

          {/* System Role Selector */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Peran AI (System Role)
            </label>
            <select
              value={systemRole}
              onChange={(e) => setSystemRole(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="Asisten Perizinan Guru">Asisten Perizinan Guru</option>
              <option value="Pakar Kurikulum & Jadwal">Pakar Kurikulum & Jadwal</option>
              <option value="Analis Dokumen & Bukti Surat">Analis Dokumen & Bukti Surat</option>
            </select>
          </div>

          {/* Quick Prompts */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Saran Pertanyaan Cepat</span>
            </h4>
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  setSelectedMode("general");
                  handleSendMessage("Bagaimana syarat dan alur pengajuan izin tidak hadir mengajar karena sakit/dinas di YPI Al-Ghozali?");
                }}
                className="w-full text-left p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-teal-50 dark:hover:bg-teal-950/30 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-all border border-slate-100 dark:border-slate-700/50"
              >
                📋 Prosedur & Syarat Izin Mengajar
              </button>
              <button
                onClick={() => {
                  setSelectedMode("search");
                  handleSendMessage("Apa aturan edaran Kemendikdasmen/Kemenag terbaru mengenai perizinan dan ketidakhadiran guru tahun 2026?");
                }}
                className="w-full text-left p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-all border border-slate-100 dark:border-slate-700/50"
              >
                🔍 Edaran Pendidikan Terbaru (Google Search)
              </button>
              <button
                onClick={() => {
                  setSelectedMode("maps");
                  handleSendMessage("Di mana alamat lokasi YPI Pondok Modern Al Ghozali dan rute perjalanan menuju sekolah?");
                }}
                className="w-full text-left p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-all border border-slate-100 dark:border-slate-700/50"
              >
                🗺️ Lokasi & Rute Sekolah (Google Maps)
              </button>
              <button
                onClick={() => {
                  setSelectedMode("thinking");
                  handleSendMessage("Lakukan analisis mendalam terhadap penanganan jam bentrok guru pengganti jika 3 guru izin di hari yang sama.");
                }}
                className="w-full text-left p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-[11px] font-medium text-slate-700 dark:text-slate-300 transition-all border border-slate-100 dark:border-slate-700/50"
              >
                🧠 Analisis Solusi Jam Bentrok (High Thinking)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Chat Window & Input Area */}
        <div className="lg:col-span-3 flex flex-col h-[700px] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Top Bar of Chat */}
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                Ruang Obrolan AI ({systemRole})
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-bold uppercase">
                {selectedMode}
              </span>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/30 dark:bg-slate-900/20">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start space-x-3 ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-sm ${
                      isUser
                        ? "bg-teal-700 text-white"
                        : "bg-emerald-800 text-amber-300 border border-amber-400/40"
                    }`}
                  >
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[85%] space-y-1.5 ${isUser ? "items-end text-right" : ""}`}>
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? "bg-teal-700 text-white rounded-tr-none shadow-md"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm"
                      }`}
                    >
                      {/* Image Preview if user uploaded */}
                      {msg.imagePreview && (
                        <div className="mb-2.5">
                          <img
                            src={msg.imagePreview}
                            alt="Pratinjau Berkas"
                            className="max-h-48 rounded-xl object-cover border border-white/20 shadow-sm"
                          />
                        </div>
                      )}

                      {/* Text content with formatting */}
                      <div className="whitespace-pre-wrap font-sans">
                        {msg.text}
                      </div>

                      {/* Grounding Chunks Display (for Google Search & Google Maps) */}
                      {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-left">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block">
                            📌 Sumber Data Grounding
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.groundingChunks.map((chunk: any, idx: number) => {
                              const uri = chunk.web?.uri || chunk.maps?.uri || "#";
                              const title = chunk.web?.title || chunk.maps?.title || `Sumber ${idx + 1}`;
                              return (
                                <a
                                  key={idx}
                                  href={uri}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900 text-[10px] font-semibold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 transition-colors"
                                >
                                  <span>{title}</span>
                                  <ExternalLink className="w-3 h-3 text-teal-500" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <span className="text-[9px] font-mono text-slate-400 block px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="w-8 h-8 rounded-full bg-emerald-800/80 text-amber-300 flex items-center justify-center animate-spin">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center space-x-2">
                  <span className="font-semibold text-teal-600 dark:text-teal-400">Gemini sedang berpikir...</span>
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Attached Image Thumbnail Preview before sending */}
          {uploadedImage && (
            <div className="px-5 py-2.5 bg-amber-50/80 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src={uploadedImage} alt="Attachment" className="w-10 h-10 rounded-lg object-cover border border-amber-300" />
                <div>
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">Gambar siap dianalisis</span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">Model: gemini-3.1-pro-preview</span>
                </div>
              </div>
              <button
                onClick={() => setUploadedImage(null)}
                className="p-1 text-rose-500 hover:text-rose-700 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom Input Area */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              {/* Image upload trigger button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  uploadedImage
                    ? "bg-amber-50 dark:bg-amber-900/50 border-amber-300 text-amber-600"
                    : "bg-slate-100 dark:bg-slate-700/60 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
                title="Unggah Foto / Surat Dokter untuk Dianalisis (gemini-3.1-pro-preview)"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={
                  uploadedImage
                    ? "Tuliskan instruksi analisis gambar..."
                    : `Ketik pesan ke Gemini (${selectedMode})...`
                }
                disabled={loading}
                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={loading || (!inputPrompt.trim() && !uploadedImage)}
                className="px-4 py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Kirim</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
