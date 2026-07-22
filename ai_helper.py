import os
import io
import json
from google import genai
from google.genai import types
from PIL import Image
from dotenv import load_dotenv

# Load environment variables (like GEMINI_API_KEY)
load_dotenv()
load_dotenv(".env.local")

# Retrieve API Key
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

class AIHelper:
    def __init__(self):
        self.client = None
        if GEMINI_API_KEY:
            try:
                self.client = genai.Client(api_key=GEMINI_API_KEY)
            except Exception as e:
                print(f"Failed to initialize Gemini Client: {e}")
        else:
            print("WARNING: GEMINI_API_KEY environment variable is not set.")

    def get_client(self):
        if not self.client and os.environ.get("GEMINI_API_KEY"):
            try:
                self.client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
            except Exception as e:
                print(f"Failed to initialize Gemini Client dynamically: {e}")
        return self.client

    def safe_generate_content(self, model: str, contents, config=None):
        """Generates content and automatically falls back to gemini-2.5-flash on quota limits"""
        client = self.get_client()
        if not client:
            raise ValueError("Gemini API Client is not initialized. Please verify GEMINI_API_KEY.")

        primary_model = model or "gemini-3.5-flash"
        fallback_model = "gemini-2.5-flash"

        try:
            return client.models.generate_content(
                model=primary_model,
                contents=contents,
                config=config
            )
        except Exception as err:
            err_msg = str(err).lower()
            if any(k in err_msg for k in ["resource_exhausted", "429", "quota", "503", "unavailable"]):
                print(f"Primary model {primary_model} unavailable or hit quota, retrying with fallback model {fallback_model}...")
                try:
                    return client.models.generate_content(
                        model=fallback_model,
                        contents=contents,
                        config=config
                    )
                except Exception as fallback_err:
                    raise Exception(f"Fallback model also failed: {str(fallback_err)}") from err
            raise err

    def chat(self, messages: list, mode: str, system_instruction: str):
        """
        Multi-turn chat completion supporting multiple modes:
        - fast: gemini-2.5-flash
        - complex: gemini-3.5-flash
        - search: search grounding
        - maps: maps grounding (fallback to search or standard)
        - thinking: thinking level configuration
        """
        client = self.get_client()
        if not client:
            return "Asisten AI tidak aktif (GEMINI_API_KEY belum diset).", None, "None"

        # Model mapping
        model_name = "gemini-3.5-flash"
        if mode == "fast":
            model_name = "gemini-2.5-flash"

        # Base configuration
        config_args = {
            "system_instruction": system_instruction or "Anda adalah Asisten AI SIPG."
        }

        # Handle different modes
        if mode == "search":
            config_args["tools"] = [{"google_search": {}}]
        elif mode == "maps":
            # Native maps is sometimes search or custom tool, we use search tool or general
            config_args["tools"] = [{"google_search": {}}]
        elif mode == "thinking":
            # Enable thinking budget for gemini-3.5-flash
            config_args["thinking_config"] = {"thinking_budget": 2048}

        config = types.GenerateContentConfig(**config_args)

        # Convert simple list of dicts to types.Content structure
        contents = []
        for m in messages:
            role = "user" if m.get("role") in ["user", "user"] else "model"
            text_val = m.get("text", "")
            
            # Extract parts if available
            parts = []
            if m.get("parts"):
                for p in m["parts"]:
                    if isinstance(p, dict) and "text" in p:
                        parts.append(types.Part.from_text(text=p["text"]))
                    elif isinstance(p, str):
                        parts.append(types.Part.from_text(text=p))
            else:
                parts.append(types.Part.from_text(text=text_val))
                
            contents.append(types.Content(role=role, parts=parts))

        try:
            response = self.safe_generate_content(model=model_name, contents=contents, config=config)
            
            # Extract grounding metadata if search was used
            grounding_chunks = None
            try:
                if response.candidates and response.candidates[0].grounding_metadata:
                    metadata = response.candidates[0].grounding_metadata
                    if metadata.grounding_chunks:
                        grounding_chunks = [
                            {"title": chunk.web.title, "uri": chunk.web.uri}
                            for chunk in metadata.grounding_chunks
                            if chunk.web
                        ]
            except Exception:
                pass

            return response.text, grounding_chunks, model_name
        except Exception as e:
            return f"Error: Gagal memproses obrolan AI. Detail: {str(e)}", None, model_name

    def analyze_image(self, image_bytes: bytes, mime_type: str, prompt: str):
        """Analyze image (e.g. medical slip, permit letter) using gemini-3.5-flash"""
        client = self.get_client()
        if not client:
            return "Asisten AI tidak aktif (GEMINI_API_KEY belum diset)."

        system_instruction = "Anda adalah Asisten Analisis Foto & Dokumen SIPG Al-Ghozali. Berikan hasil analisa yang terstruktur, jelas, dan rapi dalam bahasa Indonesia."

        # Pass image as Part object
        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        contents = [
            image_part,
            types.Part.from_text(text=prompt or "Analisis foto/dokumen ini.")
        ]

        config = types.GenerateContentConfig(system_instruction=system_instruction)

        try:
            response = self.safe_generate_content(model="gemini-3.5-flash", contents=contents, config=config)
            return response.text
        except Exception as e:
            return f"Error menganalisis gambar: {str(e)}"

    def parse_schedule_document(self, file_bytes: bytes, mime_type: str, file_name: str) -> list:
        """Parses teaching schedule from uploaded files (PDF, image, text) and extracts a list of schedules"""
        client = self.get_client()
        if not client:
            raise ValueError("Asisten AI tidak aktif (GEMINI_API_KEY belum diset).")

        # Determine file type
        ext = os.path.splitext(file_name)[1].lower() if file_name else ""
        
        parts = []
        
        if ext in [".md", ".txt", ".csv"] or "text" in mime_type or "csv" in mime_type:
            text_content = file_bytes.decode("utf-8", errors="ignore")
            parts.append(types.Part.from_text(text=f"Berikut isi dokumen jadwal mengajar dalam bentuk teks/markdown:\n\n{text_content}"))
        elif ext in [".png", ".jpg", ".jpeg", ".webp"] or "image" in mime_type:
            parts.append(types.Part.from_bytes(data=file_bytes, mime_type=mime_type or "image/jpeg"))
            parts.append(types.Part.from_text(text="Ekstrak seluruh jadwal mengajar dari gambar/foto jadwal ini."))
        elif ext == ".pdf" or mime_type == "application/pdf":
            parts.append(types.Part.from_bytes(data=file_bytes, mime_type="application/pdf"))
            parts.append(types.Part.from_text(text="Ekstrak seluruh jadwal mengajar dari dokumen PDF ini."))
        else:
            parts.append(types.Part.from_bytes(data=file_bytes, mime_type=mime_type or "application/octet-stream"))
            parts.append(types.Part.from_text(text="Ekstrak seluruh data jadwal mengajar dari dokumen ini."))

        prompt_instruction = """Anda adalah Asisten Ekstraksi Jadwal Mengajar Sekolah YPI Pondok Modern Al-Ghozali.
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
- Hanya kembalikan array JSON murni tanpa markdown formatting (```json ... ```). Jangan menyertakan teks pembuka atau penutup apa pun!
- Pastikan atribut JamKe berupa angka (1-10).
- Pastikan Hari dalam bahasa Indonesia resmi (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu)."""

        parts.append(types.Part.from_text(text=prompt_instruction))

        config = types.GenerateContentConfig(
            system_instruction="Anda adalah Parser Jadwal Mengajar Otomatis YPI Al-Ghozali."
        )

        response = self.safe_generate_content(model="gemini-3.5-flash", contents=parts, config=config)
        raw_text = response.text or ""
        
        # Clean markdown formatting if present
        json_str = raw_text.strip()
        if json_str.startswith("```"):
            json_str = json_str.replace("```json", "", 1).replace("```", "", 1).strip()
            # If the closing tag has trailing characters
            if json_str.endswith("```"):
                json_str = json_str[:-3].strip()

        try:
            return json.loads(json_str)
        except Exception as pe:
            print(f"JSON Parse error. Raw string was:\n{raw_text}")
            raise ValueError("Gagal mengurai format JSON dari respons AI. Pastikan file berisi tabel jadwal yang jelas.")


# Singleton helper instance
ai_helper = AIHelper()
