# Example for ENV in Backend

Server
PORT=5000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173

Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smartpoultry_peternakan

Auth / Security
JWT_SECRET=super_secret_jwt_key
JWT_EXPIRES_IN=1d
BCRYPT_SALT_ROUNDS=10

Uploads
UPLOAD_DIR=uploads

(Opsional) Email / Cloud services, isi jika diperlukan
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=

# Example for ENV in Frontend
VITE_API_BASE_URL=http://localhost:5000/api

# SmartPoultry Blockchain - Peternakan Node

Proyek ini adalah sistem manajemen peternakan ayam berbasis web dengan integrasi konsep blockchain di sisi aplikasi (application-level blockchain) untuk menjaga integritas data dan _traceability_ (keterlacakan) pasokan ayam dari peternakan menuju ke _processor_ (pemotongan).

File ini mendokumentasikan Environment Variables (ENV) dan penerapan Skema Blockchain pada Node Peternakan.

---

## 🔐 Konfigurasi Environment Variables (ENV)

Sistem ini terdiri dari dua bagian utama: **Backend** (Node.js/Express) dan **Frontend** (React/Vite). Masing-masing membutuhkan konfigurasi `.env`.

### 1. Backend ENV (`backend/.env`)

File ini bertanggung jawab untuk konfigurasi server, koneksi database MySQL, dan kapabilitas autentikasi.

```env
# Server Configuration
PORT=5000                              # Port jalannya server backend
NODE_ENV=development                   # Mode environment (development/production)
CLIENT_ORIGIN=http://localhost:5173    # Alamat origin frontend untuk aturan CORS

# Database Configuration (MySQL)
DB_HOST=localhost                      # Host database (biasanya localhost)
DB_PORT=3306                           # Port database MySQL standar
DB_USER=root                           # Username database
DB_PASSWORD=                           # Password database
DB_NAME=smartpoultry_peternakan        # Nama database peternakan

# Authentication / Security
JWT_SECRET=super_secret_jwt_key        # Secret key untuk signing JSON Web Token
JWT_EXPIRES_IN=1d                      # Masa berlaku token (contoh: 1 day)
BCRYPT_SALT_ROUNDS=10                  # Rounds untuk enkripsi password bcrypt

# File Uploads
UPLOAD_DIR=uploads                     # Direktori penyimpanan file hasil upload pengguna

# (Opsional) Email / Cloud Services
SMTP_HOST=                             # Host SMTP (contoh: smtp.gmail.com)
SMTP_PORT=                             # Port SMTP
SMTP_USER=                             # Username email SMTP
SMTP_PASS=                             # Password email aplikasi SMTP
```

### 2. Frontend ENV (`frontend/.env`)

Berisi variabel yang terekspos ke _client-side_ React melalui bundler Vite.

```env
# Konfigurasi Koneksi ke Backend API
VITE_API_BASE_URL=http://localhost:5000/api  # Alamat rute utama untuk API backend
```

---

## ⛓️ Skema Blockchain (Application-Level)

Sistem ini tidak menggunakan blockchain publik seperti Ethereum, melainkan membangun _Immutable Ledger_ tersendiri di atas database relasional (MySQL). Integritas dijamin melalui _cryptographic hashing_ (SHA-256) menggunakan pola berantai (_chaining_) antar data siklus (Cycle).

Satu "Chain" mewakili satu **Siklus pemeliharaan ayam** di sebuah Kandang (diidentifikasi melalui `KodeCycle`).

### 1. Struktur Entitas Database Blockchain

Ada dua tabel utama yang berperan sebagai infrastruktur blockchain di database:

#### A. Tabel `BlockchainIdentity`
Berfungsi melacak status setiap Chain (Cycle) secara keseluruhan.
- `KodeIdentity`: ID unik identitas blockchain (Format: `CHAIN-XXXXXX`)
- `KodePeternakan`: Peternakan yang memiliki chain ini
- `KodeCycle`: ID referensi siklus peternakan
- `GenesisHash`: Hash blok pertama (Blok ke-0)
- `LatestBlockHash`: Hash blok terbaru saat ini di rantai tersebut
- `TotalBlocks`: Total blok yang sudah di-generate pada cycle ini
- `StatusChain`: Status (`ACTIVE`, `COMPLETED`, `FAILED`, `TRANSFERRED`)

#### B. Tabel `ledger_peternakan`
Berfungsi menyimpan rekam jejak setiap _event_ bisnis yang tak dapat diubah (_Immutable Blocks_).
- `KodeBlock`: ID urutan blok (Format: `BLK-CycleID-Index`)
- `KodeCycle`: Relasi ke cycle
- `TipeBlock`: Jenis event (Lihat daftar event di bawah)
- `BlockIndex`: Urutan blok dalam chain (dimulai dari `0`)
- `PreviousHash`: Hash dari blok sebelumnya (Blok `0` menggunakan string kosong/0 sebanyak 64x)
- `CurrentHash`: Hash SHA-256 hasil penggabungan `(Index + PreviousHash + TipeBlock + Payload JSON + Timestamp + Nonce)`
- `DataPayload`: Payload data bisnis (berformat JSON String) penyerta event terkait.
- `StatusBlock`: Status validasi blok (selalu `VALIDATED`)

### 2. Tipe Blok (Event Types Timeline)

Sistem akan otomatis me-generate blok (menambahkan record ke `ledger_peternakan` & meng-update `BlockchainIdentity`) pada setiap pergerakan alur bisnis:

| # | Tipe Block | Pemicu (Event Payload) |
|---|---|---|
| 0 | **`GENESIS`** | Tercipta saat siklus (`Cycle`) baru dibuat. (Menyimpan durasi dan info awal). |
| 1 | **`KANDANG_AKTIF`** | Tercipta saat status kandang diset menjadi aktif & dimulainya siklus. |
| 2 | **`DOC_MASUK`** | Tercipta saat ada penerimaan "Day-Old-Chick" (DOC) masuk ke kandang. Menyimpan aslinya `Jumlah Diterima`, `DOA` (mati awal), dan `Jumlah Ditempatkan`. |
| 3 | **`PEMAKAIAN_OBAT`** | Tercipta saat ada penggunaan perlengkapan Obat/Vaksin. |
| 4 | **`LAPORAN_MORTALITY`** | Tercipta saat mencatat kematian ayam / reject. Merespon pembaruan jumlah populasi & mengkalkulasi ulang `Mortality Rate`. |
| 5 | **`PANEN`** <br/>/ **`PANEN_DINI`** / <br/>**`GAGAL_PANEN`** | Tercipta saat fitur "Panen" dijalankan. Tipe event disesuaikan otomatis dengan durasi aktual masa panen dan rasio mortalitas (misal gagal panen di atas 10% kasus tanpa obat). |
| 6 | **`TRANSFER_PROCESSOR`**| Tercipta saat dicetaknya Nota Pengiriman / Surat Jalan yang mengirimkan ayam menuju sistem Node Processor pemotongan berikutnya. |

### 3. Validasi & Traceability
Sistem memastikan keabsahan data (*Chain Integrity*) dengan memvalidasi rantai data secara berurutan `PreviousHash(n) === CurrentHash(n-1)`. Setiap perubahan database secara langsung (bypass aplikasi) akan menyebabkan rantai rusak sehingga terdeteksi adanya anomali sistem. Fitur Traceability memberikan visual kronologi peternakan secara transparan berdasarkan _hash valid_ tersebut.
