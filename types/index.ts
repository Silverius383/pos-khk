// types/index.ts
// Definisi tipe data seluruh aplikasi

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

// ─── Transaction ─────────────────────────────────────────────────────────────
export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  sell_price: number;
  buy_price: number;
  profit: number;
}

export interface Transaction {
  id: string;
  total_amount: number;
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
  sell_price: number;
  buy_price: number;
  quantity: number;
  max_qty: number;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
export interface DashboardStats {
  today_sales: number;
  today_profit: number;
  today_tx_count: number;
  month_sales: number;
  month_profit: number;
  month_tx_count: number;
  low_stock_products: Product[];
  recent_transactions: Transaction[];
}

// ─── Report ──────────────────────────────────────────────────────────────────
export interface ReportData {
  total_sales: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
  tx_count: number;
  top_products: { name: string; qty: number; revenue: number }[];
  transactions: Transaction[];
}

// ─── API Response ─────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
