// app/transactions/TransactionsClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Product, CartItem, Transaction, DiscountType } from "@/types";
import { formatRupiah, calculateDiscountAmount, calculateFinalPrice } from "@/utils/currency";
import { formatDateTime, isExpired } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import { SearchIcon, TrashIcon, EditIcon } from "@/components/ui/Icons";

interface TransactionsClientProps {
  initialProducts: Product[];
}

// Modal untuk edit diskon satu item keranjang
function DiscountModal({
  item,
  onSave,
  onClose,
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
    if (type === "none") {
      onSave(item.product_id, "none", 0);
    } else if (isValid) {
      onSave(item.product_id, type, numVal);
    }
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
      {/* Tipe diskon */}
      <div className="form-group">
        <label className="form-label">Tipe Diskon</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {(["none", "percent", "nominal"] as DiscountType[]).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); if (t === "none") setValue(""); }}
              style={{
                padding: "10px",
                borderRadius: "8px",
                border: `2px solid ${type === t ? "var(--primary)" : "var(--border)"}`,
                background: type === t ? "var(--primary-light)" : "var(--surface)",
                color: type === t ? "var(--primary)" : "var(--text2)",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "inherit",
              }}
            >
              {t === "none" ? "Tidak Ada" : t === "percent" ? "Persen (%)" : "Nominal (Rp)"}
            </button>
          ))}
        </div>
      </div>

      {/* Input nilai diskon */}
      {type !== "none" && (
        <div className="form-group">
          <label className="form-label">
            {type === "percent" ? "Besar Diskon (%)" : "Besar Diskon (Rp)"}
          </label>
          <input
            className="form-input"
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === "percent" ? "Contoh: 10" : "Contoh: 5000"}
            min={0}
            max={type === "percent" ? 100 : item.sell_price}
            autoFocus
            style={{ fontSize: "16px", padding: "12px" }}
          />
          {type === "percent" && numVal > 100 && (
            <div style={{ color: "var(--danger)", fontSize: "12px", marginTop: "4px" }}>
              Maksimal 100%
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      <div style={{
        background: "var(--surface2)",
        borderRadius: "8px",
        padding: "14px",
        marginTop: "4px",
      }}>
        <div style={{ fontSize: "13px", color: "var(--text2)", marginBottom: "8px", fontWeight: 600 }}>
          Preview Harga
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
          <span style={{ color: "var(--text2)" }}>Harga Normal</span>
          <span className="td-mono">{formatRupiah(item.sell_price)}</span>
        </div>
        {type !== "none" && discountAmt > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
            <span style={{ color: "var(--danger)" }}>
              Diskon {type === "percent" ? `${numVal}%` : "Nominal"}
            </span>
            <span className="td-mono" style={{ color: "var(--danger)" }}>
              − {formatRupiah(discountAmt)}
            </span>
          </div>
        )}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "15px",
          fontWeight: 800,
          paddingTop: "8px",
          borderTop: "1px solid var(--border)",
          marginTop: "4px",
        }}>
          <span>Harga Akhir</span>
          <span className="td-mono" style={{ color: "var(--primary)" }}>
            {formatRupiah(finalPriceVal)}
          </span>
        </div>
      </div>
    </Modal>
  );
}

export default function TransactionsClient({ initialProducts }: TransactionsClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [search, setSearch]     = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt]   = useState<Transaction | null>(null);
  const [error, setError]       = useState("");
  const [discountModal, setDiscountModal] = useState<CartItem | null>(null);

  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products]
  );

  const filtered = useMemo(
    () =>
      products.filter((p) => {
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
        return prev.map((i) =>
          i.product_id === prod.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          product_id:      prod.id,
          product_name:    prod.name,
          sell_price:      prod.sell_price,
          buy_price:       prod.buy_price,
          quantity:        1,
          max_qty:         prod.stock,
          discount_type:   "none",
          discount_value:  0,
          discount_amount: 0,
          final_price:     prod.sell_price,
        },
      ];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== productId) return i;
          const nq = i.quantity + delta;
          if (nq <= 0) return null as unknown as CartItem;
          if (nq > i.max_qty) return i;
          return { ...i, quantity: nq };
        })
        .filter(Boolean)
    );
  };

  const removeItem = (productId: string) => setCart((prev) => prev.filter((i) => i.product_id !== productId));

  // Terapkan diskon ke item keranjang
  const applyDiscount = (productId: string, type: DiscountType, value: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId) return i;
        const discountAmount = calculateDiscountAmount(i.sell_price, type, value);
        const finalPrice     = calculateFinalPrice(i.sell_price, type, value);
        return { ...i, discount_type: type, discount_value: value, discount_amount: discountAmount, final_price: finalPrice };
      })
    );
    setDiscountModal(null);
  };

  // Kalkulasi total keranjang
  const subtotalNormal  = cart.reduce((s, i) => s + i.sell_price * i.quantity, 0);
  const totalDiscount   = cart.reduce((s, i) => s + i.discount_amount * i.quantity, 0);
  const totalFinal      = cart.reduce((s, i) => s + i.final_price * i.quantity, 0);
  const estimasiProfit  = cart.reduce((s, i) => s + (i.final_price - i.buy_price) * i.quantity, 0);
  const cartCount       = cart.reduce((s, i) => s + i.quantity, 0);
  const hasDiscount     = cart.some((i) => i.discount_type !== "none" && i.discount_amount > 0);

  const checkout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          items: cart.map((i) => ({
            product_id:     i.product_id,
            quantity:       i.quantity,
            discount_type:  i.discount_type,
            discount_value: i.discount_value,
          })),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Gagal memproses transaksi");
        return;
      }

      // Update stok lokal
      setProducts((prev) =>
        prev.map((p) => {
          const item = cart.find((i) => i.product_id === p.id);
          return item ? { ...p, stock: p.stock - item.quantity } : p;
        })
      );

      setReceipt(data.data);
      setCart([]);
      router.refresh();
    } catch {
      setError("Gagal memproses transaksi. Coba lagi.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="pos-layout">
        {/* ── Panel Produk ── */}
        <div className="pos-products">
          <div className="search-wrap">
            <span className="search-icon"><SearchIcon /></span>
            <input
              className="form-input"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="filter-bar">
            {categories.map((c) => (
              <button
                key={c}
                className={`tag ${catFilter === c ? "active" : ""}`}
                onClick={() => setCatFilter(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="product-grid-wrap">
            <div className="product-grid">
              {filtered.map((p) => {
                const inCart = cart.find((i) => i.product_id === p.id);
                const isOut  = p.stock <= 0;
                return (
                  <div
                    key={p.id}
                    className={`product-tile ${isOut ? "out" : ""}`}
                    onClick={() => !isOut && addToCart(p)}
                  >
                    {isExpired(p.expired_date) && (
                      <div style={{ position: "absolute", top: 6, right: 6 }}>
                        <span className="badge badge-danger" style={{ fontSize: "9px", padding: "2px 6px" }}>Expired</span>
                      </div>
                    )}
                    {inCart && (
                      <div style={{ position: "absolute", top: 6, left: 6 }}>
                        <span className="badge badge-blue" style={{ fontSize: "9px", padding: "2px 6px" }}>
                          {inCart.quantity}×
                        </span>
                      </div>
                    )}
                    {inCart && inCart.discount_type !== "none" && (
                      <div style={{ position: "absolute", bottom: 6, right: 6 }}>
                        <span className="badge badge-warning" style={{ fontSize: "9px", padding: "2px 6px" }}>
                          🏷️ Diskon
                        </span>
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

        {/* ── Panel Keranjang ── */}
        <div className="cart-panel">
          <div className="cart-header">
            🛒 Keranjang
            {cartCount > 0 && <span className="nav-badge" style={{ marginLeft: "8px" }}>{cartCount}</span>}
          </div>

          {cart.length === 0 ? (
            <div className="cart-empty">
              <div style={{ fontSize: "40px" }}>🛒</div>
              <div style={{ fontWeight: 600 }}>Keranjang kosong</div>
              <div style={{ fontSize: "13px" }}>Pilih produk di sebelah kiri</div>
            </div>
          ) : (
            <div className="cart-items">
              {cart.map((item) => {
                const hasItemDiscount = item.discount_type !== "none" && item.discount_amount > 0;
                return (
                  <div key={item.product_id} className="cart-item" style={{ flexDirection: "column", gap: "8px" }}>
                    {/* Baris atas: nama + kontrol qty */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.product_name}</div>
                        <div className="cart-item-price">
                          {hasItemDiscount ? (
                            <>
                              <span style={{ textDecoration: "line-through", color: "var(--text3)" }}>
                                {formatRupiah(item.sell_price)}
                              </span>
                              {" → "}
                              <strong style={{ color: "var(--primary)" }}>
                                {formatRupiah(item.final_price)}
                              </strong>
                            </>
                          ) : (
                            <span>{formatRupiah(item.sell_price)}</span>
                          )}
                          {" × "}{item.quantity}{" = "}
                          <strong>{formatRupiah(item.final_price * item.quantity)}</strong>
                        </div>
                      </div>
                      <div className="cart-qty">
                        <button className="qty-btn" onClick={() => updateQty(item.product_id, -1)}>−</button>
                        <div className="qty-val">{item.quantity}</div>
                        <button className="qty-btn" onClick={() => updateQty(item.product_id, 1)}>+</button>
                        <button className="btn-icon danger" onClick={() => removeItem(item.product_id)} style={{ padding: "4px" }}>
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Baris bawah: badge diskon + tombol edit diskon */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      {hasItemDiscount ? (
                        <span className="badge badge-warning" style={{ fontSize: "11px" }}>
                          🏷️ Diskon{" "}
                          {item.discount_type === "percent"
                            ? `${item.discount_value}%`
                            : formatRupiah(item.discount_value)}
                          {" (−"}{formatRupiah(item.discount_amount * item.quantity)}{")"}
                        </span>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--text3)" }}>Tidak ada diskon</span>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: "4px 10px", fontSize: "12px" }}
                        onClick={() => setDiscountModal(item)}
                      >
                        <EditIcon size={12} /> {hasItemDiscount ? "Ubah" : "Tambah"} Diskon
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer total */}
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
              onClick={checkout}
              disabled={cart.length === 0 || processing}
            >
              {processing ? "⏳ Memproses..." : "✅ Proses Transaksi"}
            </button>

            {cart.length > 0 && (
              <button
                className="btn btn-ghost"
                style={{ width: "100%", marginTop: "8px" }}
                onClick={() => setCart([])}
              >
                Kosongkan Keranjang
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Diskon */}
      {discountModal && (
        <DiscountModal
          item={discountModal}
          onSave={applyDiscount}
          onClose={() => setDiscountModal(null)}
        />
      )}

      {/* Modal Struk */}
      {receipt && (
        <Modal
          title="✅ Transaksi Berhasil!"
          onClose={() => setReceipt(null)}
          footer={<button className="btn btn-primary" onClick={() => setReceipt(null)}>Selesai</button>}
        >
          <div className="receipt">
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "36px" }}>🧾</div>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>KHK FROZEN FOOD</div>
              <div style={{ color: "var(--text3)", fontSize: "12px" }}>{formatDateTime(receipt.created_at)}</div>
            </div>
            <div className="receipt-divider" />

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
                      🏷️ Diskon{" "}
                      {item.discount_type === "percent"
                        ? `${item.discount_value}%`
                        : formatRupiah(item.discount_value / item.quantity)}
                      {" → "}{formatRupiah(item.final_price)}/pcs
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div className="receipt-divider" />

            {receipt.total_discount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--warning)", marginBottom: "6px", fontSize: "13px" }}>
                <span>Total Diskon</span>
                <span style={{ fontWeight: 700 }}>− {formatRupiah(receipt.total_discount)}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: "16px" }}>
              <span>TOTAL BAYAR</span>
              <span>{formatRupiah(receipt.total_amount)}</span>
            </div>
            <div className="receipt-divider" />
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--success)" }}>
              <span>Profit Transaksi</span>
              <span style={{ fontWeight: 700 }}>{formatRupiah(receipt.total_profit)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
