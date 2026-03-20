// app/reports/ReportsClient.tsx
"use client";

import { useState, useMemo } from "react";
import { Transaction, Expense, PaymentMethod, BuyerType } from "@/types";
import { formatRupiah } from "@/utils/currency";
import { formatDateTime } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import { printViaRawBT } from "@/utils/printReceipt";
import { TrashIcon, EditIcon } from "@/components/ui/Icons";

// ── Payment helpers ────────────────────────────────────────────────────────────
const PAYMENT_INFO: Record<string, { icon: string; label: string; color: string }> = {
  tunai:    { icon: "💵", label: "Tunai",    color: "#057A55" },
  transfer: { icon: "🏦", label: "Transfer", color: "#1C64F2" },
  qris:     { icon: "📱", label: "QRIS",     color: "#7C3AED" },
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; color: string }[] = [
  { value: "tunai",    label: "Tunai",    icon: "💵", color: "#057A55" },
  { value: "transfer", label: "Transfer", icon: "🏦", color: "#1C64F2" },
  { value: "qris",     label: "QRIS",     icon: "📱", color: "#7C3AED" },
];

const BUYER_TYPES: { value: BuyerType; label: string; icon: string }[] = [
  { value: "walk_in",    label: "Beli di Toko",   icon: "🏪" },
  { value: "cafe",       label: "Cafe / Reseller", icon: "☕" },
  { value: "individual", label: "Perorangan",      icon: "👤" },
];

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

function PaymentStatusBadge({ status }: { status: string }) {
  return status === "paid" ? (
    <span className="badge badge-success" style={{ fontSize: "11px" }}>✅ Lunas</span>
  ) : (
    <span className="badge badge-warning" style={{ fontSize: "11px" }}>🕐 Hutang</span>
  );
}

function BuyerTypeBadge({ type, name }: { type: string; name?: string | null }) {
  const map: Record<string, { label: string; icon: string }> = {
    walk_in:    { label: "Toko",       icon: "🏪" },
    cafe:       { label: "Cafe",       icon: "☕" },
    individual: { label: "Perorangan", icon: "👤" },
  };
  const b = map[type] ?? map.walk_in;
  return (
    <div style={{ fontSize: "12px" }}>
      <span style={{ color: "var(--text2)" }}>{b.icon} {b.label}</span>
      {name && <div style={{ fontWeight: 600, color: "var(--text)" }}>{name}</div>}
    </div>
  );
}

// ── Modal Tandai Lunas ─────────────────────────────────────────────────────────
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

  const formatCashInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  return (
    <Modal
      title="✅ Tandai Lunas"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={processing}>Batal</button>
          <button
            className="btn btn-success"
            onClick={() => onConfirm(selected, cashAmount > 0 ? cashAmount : undefined)}
            disabled={processing || !isValid}
          >
            {processing ? "⏳ Memproses..." : "✅ Lunas Sekarang"}
          </button>
        </>
      }
    >
      <div style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "14px 16px", marginBottom: "20px" }}>
        {tx.buyer_name && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
            <span className="text-muted">{tx.buyer_type === "cafe" ? "Cafe" : "Pemesan"}</span>
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
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>{m.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: selected === m.value ? m.color : "var(--text2)" }}>{m.label}</div>
            </button>
          ))}
        </div>
      </div>

      {selected === "tunai" && (
        <div className="form-group">
          <label className="form-label">Uang Diterima</label>
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

// ── Modal Edit Transaksi ───────────────────────────────────────────────────────
function EditTransactionModal({
  tx, onSave, onClose, processing,
}: {
  tx: Transaction;
  onSave: (data: {
    payment_method?: string;
    payment_status?: string;
    cash_received?: number | null;
    buyer_type?: string;
    buyer_name?: string | null;
  }) => void;
  onClose: () => void;
  processing: boolean;
}) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(tx.payment_method as PaymentMethod);
  const [paymentStatus, setPaymentStatus] = useState(tx.payment_status);
  const [buyerType, setBuyerType]         = useState<BuyerType>(tx.buyer_type as BuyerType);
  const [buyerName, setBuyerName]         = useState(tx.buyer_name || "");
  const [cashInput, setCashInput]         = useState(tx.cash_received ? tx.cash_received.toLocaleString("id-ID") : "");

  const formatCashInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  const cashAmount = parseInt(cashInput.replace(/\D/g, "")) || 0;
  const needsBuyerName = buyerType !== "walk_in";

  const handleSave = () => {
    onSave({
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      cash_received:  paymentMethod === "tunai" && cashAmount > 0 ? cashAmount : null,
      buyer_type:     buyerType,
      buyer_name:     needsBuyerName && buyerName.trim() ? buyerName.trim() : null,
    });
  };

  return (
    <Modal
      title="✏️ Edit Transaksi"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={processing}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={processing}>
            {processing ? "⏳ Menyimpan..." : "💾 Simpan Perubahan"}
          </button>
        </>
      }
    >
      {/* Info transaksi */}
      <div style={{
        background: "var(--surface2)", borderRadius: "var(--radius-sm)",
        padding: "12px 16px", marginBottom: "20px", fontSize: "13px",
        display: "flex", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ color: "var(--text2)", marginBottom: "2px" }}>Tanggal</div>
          <div style={{ fontWeight: 600 }}>{formatDateTime(tx.created_at)}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "var(--text2)", marginBottom: "2px" }}>Total</div>
          <div style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}>
            {formatRupiah(tx.total_amount)}
          </div>
        </div>
      </div>

      {/* Items summary */}
      <div style={{
        background: "var(--surface2)", borderRadius: "var(--radius-sm)",
        padding: "12px 16px", marginBottom: "20px",
      }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text2)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Item Transaksi
        </div>
        {tx.items.map((item) => (
          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
            <span>{item.product_name} × {item.quantity}</span>
            <span className="td-mono" style={{ color: "var(--text2)" }}>{formatRupiah(item.subtotal)}</span>
          </div>
        ))}
      </div>

      {/* Tipe Pembeli */}
      <div className="form-group">
        <label className="form-label">👥 Tipe Pembeli</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {BUYER_TYPES.map((bt) => (
            <button
              key={bt.value}
              onClick={() => { setBuyerType(bt.value); if (bt.value === "walk_in") setBuyerName(""); }}
              style={{
                padding: "10px 6px", borderRadius: "10px", fontFamily: "inherit",
                cursor: "pointer", textAlign: "center", transition: "all 0.15s",
                border: `2px solid ${buyerType === bt.value ? "var(--primary)" : "var(--border)"}`,
                background: buyerType === bt.value ? "var(--primary-light)" : "var(--surface)",
              }}
            >
              <div style={{ fontSize: "18px", marginBottom: "2px" }}>{bt.icon}</div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: buyerType === bt.value ? "var(--primary)" : "var(--text2)" }}>
                {bt.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      {needsBuyerName && (
        <div className="form-group">
          <label className="form-label">
            {buyerType === "cafe" ? "☕ Nama Cafe / Toko" : "👤 Nama Pemesan"}
            <span style={{ color: "var(--text3)", fontWeight: 400, marginLeft: "6px" }}>(opsional)</span>
          </label>
          <input
            className="form-input"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder={buyerType === "cafe" ? "Contoh: Cafe Melati" : "Contoh: Budi Santoso"}
          />
        </div>
      )}

      <div className="divider" />

      {/* Status Pembayaran */}
      <div className="form-group">
        <label className="form-label">💳 Status Pembayaran</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button
            onClick={() => setPaymentStatus("paid")}
            style={{
              padding: "12px", borderRadius: "10px", fontFamily: "inherit",
              cursor: "pointer", textAlign: "center", transition: "all 0.15s",
              border: `2px solid ${paymentStatus === "paid" ? "#057A55" : "var(--border)"}`,
              background: paymentStatus === "paid" ? "#DEF7EC" : "var(--surface)",
            }}
          >
            <div style={{ fontSize: "18px", marginBottom: "2px" }}>✅</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: paymentStatus === "paid" ? "#057A55" : "var(--text)" }}>
              Lunas
            </div>
          </button>
          <button
            onClick={() => setPaymentStatus("pending")}
            style={{
              padding: "12px", borderRadius: "10px", fontFamily: "inherit",
              cursor: "pointer", textAlign: "center", transition: "all 0.15s",
              border: `2px solid ${paymentStatus === "pending" ? "#D97706" : "var(--border)"}`,
              background: paymentStatus === "pending" ? "#FEF3C7" : "var(--surface)",
            }}
          >
            <div style={{ fontSize: "18px", marginBottom: "2px" }}>🕐</div>
            <div style={{ fontSize: "12px", fontWeight: 700, color: paymentStatus === "pending" ? "#D97706" : "var(--text)" }}>
              Belum Lunas
            </div>
          </button>
        </div>
      </div>

      {/* Metode Bayar — hanya jika lunas */}
      {paymentStatus === "paid" && (
        <div className="form-group">
          <label className="form-label">💵 Metode Pembayaran</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => { setPaymentMethod(m.value); setCashInput(""); }}
                style={{
                  padding: "12px 6px", borderRadius: "10px", fontFamily: "inherit",
                  cursor: "pointer", textAlign: "center", transition: "all 0.15s",
                  border: `2px solid ${paymentMethod === m.value ? m.color : "var(--border)"}`,
                  background: paymentMethod === m.value ? `${m.color}18` : "var(--surface)",
                }}
              >
                <div style={{ fontSize: "18px", marginBottom: "2px" }}>{m.icon}</div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: paymentMethod === m.value ? m.color : "var(--text2)" }}>
                  {m.label}
                </div>
              </button>
            ))}
          </div>

          {paymentMethod === "tunai" && (
            <div style={{ marginTop: "12px" }}>
              <label className="form-label">Uang Diterima (opsional)</label>
              <input
                className="form-input"
                inputMode="numeric"
                placeholder="Masukkan jumlah uang..."
                value={cashInput}
                onChange={(e) => setCashInput(formatCashInput(e.target.value))}
                style={{ fontSize: "15px", fontWeight: 700 }}
              />
              {cashAmount > 0 && (
                <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--text3)" }}>
                  Kembalian: <strong style={{ color: cashAmount >= tx.total_amount ? "var(--success)" : "var(--danger)" }}>
                    {formatRupiah(Math.abs(cashAmount - tx.total_amount))}
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Modal Konfirmasi Hapus ─────────────────────────────────────────────────────
function DeleteTransactionModal({
  tx, onConfirm, onClose, processing,
}: {
  tx: Transaction;
  onConfirm: () => void;
  onClose: () => void;
  processing: boolean;
}) {
  return (
    <Modal
      title="🗑️ Hapus Transaksi"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={processing}>Batal</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={processing}>
            {processing ? "⏳ Menghapus..." : "🗑️ Ya, Hapus & Restock"}
          </button>
        </>
      }
    >
      <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
        <div style={{ fontSize: "48px", marginBottom: "12px" }}>⚠️</div>
        <p style={{ fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>
          Yakin ingin menghapus transaksi ini?
        </p>
        <p style={{ color: "var(--text2)", fontSize: "13px", marginBottom: "16px" }}>
          Tindakan ini tidak bisa dibatalkan.
        </p>
      </div>

      {/* Info transaksi */}
      <div style={{
        background: "var(--surface2)", borderRadius: "var(--radius-sm)",
        padding: "14px 16px", marginBottom: "16px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
          <span className="text-muted">Tanggal</span>
          <span style={{ fontWeight: 600 }}>{formatDateTime(tx.created_at)}</span>
        </div>
        {tx.buyer_name && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
            <span className="text-muted">Pembeli</span>
            <span style={{ fontWeight: 600 }}>{tx.buyer_name}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
          <span className="text-muted">Total</span>
          <span style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}>
            {formatRupiah(tx.total_amount)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
          <span className="text-muted">Status</span>
          <PaymentStatusBadge status={tx.payment_status} />
        </div>
      </div>

      {/* Item yang akan di-restock */}
      <div style={{
        background: "#DEF7EC", border: "1px solid #6EE7B7",
        borderRadius: "var(--radius-sm)", padding: "12px 16px",
      }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "#057A55", marginBottom: "8px" }}>
          ✅ Stok berikut akan dikembalikan:
        </div>
        {tx.items.map((item) => (
          <div key={item.id} style={{
            display: "flex", justifyContent: "space-between",
            fontSize: "13px", color: "#057A55", marginBottom: "3px",
          }}>
            <span>{item.product_name}</span>
            <span style={{ fontWeight: 700 }}>+{item.quantity} pcs</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
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
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending">("all");

  // Modal states
  const [lunasModal,       setLunasModal]       = useState<Transaction | null>(null);
  const [lunasProcessing,  setLunasProcessing]  = useState(false);
  const [editModal,        setEditModal]        = useState<Transaction | null>(null);
  const [editProcessing,   setEditProcessing]   = useState(false);
  const [deleteModal,      setDeleteModal]      = useState<Transaction | null>(null);
  const [deleteProcessing, setDeleteProcessing] = useState(false);

  // Toast notification
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

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

  // ── Tandai Lunas ──────────────────────────────────────────────────────────
  const handleLunas = async (method: PaymentMethod, cashReceived?: number) => {
    if (!lunasModal) return;
    setLunasProcessing(true);
    try {
      const res = await fetch(`/api/transactions/${lunasModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ payment_method: method, cash_received: cashReceived }),
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error || "Gagal update", "error"); return; }

      setTransactions((prev) =>
        prev.map((t) => t.id === lunasModal.id ? { ...t, ...data.data } : t)
      );
      if (viewTx && viewTx.id === lunasModal.id) setViewTx(data.data);
      setLunasModal(null);
      showToast("Transaksi berhasil ditandai lunas ✅");
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setLunasProcessing(false);
    }
  };

  // ── Edit Transaksi ────────────────────────────────────────────────────────
  const handleEdit = async (editData: {
    payment_method?: string;
    payment_status?: string;
    cash_received?: number | null;
    buyer_type?: string;
    buyer_name?: string | null;
  }) => {
    if (!editModal) return;
    setEditProcessing(true);
    try {
      const res = await fetch(`/api/transactions/${editModal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error || "Gagal edit", "error"); return; }

      setTransactions((prev) =>
        prev.map((t) => t.id === editModal.id ? { ...t, ...data.data } : t)
      );
      if (viewTx && viewTx.id === editModal.id) setViewTx({ ...viewTx, ...data.data });
      setEditModal(null);
      showToast("Transaksi berhasil diperbarui ✏️");
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setEditProcessing(false);
    }
  };

  // ── Hapus Transaksi ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleteProcessing(true);
    try {
      const res = await fetch(`/api/transactions/${deleteModal.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!data.success) { showToast(data.error || "Gagal hapus", "error"); return; }

      setTransactions((prev) => prev.filter((t) => t.id !== deleteModal.id));
      if (viewTx && viewTx.id === deleteModal.id) setViewTx(null);
      setDeleteModal(null);

      const restockSummary = data.restocked
        ?.map((r: { product_name: string; qty: number }) => `${r.product_name} +${r.qty}`)
        .join(", ");
      showToast(`Transaksi dihapus. Stok dikembalikan: ${restockSummary}`);
    } catch {
      showToast("Gagal menghubungi server", "error");
    } finally {
      setDeleteProcessing(false);
    }
  };

  // ── Kalkulasi summary ─────────────────────────────────────────────────────
  const paidTx    = useMemo(() => transactions.filter((t) => t.payment_status === "paid"), [transactions]);
  const pendingTx = useMemo(() => transactions.filter((t) => t.payment_status === "pending"), [transactions]);

  const totalSales    = useMemo(() => paidTx.reduce((s, t) => s + t.total_amount, 0), [paidTx]);
  const totalPending  = useMemo(() => pendingTx.reduce((s, t) => s + t.total_amount, 0), [pendingTx]);
  const totalDiscount = useMemo(() => paidTx.reduce((s, t) => s + t.total_discount, 0), [paidTx]);
  const grossProfit   = useMemo(() => paidTx.reduce((s, t) => s + t.total_profit, 0), [paidTx]);
  const STOCK_CAT = "Pembelian Stok";
  const totalOpex           = useMemo(() => expenses.filter((e) => e.category !== STOCK_CAT).reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalStockPurchase  = useMemo(() => expenses.filter((e) => e.category === STOCK_CAT).reduce((s, e) => s + e.amount, 0), [expenses]);
  const totalExpenses       = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const netProfit           = grossProfit - totalOpex;
  const netProfitAfterStock = grossProfit - totalExpenses;
  const avgMargin           = totalSales > 0 ? Math.round((grossProfit / totalSales) * 100) : 0;

  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    for (const t of paidTx) {
      const m = t.payment_method || "tunai";
      if (!map[m]) map[m] = { count: 0, total: 0 };
      map[m].count++;
      map[m].total += t.total_amount;
    }
    return map;
  }, [paidTx]);

  const filteredTx = useMemo(() => {
    if (filterStatus === "all") return transactions;
    return transactions.filter((t) => t.payment_status === filterStatus);
  }, [transactions, filterStatus]);

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)",
          zIndex: 2000, padding: "12px 20px", borderRadius: "var(--radius-sm)",
          background: toast.type === "success" ? "#057A55" : "#C81E1E",
          color: "#fff", fontSize: "14px", fontWeight: 600,
          boxShadow: "var(--shadow-lg)", animation: "slideUp 0.2s ease",
          whiteSpace: "nowrap", maxWidth: "90vw", overflowX: "hidden", textOverflow: "ellipsis",
        }}>
          {toast.msg}
        </div>
      )}

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

      {/* Hutang alert */}
      {pendingTx.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom: "20px" }}>
          <span>🕐</span>
          <span>
            Ada <strong>{pendingTx.length} transaksi hutang</strong> senilai{" "}
            <strong>{formatRupiah(totalPending)}</strong> yang belum lunas.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: "20px" }}>
        <div className="stat-card blue">
          <div className="stat-label">Total Penjualan (Lunas)</div>
          <div className="stat-value">{formatRupiah(totalSales)}</div>
          <div className="stat-sub">{paidTx.length} transaksi lunas</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Total Diskon</div>
          <div className="stat-value">{formatRupiah(totalDiscount)}</div>
          <div className="stat-sub">Dari {paidTx.filter(t => t.total_discount > 0).length} transaksi</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-label">Margin Rata-rata</div>
          <div className="stat-value">{avgMargin}%</div>
          <div className="stat-sub">Dari {paidTx.length} transaksi lunas</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Profit Operasional</div>
          <div className="stat-value" style={{ color: netProfit >= 0 ? undefined : "var(--danger)" }}>
            {formatRupiah(netProfit)}
          </div>
          <div className="stat-sub">
            {totalOpex > 0 ? `Setelah Rp${totalOpex.toLocaleString("id-ID")} opex` : "Belum ada biaya operasional"}
          </div>
        </div>
      </div>

      {/* Hutang summary */}
      {pendingTx.length > 0 && (
        <div className="card" style={{ marginBottom: "20px" }}>
          <div className="card-body" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text2)", marginBottom: "4px" }}>🕐 Total Piutang (Hutang)</div>
                <div style={{ fontWeight: 700, fontSize: "18px", color: "#D97706", fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatRupiah(totalPending)}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "2px" }}>{pendingTx.length} transaksi belum lunas</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text2)", marginBottom: "4px" }}>💰 Estimasi jika semua lunas</div>
                <div style={{ fontWeight: 700, fontSize: "18px", fontFamily: "'JetBrains Mono', monospace", color: "var(--success)" }}>
                  {formatRupiah(totalSales + totalPending)}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text3)", marginTop: "2px" }}>Total semua transaksi</div>
              </div>
            </div>
          </div>
        </div>
      )}

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
      {paidTx.length > 0 && (
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
          <div style={{ display: "flex", gap: "8px" }}>
            {(["all", "paid", "pending"] as const).map((s) => (
              <button
                key={s}
                className={`tag ${filterStatus === s ? "active" : ""}`}
                style={{ fontSize: "12px", padding: "4px 12px" }}
                onClick={() => setFilterStatus(s)}
              >
                {s === "all" ? `Semua (${transactions.length})` : s === "paid" ? `✅ Lunas (${paidTx.length})` : `🕐 Hutang (${pendingTx.length})`}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap report-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal & Waktu</th>
                <th>Pembeli</th>
                <th>Item</th>
                <th>Metode</th>
                <th>Status</th>
                <th>Diskon</th>
                <th>Total</th>
                <th>Profit</th>
                <th style={{ minWidth: "140px" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "var(--text3)" }}>
                    Tidak ada transaksi dalam periode ini
                  </td>
                </tr>
              )}
              {filteredTx.map((tx) => (
                <tr key={tx.id} style={{
                  background: tx.payment_status === "pending" ? "#FFFBEB" : undefined,
                }}>
                  <td className="text-muted" style={{ fontSize: "13px" }}>{formatDateTime(tx.created_at)}</td>
                  <td><BuyerTypeBadge type={tx.buyer_type} name={tx.buyer_name} /></td>
                  <td><span className="badge badge-gray">{(tx.items || []).length} item</span></td>
                  <td>
                    {tx.payment_status === "pending"
                      ? <span style={{ color: "var(--text3)", fontSize: "12px" }}>—</span>
                      : <PaymentBadge method={tx.payment_method} />
                    }
                  </td>
                  <td><PaymentStatusBadge status={tx.payment_status} /></td>
                  <td className="td-mono">
                    {tx.total_discount > 0
                      ? <span style={{ color: "var(--warning)" }}>− {formatRupiah(tx.total_discount)}</span>
                      : <span style={{ color: "var(--text3)" }}>—</span>}
                  </td>
                  <td className="td-mono" style={{ fontWeight: 700 }}>{formatRupiah(tx.total_amount)}</td>
                  <td className="td-mono" style={{ color: tx.payment_status === "pending" ? "var(--text3)" : "var(--success)" }}>
                    {tx.payment_status === "pending" ? "—" : formatRupiah(tx.total_profit)}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setViewTx(tx)}>Detail</button>
                      {tx.payment_status === "pending" && (
                        <button className="btn btn-success btn-sm" onClick={() => setLunasModal(tx)}>
                          ✅ Lunas
                        </button>
                      )}
                      <button
                        className="btn-icon"
                        onClick={() => setEditModal(tx)}
                        title="Edit transaksi"
                        style={{ padding: "7px" }}
                      >
                        <EditIcon size={14} />
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={() => setDeleteModal(tx)}
                        title="Hapus transaksi"
                        style={{ padding: "7px" }}
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
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
          <div className="table-wrap report-table-wrap">
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
              {viewTx.payment_status === "pending" && (
                <button className="btn btn-success" onClick={() => setLunasModal(viewTx)}>
                  ✅ Tandai Lunas
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditModal(viewTx); setViewTx(null); }}>
                <EditIcon size={14} /> Edit
              </button>
              <button className="btn-icon danger" onClick={() => { setDeleteModal(viewTx); setViewTx(null); }} title="Hapus">
                <TrashIcon size={14} />
              </button>
              <button className="btn btn-ghost" onClick={() => printViaRawBT(viewTx)}>🖨️ Cetak Struk</button>
              <button className="btn btn-primary" onClick={() => setViewTx(null)}>Tutup</button>
            </div>
          }
        >
          <div className="receipt">
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>KHK FROZEN FOOD</div>
              <div style={{ color: "var(--text3)", fontSize: "12px" }}>{formatDateTime(viewTx.created_at)}</div>
              <div style={{ color: "var(--text3)", fontSize: "11px", marginTop: "2px" }}>ID: {viewTx.id.slice(0, 8)}...</div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              <PaymentStatusBadge status={viewTx.payment_status} />
              <BuyerTypeBadge type={viewTx.buyer_type} name={viewTx.buyer_name} />
            </div>

            <div className="receipt-divider" />

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

            {viewTx.payment_status === "pending" && (
              <div style={{ marginTop: "10px", padding: "10px 14px", background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "#92400E" }}>
                🕐 Pembayaran belum diterima. Klik <strong>Tandai Lunas</strong> setelah menerima pembayaran.
              </div>
            )}

            {viewTx.payment_status === "paid" && (
              <>
                <div className="receipt-divider" />
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
                        <span style={{ fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "var(--success)" }}>
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
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Lunas Modal */}
      {lunasModal && (
        <LunasModal
          tx={lunasModal}
          onConfirm={handleLunas}
          onClose={() => setLunasModal(null)}
          processing={lunasProcessing}
        />
      )}

      {/* Edit Modal */}
      {editModal && (
        <EditTransactionModal
          tx={editModal}
          onSave={handleEdit}
          onClose={() => setEditModal(null)}
          processing={editProcessing}
        />
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <DeleteTransactionModal
          tx={deleteModal}
          onConfirm={handleDelete}
          onClose={() => setDeleteModal(null)}
          processing={deleteProcessing}
        />
      )}
    </div>
  );
}