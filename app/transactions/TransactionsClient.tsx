// app/transactions/TransactionsClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Product, CartItem, Transaction, DiscountType,
  PaymentMethod, BuyerType, PaymentStatus,
} from "@/types";
import { formatRupiah, calculateDiscountAmount, calculateFinalPrice } from "@/utils/currency";
import { formatDateTime, isExpired } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import { SearchIcon, TrashIcon, EditIcon } from "@/components/ui/Icons";
import { printViaRawBT } from "@/utils/printReceipt";

interface TransactionsClientProps {
  initialProducts: Product[];
}

// ── GoSend virtual product ID (tidak ada di DB) ────────────────────────────────
const GOSEND_ID = "__gosend__";

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; color: string }[] = [
  { value: "tunai",    label: "Tunai",    icon: "💵", color: "#057A55" },
  { value: "transfer", label: "Transfer", icon: "🏦", color: "#1C64F2" },
  { value: "qris",     label: "QRIS",     icon: "📱", color: "#7C3AED" },
];

const BUYER_TYPES: { value: BuyerType; label: string; icon: string; desc: string }[] = [
  { value: "walk_in",    label: "Beli di Toko",   icon: "🏪", desc: "Pembeli datang langsung" },
  { value: "cafe",       label: "Cafe / Reseller", icon: "☕", desc: "Pemesanan dari cafe" },
  { value: "individual", label: "Perorangan",      icon: "👤", desc: "Order personal" },
];

// ── Helper Badges ──────────────────────────────────────────────────────────────
function PaymentStatusBadge({ status }: { status: "paid" | "pending" }) {
  return status === "paid" ? (
    <span className="badge badge-success">✅ Lunas</span>
  ) : (
    <span className="badge badge-warning">🕐 Belum Lunas</span>
  );
}

function BuyerTypeBadge({ type }: { type: BuyerType }) {
  const map: Record<BuyerType, { label: string; icon: string; bg: string; color: string }> = {
    walk_in:    { label: "Toko",       icon: "🏪", bg: "var(--surface2)", color: "var(--text2)" },
    cafe:       { label: "Cafe",       icon: "☕", bg: "#EBF0FF",         color: "var(--primary)" },
    individual: { label: "Perorangan", icon: "👤", bg: "#F3E8FF",         color: "#7C3AED" },
  };
  const b = map[type] ?? map.walk_in;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "99px", fontSize: "11px", fontWeight: 600,
      background: b.bg, color: b.color,
    }}>
      {b.icon} {b.label}
    </span>
  );
}

// ── GoSend Price Input Modal ───────────────────────────────────────────────────
function GoSendModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (price: number) => void;
  onClose: () => void;
}) {
  const [displayPrice, setDisplayPrice] = useState("");
  const [error, setError] = useState("");

  const numericPrice = parseInt(displayPrice.replace(/\./g, "").replace(/[^0-9]/g, "")) || 0;

  const handlePriceChange = (val: string) => {
    const raw = val.replace(/[^0-9]/g, "");
    const num = parseInt(raw) || 0;
    setDisplayPrice(raw ? num.toLocaleString("id-ID") : "");
    setError("");
  };

  const handleConfirm = () => {
    if (!numericPrice || numericPrice <= 0) {
      setError("Harga GoSend wajib diisi");
      return;
    }
    onConfirm(numericPrice);
  };

  return (
    <Modal
      title="🛵 Tambah GoSend"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={handleConfirm}>
            Tambah ke Keranjang
          </button>
        </>
      }
    >
      {/* Visual GoSend tile preview */}
      <div style={{
        background: "linear-gradient(135deg, #FFF7ED 0%, #FED7AA 100%)",
        border: "2px solid #F97316",
        borderRadius: "var(--radius)",
        padding: "20px",
        textAlign: "center",
        marginBottom: "20px",
      }}>
        <div style={{ fontSize: "36px", marginBottom: "6px" }}>🛵</div>
        <div style={{ fontWeight: 700, fontSize: "15px", color: "#C2410C" }}>GoSend</div>
        <div style={{ fontSize: "12px", color: "#9A3412", marginTop: "2px" }}>Ongkos kirim sesuai tarif saat ini</div>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Harga GoSend (Rp) *</label>
        <div style={{ position: "relative" }}>
          <span style={{
            position: "absolute", left: "14px", top: "50%",
            transform: "translateY(-50%)", color: "var(--text3)",
            fontWeight: 700, fontSize: "14px", pointerEvents: "none",
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            Rp
          </span>
          <input
            className="form-input"
            style={{
              paddingLeft: "42px",
              fontSize: "20px",
              fontWeight: 800,
              fontFamily: "'IBM Plex Mono', monospace",
              textAlign: "right",
            }}
            type="text"
            inputMode="numeric"
            value={displayPrice}
            onChange={(e) => handlePriceChange(e.target.value)}
            placeholder="0"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          />
        </div>
        {numericPrice > 0 && (
          <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--text3)", textAlign: "right" }}>
            {formatRupiah(numericPrice)}
          </div>
        )}
        {error && (
          <div className="alert alert-danger" style={{ marginTop: "10px", marginBottom: 0 }}>
            {error}
          </div>
        )}
      </div>

      {/* Quick amount shortcuts */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
        {[5000, 8000, 10000, 15000, 20000, 25000].map((amt) => (
          <button
            key={amt}
            onClick={() => {
              setDisplayPrice(amt.toLocaleString("id-ID"));
              setError("");
            }}
            style={{
              padding: "6px 12px",
              borderRadius: "99px",
              border: `1.5px solid ${numericPrice === amt ? "#F97316" : "var(--border)"}`,
              background: numericPrice === amt ? "#FFF7ED" : "var(--surface2)",
              color: numericPrice === amt ? "#C2410C" : "var(--text2)",
              fontWeight: 600,
              fontSize: "12px",
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
              transition: "all 0.15s",
            }}
          >
            {formatRupiah(amt)}
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ── Discount Modal ─────────────────────────────────────────────────────────────
function DiscountModal({
  item, onSave, onClose,
}: {
  item: CartItem;
  onSave: (productId: string, type: DiscountType, value: number) => void;
  onClose: () => void;
}) {
  const [type, setType]   = useState<DiscountType>(item.discount_type);
  const [value, setValue] = useState(item.discount_value > 0 ? String(item.discount_value) : "");

  const numVal        = parseFloat(value) || 0;
  const discountAmt   = calculateDiscountAmount(item.sell_price, type, numVal);
  const finalPriceVal = calculateFinalPrice(item.sell_price, type, numVal);
  const isValid       = type === "none" || (numVal > 0 && finalPriceVal >= 0);

  const handleSave = () => {
    if (type === "none") onSave(item.product_id, "none", 0);
    else if (isValid) onSave(item.product_id, type, numVal);
  };

  return (
    <Modal
      title={`🏷️ Diskon — ${item.product_name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" onClick={handleSave}>Terapkan</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Tipe Diskon</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {(["none", "percent", "nominal"] as DiscountType[]).map((t) => (
            <button key={t} onClick={() => { setType(t); if (t === "none") setValue(""); }}
              style={{
                padding: "10px", borderRadius: "8px", fontFamily: "inherit", cursor: "pointer",
                border: `2px solid ${type === t ? "var(--primary)" : "var(--border)"}`,
                background: type === t ? "var(--primary-light)" : "var(--surface)",
                color: type === t ? "var(--primary)" : "var(--text2)",
                fontWeight: 700, fontSize: "13px",
              }}
            >
              {t === "none" ? "Tidak Ada" : t === "percent" ? "Persen (%)" : "Nominal (Rp)"}
            </button>
          ))}
        </div>
      </div>

      {type !== "none" && (
        <div className="form-group">
          <label className="form-label">
            {type === "percent" ? "Persentase Diskon (%)" : "Nominal Diskon (Rp)"}
          </label>
          <input className="form-input" type="number" value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === "percent" ? "Contoh: 10" : "Contoh: 5000"}
            min="0" max={type === "percent" ? "100" : undefined}
          />
        </div>
      )}

      {type !== "none" && numVal > 0 && (
        <div style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: "12px 16px", fontSize: "13px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span className="text-muted">Harga Normal</span>
            <span className="td-mono">{formatRupiah(item.sell_price)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ color: "var(--warning)" }}>Diskon {type === "percent" ? `${numVal}%` : "Nominal"}</span>
            <span className="td-mono" style={{ color: "var(--danger)" }}>− {formatRupiah(discountAmt)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", fontWeight: 800, paddingTop: "8px", borderTop: "1px solid var(--border)", marginTop: "4px" }}>
            <span>Harga Akhir</span>
            <span className="td-mono" style={{ color: "var(--primary)" }}>{formatRupiah(finalPriceVal)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Payment Modal ──────────────────────────────────────────────────────────────
function PaymentModal({
  totalFinal, onConfirm, onClose, processing,
}: {
  totalFinal: number;
  onConfirm: (opts: {
    method: PaymentMethod;
    cashReceived?: number;
    paymentStatus: PaymentStatus;
    buyerType: BuyerType;
    buyerName?: string;
  }) => void;
  onClose: () => void;
  processing: boolean;
}) {
  const [payStatus, setPayStatus] = useState<PaymentStatus>("paid");
  const [selected, setSelected]   = useState<PaymentMethod>("tunai");
  const [cashInput, setCashInput] = useState("");
  const [buyerType, setBuyerType] = useState<BuyerType>("walk_in");
  const [buyerName, setBuyerName] = useState("");

  const cashAmount     = parseInt(cashInput.replace(/\D/g, "")) || 0;
  const cashChange     = cashAmount - totalFinal;
  const isValidCash    = payStatus === "pending" || selected !== "tunai" || cashAmount >= totalFinal;
  const needsBuyerName = buyerType !== "walk_in";

  const formatCashInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  const handleConfirm = () => {
    onConfirm({
      method:        selected,
      cashReceived:  selected === "tunai" && cashAmount > 0 ? cashAmount : undefined,
      paymentStatus: payStatus,
      buyerType,
      buyerName:     needsBuyerName && buyerName.trim() ? buyerName.trim() : undefined,
    });
  };

  return (
    <Modal
      title="🧾 Konfirmasi Transaksi"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={processing}>Batal</button>
          <button
            className={`btn ${payStatus === "paid" ? "btn-success" : "btn-primary"}`}
            onClick={handleConfirm}
            disabled={processing || !isValidCash}
          >
            {processing
              ? "⏳ Memproses..."
              : payStatus === "paid"
              ? "✅ Konfirmasi & Lunas"
              : "📋 Simpan Hutang"}
          </button>
        </>
      }
    >
      <div style={{
        background: "var(--surface2)", borderRadius: "var(--radius-sm)",
        padding: "16px", textAlign: "center", marginBottom: "20px",
      }}>
        <div style={{ fontSize: "13px", color: "var(--text2)", marginBottom: "4px" }}>Total Pembayaran</div>
        <div style={{ fontSize: "28px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}>
          {formatRupiah(totalFinal)}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">👥 Tipe Pembeli</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          {BUYER_TYPES.map((bt) => (
            <button
              key={bt.value}
              onClick={() => { setBuyerType(bt.value); if (bt.value === "walk_in") setBuyerName(""); }}
              style={{
                padding: "12px 8px", borderRadius: "10px", fontFamily: "inherit",
                cursor: "pointer", textAlign: "center", transition: "all 0.15s",
                border: `2px solid ${buyerType === bt.value ? "var(--primary)" : "var(--border)"}`,
                background: buyerType === bt.value ? "var(--primary-light)" : "var(--surface)",
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "4px" }}>{bt.icon}</div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: buyerType === bt.value ? "var(--primary)" : "var(--text)" }}>
                {bt.label}
              </div>
              <div style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>{bt.desc}</div>
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
            autoFocus
          />
        </div>
      )}

      <div className="divider" />

      <div className="form-group">
        <label className="form-label">💳 Status Pembayaran</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <button
            onClick={() => setPayStatus("paid")}
            style={{
              padding: "14px 12px", borderRadius: "10px", fontFamily: "inherit",
              cursor: "pointer", textAlign: "center", transition: "all 0.15s",
              border: `2px solid ${payStatus === "paid" ? "#057A55" : "var(--border)"}`,
              background: payStatus === "paid" ? "#DEF7EC" : "var(--surface)",
            }}
          >
            <div style={{ fontSize: "22px", marginBottom: "4px" }}>✅</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: payStatus === "paid" ? "#057A55" : "var(--text)" }}>
              Bayar Sekarang
            </div>
            <div style={{ fontSize: "11px", color: "var(--text3)", marginTop: "2px" }}>Langsung lunas</div>
          </button>
          <button
            onClick={() => { setPayStatus("pending"); setCashInput(""); }}
            style={{
              padding: "14px 12px", borderRadius: "10px", fontFamily: "inherit",
              cursor: "pointer", textAlign: "center", transition: "all 0.15s",
              border: `2px solid ${payStatus === "pending" ? "#D97706" : "var(--border)"}`,
              background: payStatus === "pending" ? "#FEF3C7" : "var(--surface)",
            }}
          >
            <div style={{ fontSize: "22px", marginBottom: "4px" }}>🕐</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: payStatus === "pending" ? "#D97706" : "var(--text)" }}>
              Bayar Nanti
            </div>
            <div style={{ fontSize: "11px", color: "var(--text3)", marginTop: "2px" }}>Stok tetap dikurangi</div>
          </button>
        </div>

        {payStatus === "pending" && (
          <div style={{
            marginTop: "10px", padding: "10px 14px",
            background: "#FEF3C7", border: "1px solid #FCD34D",
            borderRadius: "var(--radius-sm)", fontSize: "12px", color: "#92400E",
          }}>
            ⚠️ Stok akan langsung dikurangi. Tandai <strong>Lunas</strong> nanti dari struk atau halaman laporan.
          </div>
        )}
      </div>

      {payStatus === "paid" && (
        <div className="form-group">
          <label className="form-label">💵 Metode Pembayaran</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => { setSelected(m.value); setCashInput(""); }}
                style={{
                  padding: "14px 8px", borderRadius: "10px", fontFamily: "inherit",
                  cursor: "pointer", textAlign: "center", transition: "all 0.15s",
                  border: `2px solid ${selected === m.value ? m.color : "var(--border)"}`,
                  background: selected === m.value ? `${m.color}18` : "var(--surface)",
                }}
              >
                <div style={{ fontSize: "22px", marginBottom: "4px" }}>{m.icon}</div>
                <div style={{ fontSize: "13px", fontWeight: 700, color: selected === m.value ? m.color : "var(--text2)" }}>
                  {m.label}
                </div>
              </button>
            ))}
          </div>

          {selected === "tunai" && (
            <div className="form-group" style={{ marginTop: "12px", marginBottom: 0 }}>
              <label className="form-label">Uang Diterima (opsional)</label>
              <input
                className="form-input"
                inputMode="numeric"
                placeholder="Masukkan jumlah uang..."
                value={cashInput}
                onChange={(e) => setCashInput(formatCashInput(e.target.value))}
                style={{ fontSize: "16px", fontWeight: 700 }}
              />
              {cashAmount > 0 && (
                <div style={{
                  marginTop: "10px", padding: "12px 16px", borderRadius: "var(--radius-sm)",
                  background: cashChange >= 0 ? "var(--success-light)" : "var(--danger-light)",
                  border: `1px solid ${cashChange >= 0 ? "#6EE7B7" : "#FCA5A5"}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text2)" }}>Uang diterima</span>
                    <span className="td-mono">{formatRupiah(cashAmount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
                    <span style={{ color: "var(--text2)" }}>Total belanja</span>
                    <span className="td-mono">− {formatRupiah(totalFinal)}</span>
                  </div>
                  <div style={{
                    display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "16px",
                    paddingTop: "8px", borderTop: "1px solid var(--border)",
                  }}>
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

          {selected === "transfer" && (
            <div style={{ marginTop: "10px", padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "#EBF0FF", border: "1px solid #93C5FD", fontSize: "13px", color: "var(--primary)" }}>
              🏦 Pastikan transfer sudah diterima sebelum konfirmasi.
            </div>
          )}
          {selected === "qris" && (
            <div style={{ marginTop: "10px", padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "#F3E8FF", border: "1px solid #C4B5FD", fontSize: "13px", color: "#7C3AED" }}>
              📱 Pastikan notifikasi QRIS sudah masuk sebelum konfirmasi.
            </div>
          )}
        </div>
      )}
    </Modal>
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
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: 800, paddingTop: "4px" }}>
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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TransactionsClient({ initialProducts }: TransactionsClientProps) {
  const router = useRouter();
  const [products, setProducts]           = useState<Product[]>(initialProducts);
  const [cart, setCart]                   = useState<CartItem[]>([]);
  const [search, setSearch]               = useState("");
  const [catFilter, setCatFilter]         = useState("Semua");
  const [processing, setProcessing]       = useState(false);
  const [receipt, setReceipt]             = useState<Transaction | null>(null);
  const [error, setError]                 = useState("");
  const [discountModal, setDiscountModal] = useState<CartItem | null>(null);
  const [paymentModal, setPaymentModal]   = useState(false);
  const [sheetOpen, setSheetOpen]         = useState(false);
  const [lunasModal, setLunasModal]       = useState<Transaction | null>(null);
  const [lunasProcessing, setLunasProcessing] = useState(false);

  // GoSend modal state
  const [goSendModal, setGoSendModal] = useState(false);

  const hasGoSendInCart = cart.some((i) => i.product_id === GOSEND_ID);

  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products]
  );

  const filtered = useMemo(
    () => products.filter((p) => {
      const mc = catFilter === "Semua" || p.category === catFilter;
      const ms = p.name.toLowerCase().includes(search.toLowerCase());
      return mc && ms;
    }),
    [products, search, catFilter]
  );

  const addToCart = (prod: Product) => {
    if (prod.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === prod.id);
      if (existing) {
        if (existing.quantity >= existing.max_qty) return prev;
        return prev.map((i) => i.product_id === prod.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        product_id: prod.id, product_name: prod.name,
        sell_price: prod.sell_price, buy_price: prod.buy_price,
        quantity: 1, max_qty: prod.stock,
        discount_type: "none", discount_value: 0, discount_amount: 0, final_price: prod.sell_price,
      }];
    });
  };

  // ── Tambah GoSend ke keranjang ─────────────────────────────────────────────
  const addGoSendToCart = (price: number) => {
    setCart((prev) => {
      // Replace jika sudah ada (seharusnya tidak terjadi karena tombol disabled)
      const filtered = prev.filter((i) => i.product_id !== GOSEND_ID);
      return [...filtered, {
        product_id:     GOSEND_ID,
        product_name:   "GoSend",
        sell_price:     price,
        buy_price:      0,         // tidak ada HPP untuk ongkir
        quantity:       1,
        max_qty:        1,         // maksimal 1
        discount_type:  "none",
        discount_value: 0,
        discount_amount: 0,
        final_price:    price,
      }];
    });
    setGoSendModal(false);
  };

  const updateQty = (productId: string, delta: number) => {
    // GoSend tidak bisa diubah qty-nya
    if (productId === GOSEND_ID) return;
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId) return i;
        const nq = i.quantity + delta;
        if (nq <= 0) return null as unknown as CartItem;
        if (nq > i.max_qty) return i;
        return { ...i, quantity: nq };
      }).filter(Boolean)
    );
  };

  const removeItem = (productId: string) => setCart((prev) => prev.filter((i) => i.product_id !== productId));

  const applyDiscount = (productId: string, type: DiscountType, value: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.product_id !== productId) return i;
      const discountAmount = calculateDiscountAmount(i.sell_price, type, value);
      const finalPrice     = calculateFinalPrice(i.sell_price, type, value);
      return { ...i, discount_type: type, discount_value: value, discount_amount: discountAmount, final_price: finalPrice };
    }));
    setDiscountModal(null);
  };

  const subtotalNormal = cart.reduce((s, i) => s + i.sell_price * i.quantity, 0);
  const totalDiscount  = cart.reduce((s, i) => s + i.discount_amount * i.quantity, 0);
  const totalFinal     = cart.reduce((s, i) => s + i.final_price * i.quantity, 0);
  const estimasiProfit = cart.reduce((s, i) => s + (i.final_price - i.buy_price) * i.quantity, 0);
  const cartCount      = cart.reduce((s, i) => s + i.quantity, 0);
  const hasDiscount    = cart.some((i) => i.discount_type !== "none" && i.discount_amount > 0);

  const checkout = async (opts: {
    method: PaymentMethod;
    cashReceived?: number;
    paymentStatus: PaymentStatus;
    buyerType: BuyerType;
    buyerName?: string;
  }) => {
    if (cart.length === 0) return;
    setProcessing(true);
    setError("");

    // Pisahkan item GoSend dari item produk biasa
    const productItems = cart.filter((i) => i.product_id !== GOSEND_ID);
    const goSendItem   = cart.find((i) => i.product_id === GOSEND_ID);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          payment_method: opts.method,
          cash_received:  opts.method === "tunai" && opts.cashReceived ? opts.cashReceived : null,
          payment_status: opts.paymentStatus,
          buyer_type:     opts.buyerType,
          buyer_name:     opts.buyerName || null,
          // GoSend dikirim sebagai metadata tambahan (opsional, untuk API yang mendukung)
          gosend_fee:     goSendItem ? goSendItem.final_price : null,
          items: productItems.map((i) => ({
            product_id:     i.product_id,
            quantity:       i.quantity,
            discount_type:  i.discount_type,
            discount_value: i.discount_value,
          })),
        }),
      });

      const data = await res.json();
      if (!data.success) { setError(data.error || "Gagal memproses transaksi"); return; }

      // Update stok lokal hanya untuk produk nyata (bukan GoSend)
      setProducts((prev) => prev.map((p) => {
        const item = productItems.find((i) => i.product_id === p.id);
        return item ? { ...p, stock: p.stock - item.quantity } : p;
      }));

      // Inject GoSend ke dalam receipt untuk ditampilkan dan dicetak
      const enrichedReceipt: Transaction = {
        ...data.data,
        items: goSendItem
          ? [
              ...data.data.items,
              // GoSend sebagai item virtual di receipt (tidak ada di DB)
              {
                id:              "__gosend_item__",
                transaction_id:  data.data.id,
                product_id:      GOSEND_ID,
                product_name:    "GoSend",
                quantity:        1,
                sell_price:      goSendItem.final_price,
                buy_price:       0,
                discount_type:   "none",
                discount_value:  0,
                discount_amount: 0,
                final_price:     goSendItem.final_price,
                subtotal:        goSendItem.final_price,
                profit:          0,
              },
            ]
          : data.data.items,
        // Adjust total untuk menyertakan GoSend
        total_amount: goSendItem
          ? data.data.total_amount + goSendItem.final_price
          : data.data.total_amount,
      };

      setReceipt(enrichedReceipt);
      setCart([]);
      setPaymentModal(false);
      setSheetOpen(false);
      router.refresh();
    } catch {
      setError("Gagal memproses transaksi. Coba lagi.");
    } finally {
      setProcessing(false);
    }
  };

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
      if (!data.success) { alert(data.error || "Gagal update"); return; }

      if (receipt && receipt.id === lunasModal.id) setReceipt(data.data);
      setLunasModal(null);
      router.refresh();
    } catch {
      alert("Gagal menghubungi server");
    } finally {
      setLunasProcessing(false);
    }
  };

  // ── Cart Items (shared desktop & mobile) ──────────────────────────────────
  const CartItemsList = () => (
    <>
      {cart.length === 0 ? (
        <div className="cart-empty">
          <span style={{ fontSize: "32px" }}>🛒</span>
          <span style={{ fontSize: "14px" }}>Keranjang kosong</span>
        </div>
      ) : (
        <div className="cart-items">
          {cart.map((item) => {
            const isGoSend        = item.product_id === GOSEND_ID;
            const hasItemDiscount = item.discount_type !== "none" && item.discount_amount > 0;
            return (
              <div key={item.product_id} className="cart-item" style={{
                // GoSend: subtle orange accent
                borderLeft: isGoSend ? "3px solid #F97316" : undefined,
              }}>
                <div className="cart-item-info">
                  <div className="cart-item-name">
                    {isGoSend && <span style={{ marginRight: "4px" }}>🛵</span>}
                    {item.product_name}
                    {isGoSend && (
                      <span className="badge badge-gray" style={{ marginLeft: "6px", fontSize: "10px" }}>Ongkir</span>
                    )}
                  </div>
                  <div className="cart-item-price">
                    {formatRupiah(item.final_price)}
                    {!isGoSend && ` × ${item.quantity} = `}
                    {!isGoSend && <strong>{formatRupiah(item.final_price * item.quantity)}</strong>}
                  </div>
                  {!isGoSend && (
                    <>
                      {hasItemDiscount ? (
                        <span className="badge badge-warning" style={{ fontSize: "11px" }}>
                          🏷️ Diskon {item.discount_type === "percent" ? `${item.discount_value}%` : formatRupiah(item.discount_value)}
                          {" (−"}{formatRupiah(item.discount_amount * item.quantity)}{")"}
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--text3)" }}>Tidak ada diskon</span>
                      )}
                      <button className="btn btn-ghost btn-sm" style={{ padding: "4px 10px", fontSize: "12px" }}
                        onClick={() => setDiscountModal(item)}>
                        <EditIcon size={12} /> {hasItemDiscount ? "Ubah" : "Tambah"} Diskon
                      </button>
                    </>
                  )}
                  {isGoSend && (
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
                      onClick={() => setGoSendModal(true)}
                    >
                      ✏️ Ubah Harga
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  {!isGoSend && (
                    <div className="cart-qty">
                      <button className="qty-btn" onClick={() => updateQty(item.product_id, -1)}>−</button>
                      <span className="qty-val">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.product_id, +1)}>+</button>
                    </div>
                  )}
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: "4px" }}
                    onClick={() => removeItem(item.product_id)}>
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  // ── Cart Footer (shared) ───────────────────────────────────────────────────
  const CartFooter = () => (
    <div className="cart-footer">
      <div className="cart-total-row">
        <span className="text-muted">Subtotal Normal</span>
        <span className="cart-total-val td-mono">{formatRupiah(subtotalNormal)}</span>
      </div>
      {hasDiscount && (
        <div className="cart-total-row">
          <span style={{ color: "var(--warning)" }}>🏷️ Total Diskon</span>
          <span className="cart-total-val td-mono" style={{ color: "var(--warning)" }}>
            − {formatRupiah(totalDiscount)}
          </span>
        </div>
      )}
      <div className="cart-total-row">
        <span className="text-muted">Est. Profit</span>
        <span className={`cart-total-val td-mono ${estimasiProfit >= 0 ? "text-success" : "text-danger"}`}>
          {formatRupiah(estimasiProfit)}
        </span>
      </div>
      <div className="cart-total-row big">
        <span>TOTAL BAYAR</span>
        <span className="cart-total-val">{formatRupiah(totalFinal)}</span>
      </div>

      <button
        className="btn btn-success btn-lg"
        style={{ width: "100%", marginTop: "12px" }}
        onClick={() => setPaymentModal(true)}
        disabled={cart.length === 0 || processing}
      >
        ✅ Proses Transaksi
      </button>
      {cart.length > 0 && (
        <button className="btn btn-ghost" style={{ width: "100%", marginTop: "8px" }}
          onClick={() => setCart([])}>
          Kosongkan Keranjang
        </button>
      )}
    </div>
  );

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ── DESKTOP layout ── */}
      <div className="pos-layout">
        <div className="pos-products">
          <div className="search-wrap">
            <span className="search-icon"><SearchIcon /></span>
            <input className="form-input" placeholder="Cari produk..." value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="filter-bar">
            {categories.map((c) => (
              <button key={c} className={`tag ${catFilter === c ? "active" : ""}`}
                onClick={() => setCatFilter(c)}>{c}</button>
            ))}
          </div>
          <div className="product-grid-wrap">
            <div className="product-grid">

              {/* ── GoSend Tile (virtual) ── */}
              <div
                className={`product-tile ${hasGoSendInCart ? "out" : ""}`}
                onClick={() => !hasGoSendInCart && setGoSendModal(true)}
                style={{
                  background: hasGoSendInCart
                    ? "var(--surface2)"
                    : "linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)",
                  border: `2px solid ${hasGoSendInCart ? "var(--border)" : "#F97316"}`,
                  position: "relative",
                }}
              >
                {hasGoSendInCart && (
                  <div style={{ position: "absolute", top: 6, left: 6 }}>
                    <span className="badge badge-success" style={{ fontSize: "9px", padding: "2px 6px" }}>✓ Ditambah</span>
                  </div>
                )}
                <div className="product-tile-cat" style={{ color: "#C2410C", background: "#FED7AA" }}>
                  Pengiriman
                </div>
                <div style={{ fontSize: "28px", marginBottom: "4px" }}>🛵</div>
                <div className="product-tile-name" style={{ color: hasGoSendInCart ? "var(--text3)" : "#C2410C" }}>
                  GoSend
                </div>
                <div style={{
                  fontSize: "11px",
                  color: hasGoSendInCart ? "var(--text3)" : "#9A3412",
                  marginTop: "2px",
                  fontStyle: "italic",
                }}>
                  {hasGoSendInCart
                    ? `${formatRupiah(cart.find((i) => i.product_id === GOSEND_ID)?.final_price ?? 0)}`
                    : "Harga sesuai tarif"}
                </div>
              </div>

              {/* ── Produk biasa ── */}
              {filtered.map((p) => {
                const inCart = cart.find((i) => i.product_id === p.id);
                const isOut  = p.stock <= 0;
                return (
                  <div key={p.id} className={`product-tile ${isOut ? "out" : ""}`}
                    onClick={() => !isOut && addToCart(p)}>
                    {isExpired(p.expired_date) && (
                      <div style={{ position: "absolute", top: 6, right: 6 }}>
                        <span className="badge badge-danger" style={{ fontSize: "9px", padding: "2px 6px" }}>Expired</span>
                      </div>
                    )}
                    {inCart && (
                      <div style={{ position: "absolute", top: 6, left: 6 }}>
                        <span className="badge badge-blue" style={{ fontSize: "9px", padding: "2px 6px" }}>{inCart.quantity}×</span>
                      </div>
                    )}
                    {inCart && inCart.discount_type !== "none" && (
                      <div style={{ position: "absolute", bottom: 6, right: 6 }}>
                        <span className="badge badge-warning" style={{ fontSize: "9px", padding: "2px 6px" }}>🏷️ Diskon</span>
                      </div>
                    )}
                    <div className="product-tile-cat">{p.category || "Umum"}</div>
                    <div className="product-tile-name">{p.name}</div>
                    <div className="product-tile-price">{formatRupiah(p.sell_price)}</div>
                    <div className="product-tile-stock">{isOut ? "Habis" : `Stok: ${p.stock}`}</div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px", color: "var(--text3)" }}>
                  Produk tidak ditemukan
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop cart panel */}
        <div className="cart-panel desktop-cart">
          <div className="cart-header">
            🛒 Keranjang
            {cartCount > 0 && <span className="nav-badge" style={{ marginLeft: "8px" }}>{cartCount}</span>}
          </div>
          <CartItemsList />
          <CartFooter />
        </div>
      </div>

      {/* ── MOBILE: sticky bar ── */}
      <div className="mobile-cart-bar" onClick={() => setSheetOpen(true)}>
        <div className="mobile-cart-bar-left">
          <span className="mobile-cart-bar-count">{cartCount}</span>
          <span className="mobile-cart-bar-label">
            {cartCount === 0 ? "Keranjang kosong" : `${cartCount} item dipilih`}
          </span>
        </div>
        <div className="mobile-cart-bar-right">
          <span className="mobile-cart-bar-total">{formatRupiah(totalFinal)}</span>
          <span className="mobile-cart-bar-arrow">▲ Lihat</span>
        </div>
      </div>

      {/* ── MOBILE: bottom sheet ── */}
      {sheetOpen && <div className="sheet-overlay" onClick={() => setSheetOpen(false)} />}
      <div className={`bottom-sheet ${sheetOpen ? "open" : ""}`}>
        <div className="sheet-handle-wrap" onClick={() => setSheetOpen(!sheetOpen)}>
          <div className="sheet-handle" />
          <div className="sheet-header">
            <span style={{ fontWeight: 700, fontSize: "15px" }}>
              🛒 Keranjang
              {cartCount > 0 && <span className="nav-badge" style={{ marginLeft: "8px" }}>{cartCount}</span>}
            </span>
            <button onClick={(e) => { e.stopPropagation(); setSheetOpen(false); }}
              style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text2)", lineHeight: 1 }}>✕</button>
          </div>
        </div>
        <div className="sheet-body"><CartItemsList /></div>
        <div className="sheet-footer"><CartFooter /></div>
      </div>

      {/* ── GoSend Modal ── */}
      {goSendModal && (
        <GoSendModal
          onConfirm={addGoSendToCart}
          onClose={() => setGoSendModal(false)}
        />
      )}

      {/* ── Modal Checkout ── */}
      {paymentModal && (
        <PaymentModal
          totalFinal={totalFinal}
          onConfirm={checkout}
          onClose={() => setPaymentModal(false)}
          processing={processing}
        />
      )}

      {/* ── Modal Diskon ── */}
      {discountModal && (
        <DiscountModal item={discountModal} onSave={applyDiscount} onClose={() => setDiscountModal(null)} />
      )}

      {/* ── Modal Struk ── */}
      {receipt && (
        <Modal
          title={receipt.payment_status === "pending" ? "📋 Transaksi Disimpan (Hutang)" : "✅ Transaksi Berhasil!"}
          onClose={() => setReceipt(null)}
          footer={
            <div style={{ display: "flex", gap: "8px", width: "100%", justifyContent: "flex-end" }}>
              {receipt.payment_status === "pending" && (
                <button className="btn btn-success" onClick={() => setLunasModal(receipt)}>
                  ✅ Tandai Lunas
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => printViaRawBT(receipt)}>🖨️ Cetak Struk</button>
              <button className="btn btn-primary" onClick={() => setReceipt(null)}>Selesai</button>
            </div>
          }
        >
          <div className="receipt">
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "36px" }}>{receipt.payment_status === "pending" ? "🕐" : "🧾"}</div>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>KHK FROZEN FOOD</div>
              <div style={{ color: "var(--text3)", fontSize: "12px" }}>{formatDateTime(receipt.created_at)}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              <PaymentStatusBadge status={receipt.payment_status} />
              <BuyerTypeBadge type={receipt.buyer_type} />
            </div>
            {receipt.buyer_name && (
              <div style={{ textAlign: "center", fontSize: "13px", fontWeight: 600, marginBottom: "12px", color: "var(--primary)" }}>
                {receipt.buyer_type === "cafe" ? "☕" : "👤"} {receipt.buyer_name}
              </div>
            )}

            <div className="receipt-divider" />

            {receipt.items.map((item) => (
              <div key={item.id} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>
                    {item.product_id === GOSEND_ID && "🛵 "}
                    {item.product_name}
                    {item.product_id === GOSEND_ID && (
                      <span style={{ fontWeight: 400, color: "var(--text3)", fontSize: "11px", marginLeft: "4px" }}>(Ongkir)</span>
                    )}
                  </span>
                  <span style={{ fontWeight: 700 }}>{formatRupiah(item.subtotal)}</span>
                </div>
                {item.product_id !== GOSEND_ID && (
                  <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                    {item.quantity} × {formatRupiah(item.sell_price)}
                    {item.discount_type !== "none" && item.discount_amount > 0 && (
                      <span style={{ color: "var(--warning)", marginLeft: "8px" }}>
                        🏷️ Diskon {item.discount_type === "percent" ? `${item.discount_value}%` : formatRupiah(item.discount_value)}
                        {" (−"}{formatRupiah(item.discount_amount * item.quantity)}{")"}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="receipt-divider" />
            {receipt.total_discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "var(--warning)" }}>
                <span>🏷️ Total Diskon</span>
                <span className="td-mono">− {formatRupiah(receipt.total_discount)}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "16px" }}>
              <span>TOTAL</span>
              <span className="td-mono">{formatRupiah(receipt.total_amount)}</span>
            </div>

            {receipt.payment_status === "pending" && (
              <div style={{ marginTop: "12px", padding: "10px 14px", background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: "var(--radius-sm)", fontSize: "12px", color: "#92400E", textAlign: "center" }}>
                🕐 Stok sudah dikurangi. Pembayaran belum diterima.
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── Modal Tandai Lunas ── */}
      {lunasModal && (
        <LunasModal
          tx={lunasModal}
          onConfirm={handleLunas}
          onClose={() => setLunasModal(null)}
          processing={lunasProcessing}
        />
      )}
    </div>
  );
}