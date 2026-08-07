// app/hutang/HutangClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Transaction, PaymentMethod } from "@/types";
import { formatRupiah } from "@/utils/currency";
import { formatDateTime } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import { PAYMENT_METHODS } from "@/lib/constants";

interface HutangClientProps {
  initialTransactions: Transaction[];
}

const formatCashInput = (val: string) => {
  const num = val.replace(/\D/g, "");
  return num ? parseInt(num).toLocaleString("id-ID") : "";
};

// ── Modal Tandai Lunas ────────────────────────────────────────────────────────
function LunasModal({
  tx, onConfirm, onClose, processing,
}: {
  tx: Transaction;
  onConfirm: (method: PaymentMethod, cashReceived?: number) => void;
  onClose: () => void;
  processing: boolean;
}) {
  const [selected, setSelected] = useState<PaymentMethod>("tunai");
  const [cashInput, setCashInput] = useState("");
  const cashAmount = parseInt(cashInput.replace(/\D/g, "")) || 0;
  const cashChange = cashAmount - tx.total_amount;
  const isValid    = selected !== "tunai" || cashAmount >= tx.total_amount;

  const roundUpToNext = (amount: number, step: number) => Math.ceil(amount / step) * step;
  const basePresets   = [50000, 100000, 200000, 500000, 1000000];
  const presets = [
    tx.total_amount,
    ...basePresets.filter(a => a > tx.total_amount),
    roundUpToNext(tx.total_amount, 10000),
  ]
    .filter((v, i, arr) => arr.indexOf(v) === i) // deduplicate
    .sort((a, b) => a - b)
    .slice(0, 4);

  return (
    <Modal
      title="✅ Tandai Lunas"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={processing}>Batal</button>
          <button className="btn btn-success"
            onClick={() => onConfirm(selected, selected === "tunai" && cashAmount > 0 ? cashAmount : undefined)}
            disabled={processing || !isValid}>
            {processing ? "⏳ Memproses..." : "✅ Lunas Sekarang"}
          </button>
        </>
      }
    >
      <div style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "14px 16px", marginBottom: "20px" }}>
        {tx.buyer_name && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
            <span className="text-muted">Pembeli</span>
            <span style={{ fontWeight: 700 }}>{tx.buyer_name}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
          <span className="text-muted">Tanggal Order</span>
          <span style={{ fontWeight: 600 }}>{formatDateTime(tx.created_at)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800 }}>
          <span>Total Tagihan</span>
          <span style={{ color: "var(--primary)", fontFamily: "'JetBrains Mono', monospace" }}>
            {formatRupiah(tx.total_amount)}
          </span>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Metode Pembayaran</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          {PAYMENT_METHODS.map((m) => (
            <button key={m.value} onClick={() => { setSelected(m.value); setCashInput(""); }}
              style={{
                padding: "14px 8px", borderRadius: "10px", fontFamily: "inherit",
                cursor: "pointer", textAlign: "center", transition: "all 0.15s",
                border: `2px solid ${selected === m.value ? m.color : "var(--border)"}`,
                background: selected === m.value ? `${m.color}18` : "var(--surface)",
              }}>
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>{m.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: selected === m.value ? m.color : "var(--text2)" }}>{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      {selected === "tunai" && (
        <div className="form-group">
          <label className="form-label">Uang Diterima</label>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
            {presets.map((amt) => (
              <button key={amt} type="button"
                className={`tag${cashAmount === amt ? " active" : ""}`}
                style={{ fontSize: "12px", padding: "4px 10px" }}
                onClick={() => setCashInput(amt.toLocaleString("id-ID"))}>
                {amt === tx.total_amount ? "Pas" : formatRupiah(amt)}
              </button>
            ))}
          </div>
          <input className="form-input" inputMode="numeric" placeholder="Masukkan jumlah uang..."
            value={cashInput} onChange={(e) => setCashInput(formatCashInput(e.target.value))}
            style={{ fontSize: "16px", fontWeight: 700 }} />
          {cashAmount > 0 && (
            <div style={{
              marginTop: "10px", padding: "12px 16px", borderRadius: "var(--radius-sm)",
              background: cashChange >= 0 ? "var(--success-light)" : "var(--danger-light)",
              border: `1px solid ${cashChange >= 0 ? "#6EE7B7" : "#FCA5A5"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 800 }}>
                <span style={{ color: cashChange >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {cashChange >= 0 ? "Kembalian" : "Kurang"}
                </span>
                <span className="td-mono" style={{ color: cashChange >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {formatRupiah(Math.abs(cashChange))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function HutangClient({ initialTransactions }: HutangClientProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [lunasModal, setLunasModal]     = useState<Transaction | null>(null);
  const [processing, setProcessing]     = useState(false);
  const [toast, setToast]               = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Group by buyer_name
  const grouped = useMemo(() => {
    const map: Record<string, {
      key: string;
      label: string;
      txList: Transaction[];
      total: number;
      oldestDate: string;
    }> = {};

    for (const tx of transactions) {
      const key = tx.buyer_name?.trim() || "__walk_in__";
      const label = tx.buyer_name?.trim() || "Pembeli Langsung";
      if (!map[key]) {
        map[key] = { key, label, txList: [], total: 0, oldestDate: tx.created_at };
      }
      map[key].txList.push(tx);
      map[key].total += tx.total_amount;
      if (tx.created_at < map[key].oldestDate) map[key].oldestDate = tx.created_at;
    }

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [transactions]);

  const totalHutang = useMemo(() => transactions.reduce((s, t) => s + t.total_amount, 0), [transactions]);

  const handleLunas = async (method: PaymentMethod, cashReceived?: number) => {
    if (!lunasModal) return;
    setProcessing(true);
    try {
      const res = await fetch(`/api/transactions/${lunasModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payment_method: method, cash_received: cashReceived }),
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error || "Gagal update", "error"); return; }

      setTransactions((prev) => prev.filter((t) => t.id !== lunasModal.id));
      setLunasModal(null);
      showToast("Transaksi berhasil ditandai lunas ✅");
      router.refresh();
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setProcessing(false);
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "60px 24px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🎉</div>
          <div style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>Tidak ada hutang!</div>
          <div style={{ color: "var(--text3)", fontSize: "14px" }}>Semua transaksi sudah lunas.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          zIndex: 2000, padding: "12px 20px", borderRadius: "var(--radius-sm)",
          background: toast.type === "success" ? "#057A55" : "#C81E1E",
          color: "#fff", fontSize: "14px", fontWeight: 600,
          boxShadow: "var(--shadow-lg)", animation: "slideUp 0.2s ease",
          whiteSpace: "nowrap", maxWidth: "90vw",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Summary */}
      <div className="stats-grid" style={{ marginBottom: "20px" }}>
        <div className="stat-card orange">
          <div className="stat-label">Total Hutang</div>
          <div className="stat-value">{formatRupiah(totalHutang)}</div>
          <div className="stat-sub">{transactions.length} transaksi belum lunas</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Jumlah Pelanggan</div>
          <div className="stat-value">{grouped.length}</div>
          <div className="stat-sub">pelanggan dengan hutang</div>
        </div>
      </div>

      {/* List per pelanggan */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {grouped.map((group) => (
          <div key={group.key} className="card" style={{ overflow: "hidden" }}>
            {/* Header pelanggan */}
            <div
              style={{
                padding: "16px 20px", display: "flex", justifyContent: "space-between",
                alignItems: "center", cursor: "pointer", userSelect: "none",
                background: expandedCustomer === group.key ? "var(--surface2)" : "var(--surface)",
              }}
              onClick={() => setExpandedCustomer(expandedCustomer === group.key ? null : group.key)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "50%",
                  background: "var(--primary-light)", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: "16px", flexShrink: 0,
                }}>
                  {group.key === "__walk_in__" ? "🏪" : "👤"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "15px" }}>{group.label}</div>
                  <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "2px" }}>
                    {group.txList.length} transaksi · Terlama: {formatDateTime(group.oldestDate)}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontWeight: 800, fontSize: "16px", fontFamily: "'JetBrains Mono', monospace",
                    color: "var(--warning)",
                  }}>
                    {formatRupiah(group.total)}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text3)" }}>total hutang</div>
                </div>
                <span style={{
                  fontSize: "12px", color: "var(--text3)",
                  transform: expandedCustomer === group.key ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.15s", display: "inline-block",
                }}>▼</span>
              </div>
            </div>

            {/* Detail transaksi (collapsed/expanded) */}
            {expandedCustomer === group.key && (
              <div style={{ borderTop: "1px solid var(--border)" }}>
                {group.txList.map((tx, idx) => (
                  <div key={tx.id} style={{
                    padding: "14px 20px",
                    borderBottom: idx < group.txList.length - 1 ? "1px solid var(--border)" : undefined,
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    gap: "12px",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", color: "var(--text3)", marginBottom: "6px" }}>
                        {formatDateTime(tx.created_at)}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {tx.items.filter(i => i.product_name !== "GoSend").slice(0, 3).map((item) => (
                          <span key={item.id} className="badge badge-gray" style={{ fontSize: "11px" }}>
                            {item.product_name} ×{item.quantity}
                          </span>
                        ))}
                        {tx.items.filter(i => i.product_name !== "GoSend").length > 3 && (
                          <span className="badge badge-gray" style={{ fontSize: "11px" }}>
                            +{tx.items.filter(i => i.product_name !== "GoSend").length - 3} lagi
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{
                        fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                        color: "var(--warning)", marginBottom: "8px",
                      }}>
                        {formatRupiah(tx.total_amount)}
                      </div>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => setLunasModal(tx)}
                      >
                        ✅ Lunas
                      </button>
                    </div>
                  </div>
                ))}

                {/* Lunas semua tombol jika lebih dari 1 transaksi */}
                {group.txList.length > 1 && (
                  <div style={{
                    padding: "12px 20px", background: "var(--success-light)",
                    borderTop: "1px solid #6EE7B7", display: "flex",
                    justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: "13px", color: "var(--success)", fontWeight: 600 }}>
                      Total: {formatRupiah(group.total)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {lunasModal && (
        <LunasModal
          tx={lunasModal}
          onConfirm={handleLunas}
          onClose={() => setLunasModal(null)}
          processing={processing}
        />
      )}
    </div>
  );
}
