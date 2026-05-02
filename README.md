# ⚖️ Nota Timbangan Digital - Gun Project
### Solusi Digital Pencatatan Timbangan & Manajemen Kas Desa
[![Lisensi MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-1.2.0-blue.svg)](https://ragilgunawan.my.id/timbangan)
[![Theme](https://img.shields.io/badge/Theme-Dark%20%26%20Light-orange.svg)](#)

Aplikasi web progresif (PWA) yang dirancang khusus untuk mempermudah pengepul atau pedagang dalam mencatat hasil timbangan secara akurat, cepat, dan profesional. Dilengkapi dengan sistem manajemen keuangan berbasis strategi alokasi pos dana.



---

## 🌟 Fitur Utama

### 1. Pencatatan Nota Pintar
* **Input Multi-Baris:** Tambah baris timbangan tanpa batas dengan satu klik.
* **Kalkulasi Otomatis:** Perhitungan berat total dan total bayar dilakukan secara *real-time* dan presisi.
* **Cari & Filter:** Temukan data pelanggan lama hanya dengan mengetik nama atau tanggal.

### 2. Manajemen Keuangan Pro (Premium)
* **Arus Kas:** Catat pemasukan dan pengeluaran operasional dengan mudah.
* **Strategi Alokasi Pos:** Bagi otomatis saldo Anda ke dalam pos Modal, Profit, dan Dana Darurat berdasarkan persentase (%).
* **Analisis Statistik:** Pantau omzet harian, mingguan, hingga perbandingan antar bulan dalam bentuk chart visual.

### 3. Struk Digital & Personalisasi
* **Download & Share:** Simpan struk dalam format gambar (PNG) atau bagikan langsung ke WhatsApp.
* **Anti-Watermark:** Gunakan identitas profil sendiri pada struk (Khusus Pro).
* **Dark Mode:** Tampilan elegan yang nyaman di mata saat bekerja di malam hari.

---

## 🛠️ Stack Teknologi

| Komponen | Teknologi |
| :--- | :--- |
| **Bahasa Utama** | HTML5, CSS3, JavaScript (ES6+) |
| **Framework CSS** | Custom Modern UI (Glassmorphism & Card Design) |
| **Library Visual** | [html2canvas](https://html2canvas.hertzen.com/) (Generate Struk ke Gambar) |
| **Penyimpanan** | LocalStorage (Offline First) |
| **Ikon** | Lucide Icons & Custom SVG |

---

## 📐 Logika Bisnis (Formula)

Aplikasi ini menggunakan algoritma sederhana namun powerful untuk memastikan tidak ada kesalahan hitung:

$$Total Berat = \sum (Timbangan_{1} + Timbangan_{2} + ... + Timbangan_{n})$$
$$Total Bayar = Total Berat \times Harga/Kg$$
$$Alokasi Pos = Saldo \times \% \text{ Target Pos}$$

---

## 📸 Tampilan UI


> *Preview tampilan antarmuka yang responsif di berbagai perangkat mobile.*

---

## 🚀 Cara Instalasi (Self-Host)

1.  **Clone Repositori**
    ```bash
    git clone [https://github.com/ragilgunawan/timbangan.git](https://github.com/ragilgunawan/timbangan.git)
    ```
2.  **Buka File**
    Cukup buka file `index.html` di browser favorit Anda, atau upload ke hosting (Vercel/GitHub Pages/IDwebhost).
3.  **Selesai!**
    Aplikasi siap digunakan tanpa perlu database eksternal (menggunakan LocalStorage).

---

## 🛡️ Keamanan Data
Data sepenuhnya tersimpan di dalam **Penyimpanan Lokal (LocalStorage)** perangkat Anda. Kami menyarankan untuk melakukan **Backup Data (Download JSON)** secara rutin di menu Pengaturan untuk menghindari kehilangan data saat menghapus histori browser.

---

## ☕ Kontribusi & Support
Dibuat dengan dedikasi oleh **Gunawan Gunawan (Gun Original Project)** di Ogan Ilir.

* **Website:** [ragilgunawan.my.id](https://ragilgunawan.my.id)
* **WhatsApp:** [+62 816-308-466](https://wa.me/62816308466)
* **Portfolio:** [Gun Original Project](https://ragilgunawan.my.id)

---
Copyright © 2026 **Gun Original Project**.
