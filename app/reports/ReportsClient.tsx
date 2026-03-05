// app/reports/ReportsClient.tsx
"use client";

import { useState, useMemo } from "react";
import { Transaction, Expense } from "@/types";
import { formatRupiah } from "@/utils/currency";
import { formatDateTime } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import { printViaRawBT } from "@/utils/printReceipt";
import { DownloadIcon } from "@/components/ui/Icons";

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

interface ReportsClientProps {
  initialTransactions: Transaction[];
  initialExpenses: Expense[];
  defaultFrom: string;
  defaultTo: string;
}

export default function ReportsClient({
  initialTransactions, initialExpenses, defaultFrom, defaultTo,
}: ReportsClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [expenses, setExpenses]         = useState<Expense[]>(initialExpenses);
  const [dateFrom, setDateFrom]         = useState(defaultFrom);
  const [dateTo, setDateTo]             = useState(defaultTo);
  const [loading, setLoading]           = useState(false);
  const [viewTx, setViewTx]             = useState<Transaction | null>(null);

  const loadData = async (from: string, to: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/reports?from=${from}&to=${to}`);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data.transactions);
        setExpenses(data.data.expenses);
      }
    } catch {
      console.error("Gagal memuat laporan");
    } finally {
      setLoading(false);
    }
  };

  const totalSales    = useMemo(() => transactions.reduce((s, t) => s + t.total_amount, 0), [transactions]);
  const totalDiscount = useMemo(() => transactions.reduce((s, t) => s + t.total_discount, 0), [transactions]);
  const grossProfit   = useMemo(() => transactions.reduce((s, t) => s + t.total_profit, 0), [transactions]);
  const STOCK_CAT = "Pembelian Stok";
  const totalOpex          = useMemo(() => expenses.filter((e) => e.category !== STOCK_CAT).reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalStockPurchase = useMemo(() => expenses.filter((e) => e.category === STOCK_CAT).reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalExpenses      = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const netProfit          = grossProfit - totalOpex;           // profit operasional
  const netProfitAfterStock = grossProfit - totalExpenses;      // profit setelah modal stok

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const t of transactions) {
      const m = t.payment_method || "tunai";
      if (!map[m]) map[m] = { count: 0, total: 0 };
      map[m].count++;
      map[m].total += t.total_amount;
    }
    return map;
  }, [transactions]);

  return (
    <div>
      {/* Date filter */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="card-body">
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: "140px" }}>
              <label className="form-label">Dari</label>
              <input className="form-input" type="date" value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1, minWidth: "140px" }}>
              <label className="form-label">Sampai</label>
              <input className="form-input" type="date" value={dateTo}
                onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => loadData(dateFrom, dateTo)} disabled={loading}>
              {loading ? "⏳ Memuat..." : "🔍 Cari"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: "20px" }}>
        <div className="stat-card blue">
          <div className="stat-label">Total Penjualan</div>
          <div className="stat-value">{formatRupiah(totalSales)}</div>
          <div className="stat-sub">{transactions.length} transaksi</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Total Diskon</div>
          <div className="stat-value">{formatRupiah(totalDiscount)}</div>
          <div className="stat-sub">Dari {transactions.filter(t => t.total_discount > 0).length} transaksi</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Gross Profit</div>
          <div className="stat-value">{formatRupiah(grossProfit)}</div>
          <div className="stat-sub">Sebelum biaya operasional</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Profit Operasional</div>
          <div className="stat-value" style={{ color: netProfit >= 0 ? undefined : "var(--danger)" }}>
            {formatRupiah(netProfit)}
          </div>
          <div className="stat-sub">
            {totalOpex > 0 ? `Setelah Rp${totalOpex.toLocaleString("id-ID")} opex` : "Belum ada biaya operasional"}
          </div>
        </div>
      </div>

      {/* Stock purchase info */}
      {totalStockPurchase > 0 && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="card-body" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text2)", marginBottom: "4px" }}>📦 Modal Pembelian Stok</div>
                <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--danger)", fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatRupiah(totalStockPurchase)}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "2px" }}>Dicatat sebagai aset, bukan pengurang profit</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text2)", marginBottom: "4px" }}>💰 Profit setelah Modal Stok</div>
                <div style={{ fontWeight: 700, fontSize: "18px", fontFamily: "'JetBrains Mono', monospace",
                  color: netProfitAfterStock >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {formatRupiah(netProfitAfterStock)}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "2px" }}>Jika modal stok dianggap pengeluaran</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment breakdown */}
      {transactions.length > 0 && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="card-header"><div className="card-title">💳 Rekap Metode Pembayaran</div></div>
          <div className="card-body" style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            {Object.entries(paymentBreakdown).map(([method, data]) => {
              const p = PAYMENT_INFO[method] ?? PAYMENT_INFO.tunai;
              return (
                <div key={method} style={{
                  flex: 1, minWidth: "140px", padding: "14px 16px",
                  borderRadius: "var(--radius-sm)", background: `${p.color}0f`,
                  border: `1px solid ${p.color}30`,
                }}>
                  <div style={{ fontSize: "20px", marginBottom: "4px" }}>{p.icon}</div>
                  <div style={{ fontWeight: 700, color: p.color, fontSize: "15px" }}>{p.label}</div>
                  <div style={{ fontWeight: 800, fontSize: "17px", fontFamily: "'JetBrains Mono', monospace", marginTop: "4px" }}>
                    {formatRupiah(data.total)}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text2)", marginTop: "2px" }}>
                    {data.count} transaksi
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions table */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <div className="card-header">
          <div className="card-title">📋 Riwayat Transaksi ({transactions.length})</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal & Waktu</th>
                <th>Item</th>
                <th>Pembayaran</th>
                <th>Diskon</th>
                <th>Total</th>
                <th>Profit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text3)" }}>
                    Tidak ada transaksi dalam periode ini
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="text-muted" style={{ fontSize: "13px" }}>{formatDateTime(tx.created_at)}</td>
                  <td><span className="badge badge-gray">{(tx.items || []).length} item</span></td>
                  <td><PaymentBadge method={tx.payment_method} /></td>
                  <td className="td-mono">
                    {tx.total_discount > 0
                      ? <span style={{ color: "var(--warning)" }}>− {formatRupiah(tx.total_discount)}</span>
                      : <span style={{ color: "var(--text3)" }}>—</span>}
                  </td>
                  <td className="td-mono" style={{ fontWeight: 700 }}>{formatRupiah(tx.total_amount)}</td>
                  <td className="td-mono text-success">{formatRupiah(tx.total_profit)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setViewTx(tx)}>Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses table */}
      {expenses.length > 0 && (
        <div className="card">
          <div className="card-header"><div className="card-title">💸 Pengeluaran ({expenses.length})</div></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Tanggal</th><th>Keterangan</th><th>Kategori</th><th>Jumlah</th></tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="text-muted" style={{ fontSize: "13px" }}>{formatDateTime(e.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td><span className="badge badge-gray">{e.category}</span></td>
                    <td className="td-mono text-danger">{formatRupiah(e.amount)}</td>
                  </tr>
                ))}
                <tr style={{ background: "var(--surface2)", fontWeight: 700 }}>
                  <td colSpan={3}>TOTAL PENGELUARAN</td>
                  <td className="td-mono text-danger">{formatRupiah(totalExpenses)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {viewTx && (
        <Modal
          title="Detail Transaksi"
          onClose={() => setViewTx(null)}
          footer={
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", width: "100%" }}>
              <button className="btn btn-ghost" onClick={() => printViaRawBT(viewTx)}>🖨️ Cetak Struk</button>
              <button className="btn btn-primary" onClick={() => setViewTx(null)}>Tutup</button>
            </div>
          }
        >
          <div className="receipt">
            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>KHK FROZEN FOOD</div>
              <div style={{ color: "var(--text3)", fontSize: "12px" }}>{formatDateTime(viewTx.created_at)}</div>
              <div style={{ color: "var(--text3)", fontSize: "11px", marginTop: "2px" }}>ID: {viewTx.id.slice(0, 8)}...</div>
            </div>
            <div className="receipt-divider" />

            {/* Items */}
            {(viewTx.items || []).map((item) => (
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

            {/* Totals */}
            {viewTx.total_discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--warning)", marginBottom: "6px", fontSize: "13px" }}>
                <span>Total Diskon</span>
                <span style={{ fontWeight: 700 }}>− {formatRupiah(viewTx.total_discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "16px", marginBottom: "8px" }}>
              <span>TOTAL BAYAR</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(viewTx.total_amount)}</span>
            </div>

            <div className="receipt-divider" />

            {/* Payment section */}
            <div style={{ fontSize: "13px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text2)" }}>Metode Pembayaran</span>
                <PaymentBadge method={viewTx.payment_method} />
              </div>

              {viewTx.payment_method === "tunai" && viewTx.cash_received && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text2)" }}>Uang Diterima</span>
                    <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                      {formatRupiah(viewTx.cash_received)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text2)" }}>Kembalian</span>
                    <span style={{
                      fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--success)",
                    }}>
                      {formatRupiah(viewTx.cash_received - viewTx.total_amount)}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="receipt-divider" />
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success)", fontSize: "13px" }}>
              <span>Profit Transaksi</span>
              <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{formatRupiah(viewTx.total_profit)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}