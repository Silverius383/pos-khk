// app/transactions/TransactionsClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Product, CartItem, Transaction } from "@/types";
import { formatRupiah } from "@/utils/currency";
import { formatDateTime, isExpired } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import { SearchIcon, TrashIcon } from "@/components/ui/Icons";

interface TransactionsClientProps {
  initialProducts: Product[];
}

export default function TransactionsClient({ initialProducts }: TransactionsClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const [processing, setProcessing] = useState(false);
  const [receipt, setReceipt] = useState<Transaction | null>(null);
  const [error, setError] = useState("");

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
          product_id: prod.id,
          product_name: prod.name,
          sell_price: prod.sell_price,
          buy_price: prod.buy_price,
          quantity: 1,
          max_qty: prod.stock,
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

  const removeItem = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const total = cart.reduce((s, i) => s + i.sell_price * i.quantity, 0);
  const profit = cart.reduce((s, i) => s + (i.sell_price - i.buy_price) * i.quantity, 0);

  const checkout = async () => {
    if (cart.length === 0) return;
    setProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Gagal memproses transaksi");
        return;
      }

      // Update local product stock
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

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="pos-layout">
        {/* ── Products Panel ── */}
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

          <div className="product-grid">
            {filtered.map((p) => {
              const inCart = cart.find((i) => i.product_id === p.id);
              const isOut = p.stock <= 0;

              return (
                <div
                  key={p.id}
                  className={`product-tile ${isOut ? "out" : ""}`}
                  onClick={() => !isOut && addToCart(p)}
                >
                  {isExpired(p.expired_date) && (
                    <div style={{ position: "absolute", top: 6, right: 6 }}>
                      <span className="badge badge-danger" style={{ fontSize: "9px", padding: "2px 6px" }}>
                        Expired
                      </span>
                    </div>
                  )}
                  {inCart && (
                    <div style={{ position: "absolute", top: 6, left: 6 }}>
                      <span className="badge badge-blue" style={{ fontSize: "9px", padding: "2px 6px" }}>
                        {inCart.quantity}×
                      </span>
                    </div>
                  )}
                  <div className="product-tile-cat">{p.category || "Umum"}</div>
                  <div className="product-tile-name">{p.name}</div>
                  <div className="product-tile-price">{formatRupiah(p.sell_price)}</div>
                  <div className="product-tile-stock">
                    {isOut ? "Habis" : `Stok: ${p.stock}`}
                  </div>
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

        {/* ── Cart Panel ── */}
        <div className="cart-panel">
          <div className="cart-header">
            🛒 Keranjang
            {cartCount > 0 && (
              <span className="nav-badge" style={{ marginLeft: "8px" }}>{cartCount}</span>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="cart-empty">
              <div style={{ fontSize: "40px" }}>🛒</div>
              <div style={{ fontWeight: 600 }}>Keranjang kosong</div>
              <div style={{ fontSize: "13px" }}>Pilih produk di sebelah kiri</div>
            </div>
          ) : (
            <div className="cart-items">
              {cart.map((item) => (
                <div key={item.product_id} className="cart-item">
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.product_name}</div>
                    <div className="cart-item-price">
                      {formatRupiah(item.sell_price)} × {item.quantity} ={" "}
                      <strong>{formatRupiah(item.sell_price * item.quantity)}</strong>
                    </div>
                  </div>
                  <div className="cart-qty">
                    <button className="qty-btn" onClick={() => updateQty(item.product_id, -1)}>
                      −
                    </button>
                    <div className="qty-val">{item.quantity}</div>
                    <button className="qty-btn" onClick={() => updateQty(item.product_id, 1)}>
                      +
                    </button>
                    <button
                      className="btn-icon danger"
                      onClick={() => removeItem(item.product_id)}
                      style={{ padding: "4px" }}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="cart-footer">
            <div className="cart-total-row">
              <span className="text-muted">Subtotal</span>
              <span className="cart-total-val td-mono">{formatRupiah(total)}</span>
            </div>
            <div className="cart-total-row">
              <span className="text-muted">Est. Profit</span>
              <span className="cart-total-val td-mono text-success">{formatRupiah(profit)}</span>
            </div>
            <div className="cart-total-row big">
              <span>TOTAL</span>
              <span className="cart-total-val">{formatRupiah(total)}</span>
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

      {/* Receipt Modal */}
      {receipt && (
        <Modal
          title="✅ Transaksi Berhasil!"
          onClose={() => setReceipt(null)}
          footer={
            <button className="btn btn-primary" onClick={() => setReceipt(null)}>
              Selesai
            </button>
          }
        >
          <div className="receipt">
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "36px" }}>🧾</div>
              <div style={{ fontWeight: 700, fontSize: "15px" }}>TOKO FROZEN FOOD</div>
              <div style={{ color: "var(--text3)", fontSize: "12px" }}>
                {formatDateTime(receipt.created_at)}
              </div>
            </div>

            <div className="receipt-divider" />

            {receipt.items.map((item) => (
              <div
                key={item.id}
                style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}
              >
                <span>
                  {item.product_name}
                  <br />
                  <span style={{ fontSize: "11px", color: "var(--text3)" }}>
                    {item.quantity} × {formatRupiah(item.sell_price)}
                  </span>
                </span>
                <span style={{ fontWeight: 700 }}>
                  {formatRupiah(item.sell_price * item.quantity)}
                </span>
              </div>
            ))}

            <div className="receipt-divider" />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                fontSize: "16px",
              }}
            >
              <span>TOTAL</span>
              <span>{formatRupiah(receipt.total_amount)}</span>
            </div>

            <div className="receipt-divider" />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "var(--success)",
              }}
            >
              <span>Profit Transaksi</span>
              <span style={{ fontWeight: 700 }}>{formatRupiah(receipt.total_profit)}</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
