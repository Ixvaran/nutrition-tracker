# NutriFit - Personal Nutrition & Fitness Tracker 🥗💪

NutriFit adalah aplikasi *web* pintar yang dirancang untuk mempermudah Anda dalam mencatat, melacak, dan merencanakan asupan nutrisi harian. Dibangun dengan antarmuka yang modern, dinamis, dan intuitif, aplikasi ini membantu mencapai target kebugaran Anda dengan bantuan AI.

## Fitur Utama ✨

- **Pencatatan Makanan Cerdas & Fleksibel**:
  - **AI-Powered Input**: Cukup masukkan apa yang Anda makan (misal: *"makan siang gulai tikungan 2 porsi"* atau *"nasi putih 300g"*), dan sistem AI akan secara otomatis mengekstrak, mengidentifikasi bahan, dan menghitung estimasi kalori serta makronutrisi (protein, karbohidrat, lemak).
  - **Manual Input**: Input bahan makanan secara manual untuk kendali penuh atas akurasi nutrisi Anda.
- **Sistem Tier Akun (Free vs Pro - BYOK)**:
  - **Free Tier**: Batasan 1 request analisis AI per hari demi mencegah pembengkakan biaya server (menggunakan API key bawaan admin).
  - **Pro Tier (BYOK - Bring Your Own Key)**: Pengguna dapat beralih ke Pro Tier secara instan dengan memasukkan DeepSeek API Key milik mereka sendiri. Kunci API disimpan dengan aman di *local storage* peramban pengguna untuk memberikan akses analisis AI tanpa batas.
- **Dashboard Pahlawan (Hero Section)**: Tampilan status kalori harian yang inspiratif dan rekap ringkas tentang target kebugaran Anda yang otomatis menyesuaikan progres harian.
- **Rekap Nutrisi Mingguan (Weekly Recap)**: Grafik visual interaktif yang menampilkan asupan nutrisi Anda selama 7 hari terakhir agar tren makan Anda mudah dievaluasi.
- **Kalkulator Makro & TDEE**: Hitung otomatis Kebutuhan Kalori Harian (TDEE) Anda berdasarkan tingkat aktivitas, usia, berat, dan tinggi badan menggunakan rumus sains *Mifflin-St Jeor*.
- **Database Makanan Personal**: Simpan menu atau makanan yang sering Anda konsumsi ke dalam daftar "My Foods" agar dapat dicatat ulang dalam satu klik tanpa perlu bertanya ke AI kembali.
- **Desain Responsif & Premium**:
  - Tampilan dioptimalkan sepenuhnya untuk perangkat seluler (*mobile-view friendly*).
  - Menggunakan *Light Theme* (mode terang) modern sebagai setelan bawaan default yang nyaman bagi mata.

## Tech Stack 🚀

- **Frontend/Framework**: Next.js (App Router), React, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React Icons
- **Database & Auth**: Supabase (PostgreSQL, Row Level Security, Supabase Auth)
- **AI Engine**: DeepSeek / OpenAI API integration
- **Validasi Data**: Zod

## Instalasi & Menjalankan Aplikasi di Lokal 💻

1. **Kloning Repositori**
   ```bash
   git clone https://github.com/Ixvaran/nutrition-tracker.git
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
   DEEPSEEK_API_KEY_FALLBACK=your_global_deepseek_api_key_for_free_tier
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
