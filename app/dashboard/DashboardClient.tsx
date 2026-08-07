// app/dashboard/DashboardClient.tsx
"use client";

import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
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
    today_discount: number;
    today_expenses: number;
    today_profit: number;
    today_tx_count: number;
    today_new_hutang_count: number;
    today_new_hutang_amount: number;
    month_sales: number;
    month_profit: number;
    month_profit_after_stock: number;
    month_tx_count: number;
    month_opex: number;
    month_stock_purchase: number;
  };
  lowStockProducts: Product[];
  recentTransactions: Transaction[];
  todayHutang: Transaction[];
  salesTrend: { date: string; total: number; count: number }[];
}

export default function DashboardClient({ stats, lowStockProducts, recentTransactions, todayHutang, salesTrend }: DashboardClientProps) {
  const [viewTx, setViewTx]                 = useState<Transaction | null>(null);
  const [stockSearch, setStockSearch]       = useState("");
  const [stockCatFilter, setStockCatFilter] = useState("Semua");
  const [showRingkasan, setShowRingkasan]   = useState(false);
  const [trendRange, setTrendRange]         = useState<7 | 30>(30);

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
      {/* Ringkasan Hari Ini Modal */}
      {showRingkasan && (
        <Modal title="📋 Ringkasan Hari Ini" onClose={() => setShowRingkasan(false)}
          footer={<button className="btn btn-primary" onClick={() => setShowRingkasan(false)}>Tutup</button>}>
          <div style={{ fontSize: "13px", color: "var(--text3)", marginBottom: "16px", textAlign: "center" }}>
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </div>
          {/* Summary rows */}
          {[
            { label: "Total Transaksi",    value: `${stats.today_tx_count} transaksi`,          color: "var(--text)" },
            { label: "Total Penjualan",    value: formatRupiah(stats.today_sales),              color: "var(--primary)" },
            { label: "Total Diskon",       value: formatRupiah(stats.today_discount),            color: "var(--warning)" },
            { label: "Total Pengeluaran",  value: formatRupiah(stats.today_expenses),            color: "var(--danger)" },
            { label: "Profit Bersih",      value: formatRupiah(stats.today_profit),              color: stats.today_profit >= 0 ? "var(--success)" : "var(--danger)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ color: "var(--text2)", fontSize: "14px" }}>{label}</span>
              <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color, fontSize: "14px" }}>{value}</span>
            </div>
          ))}
          {/* Hutang baru hari ini */}
          {stats.today_new_hutang_count > 0 && (
            <div style={{ marginTop: "16px" }}>
              <div style={{
                padding: "10px 14px", borderRadius: "var(--radius-sm)",
                background: "#FEF3C7", border: "1px solid #FCD34D",
                marginBottom: "8px",
              }}>
                <div style={{ fontWeight: 700, color: "#92400E", fontSize: "13px", marginBottom: "4px" }}>
                  🕐 Hutang Baru Hari Ini: {stats.today_new_hutang_count} transaksi ({formatRupiah(stats.today_new_hutang_amount)})
                </div>
              </div>
              {todayHutang.map((t) => (
                <div key={t.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "7px 10px", borderRadius: "var(--radius-sm)",
                  background: "var(--surface2)", marginBottom: "4px", fontSize: "13px",
                }}>
                  <span style={{ fontWeight: 600 }}>{t.buyer_name || "Pembeli Langsung"}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--warning)", fontWeight: 700 }}>
                    {formatRupiah(t.total_amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "13px", color: "var(--text3)", fontWeight: 600 }}>Hari Ini</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowRingkasan(true)}>
          📋 Ringkasan Hari Ini
        </button>
      </div>
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
          <div className="stat-label">Profit Operasional</div>
          <div className="stat-value">{formatRupiah(stats.month_profit)}</div>
          <div className="stat-sub">Belum termasuk pembelian stok</div>
        </div>
      </div>

      {/* Info pembelian stok bulan ini */}
      {stats.month_stock_purchase > 0 && (
        <div style={{
          background: "var(--surface2)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)", padding: "10px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: "20px", fontSize: "13px",
        }}>
          <span style={{ color: "var(--text2)" }}>
            📦 Modal Pembelian Stok bulan ini: <strong style={{ color: "var(--text)" }}>{formatRupiah(stats.month_stock_purchase)}</strong>
          </span>
          <span style={{ color: "var(--text2)" }}>
            Profit setelah modal stok: <strong style={{ color: stats.month_profit_after_stock >= 0 ? "var(--success)" : "var(--danger)" }}>
              {formatRupiah(stats.month_profit_after_stock)}
            </strong>
          </span>
        </div>
      )}

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
                      style={{ fontSize: "13px", padding: "7px 10px 7px 34px", paddingRight: stockSearch ? "32px" : undefined }}
                    />
                    {stockSearch && (
                      <button onClick={() => setStockSearch("")} style={{
                        position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "16px", lineHeight: 1,
                      }}>✕</button>
                    )}
                  </div>
                  {stockCategories.length > 2 && (
                    <div className="filter-bar" style={{ gap: "6px", marginBottom: 0, flexWrap: "wrap" }}>
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
                      <th className="col-hide-mobile">Pembeli</th>
                      <th className="col-hide-mobile">Bayar</th>
                      <th>Status</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((t) => (
                      <tr key={t.id} style={{ background: t.payment_status === "pending" ? "#FFFBEB" : undefined }}>
                        <td className="text-muted" style={{ fontSize: "12px" }}>{formatDateTime(t.created_at)}</td>
                        <td className="col-hide-mobile" style={{ fontSize: "12px" }}>
                          {t.buyer_name
                            ? <span style={{ fontWeight: 600 }}>{t.buyer_name}</span>
                            : <span style={{ color: "var(--text3)" }}>—</span>}
                        </td>
                        <td className="col-hide-mobile"><PaymentBadge method={t.payment_method} /></td>
                        <td>
                          {t.payment_status === "pending"
                            ? <span className="badge badge-warning" style={{ fontSize: "10px" }}>🕐 Hutang</span>
                            : <span className="badge badge-success" style={{ fontSize: "10px" }}>✅ Lunas</span>}
                        </td>
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

      {/* Grafik Tren Penjualan */}
      <div className="card" style={{ marginTop: "20px" }}>
        <div className="card-header">
          <div className="card-title">📈 Tren Penjualan</div>
          <div style={{ display: "flex", gap: "6px" }}>
            {([7, 30] as const).map((d) => (
              <button key={d}
                className={`tag${trendRange === d ? " active" : ""}`}
                style={{ fontSize: "12px", padding: "4px 12px" }}
                onClick={() => setTrendRange(d)}>
                {d} Hari
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 8px 8px" }}>
          {salesTrend.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text3)", fontSize: "13px" }}>
              Belum ada data penjualan
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={salesTrend.slice(-(trendRange))}
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "var(--text3)" }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v + "T00:00:00");
                    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
                  }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--text3)" }}
                  tickFormatter={(v: number) => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : String(v)}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  formatter={(value: number) => formatRupiah(value)}
                  labelFormatter={(label: string) => {
                    const d = new Date(label + "T00:00:00");
                    return d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "long" });
                  }}
                  contentStyle={{
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: "8px", fontSize: "12px",
                  }}
                />
                <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}