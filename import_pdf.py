import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables (mencari di folder saat ini dan folder induk)
load_dotenv(".env.local")
load_dotenv(".env")
load_dotenv("../.env.local")
load_dotenv("../.env")

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY tidak ditemukan di .env atau .env.local")
    exit(1)

# Initialize Gemini Client
client = genai.Client(api_key=API_KEY)

# PDF File Path
PDF_PATH = r"C:\Users\liyaz\.gemini\antigravity-ide\brain\48dffe6e-edb2-4fba-a415-2fbd64da8f05\media__1784699164827.pdf"

DB_FILE = "db.json"

def main():
    print("Memulai proses ekstraksi jadwal dari PDF (127 Halaman)...")
    if not os.path.exists(PDF_PATH):
        print(f"Error: File PDF tidak ditemukan di {PDF_PATH}")
        return

    print("Mengunggah PDF ke server Gemini...")
    try:
        uploaded_file = client.files.upload(file=PDF_PATH)
        print(f"File berhasil diunggah dengan URI: {uploaded_file.uri}")
    except Exception as e:
        print(f"Gagal mengunggah file: {e}")
        return

    prompt = """
    Kamu adalah sistem ekstraksi jadwal.
    Tugasmu adalah membaca seluruh halaman dari dokumen PDF jadwal sekolah ini.
    Dokumen ini berisi jadwal untuk banyak guru. Ekstrak jadwal setiap guru menjadi format JSON.
    Hasilkan output HANYA berupa array JSON (tanpa markdown markdown backticks) dengan struktur berikut untuk SETIAP jadwal yang kamu temukan:
    [
      {
        "IdJadwal": "J-001",
        "NIP": "nama_guru",
        "Hari": "Senin",
        "JamKe": 1,
        "KodeMapel": "Nama Mata Pelajaran",
        "KodeKelas": "Nama Kelas"
      }, ...
    ]
    Catatan: Gunakan nama guru sebagai NIP sementara.
    """

    print("Menganalisis dokumen menggunakan Gemini 1.5 Pro...")
    try:
        response = client.models.generate_content(
            model='gemini-1.5-pro',
            contents=[uploaded_file, prompt],
            config=types.GenerateContentConfig(
                temperature=0.0
            )
        )
        
        output_text = response.text.strip()
        if output_text.startswith("```json"):
            output_text = output_text[7:-3]
        elif output_text.startswith("```"):
            output_text = output_text[3:-3]
            
        extracted_data = json.loads(output_text.strip())
        print(f"Berhasil mengekstrak {len(extracted_data)} jadwal.")

        # Load existing DB
        db_data = {}
        if os.path.exists(DB_FILE):
            with open(DB_FILE, "r", encoding="utf-8") as f:
                db_data = json.load(f)
        
        if "DATA_JADWAL" not in db_data:
            db_data["DATA_JADWAL"] = []
            
        db_data["DATA_JADWAL"].extend(extracted_data)
        
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(db_data, f, indent=2, ensure_ascii=False)
            
        print("Data berhasil disimpan ke db.json!")

    except Exception as e:
        print(f"Gagal mengekstrak data: {e}")

if __name__ == "__main__":
    main()
