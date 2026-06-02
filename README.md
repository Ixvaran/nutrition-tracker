# NutriFit - Personal Nutrition & Fitness Tracker 🥗💪

NutriFit adalah aplikasi *web* pintar yang dirancang untuk mempermudah Anda dalam mencatat, melacak, dan merencanakan asupan nutrisi harian. Dibangun dengan antarmuka yang modern, dinamis, dan intuitif, aplikasi ini membantu mencapai target kebugaran Anda dengan bantuan AI.

## Fitur Utama ✨
- **Pencatatan Makanan Cerdas (AI-Powered)**: Cukup masukkan apa yang Anda makan (misal: "makan siang nasi padang lauk rendang 1 porsi"), dan sistem AI akan secara otomatis mengekstrak, mengidentifikasi bahan, dan menghitung estimasi kalori serta makronutrisi (protein, karbohidrat, lemak).
- **Dashboard Pahlawan (Hero Section)**: Tampilan status kalori harian yang inspiratif dan rekap ringkas tentang target kebugaran Anda yang otomatis menyesuaikan progres harian.
- **Rekap Nutrisi Mingguan (Weekly Recap)**: Grafik atau diagram komprehensif yang menampilkan asupan nutrisi Anda selama 7 hari terakhir agar tren makan Anda mudah dievaluasi.
- **Kalkulator Makro & TDEE**: Hitung otomatis Kebutuhan Kalori Harian (TDEE) Anda berdasarkan aktivitas, umur, berat, dan tinggi badan dengan rumus *Mifflin-St Jeor*.
- **Database Makanan Personal**: Simpan menu atau makanan yang sering Anda konsumsi ke dalam daftar "My Foods" agar dapat dicatat ulang dalam satu klik tanpa perlu bertanya kepada AI lagi.
- **Dukungan Mode Terang/Malam**: Tampilan aplikasi akan secara default menggunakan *Light Theme* (mode terang) yang cerah dan modern, namun bisa diganti ke *Dark Theme* (mode malam) kapan saja sesuai kenyamanan mata Anda.

## Tech Stack 🚀
- **Frontend/Framework**: Next.js (App Router), React, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React Icons
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Supabase Auth)
- **AI Engine**: DeepSeek / OpenAI API integration
- **Validasi Data**: Zod

## Instalasi & Menjalankan Aplikasi di Lokal 💻

1. **Kloning Repositori**
   ```bash
   git clone https://github.com/username-anda/nutrition-tracker.git
   cd nutrition-tracker
   ```

2. **Instal Dependensi**
   ```bash
   npm install
   ```

3. **Konfigurasi Lingkungan (.env)**
   Buat file `.env` di direktori *root* (Anda bisa menggunakan `.env.example` sebagai referensi) dan isi kredensial berikut:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   DEEPSEEK_API_KEY=your_deepseek_or_openai_api_key
   ```

4. **Persiapan Database (Supabase)**
   Jalankan query SQL yang terdapat di dalam file `schema.sql` di SQL Editor Supabase Anda untuk membuat struktur tabel (*users*, *daily_logs*, *food_entries*, *saved_foods*) dan kebijakan keamanannya (RLS).

5. **Jalankan Aplikasi**
   ```bash
   npm run dev
   ```
   Aplikasi akan dapat diakses pada `http://localhost:3000`.

## Kontribusi 🤝
Kontribusi sangat terbuka! Silakan *fork* repositori ini, buat *branch* fitur Anda, dan kirimkan *Pull Request*.

## Lisensi 📝
Proyek ini didistribusikan di bawah lisensi MIT.
