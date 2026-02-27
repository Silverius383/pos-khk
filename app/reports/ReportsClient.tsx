// app/reports/ReportsClient.tsx
"use client";

import { useState, useMemo } from "react";
import { Transaction, Expense } from "@/types";
import { formatRupiah } from "@/utils/currency";
import { formatDateTime } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import { DownloadIcon } from "@/components/ui/Icons";

interface ReportsClientProps {
  initialTransactions: Transaction[];
  initialExpenses: Expense[];
  defaultFrom: string;
  defaultTo: string;
}

export default function ReportsClient({
  initialTransactions,
  initialExpenses,
  defaultFrom,
  defaultTo,
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

  // Stats
  const totalSales    = useMemo(() => transactions.reduce((s, t) => s + t.total_amount, 0), [transactions]);
  const totalDiscount = useMemo(() => transactions.reduce((s, t) => s + t.total_discount, 0), [transactions]);
  const grossProfit   = useMemo(() => transactions.reduce((s, t) => s + t.total_profit, 0), [transactions]);
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const netProfit     = grossProfit - totalExpenses;
  // HPP = total harga beli semua produk yang terjual
  const hpp           = useMemo(() =>
    transactions.reduce((s, t) =>
      s + t.items.reduce((si, i) => si + i.buy_price * i.quantity, 0), 0
    ), [transactions]);
  // Revenue sebelum diskon
  const revenueBeforeDiscount = totalSales + totalDiscount;

  // Top products
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number; discount: number }> = {};
    transactions.forEach((tx) => {
      (tx.items || []).forEach((item) => {
        if (!map[item.product_name]) {
          map[item.product_name] = { name: item.product_name, qty: 0, revenue: 0, discount: 0 };
        }
        map[item.product_name].qty      += item.quantity;
        map[item.product_name].revenue  += item.subtotal;
        map[item.product_name].discount += item.discount_amount;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [transactions]);

  const exportCSV = () => {
    const rows = [
      ["Tanggal", "ID", "Produk", "Qty", "Harga Normal", "Diskon", "Harga Akhir", "Subtotal", "Profit"],
      ...transactions.flatMap((tx) =>
        (tx.items || []).map((item) => [
          formatDateTime(tx.created_at),
          tx.id.slice(0, 8),
          item.product_name,
          item.quantity,
          item.sell_price,
          item.discount_amount,
          item.final_price,
          item.subtotal,
          item.profit,
        ])
      ),
      [],
      ["", "", "", "", "", "", "", "Revenue Kotor", revenueBeforeDiscount],
      ["", "", "", "", "", "", "", "Total Diskon", totalDiscount],
      ["", "", "", "", "", "", "", "Total Penjualan (Bersih)", totalSales],
      ["", "", "", "", "", "", "", "HPP", hpp],
      ["", "", "", "", "", "", "", "Profit Kotor", grossProfit],
      ["", "", "", "", "", "", "", "Pengeluaran Operasional", totalExpenses],
      ["", "", "", "", "", "", "", "Profit Bersih", netProfit],
    ];
    const csv  = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `laporan-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex-between mb-4">
        <div className="section-title" style={{ margin: 0 }}>Laporan Penjualan</div>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV}>
          <DownloadIcon /> Export CSV
        </button>
      </div>

      <div className="filter-bar mb-6">
        <label className="form-label" style={{ margin: 0 }}>Dari:</label>
        <input type="date" className="form-input" style={{ width: "auto" }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <label className="form-label" style={{ margin: 0 }}>Sampai:</label>
        <input type="date" className="form-input" style={{ width: "auto" }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <button className="btn btn-primary btn-sm" onClick={() => dateFrom && dateTo && loadData(dateFrom, dateTo)} disabled={loading}>
          {loading ? "Memuat..." : "Tampilkan"}
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card blue">
          <div className="stat-label">Total Penjualan</div>
          <div className="stat-value">{formatRupiah(totalSales)}</div>
          <div className="stat-sub">{transactions.length} transaksi</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Profit Kotor</div>
          <div className="stat-value">{formatRupiah(grossProfit)}</div>
          <div className="stat-sub">Sebelum biaya operasional</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Total Pengeluaran</div>
          <div className="stat-value">{formatRupiah(totalExpenses)}</div>
          <div className="stat-sub">{expenses.length} item</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Profit Bersih</div>
          <div className="stat-value" style={{ color: netProfit >= 0 ? "#7C3AED" : "var(--danger)" }}>
            {formatRupiah(netProfit)}
          </div>
          <div className="stat-sub">Setelah biaya operasional</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: "20px", marginBottom: "20px" }}>
        {/* Top Products */}
        <div className="card">
          <div className="card-header"><div className="card-title">🏆 Produk Terlaris</div></div>
          <div style={{ padding: 0 }}>
            {topProducts.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--text3)" }}>Tidak ada data</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>#</th><th>Produk</th><th>Qty</th><th>Revenue</th><th>Diskon</th></tr>
                  </thead>
                  <tbody>
                    {topProducts.map((p, i) => (
                      <tr key={p.name}>
                        <td style={{ fontWeight: 700, color: i < 3 ? "var(--primary)" : "var(--text3)" }}>{i + 1}</td>
                        <td style={{ fontWeight: 600, fontSize: "13px" }}>{p.name}</td>
                        <td><span className="badge badge-blue">{p.qty}</span></td>
                        <td className="td-mono">{formatRupiah(p.revenue)}</td>
                        <td className="td-mono" style={{ color: p.discount > 0 ? "var(--warning)" : "var(--text3)" }}>
                          {p.discount > 0 ? `− ${formatRupiah(p.discount)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="card">
          <div className="card-header"><div className="card-title">📊 Ringkasan Keuangan</div></div>
          <div className="card-body">
            {[
              { label: "Revenue Sebelum Diskon", val: revenueBeforeDiscount, color: "var(--text2)" },
              { label: "🏷️ Total Diskon Diberikan", val: -totalDiscount, color: "var(--warning)", prefix: "−" },
              { label: "Total Penjualan (Bersih)", val: totalSales, color: "var(--primary)" },
              { label: "HPP (Harga Pokok)", val: -hpp, color: "var(--danger)", prefix: "−" },
              { label: "Profit Kotor", val: grossProfit, color: "#10B981" },
              { label: "Pengeluaran Operasional", val: -totalExpenses, color: "#F59E0B", prefix: "−" },
            ].map((row) => (
              <div key={row.label} style={{
                display: "flex", justifyContent: "space-between",
                padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: "13px",
              }}>
                <span style={{ color: "var(--text2)" }}>{row.label}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: row.color, fontWeight: 600 }}>
                  {row.prefix}{formatRupiah(Math.abs(row.val))}
                </span>
              </div>
            ))}
            <div style={{
              display: "flex", justifyContent: "space-between",
              padding: "12px 0 0", fontWeight: 800, fontSize: "15px",
            }}>
              <span style={{ color: netProfit >= 0 ? "#7C3AED" : "var(--danger)" }}>Profit Bersih</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: netProfit >= 0 ? "#7C3AED" : "var(--danger)" }}>
                {formatRupiah(netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Riwayat Transaksi */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">📋 Riwayat Transaksi ({transactions.length})</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal & Waktu</th>
                <th>Item</th>
                <th>Diskon</th>
                <th>Total</th>
                <th>Profit</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "var(--text3)" }}>
                    Tidak ada transaksi dalam periode ini
                  </td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="text-muted" style={{ fontSize: "13px" }}>{formatDateTime(tx.created_at)}</td>
                  <td><span className="badge badge-gray">{(tx.items || []).length} item</span></td>
                  <td className="td-mono">
                    {tx.total_discount > 0 ? (
                      <span style={{ color: "var(--warning)" }}>− {formatRupiah(tx.total_discount)}</span>
                    ) : (
                      <span style={{ color: "var(--text3)" }}>—</span>
                    )}
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

      {/* Modal Detail Transaksi */}
      {viewTx && (
        <Modal
          title="Detail Transaksi"
          onClose={() => setViewTx(null)}
          footer={<button className="btn btn-primary" onClick={() => setViewTx(null)}>Tutup</button>}
        >
          <div className="receipt">
            <div style={{ marginBottom: "12px", color: "var(--text2)", fontSize: "13px" }}>
              {formatDateTime(viewTx.created_at)} — ID: {viewTx.id.slice(0, 8)}...
            </div>
            <div className="receipt-divider" />

            {(viewTx.items || []).map((item) => (
              <div key={item.id} style={{ marginBottom: "12px", fontSize: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiah(item.subtotal)}</span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "2px" }}>
                  {item.quantity} pcs × {formatRupiah(item.sell_price)}
                </div>
                {item.discount_type !== "none" && item.discount_amount > 0 && (
                  <div style={{ fontSize: "12px", color: "var(--warning)", marginTop: "2px" }}>
                    🏷️ Diskon{" "}
                    {item.discount_type === "percent"
                      ? `${item.discount_value}%`
                      : formatRupiah(item.discount_value)}
                    {" → Harga akhir "}{formatRupiah(item.final_price)}/pcs
                    {" (hemat "}{formatRupiah(item.discount_amount)}{")"}
                  </div>
                )}
                <div style={{ fontSize: "12px", color: "var(--success)", marginTop: "2px" }}>
                  Profit: +{formatRupiah(item.profit)}
                </div>
              </div>
            ))}

            <div className="receipt-divider" />

            {viewTx.total_discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--warning)", marginBottom: "6px" }}>
                <span>Total Diskon</span>
                <span style={{ fontWeight: 700 }}>− {formatRupiah(viewTx.total_discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "16px" }}>
              <span>TOTAL BAYAR</span>
              <span>{formatRupiah(viewTx.total_amount)}</span>
            </div>
            <div className="receipt-divider" />
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success)" }}>
              <span>Profit Transaksi</span>
              <span style={{ fontWeight: 700 }}>{formatRupiah(viewTx.total_profit)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
