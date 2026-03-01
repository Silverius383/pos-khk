// app/transactions/TransactionsClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Product, CartItem, Transaction, DiscountType, PaymentMethod } from "@/types";
import { formatRupiah, calculateDiscountAmount, calculateFinalPrice } from "@/utils/currency";
import { formatDateTime, isExpired } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import { SearchIcon, TrashIcon, EditIcon } from "@/components/ui/Icons";

interface TransactionsClientProps {
  initialProducts: Product[];
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; color: string }[] = [
  { value: "tunai",    label: "Tunai",    icon: "💵", color: "#057A55" },
  { value: "transfer", label: "Transfer", icon: "🏦", color: "#1C64F2" },
  { value: "qris",     label: "QRIS",     icon: "📱", color: "#7C3AED" },
];

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

// ── Payment Method Modal ───────────────────────────────────────────────────────
function PaymentModal({
  totalFinal, onConfirm, onClose, processing,
}: {
  totalFinal: number;
  onConfirm: (method: PaymentMethod) => void;
  onClose: () => void;
  processing: boolean;
}) {
  const [selected, setSelected] = useState<PaymentMethod>("tunai");
  const [cashInput, setCashInput] = useState("");

  const cashAmount  = parseInt(cashInput.replace(/\D/g, "")) || 0;
  const cashChange  = cashAmount - totalFinal;
  const isValidCash = selected !== "tunai" || cashAmount >= totalFinal;

  const formatCashInput = (val: string) => {
    const num = val.replace(/\D/g, "");
    return num ? parseInt(num).toLocaleString("id-ID") : "";
  };

  return (
    <Modal
      title="💳 Pilih Metode Pembayaran"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={processing}>Batal</button>
          <button
            className="btn btn-success"
            onClick={() => onConfirm(selected)}
            disabled={processing || !isValidCash}
          >
            {processing ? "⏳ Memproses..." : "✅ Konfirmasi"}
          </button>
        </>
      }
    >
      {/* Total */}
      <div style={{
        background: "var(--surface2)", borderRadius: "var(--radius-sm)",
        padding: "16px", textAlign: "center", marginBottom: "20px",
      }}>
        <div style={{ fontSize: "13px", color: "var(--text2)", marginBottom: "4px" }}>Total Pembayaran</div>
        <div style={{ fontSize: "28px", fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: "var(--primary)" }}>
          {formatRupiah(totalFinal)}
        </div>
      </div>

      {/* Method picker */}
      <div className="form-group">
        <label className="form-label">Metode Pembayaran</label>
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
      </div>

      {/* Cash input + change calculator */}
      {selected === "tunai" && (
        <div className="form-group" style={{ marginTop: "4px" }}>
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
              marginTop: "10px", padding: "12px 16px",
              borderRadius: "var(--radius-sm)",
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
                display: "flex", justifyContent: "space-between",
                fontWeight: 800, fontSize: "16px",
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
        <div style={{
          padding: "12px 16px", borderRadius: "var(--radius-sm)",
          background: "#EBF0FF", border: "1px solid #93C5FD", fontSize: "13px", color: "var(--primary)"
        }}>
          🏦 Pastikan transfer sudah diterima sebelum konfirmasi.
        </div>
      )}

      {selected === "qris" && (
        <div style={{
          padding: "12px 16px", borderRadius: "var(--radius-sm)",
          background: "#F3E8FF", border: "1px solid #C4B5FD", fontSize: "13px", color: "#7C3AED"
        }}>
          📱 Pastikan notifikasi QRIS sudah masuk sebelum konfirmasi.
        </div>
      )}
    </Modal>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TransactionsClient({ initialProducts }: TransactionsClientProps) {
  const router = useRouter();
  const [products, setProducts]     = useState<Product[]>(initialProducts);
  const [cart, setCart]             = useState<CartItem[]>([]);
  const [search, setSearch]         = useState("");
  const [catFilter, setCatFilter]   = useState("Semua");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt]       = useState<Transaction | null>(null);
  const [error, setError]           = useState("");
  const [discountModal, setDiscountModal] = useState<CartItem | null>(null);
  const [paymentModal, setPaymentModal]   = useState(false);
  const [sheetOpen, setSheetOpen]         = useState(false);

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

  const updateQty = (productId: string, delta: number) => {
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

  const checkout = async (method: PaymentMethod) => {
    if (cart.length === 0) return;
    setProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          payment_method: method,
          items: cart.map((i) => ({
            product_id:     i.product_id,
            quantity:       i.quantity,
            discount_type:  i.discount_type,
            discount_value: i.discount_value,
          })),
        }),
      });

      const data = await res.json();
      if (!data.success) { setError(data.error || "Gagal memproses transaksi"); return; }

      setProducts((prev) => prev.map((p) => {
        const item = cart.find((i) => i.product_id === p.id);
        return item ? { ...p, stock: p.stock - item.quantity } : p;
      }));

      setReceipt(data.data);
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

  // ── Cart Items (shared) ────────────────────────────────────────────────────
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
            const hasItemDiscount = item.discount_type !== "none" && item.discount_amount > 0;
            return (
              <div key={item.product_id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.product_name}</div>
                  <div className="cart-item-price">
                    {formatRupiah(item.final_price)} × {item.quantity} ={" "}
                    <strong>{formatRupiah(item.final_price * item.quantity)}</strong>
                  </div>
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
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div className="cart-qty">
                    <button className="qty-btn" onClick={() => updateQty(item.product_id, -1)}>−</button>
                    <span className="qty-val">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.product_id, +1)}>+</button>
                  </div>
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

      {/* Tombol Proses → buka PaymentModal */}
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
          <div className="product-grid">
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

      {/* ── Modal Pilih Metode Bayar ── */}
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
        <Modal title="✅ Transaksi Berhasil!" onClose={() => setReceipt(null)}
          footer={<button className="btn btn-primary" onClick={() => setReceipt(null)}>Selesai</button>}>
          <div className="receipt">
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "36px" }}>🧾</div>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>KHK FROZEN FOOD</div>
              <div style={{ color: "var(--text3)", fontSize: "12px" }}>{formatDateTime(receipt.created_at)}</div>
            </div>
            <div className="receipt-divider" />

            {/* Badge metode pembayaran */}
            <div style={{ textAlign: "center", marginBottom: "12px" }}>
              {(() => {
                const m = PAYMENT_METHODS.find((p) => p.value === receipt.payment_method);
                return (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "4px 14px", borderRadius: "99px", fontSize: "12px", fontWeight: 700,
                    background: `${m?.color}18`, color: m?.color, border: `1px solid ${m?.color}40`,
                  }}>
                    {m?.icon} {m?.label}
                  </span>
                );
              })()}
            </div>

            {receipt.items.map((item) => (
              <div key={item.id} style={{ marginBottom: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600 }}>{item.product_name}</span>
                  <span style={{ fontWeight: 700 }}>{formatRupiah(item.subtotal)}</span>
                </div>
                <div style={{ fontSize: "11px", color: "var(--text3)" }}>
                  {item.quantity} × {formatRupiah(item.sell_price)}
                  {item.discount_type !== "none" && item.discount_amount > 0 && (
                    <span style={{ color: "var(--warning)", marginLeft: "8px" }}>
                      🏷️ Diskon {item.discount_type === "percent" ? `${item.discount_value}%` : formatRupiah(item.discount_value)}
                      {" (−"}{formatRupiah(item.discount_amount * item.quantity)}{")"}
                    </span>
                  )}
                </div>
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
          </div>
        </Modal>
      )}
    </div>
  );
}