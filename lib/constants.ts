// lib/constants.ts
// Konstanta bersama yang dipakai di beberapa halaman

export const PAYMENT_METHODS: { value: "tunai" | "transfer" | "qris"; label: string; icon: string; color: string }[] = [
  { value: "tunai",    label: "Tunai",    icon: "💵", color: "#057A55" },
  { value: "transfer", label: "Transfer", icon: "🏦", color: "#1C64F2" },
  { value: "qris",     label: "QRIS",     icon: "📱", color: "#7C3AED" },
];

export const BUYER_TYPES: { value: "walk_in" | "cafe" | "individual"; label: string; icon: string; desc: string }[] = [
  { value: "walk_in",    label: "Beli di Toko",    icon: "🏪", desc: "Pembeli datang langsung" },
  { value: "cafe",       label: "Cafe / Reseller", icon: "☕", desc: "Pemesanan dari cafe" },
  { value: "individual", label: "Perorangan",       icon: "👤", desc: "Order personal" },
];

/** Kategori pengeluaran — dipakai di ExpensesClient dan filter laporan */
export const EXPENSE_CATEGORIES = [
  "Operasional",
  "Pembelian Stok",
  "Listrik",
  "Transport",
  "Lainnya",
] as const;

/** Kategori pengeluaran untuk pembelian stok — dipakai di kalkulasi profit */
export const STOCK_PURCHASE_CATEGORY = "Pembelian Stok";

/** Durasi session login (detik) */
export const SESSION_TTL = 60 * 60 * 24 * 7; // 7 hari
