# CourtHub 🏟️
> **Platform B2B2C Booking Fasilitas Olahraga Terintegrasi**

CourtHub adalah aplikasi *marketplace* penyewaan fasilitas olahraga (futsal, badminton, mini soccer, dll) yang menghubungkan pemilik bisnis (Mitra) dengan pengguna aktif (Pelanggan) dalam satu ekosistem yang mulus. Aplikasi ini dirancang dengan antarmuka modern, arsitektur *multi-tenant*, dan sistem pembayaran terotomatisasi.

Proyek ini dibangun untuk memenuhi kriteria penilaian mata kuliah **Aplikasi Kewirausahaan** pada program studi **Teknik Informatika**, **Universitas Indraprasta (PGRI)**.

---

## 🔄 Alur Sistem Terpadu (B2B2C)

Sistem CourtHub menyatukan tiga entitas utama dalam satu aplikasi:

1. **Pemilik Bisnis (Partner/B2B):** Mendaftar ke dalam sistem dan mendaftarkan fasilitas olahraga mereka. Mereka mendapatkan *Dashboard* terisolasi untuk memantau fasilitas dan pesanan yang masuk secara spesifik ke tempat mereka.
2. **Pelanggan (User/B2C):** Menjelajahi katalog dari berbagai lapangan, memilih jadwal bermain, dan melakukan *checkout*.
3. **Sistem Pembayaran (Midtrans API):** Saat pelanggan memesan, Next.js API Routes akan meminta token dari Midtrans dan memunculkan *popup* QRIS/VA. Setelah dibayar, status di *database* akan langsung diperbarui, dan Mitra dapat langsung melihat dana/status *Paid* di dasbor mereka.

---

## ✨ Fitur Unggulan

### 🛍️ Sisi Pelanggan (Frontend)
* **Katalog Dinamis:** Menampilkan daftar fasilitas yang diambil langsung dari *database* secara *real-time*.
* **Smart Booking Widget:** Form pemilihan jadwal (tanggal dan jam) dengan kalkulasi total harga yang presisi.
* **Seamless Checkout:** Integrasi Midtrans Snap API (Sandbox) untuk simulasi pembayaran menggunakan Virtual Account dan QRIS.
* **Interactive UI:** Menggunakan SweetAlert2 untuk memberikan umpan balik (notifikasi sukses/gagal) yang elegan tanpa mengganggu *routing* Next.js.
* **User Dashboard:** Halaman riwayat (*My Bookings*) untuk memantau pesanan yang *Pending* atau *Confirmed*.

### 🏢 Sisi Mitra (Admin/Partner Dashboard)
* **Multi-Tenant Architecture:** Autentikasi ketat memastikan Mitra **A** tidak bisa melihat data pesanan atau lapangan milik Mitra **B**.
* **Tab Navigation UI:** Dasbor yang rapi terbagi menjadi dua panel:
  * *Fasilitas Saya:* Daftar lapangan yang dikelola oleh Mitra tersebut.
  * *Daftar Booking:* Tabel pelacakan status pesanan pelanggan.
* **Manajemen Pesanan:** Tombol *action* untuk mengubah status pembayaran dan konfirmasi pemesanan secara manual jika diperlukan.

---

## 🛠️ Tech Stack & Arsitektur

Proyek ini dibangun menggunakan teknologi *modern web development*:

* **Framework:** Next.js (App Router)
* **Language:** JavaScript (ES6+)
* **Styling:** Tailwind CSS & Lucide React
* **Backend as a Service:** Supabase (PostgreSQL & Supabase Auth)
* **Payment Gateway:** Midtrans Node.js Client
* **State & Routing:** React Hooks (`useState`, `useEffect`) & `next/navigation`

---

## 🗄️ Relasi Database (Supabase)

Struktur *database* dirancang secara relasional untuk mendukung sistem *multi-tenant*:

* `auth.users` (Bawaan Supabase)
* `profiles` (Tabel Ekstensi): Menyimpan `full_name`, `phone`, dan `role` (customer / partner).
* `facilities`: Menyimpan detail lapangan (nama, harga, kategori). Memiliki kolom `owner_id` (Foreign Key) yang merujuk ke tabel `profiles` pemilik bisnis.
* `bookings`: Mencatat histori transaksi. Terhubung dengan `facility_id` (lapangan mana yang disewa) dan `profile_id` (siapa yang menyewa).

---

## 🚀 Panduan Instalasi Lokal

Ikuti langkah-langkah ini untuk menjalankan lingkungan pengembangan di komputer Anda:

**1. Kloning Repositori & Instalasi**
```bash
git clone [https://github.com/username-anda/courthub.git](https://github.com/username-anda/courthub.git)
cd courthub
npm install

**2. Setup Dependensi Tambahan**
Pastikan library pendukung ini sudah terpasang:

```bash
npm install @supabase/supabase-js midtrans-client sweetalert2 lucide-react

**3. Konfigurasi Environment (.env.local)**
Buat file .env.local di root folder, lalu masukkan API Keys Anda:

Cuplikan kode
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]

NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=[YOUR_MIDTRANS_CLIENT_KEY_SANDBOX]
MIDTRANS_SERVER_KEY=[YOUR_MIDTRANS_SERVER_KEY_SANDBOX]

**4. Jalankan Server Development**

```bash
npm run dev
Buka http://localhost:3000 di browser Anda.

Dibangun dengan ❤️ menggunakan Next.js & Supabase.