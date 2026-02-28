# 🧊 POS Toko Frozen Food

Aplikasi Point of Sales untuk toko frozen food rumahan.
Stack: **Next.js 16**, **Prisma**, **PostgreSQL**, **TypeScript**

---

## ⚡ Setup Cepat (5 Langkah)

### Langkah 1 — Install dependencies
```bash
cd pos-frozen-food
npm install
```

### Langkah 2 — Buat database (pilih salah satu)

**Pilihan A: Neon (Gratis & Online — Direkomendasikan)**
1. Daftar di https://neon.tech (gratis)
2. Klik "New Project" → beri nama bebas
3. Klik "Connect" → copy Connection String
4. Contoh: `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

**Pilihan B: PostgreSQL Lokal (Offline)**
1. Download & install: https://www.postgresql.org/download/windows/
2. Buka pgAdmin → buat database baru bernama `pos_frozen_food`
3. Connection string: `postgresql://postgres:PASSWORD_ANDA@localhost:5432/pos_frozen_food`

### Langkah 3 — Buat file .env.local
```bash
# Di folder pos-frozen-food, buat file baru: .env.local
# Isi dengan:

DATABASE_URL="postgresql://..."   # ← ganti dengan connection string Anda
SESSION_SECRET="string-acak-bebas-minimal-32-karakter-contoh-123456789"
ADMIN_PASSWORD="admin123"
```

### Langkah 4 — Buat tabel database
```bash
npm run db:push
```

### Langkah 5 — Jalankan!
```bash
npm run dev
```

Buka: **http://localhost:3000**
Login dengan password: `admin123` (atau sesuai ADMIN_PASSWORD di .env.local)

---

## 🔧 Troubleshooting

| Error | Solusi |
|-------|--------|
| `Can't reach database server at host:5432` | DATABASE_URL di .env.local belum diisi / salah |
| `The "middleware" file is deprecated` | Normal di Next.js 16, gunakan proxy.ts (sudah included) |
| Login tidak bisa masuk | Cek SESSION_SECRET sudah diisi di .env.local |
| `Table does not exist` | Jalankan `npm run db:push` |

---

## 📁 Struktur File Penting

```
pos-frozen-food/
├── .env.local          ← WAJIB dibuat manual (tidak ada di ZIP)
├── .env.example        ← Template .env.local
├── proxy.ts            ← Auth middleware (Next.js 16)
├── prisma/
│   └── schema.prisma   ← Definisi tabel database
├── app/
│   ├── dashboard/      ← Halaman dashboard
│   ├── products/       ← Manajemen produk
│   ├── transactions/   ← Kasir / POS
│   ├── expenses/       ← Pengeluaran
│   └── reports/        ← Laporan
└── lib/
    ├── prisma.ts       ← Koneksi database
    └── auth.ts         ← Fungsi login/session
```

---

## 🌐 Deploy ke Vercel

1. Push ke GitHub
2. Import di vercel.com
3. Tambah Environment Variables: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`
4. Deploy → selesai! 
