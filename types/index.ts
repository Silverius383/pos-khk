// types/index.ts

// ─── Product ──────────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  name: string;
  category: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  expired_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductFormData {
  name: string;
  category: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  min_stock: number;
  expired_date: string;
}

// ─── Discount ─────────────────────────────────────────────────────────────────
export type DiscountType = "none" | "percent" | "nominal";

export interface DiscountInfo {
  type: DiscountType;
  value: number; // angka diskon: % atau Rp
}

// ─── Transaction ─────────────────────────────────────────────────────────────
export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  sell_price: number;      // harga normal
  buy_price: number;
  discount_type: DiscountType;
  discount_value: number;  // angka diskon (% atau Rp)
  discount_amount: number; // nilai diskon dalam Rp
  final_price: number;     // harga setelah diskon per unit
  subtotal: number;        // final_price * qty
  profit: number;
}

export interface Transaction {
  id: string;
  total_amount: number;    // total setelah diskon
  total_discount: number;  // total nilai diskon
  total_profit: number;
  created_at: string;
  items: TransactionItem[];
}

// ─── Expense ─────────────────────────────────────────────────────────────────
export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  created_at: string;
}

export interface ExpenseFormData {
  name: string;
  amount: number;
  category: string;
}

// ─── Cart ─────────────────────────────────────────────────────────────────────
export interface CartItem {
  product_id: string;
  product_name: string;
  sell_price: number;      // harga normal
  buy_price: number;
  quantity: number;
  max_qty: number;
  discount_type: DiscountType;
  discount_value: number;  // angka diskon (% atau Rp)
  discount_amount: number; // nilai diskon per unit dalam Rp
  final_price: number;     // harga setelah diskon per unit
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
