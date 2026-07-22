import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { dbInstance, DatabaseSchema, Izin, GuruPengganti, Approval, UPLOAD_DIR } from "./server/db.js";

// Initialize Gemini AI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// In-memory simulation of GmailApp notifications
interface SimulatedEmail {
  id: string;
  timestamp: string;
  to: string;
  subject: string;
  body: string;
}

const simulatedEmails: SimulatedEmail[] = [];

export const app = express();
const PORT = 3000;

// Enable CORS for Vercel and cross-origin requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

// Middleware to parse JSON (with increased limits for base64 file uploads)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve uploads folder statically
app.use("/uploads", express.static(UPLOAD_DIR));

// Helper to send email (simulates GmailApp.sendEmail)
function sendSimulatedEmail(to: string, subject: string, body: string) {
  const email: SimulatedEmail = {
    id: "EM-" + Math.random().toString(36).substr(2, 9).toUpperCase(),
    timestamp: new Date().toISOString(),
    to,
    subject,
    body,
  };
  simulatedEmails.unshift(email);
  console.log(`[SIMULATED GMAIL] Sent to ${to} | Subject: ${subject}`);
}

// Register all API routes synchronously
// Get sent emails
app.get("/api/notifications/sent", (req, res) => {
  res.json(simulatedEmails);
});

  // Login session
  app.post("/api/auth/login", (req, res) => {
    const { username, role, mapel, password } = req.body;
    const db = dbInstance.getAll();

    if (!username) {
      return res.status(400).json({ success: false, message: "Nama tidak boleh kosong." });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: "Password tidak boleh kosong." });
    }

    // Find the user account.
    // 1. Search directly in DATA_USER (Username case-insensitive match)
    let user = db.DATA_USER.find(
      (u) =>
        u.Username.toLowerCase() === username.toLowerCase() &&
        u.Role === role
    );

    // 2. If not found, try searching in DATA_GURU by full name
    if (!user) {
      const matchedGuru = db.DATA_GURU.find(
        (g) => g.Nama.toLowerCase().includes(username.toLowerCase())
      );
      if (matchedGuru) {
        user = db.DATA_USER.find(
          (u) => u.NIP === matchedGuru.NIP && u.Role === role
        );
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: `Akun dengan nama "${username}" dan peran "${role}" tidak ditemukan.`
      });
    }

    // Secure database-backed password check
    if (user.PasswordRaw !== password) {
      return res.status(401).json({
        success: false,
        message: "Password yang Anda masukkan salah."
      });
    }

    let teacherInfo = null;
    if (user.NIP !== "-") {
      teacherInfo = db.DATA_GURU.find((g) => g.NIP === user.NIP) || null;
    }

    // Special check for subject teacher ("Guru")
    if (role === "Guru") {
      if (!mapel) {
        return res.status(400).json({
          success: false,
          message: "Mata pelajaran wajib dipilih untuk guru mata pelajaran."
        });
      }

      // Check if this teacher teaches this subject
      const mapelObj = db.DATA_MAPEL.find((m) => m.KodeMapel === mapel);
      const teachesSubject = db.DATA_JADWAL.some(
        (j) => j.NIP === user.NIP && j.KodeMapel === mapel
      );

      if (!teachesSubject && teacherInfo) {
        const subjectName = mapelObj ? mapelObj.NamaMapel : mapel;
        return res.status(401).json({
          success: false,
          message: `Guru ${teacherInfo.Nama.split(",")[0]} tidak memiliki jadwal mengajar untuk mata pelajaran ${subjectName}.`
        });
      }
    }

    dbInstance.log(user.Username, "Login", `Berhasil masuk dengan peran ${role}${role === "Guru" ? ` - Mapel: ${mapel}` : ""}`);
    
    res.json({
      success: true,
      user: {
        username: user.Username,
        role: user.Role,
        nip: user.NIP,
        email: user.Email,
        teacher: teacherInfo,
        loginMapel: mapel || null
      },
    });
  });

  // Get database tables directly
  app.get("/api/db/:table", (req, res) => {
    const { table } = req.params;
    const db = dbInstance.getAll();
    if (table in db) {
      res.json(db[table as keyof DatabaseSchema]);
    } else {
      res.status(404).json({ message: "Table not found" });
    }
  });

  // Update table row (CRUD)
  app.post("/api/db/:table", (req, res) => {
    const { table } = req.params;
    const record = req.body;
    const db = dbInstance.getAll();

    if (table in db) {
      const list = db[table as keyof DatabaseSchema] as any[];
      list.push(record);
      dbInstance.save();
      dbInstance.log("admin", "Tambah Data", `Menambahkan baris ke ${table}`);
      res.json({ success: true, record });
    } else {
      res.status(404).json({ message: "Table not found" });
    }
  });

  // Edit / PUT Table row
  app.put("/api/db/:table/:idKey", (req, res) => {
    const { table, idKey } = req.params;
    const record = req.body;
    const db = dbInstance.getAll();

    if (table in db) {
      const list = db[table as keyof DatabaseSchema] as any[];
      // Match by the identifier key provided in query or body
      const idVal = record[idKey];
      const index = list.findIndex((item) => item[idKey] === idVal);
      if (index !== -1) {
        list[index] = { ...list[index], ...record };
        dbInstance.save();
        dbInstance.log("admin", "Ubah Data", `Mengubah baris di ${table} dengan key ${idVal}`);
        res.json({ success: true, record: list[index] });
      } else {
        res.status(404).json({ message: "Record not found" });
      }
    } else {
      res.status(404).json({ message: "Table not found" });
    }
  });

  // Delete Table row
  app.delete("/api/db/:table/:idKey/:idValue", (req, res) => {
    const { table, idKey, idValue } = req.params;
    const db = dbInstance.getAll();

    if (table in db) {
      const list = db[table as keyof DatabaseSchema] as any[];
      const originalLen = list.length;
      const updatedList = list.filter((item) => String(item[idKey]) !== String(idValue));
      
      if (updatedList.length < originalLen) {
        (db as any)[table] = updatedList;
        dbInstance.save();
        dbInstance.log("admin", "Hapus Data", `Menghapus baris di ${table} dengan id ${idValue}`);
        res.json({ success: true });
      } else {
        res.status(404).json({ message: "Record not found" });
      }
    } else {
      res.status(404).json({ message: "Table not found" });
    }
  });

  // Reset database to seed
  app.post("/api/db-admin/reset", (req, res) => {
    dbInstance.reset();
    res.json({ success: true, message: "Database berhasil diatur ulang." });
  });

  // Backup Database (Download JSON)
  app.get("/api/db-admin/backup", (req, res) => {
    const data = dbInstance.getAll();
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", "attachment; filename=perizinan_backup.json");
    res.send(JSON.stringify(data, null, 2));
  });

  // Restore Database (Upload JSON)
  app.post("/api/db-admin/restore", (req, res) => {
    const { data } = req.body;
    try {
      dbInstance.restore(data);
      res.json({ success: true, message: "Database berhasil dipulihkan." });
    } catch (e) {
      res.status(400).json({ success: false, message: "Format backup database tidak valid." });
    }
  });

  // Check Substitute Availability
  app.get("/api/substitutes/check", (req, res) => {
    const { hari, jams, excludeNip } = req.query;
    if (!hari || !jams || !excludeNip) {
      return res.status(400).json({ message: "Missing required query parameters." });
    }
    const jamArray = String(jams).split(",").map(Number);
    const available = dbInstance.getAvailableSubstitutes(
      String(hari),
      jamArray,
      String(excludeNip)
    );
    res.json(available);
  });

  // Handle Base64 file upload (Google Drive simulation)
  app.post("/api/permits/upload", (req, res) => {
    const { fileName, fileType, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ success: false, message: "Missing file data." });
    }

    try {
      // Decode base64 string
      const base64Data = fileData.replace(/^data:.*;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const safeFileName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const filePath = path.join(UPLOAD_DIR, safeFileName);

      fs.writeFileSync(filePath, buffer);
      console.log(`[GOOGLE DRIVE SIM] File saved to ${filePath}`);

      res.json({
        success: true,
        filePath: `/uploads/${safeFileName}`,
        fileName: safeFileName,
      });
    } catch (e: any) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  // Submit perizinan (Form Perizinan)
  app.post("/api/permits/submit", (req, res) => {
    const { permit, substitutes, username } = req.body;
    const db = dbInstance.getAll();

    // Auto generate ID
    const dateStr = permit.Tanggal.replace(/-/g, "");
    const countToday = db.DATA_IZIN.filter((i) => i.Tanggal === permit.Tanggal).length + 1;
    const idIzin = `IZ-${dateStr}-${String(countToday).padStart(3, "0")}`;

    const newPermit: Izin = {
      IdIzin: idIzin,
      Tanggal: permit.Tanggal,
      Hari: permit.Hari,
      NIP: permit.NIP,
      Unit: permit.Unit,
      JenisIzin: permit.JenisIzin,
      Alasan: permit.Alasan,
      Status: "Menunggu Persetujuan", // Start directly in pending state
      LampiranUrl: permit.LampiranUrl || "",
      LampiranNama: permit.LampiranNama || "",
      CreatedAt: new Date().toISOString(),
    };

    // Save permit
    db.DATA_IZIN.unshift(newPermit);

    // Save substitutes log
    const substitutesList: GuruPengganti[] = substitutes.map((sub: any) => ({
      IdIzin: idIzin,
      JamKe: sub.JamKe,
      NIPOriginal: permit.NIP,
      NIPPengganti: sub.NIPPengganti,
      KodeKelas: sub.KodeKelas || "",
      KodeMapel: sub.KodeMapel || "",
      Materi: sub.Materi,
      Tugas: sub.Tugas,
      HalamanBuku: sub.HalamanBuku,
      TargetPembelajaran: sub.TargetPembelajaran,
      Instruksi: sub.Instruksi,
    }));

    db.DATA_GURU_PENGGANTI.push(...substitutesList);

    // Write to file
    dbInstance.save();

    // Create log
    dbInstance.log(username, "Pengajuan Izin", `Mengajukan perizinan ${idIzin} (${permit.JenisIzin})`);

    // --- NOTIFICATION SIMULATION ---
    const requester = db.DATA_GURU.find((g) => g.NIP === permit.NIP);
    const requesterName = requester ? requester.Nama : username;

    // Send email to Teacher
    sendSimulatedEmail(
      requester?.Email || "guru@alghozali.sch.id",
      `[Perizinan Guru] Pengajuan Perizinan Diajukan - ${idIzin}`,
      `Yth. ${requesterName},\n\nPengajuan perizinan Anda (${permit.JenisIzin}) untuk tanggal ${permit.Tanggal} telah diajukan ke sistem. Status saat ini: Menunggu Persetujuan.\n\nAlasan: ${permit.Alasan}`
    );

    // Send email to Guru Piket
    const piketList = db.DATA_GURU.filter((g) => g.IsPiket);
    piketList.forEach((piket) => {
      sendSimulatedEmail(
        piket.Email,
        `[Perizinan Guru] Pengajuan Baru Menunggu Verifikasi - ${idIzin}`,
        `Yth. Guru Piket (${piket.Nama}),\n\nAda pengajuan perizinan baru dari ${requesterName} (${permit.Unit}) pada tanggal ${permit.Tanggal}.\n\nHarap segera login ke sistem untuk melakukan pemeriksaan dan memberikan verifikasi.`
      );
    });

    // Send email to substitutes
    substitutesList.forEach((sub) => {
      const substituteTeacher = db.DATA_GURU.find((g) => g.NIP === sub.NIPPengganti);
      if (substituteTeacher) {
        sendSimulatedEmail(
          substituteTeacher.Email,
          `[Perizinan Guru] Penugasan Guru Pengganti - ${idIzin}`,
          `Yth. ${substituteTeacher.Nama},\n\nAnda telah dipilih oleh ${requesterName} sebagai Guru Pengganti untuk Jam Ke-${sub.JamKe} pada tanggal ${permit.Tanggal}.\n\nMateri: ${sub.Materi}\nTugas: ${sub.Tugas}\nHalaman: ${sub.HalamanBuku}\nTarget: ${sub.TargetPembelajaran}\n\nHarap bersiap mengampu kelas tersebut.`
        );
      }
    });

    res.json({ success: true, idIzin });
  });

  // Approve / Reject Perizinan (State machine + approvals)
  app.post("/api/permits/approve", (req, res) => {
    const { idIzin, role, name, status, comment, username } = req.body;
    const db = dbInstance.getAll();

    const permit = db.DATA_IZIN.find((i) => i.IdIzin === idIzin);
    if (!permit) {
      return res.status(404).json({ success: false, message: "Permit not found" });
    }

    // Insert Approval entry
    const idApproval = "AP-" + String(db.DATA_APPROVAL.length + 1).padStart(3, "0");
    const newApproval: Approval = {
      IdApproval: idApproval,
      IdIzin: idIzin,
      ApproverRole: role,
      ApproverName: name,
      Status: status,
      TanggalApproval: new Date().toISOString(),
      Catatan: comment || "",
    };
    db.DATA_APPROVAL.push(newApproval);

    // Handle permit status progression based on role approval
    // Chain: Guru Piket -> Waka Kurikulum -> Kepala Bidang Pendidikan
    const requester = db.DATA_GURU.find((g) => g.NIP === permit.NIP);
    const requesterName = requester ? requester.Nama : "Guru";

    if (status === "Ditolak") {
      permit.Status = "Ditolak";
      dbInstance.log(username, "Penolakan Izin", `Menolak perizinan ${idIzin} oleh ${role}`);
      
      // Notify requester
      sendSimulatedEmail(
        requester?.Email || "guru@alghozali.sch.id",
        `[Perizinan Guru] Pengajuan Perizinan Ditolak - ${idIzin}`,
        `Yth. ${requesterName},\n\nDengan hormat, pengajuan perizinan Anda untuk tanggal ${permit.Tanggal} telah ditolak oleh ${role} (${name}).\n\nCatatan: ${comment || "-"}`
      );
    } else {
      // It is approved
      if (role === "Guru Piket") {
        // Advanced to Waka Kurikulum
        dbInstance.log(username, "Verifikasi Piket", `Menyetujui perizinan ${idIzin} (Verifikasi Piket)`);
        
        // Send email to Waka Kurikulum
        const wakaUser = db.DATA_USER.find((u) => u.Role === "Waka Kurikulum");
        if (wakaUser) {
          sendSimulatedEmail(
            wakaUser.Email,
            `[Perizinan Guru] Menunggu Persetujuan Waka Kurikulum - ${idIzin}`,
            `Yth. Waka Kurikulum,\n\nPengajuan perizinan dari ${requesterName} tanggal ${permit.Tanggal} telah diverifikasi oleh Guru Piket (${name}).\n\nHarap segera login untuk memproses persetujuan tingkat 2.`
          );
        }
      } else if (role === "Waka Kurikulum") {
        // Advanced to Kabid Pendidikan
        dbInstance.log(username, "Persetujuan Waka", `Menyetujui perizinan ${idIzin} (Persetujuan Waka Kurikulum)`);

        // Send email to Kepala Bidang Pendidikan
        const kabidUser = db.DATA_USER.find((u) => u.Role === "Kepala Bidang Pendidikan");
        if (kabidUser) {
          sendSimulatedEmail(
            kabidUser.Email,
            `[Perizinan Guru] Menunggu Persetujuan Final Kabid Pendidikan - ${idIzin}`,
            `Yth. Kepala Bidang Pendidikan,\n\nPengajuan perizinan dari ${requesterName} tanggal ${permit.Tanggal} telah disetujui oleh Waka Kurikulum.\n\nHarap segera login untuk memberikan persetujuan final.`
          );
        }
      } else if (role === "Kepala Bidang Pendidikan") {
        // Finished / Disetujui (Selesai)
        permit.Status = "Selesai";
        dbInstance.log(username, "Persetujuan Final", `Menyetujui perizinan ${idIzin} (Persetujuan Final Kabid Pendidikan)`);

        // Send email to Requester
        sendSimulatedEmail(
          requester?.Email || "guru@alghozali.sch.id",
          `[Perizinan Guru] Pengajuan Perizinan Selesai Disetujui - ${idIzin}`,
          `Yth. ${requesterName},\n\nAlhamdulillah, pengajuan perizinan Anda untuk tanggal ${permit.Tanggal} telah disetujui sepenuhnya oleh Kepala Bidang Pendidikan.\n\nSemua proses selesai.`
        );

        // Send confirmation email to substitute teachers
        const substitutes = db.DATA_GURU_PENGGANTI.filter((p) => p.IdIzin === idIzin);
        substitutes.forEach((sub) => {
          const subTeacher = db.DATA_GURU.find((g) => g.NIP === sub.NIPPengganti);
          if (subTeacher) {
            sendSimulatedEmail(
              subTeacher.Email,
              `[Perizinan Guru] Konfirmasi Penugasan Guru Pengganti Selesai - ${idIzin}`,
              `Yth. ${subTeacher.Nama},\n\nPerizinan untuk ${requesterName} telah disetujui sepenuhnya. Penugasan Anda sebagai guru pengganti pada Jam Ke-${sub.JamKe} tanggal ${permit.Tanggal} resmi dikonfirmasi.\n\nMateri: ${sub.Materi}`
            );
          }
        });
      }
    }

    dbInstance.save();
    res.json({ success: true, permit });
  });

  // Get Simulated Google Drive Uploads
  app.get("/api/drive/files", (req, res) => {
    try {
      const files = fs.readdirSync(UPLOAD_DIR);
      const list = files.map((file) => {
        const filePath = path.join(UPLOAD_DIR, file);
        const stat = fs.statSync(filePath);
        return {
          name: file,
          url: `/uploads/${file}`,
          size: `${(stat.size / 1024).toFixed(1)} KB`,
          createdAt: stat.birthtime,
        };
      });
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete Google Drive Uploads
  app.delete("/api/drive/files/:filename", (req, res) => {
    const { filename } = req.params;
    try {
      const filePath = path.join(UPLOAD_DIR, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        dbInstance.log("admin", "Hapus Berkas", `Menghapus berkas ${filename} dari penyimpanan.`);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Helper for resilient AI generation with fallback model on 429 quota errors
  async function safeGenerateContent(params: {
    model?: string;
    contents: any;
    config?: any;
  }) {
    const primaryModel = params.model || "gemini-3.5-flash";
    const fallbackModel = "gemini-2.5-flash";

    try {
      return await ai.models.generateContent({
        model: primaryModel,
        contents: params.contents,
        config: params.config
      });
    } catch (err: any) {
      if (err?.status === "RESOURCE_EXHAUSTED" || err?.message?.includes("429") || err?.message?.includes("quota")) {
        console.warn(`Primary model ${primaryModel} hit quota limit, retrying with fallback model ${fallbackModel}...`);
        return await ai.models.generateContent({
          model: fallbackModel,
          contents: params.contents,
          config: params.config
        });
      }
      throw err;
    }
  }

  // --- GEMINI AI INTEGRATION ROUTES ---

  // 1. General & Multi-turn Chat Endpoint with Mode Selection
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, mode, systemInstruction } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
      }

      let selectedModel = "gemini-3.5-flash"; // Default general
      let config: any = {
        systemInstruction: systemInstruction || "Anda adalah Asisten AI Pintar SIPG YPI Pondok Modern Al-Ghozali. Anda bertugas membantu guru, waka kurikulum, kepala bidang, dan staf dalam hal perizinan guru, jadwal pelajaran, analisis dokumen, pencarian informasi, serta pemikiran analitis secara sopan dan profesional."
      };

      if (mode === "fast") {
        selectedModel = "gemini-3.1-flash-lite"; // Low-latency
      } else if (mode === "complex") {
        selectedModel = "gemini-3.5-flash"; // High capacity flash model
      } else if (mode === "search") {
        selectedModel = "gemini-3.5-flash"; // Google Search Grounding
        config.tools = [{ googleSearch: {} }];
      } else if (mode === "maps") {
        selectedModel = "gemini-3.5-flash"; // Google Maps Grounding
        config.tools = [{ googleMaps: {} }];
      } else if (mode === "thinking") {
        selectedModel = "gemini-3.5-flash"; // Thinking / Reasoning mode
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
      }

      // Convert messages to GenAI contents structure
      const contents = messages.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: m.parts || [{ text: m.text || "" }]
      }));

      const response = await safeGenerateContent({
        model: selectedModel,
        contents,
        config
      });

      const text = response.text || "";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || null;

      res.json({
        text,
        groundingChunks,
        modelUsed: selectedModel,
        modeUsed: mode || "general"
      });
    } catch (error: any) {
      console.error("Gemini Chat Error:", error);
      res.status(500).json({ error: error.message || "Gagal memproses AI Chat." });
    }
  });

  // 2. Analyze Image Endpoint (gemini-3.5-flash)
  app.post("/api/ai/analyze-image", async (req, res) => {
    try {
      const { prompt, imageBase64, mimeType } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Image base64 data is required." });
      }

      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const response = await safeGenerateContent({
        model: "gemini-3.5-flash",
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || "image/jpeg"
              }
            },
            {
              text: prompt || "Analisis foto atau dokumen ini secara teliti. Jika ini adalah surat izin/keterangan dokter/surat tugas/foto jadwal, uraikan poin-poin utama seperti Nama, Tanggal, Diagnosa/Alasan, dan Ringkasan Informasi Penting."
            }
          ]
        },
        config: {
          systemInstruction: "Anda adalah Asisten Analisis Foto & Dokumen SIPG Al-Ghozali. Berikan hasil analisa yang terstruktur, jelas, dan rapi dalam bahasa Indonesia."
        }
      });

      res.json({
        text: response.text,
        modelUsed: "gemini-3.5-flash"
      });
    } catch (error: any) {
      console.error("Gemini Image Analysis Error:", error);
      res.status(500).json({ error: error.message || "Gagal menganalisis gambar/dokumen." });
    }
  });

  // 3. Search Grounding Endpoint (gemini-3.5-flash + googleSearch)
  app.post("/api/ai/search", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required." });

      const response = await safeGenerateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "Berikan jawaban komprehensif berdasar data Google Search terbaru."
        }
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      res.json({
        text: response.text,
        groundingChunks: chunks,
        modelUsed: "gemini-3.5-flash"
      });
    } catch (error: any) {
      console.error("Gemini Search Grounding Error:", error);
      res.status(500).json({ error: error.message || "Gagal melakukan pencarian Google Search." });
    }
  });

  // 4. Maps Grounding Endpoint (gemini-3.5-flash + googleMaps)
  app.post("/api/ai/maps", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required." });

      const response = await safeGenerateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleMaps: {} }],
          systemInstruction: "Berikan jawaban lokasi dan rute berdasarkan Google Maps data."
        }
      });

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      res.json({
        text: response.text,
        groundingChunks: chunks,
        modelUsed: "gemini-3.5-flash"
      });
    } catch (error: any) {
      console.error("Gemini Maps Grounding Error:", error);
      res.status(500).json({ error: error.message || "Gagal mengambil data Google Maps." });
    }
  });

  // 5. High Thinking Mode Endpoint (gemini-3.5-flash)
  app.post("/api/ai/thinking", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required." });

      const response = await safeGenerateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH
          },
          systemInstruction: "Lakukan penalaran mendalam (high thinking mode) untuk menyelesaikan masalah kompleks, perencana jadwal, analisis bentrok, atau penyusunan kebijakan perizinan guru."
        }
      });

      res.json({
        text: response.text,
        modelUsed: "gemini-3.5-flash"
      });
    } catch (error: any) {
      console.error("Gemini Thinking Error:", error);
      res.status(500).json({ error: error.message || "Gagal memproses mode penalaran tinggi." });
    }
  });

  // 6. Schedule Document Parser Endpoint (PDF, Word, Excel, Gambar, Markdown)
  app.post("/api/jadwal/upload-parse", async (req, res) => {
    try {
      const { fileName, fileType, fileData } = req.body;

      if (!fileData) {
        return res.status(400).json({ error: "File base64 data is required." });
      }

      const cleanBase64 = fileData.replace(/^data:.*;base64,/, "");
      const ext = path.extname(fileName || "").toLowerCase();

      let parts: any[] = [];

      // Determine how to pass file to Gemini
      if ([".md", ".txt", ".csv"].includes(ext) || fileType?.includes("text") || fileType?.includes("csv")) {
        const textContent = Buffer.from(cleanBase64, "base64").toString("utf-8");
        parts.push({
          text: `Berikut isi dokumen jadwal mengajar dalam bentuk teks/markdown:\n\n${textContent}`
        });
      } else if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext) || fileType?.startsWith("image/")) {
        const mime = fileType || (ext === ".png" ? "image/png" : "image/jpeg");
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mime
          }
        });
        parts.push({
          text: "Ekstrak seluruh jadwal mengajar dari gambar/foto jadwal ini."
        });
      } else if (ext === ".pdf" || fileType === "application/pdf") {
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: "application/pdf"
          }
        });
        parts.push({
          text: "Ekstrak seluruh jadwal mengajar dari dokumen PDF ini."
        });
      } else {
        // Office doc / fallback - pass inlineData or text
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: fileType || "application/octet-stream"
          }
        });
        parts.push({
          text: "Ekstrak seluruh data jadwal mengajar dari dokumen ini."
        });
      }

      const promptInstruction = `Anda adalah Asisten Ekstraksi Jadwal Mengajar Sekolah YPI Pondok Modern Al-Ghozali.
Tugas Anda adalah membaca dokumen/berkas jadwal mengajar (PDF, Word, Excel, Gambar, atau Markdown/Text) dan mengekstrak SELURUH jadwal mengajar menjadi JSON Array terstruktur.

Setiap objek harus mempunyai atribut persis:
[
  {
    "NIP": "string (opsional jika ada di dokumen, jika tidak ada beri '-')",
    "NamaGuru": "string (Nama guru)",
    "Hari": "string ('Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu')",
    "JamKe": number (1 sampai 10),
    "KodeMapel": "string (kode atau nama mata pelajaran)",
    "KodeKelas": "string (kode atau nama kelas e.g. '7A SMP', 'X IPA SMA', 'TMMIA-1')"
  }
]

SANGAT PENTING:
- Hanya kembalikan array JSON murni tanpa markdown formatting (\`\`\`json).
- Pastikan atribut JamKe berupa angka (1-10).
- Pastikan Hari dalam bahasa Indonesia resmi (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu).`;

      parts.push({ text: promptInstruction });

      const response = await safeGenerateContent({
        model: "gemini-3.5-flash",
        contents: { parts },
        config: {
          systemInstruction: "Anda adalah Parser Jadwal Mengajar Otomatis YPI Al-Ghozali."
        }
      });

      const rawText = response.text || "";
      let jsonString = rawText.trim();
      if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```(json)?\n?/, "").replace(/\n?```$/, "");
      }

      let parsedItems: any[] = [];
      try {
        parsedItems = JSON.parse(jsonString);
      } catch (pe) {
        console.error("JSON parse failed, raw string was:", rawText);
        return res.status(500).json({ error: "Gagal memproses format JSON dari respon AI Gemini. Pastikan file berisi tabel jadwal yang jelas." });
      }

      // Cross reference with DB to match exact NIP and names
      const db = dbInstance.getAll();
      const allGuru = db.DATA_GURU;

      const enrichedItems = parsedItems.map((item, index) => {
        // Try matching guru by name
        let matchedGuru = allGuru.find((g) => g.NIP === item.NIP);
        if (!matchedGuru && item.NamaGuru) {
          const cleanName = item.NamaGuru.toLowerCase().replace(/ustadz(ah)?|m\.pd\.|s\.pd\.|s\.ag\.|m\.a\.|s\.si\.|lc\./g, "").trim();
          matchedGuru = allGuru.find((g) => g.Nama.toLowerCase().includes(cleanName));
        }

        return {
          IdJadwal: `J-UP-${Date.now()}-${index + 1}`,
          NIP: matchedGuru ? matchedGuru.NIP : (item.NIP || "-"),
          NamaGuruMatched: matchedGuru ? matchedGuru.Nama : item.NamaGuru,
          Hari: item.Hari || "Senin",
          JamKe: Number(item.JamKe) || 1,
          KodeMapel: item.KodeMapel || "UMUM",
          KodeKelas: item.KodeKelas || "UMUM"
        };
      });

      res.json({
        success: true,
        count: enrichedItems.length,
        items: enrichedItems,
        fileName
      });
    } catch (error: any) {
      console.error("Schedule Parse Error:", error);
      res.status(500).json({ error: error.message || "Gagal mengurai dokumen jadwal mengajar." });
    }
  });

  // Batch Save Schedule Endpoint
  app.post("/api/jadwal/batch-save", (req, res) => {
    try {
      const { items, replaceAll } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Items array is required." });
      }

      const db = dbInstance.getAll();

      const sanitizedItems: any[] = items.map((item: any, idx: number) => ({
        IdJadwal: item.IdJadwal || `J-${Date.now()}-${idx + 1}`,
        NIP: item.NIP || "-",
        Hari: item.Hari || "Senin",
        JamKe: Number(item.JamKe) || 1,
        KodeMapel: item.KodeMapel || "UMUM",
        KodeKelas: item.KodeKelas || "UMUM"
      }));

      if (replaceAll) {
        db.DATA_JADWAL = sanitizedItems;
      } else {
        db.DATA_JADWAL.push(...sanitizedItems);
      }

      dbInstance.save();
      dbInstance.log("Administrator", "Upload Database Jadwal", `Memperbarui database jadwal mengajar dengan ${sanitizedItems.length} baris.`);

      res.json({
        success: true,
        totalJadwal: db.DATA_JADWAL.length,
        message: "Database jadwal mengajar berhasil diperbarui."
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Gagal menyimpan data jadwal." });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---
  async function startServer() {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    if (!process.env.VERCEL) {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
      });
    }
  }

  startServer();
