// types/index.ts

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

export type DiscountType = "none" | "percent" | "nominal";

export interface DiscountInfo {
  type: DiscountType;
  value: number;
}

export type PaymentMethod = "tunai" | "transfer" | "qris";

// ── Tipe baru ─────────────────────────────────────────────────────────────────
export type PaymentStatus = "paid" | "pending";
export type BuyerType     = "walk_in" | "cafe" | "individual";

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  sell_price: number;
  buy_price: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  final_price: number;
  subtotal: number;
  profit: number;
}

export interface Transaction {
  id: string;
  total_amount: number;
  total_discount: number;
  total_profit: number;
  payment_method: PaymentMethod;
  cash_received: number | null;
  // ── Field baru ──────────────────────────────────────────────────────────────
  payment_status: PaymentStatus;
  paid_at: string | null;
  buyer_type: BuyerType;
  buyer_name: string | null;
  // ────────────────────────────────────────────────────────────────────────────
  created_at: string;
  items: TransactionItem[];
}

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

export interface CartItem {
  product_id: string;
  product_name: string;
  sell_price: number;
  buy_price: number;
  quantity: number;
  max_qty: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  final_price: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}