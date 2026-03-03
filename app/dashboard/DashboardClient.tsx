// app/dashboard/DashboardClient.tsx
"use client";

import { useState, useMemo } from "react";
import { Product, Transaction } from "@/types";
import { formatRupiah } from "@/utils/currency";
import { formatDateTime, isExpired } from "@/utils/date";
import { WarningIcon, SearchIcon } from "@/components/ui/Icons";
import Modal from "@/components/ui/Modal";
import { printViaRawBT } from "@/utils/printReceipt";

// ── Payment helpers ────────────────────────────────────────────────────────────
const PAYMENT_INFO: Record<string, { icon: string; label: string; color: string }> = {
  tunai:    { icon: "💵", label: "Tunai",    color: "#057A55" },
  transfer: { icon: "🏦", label: "Transfer", color: "#1C64F2" },
  qris:     { icon: "📱", label: "QRIS",     color: "#7C3AED" },
};

function PaymentBadge({ method }: { method: string }) {
  const p = PAYMENT_INFO[method] ?? PAYMENT_INFO.tunai;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "99px", fontSize: "11px", fontWeight: 700,
      background: `${p.color}18`, color: p.color, border: `1px solid ${p.color}30`,
    }}>
      {p.icon} {p.label}
    </span>
  );
}

function TxDetailModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const cashChange = tx.payment_method === "tunai" && tx.cash_received
    ? tx.cash_received - tx.total_amount
    : null;

  return (
    <Modal
      title="🧾 Detail Transaksi"
      onClose={onClose}
      footer={
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", width: "100%" }}>
              <button className="btn btn-ghost" onClick={() => printViaRawBT(tx)}>🖨️ Cetak Struk</button>
              <button className="btn btn-primary" onClick={onClose}>Tutup</button>
            </div>
          }
    >
      <div className="receipt">
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <div style={{ fontWeight: 700, fontSize: "15px" }}>KHK FROZEN FOOD</div>
          <div style={{ color: "var(--text3)", fontSize: "12px" }}>{formatDateTime(tx.created_at)}</div>
          <div style={{ color: "var(--text3)", fontSize: "11px", marginTop: "2px" }}>ID: {tx.id.slice(0, 8)}...</div>
        </div>
        <div className="receipt-divider" />

        {(tx.items || []).map((item) => (
          <div key={item.id} style={{ marginBottom: "10px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 600 }}>{item.product_name}</span>
              <span style={{ fontWeight: 700 }}>{formatRupiah(item.subtotal)}</span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "2px" }}>
              {item.quantity} pcs × {formatRupiah(item.sell_price)}
              {item.discount_type !== "none" && item.discount_amount > 0 && (
                <span style={{ color: "var(--warning)", marginLeft: "8px" }}>
                  🏷️ Diskon {item.discount_type === "percent"
                    ? `${item.discount_value}%`
                    : formatRupiah(item.discount_value)}
                  {" → "}{formatRupiah(item.final_price)}/pcs
                </span>
              )}
            </div>
          </div>
        ))}

        <div className="receipt-divider" />

        {tx.total_discount > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--warning)", marginBottom: "6px", fontSize: "13px" }}>
            <span>Total Diskon</span>
            <span style={{ fontWeight: 700 }}>− {formatRupiah(tx.total_discount)}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "16px", marginBottom: "8px" }}>
          <span>TOTAL BAYAR</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(tx.total_amount)}</span>
        </div>

        <div className="receipt-divider" />

        <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text2)" }}>Metode Pembayaran</span>
            <PaymentBadge method={tx.payment_method} />
          </div>
          {tx.payment_method === "tunai" && tx.cash_received && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text2)" }}>Uang Diterima</span>
                <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatRupiah(tx.cash_received)}
                </span>
              </div>
              {cashChange !== null && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text2)" }}>Kembalian</span>
                  <span style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "var(--success)" }}>
                    {formatRupiah(Math.abs(cashChange))}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="receipt-divider" />
        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success)", fontSize: "13px" }}>
          <span>Profit Transaksi</span>
          <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(tx.total_profit)}</span>
        </div>
      </div>
    </Modal>
  );
}

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
  const [viewTx, setViewTx]                 = useState<Transaction | null>(null);
  const [stockSearch, setStockSearch]       = useState("");
  const [stockCatFilter, setStockCatFilter] = useState("Semua");

  const expiredProds = lowStockProducts.filter((p) => isExpired(p.expired_date));

  const stockCategories = useMemo(
    () => ["Semua", ...Array.from(new Set(lowStockProducts.map((p) => p.category).filter(Boolean)))],
    [lowStockProducts]
  );

  const filteredLowStock = useMemo(
    () => lowStockProducts.filter((p) => {
      const mc = stockCatFilter === "Semua" || p.category === stockCatFilter;
      const ms = p.name.toLowerCase().includes(stockSearch.toLowerCase());
      return mc && ms;
    }),
    [lowStockProducts, stockSearch, stockCatFilter]
  );

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
              <>
                {/* Search + category filter */}
                <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                  <div className="search-wrap" style={{ marginBottom: stockCategories.length > 2 ? "8px" : "0" }}>
                    <span className="search-icon"><SearchIcon size={15} /></span>
                    <input
                      className="form-input"
                      placeholder="Cari produk..."
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      style={{ fontSize: "13px", padding: "7px 10px 7px 34px" }}
                    />
                  </div>
                  {stockCategories.length > 2 && (
                    <div className="filter-bar" style={{ gap: "6px", marginBottom: 0 }}>
                      {stockCategories.map((c) => (
                        <button
                          key={c}
                          className={`tag ${stockCatFilter === c ? "active" : ""}`}
                          style={{ fontSize: "11px", padding: "3px 10px" }}
                          onClick={() => setStockCatFilter(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="table-wrap dashboard-card-scroll">
                  <table>
                    <thead><tr><th>Produk</th><th>Stok</th><th>Min</th></tr></thead>
                    <tbody>
                      {filteredLowStock.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ textAlign: "center", padding: "20px", color: "var(--text3)", fontSize: "13px" }}>
                            Tidak ditemukan
                          </td>
                        </tr>
                      ) : filteredLowStock.map((p) => (
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
              </>
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
              <div className="table-wrap dashboard-card-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Bayar</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((t) => (
                      <tr key={t.id}>
                        <td className="text-muted" style={{ fontSize: "12px" }}>{formatDateTime(t.created_at)}</td>
                        <td><PaymentBadge method={t.payment_method} /></td>
                        <td className="td-mono" style={{ fontWeight: 700 }}>{formatRupiah(t.total_amount)}</td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => setViewTx(t)}>Detail</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewTx && <TxDetailModal tx={viewTx} onClose={() => setViewTx(null)} />}
    </div>
  );
}