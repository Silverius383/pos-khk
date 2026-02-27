// app/dashboard/DashboardClient.tsx
"use client";

import { Product, Transaction } from "@/types";
import { formatRupiah } from "@/utils/currency";
import { formatDateTime, isExpired } from "@/utils/date";
import { WarningIcon } from "@/components/ui/Icons";

interface DashboardClientProps {
  stats: {
    today_sales: number;
    today_profit: number;
    today_tx_count: number;
    month_sales: number;
    month_profit: number;
    month_tx_count: number;
  };
  lowStockProducts: Product[];
  recentTransactions: Transaction[];
}

export default function DashboardClient({ stats, lowStockProducts, recentTransactions }: DashboardClientProps) {
  const expiredProds = lowStockProducts.filter((p) => isExpired(p.expired_date));

  return (
    <div>
      {/* Alerts */}
      {(expiredProds.length > 0 || lowStockProducts.length > 0) && (
        <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {expiredProds.length > 0 && (
            <div className="alert alert-danger">
              <WarningIcon />
              <strong>{expiredProds.length} produk sudah expired!</strong>&nbsp;Segera periksa stok.
            </div>
          )}
          {lowStockProducts.length > 0 && (
            <div className="alert alert-warning">
              <WarningIcon />
              <strong>{lowStockProducts.length} produk hampir habis stok.</strong>&nbsp;Segera restock.
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div className="stat-label">Penjualan Hari Ini</div>
          <div className="stat-value">{formatRupiah(stats.today_sales)}</div>
          <div className="stat-sub">{stats.today_tx_count} transaksi</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Profit Hari Ini</div>
          <div className="stat-value">{formatRupiah(stats.today_profit)}</div>
          <div className="stat-sub">Setelah biaya operasional</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Penjualan Bulan Ini</div>
          <div className="stat-value">{formatRupiah(stats.month_sales)}</div>
          <div className="stat-sub">{stats.month_tx_count} transaksi</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Profit Bulan Ini</div>
          <div className="stat-value">{formatRupiah(stats.month_profit)}</div>
          <div className="stat-sub">Setelah biaya operasional</div>
        </div>
      </div>

      <div className="grid-2">
        {/* Low Stock */}
        <div className="card">
          <div className="card-header"><div className="card-title">⚠️ Stok Hampir Habis</div></div>
          <div style={{ padding: 0 }}>
            {lowStockProducts.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text3)" }}>Semua stok aman ✅</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Produk</th><th>Stok</th><th>Min</th></tr></thead>
                  <tbody>
                    {lowStockProducts.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>
                          {p.name}
                          {isExpired(p.expired_date) && (
                            <span className="badge badge-danger" style={{ marginLeft: "8px", fontSize: "10px" }}>Expired</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${p.stock === 0 ? "badge-danger" : "badge-warning"}`}>{p.stock}</span>
                        </td>
                        <td className="text-muted">{p.min_stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <div className="card-header"><div className="card-title">🧾 Transaksi Terakhir</div></div>
          <div style={{ padding: 0 }}>
            {recentTransactions.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text3)" }}>Belum ada transaksi</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Waktu</th><th>Diskon</th><th>Total</th><th>Profit</th></tr></thead>
                  <tbody>
                    {recentTransactions.map((t) => (
                      <tr key={t.id}>
                        <td className="text-muted" style={{ fontSize: "12px" }}>{formatDateTime(t.created_at)}</td>
                        <td className="td-mono" style={{ color: t.total_discount > 0 ? "var(--warning)" : "var(--text3)", fontSize: "12px" }}>
                          {t.total_discount > 0 ? `−${formatRupiah(t.total_discount)}` : "—"}
                        </td>
                        <td className="td-mono">{formatRupiah(t.total_amount)}</td>
                        <td className="td-mono text-success">{formatRupiah(t.total_profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
