// app/restock/RestockClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Product } from "@/types";
import { formatRupiah } from "@/utils/currency";
import { SearchIcon, CheckIcon, PlusIcon } from "@/components/ui/Icons";
import Modal from "@/components/ui/Modal";

interface RestockClientProps {
  initialProducts: Product[];
}

export default function RestockClient({ initialProducts }: RestockClientProps) {
  const router = useRouter();
  const [products, setProducts]   = useState<Product[]>(initialProducts);
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Restock modal
  const [modal, setModal]         = useState<Product | null>(null);
  const [inputQty, setInputQty]   = useState("1");
  const [modalMode, setModalMode] = useState<"tambah" | "koreksi">("tambah");
  const [koreksiAlasan, setKoreksiAlasan] = useState("");

  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products]
  );

  const filtered = useMemo(
    () => products.filter((p) => {
      const mc = catFilter === "Semua" || p.category === catFilter;
      const ms = p.name.toLowerCase().includes(search.toLowerCase()) ||
                 (p.category || "").toLowerCase().includes(search.toLowerCase());
      return mc && ms;
    }),
    [products, search, catFilter]
  );

  const openModal = (p: Product) => {
    setModal(p);
    setInputQty("1");
    setModalMode("tambah");
    setKoreksiAlasan("");
    setError("");
  };

  const handleRestock = async () => {
    if (!modal) return;
    const qty = parseInt(inputQty) || 0;
    if (qty <= 0) { setError("Jumlah harus lebih dari 0"); return; }
    if (modalMode === "koreksi" && !koreksiAlasan.trim()) {
      setError("Alasan koreksi wajib diisi");
      return;
    }
    if (modalMode === "koreksi" && qty > modal.stock) {
      setError(`Stok tidak cukup. Stok saat ini: ${modal.stock}`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res  = await fetch(`/api/products/${modal.id}/restock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qty,
          type: modalMode === "koreksi" ? "decrement" : "increment",
          reason: modalMode === "koreksi" ? koreksiAlasan.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error || "Gagal update stok"); return; }

      setProducts((prev) =>
        prev.map((p) => p.id === modal.id ? { ...p, stock: data.data.stock } : p)
      );
      const msg = modalMode === "koreksi"
        ? `✅ ${modal.name} stok dikurangi ${qty} (${koreksiAlasan.trim()}) → sisa ${data.data.stock}`
        : `✅ ${modal.name} berhasil ditambah ${qty} stok → total ${data.data.stock}`;
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 3500);
      setModal(null);
      router.refresh();
    } catch {
      setError("Gagal menghubungi server.");
    } finally {
      setSaving(false);
    }
  };

  const getStockBadge = (p: Product) => {
    if (p.stock === 0) return <span className="badge badge-danger">Habis</span>;
    if (p.stock <= p.min_stock) return <span className="badge badge-warning">⚠️ Hampir habis</span>;
    return <span className="badge badge-success">{p.stock}</span>;
  };

  return (
    <div>
      {error && !modal && (
        <div className="alert alert-danger" style={{ marginBottom: "16px" }}>{error}</div>
      )}

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between" }}>
          <span>{successMsg}</span>
          <button style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
            onClick={() => setSuccessMsg(null)}>✕</button>
        </div>
      )}

      {/* Search + filter */}
      <div className="search-wrap">
        <span className="search-icon"><SearchIcon /></span>
        <input className="form-input" placeholder="Cari produk..." value={search}
          onChange={(e) => setSearch(e.target.value)} style={{ paddingRight: search ? "32px" : undefined }} />
        {search && (
          <button onClick={() => setSearch("")} style={{
            position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "16px", lineHeight: 1,
          }}>✕</button>
        )}
      </div>

      <div className="filter-bar">
        {categories.map((c) => (
          <button key={c} className={`tag ${catFilter === c ? "active" : ""}`}
            onClick={() => setCatFilter(c)}>{c}</button>
        ))}
      </div>

      {/* Product table */}
      <div className="card">
        <div className="table-wrap products-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Stok</th>
                <th>Min. Stok</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--text3)" }}>
                    Tidak ada produk
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text3)" }}>{formatRupiah(p.sell_price)}</div>
                  </td>
                  <td>
                    <span className="badge badge-gray">{p.category || "—"}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {p.stock > 0 && p.stock <= p.min_stock && (
                        <span style={{ fontSize: "12px", color: "var(--warning)", fontWeight: 600 }}>
                          {p.stock}
                        </span>
                      )}
                      {getStockBadge(p)}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: "13px", color: "var(--text2)" }}>{p.min_stock}</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => openModal(p)}
                    >
                      <PlusIcon size={13} /> Restock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restock modal */}
      {modal && (
        <Modal
          title={`📦 ${modalMode === "koreksi" ? "Koreksi Stok" : "Restock"} — ${modal.name}`}
          onClose={() => { if (!saving) setModal(null); }}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>Batal</button>
              <button
                className={`btn ${modalMode === "koreksi" ? "btn-danger" : "btn-primary"}`}
                onClick={handleRestock} disabled={saving}>
                <CheckIcon /> {saving ? "Menyimpan..." : modalMode === "koreksi" ? "Kurangi Stok" : "Tambah Stok"}
              </button>
            </>
          }
        >
          {/* Toggle mode */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
            <button
              onClick={() => { setModalMode("tambah"); setError(""); }}
              style={{
                padding: "10px", borderRadius: "8px", fontFamily: "inherit", cursor: "pointer",
                border: `2px solid ${modalMode === "tambah" ? "var(--primary)" : "var(--border)"}`,
                background: modalMode === "tambah" ? "var(--primary-light)" : "var(--surface)",
                fontWeight: 700, fontSize: "13px",
                color: modalMode === "tambah" ? "var(--primary)" : "var(--text2)",
              }}>
              ➕ Tambah Stok
            </button>
            <button
              onClick={() => { setModalMode("koreksi"); setError(""); }}
              style={{
                padding: "10px", borderRadius: "8px", fontFamily: "inherit", cursor: "pointer",
                border: `2px solid ${modalMode === "koreksi" ? "var(--danger)" : "var(--border)"}`,
                background: modalMode === "koreksi" ? "var(--danger-light)" : "var(--surface)",
                fontWeight: 700, fontSize: "13px",
                color: modalMode === "koreksi" ? "var(--danger)" : "var(--text2)",
              }}>
              ✏️ Koreksi / Opname
            </button>
          </div>

          {/* Info produk */}
          <div style={{
            background: "var(--surface2)", borderRadius: "var(--radius-sm)",
            padding: "14px 16px", marginBottom: "20px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
              <span className="text-muted">Kategori</span>
              <span className="badge badge-gray">{modal.category || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "8px" }}>
              <span className="text-muted">Stok saat ini</span>
              <span style={{ fontWeight: 700 }}>{getStockBadge(modal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span className="text-muted">Stok minimum</span>
              <span style={{ fontWeight: 600 }}>{modal.min_stock}</span>
            </div>
          </div>

          {/* Input qty */}
          <div className="form-group">
            <label className="form-label">
              {modalMode === "koreksi" ? "Jumlah yang Dikurangi" : "Jumlah yang Ditambahkan"}
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button className="qty-btn" style={{ width: "40px", height: "40px" }}
                onClick={() => setInputQty(String(Math.max(1, (parseInt(inputQty) || 1) - 1)))}>−</button>
              <input
                className="form-input"
                type="number" min="1"
                value={inputQty}
                onChange={(e) => setInputQty(e.target.value)}
                style={{ fontSize: "22px", fontWeight: 800, textAlign: "center", flex: 1 }}
                autoFocus
              />
              <button className="qty-btn" style={{ width: "40px", height: "40px" }}
                onClick={() => setInputQty(String((parseInt(inputQty) || 0) + 1))}>+</button>
            </div>
          </div>

          {/* Alasan koreksi */}
          {modalMode === "koreksi" && (
            <div className="form-group">
              <label className="form-label">Alasan Koreksi *</label>
              <input
                className="form-input"
                placeholder="Contoh: expired dibuang, rusak freezer mati..."
                value={koreksiAlasan}
                onChange={(e) => setKoreksiAlasan(e.target.value)}
              />
            </div>
          )}

          {error && <div className="alert alert-danger">{error}</div>}

          {/* Preview */}
          {parseInt(inputQty) > 0 && (
            <div style={{
              padding: "12px 16px", borderRadius: "var(--radius-sm)",
              background: modalMode === "koreksi" ? "var(--danger-light)" : "var(--success-light)",
              border: `1px solid ${modalMode === "koreksi" ? "#FCA5A5" : "#6EE7B7"}`,
              display: "flex", justifyContent: "space-between",
              fontSize: "14px", fontWeight: 600,
              color: modalMode === "koreksi" ? "var(--danger)" : "var(--success)",
            }}>
              <span>Stok setelah {modalMode === "koreksi" ? "koreksi" : "restock"}</span>
              <span>
                {modal.stock} {modalMode === "koreksi" ? "−" : "+"} {parseInt(inputQty) || 0} ={" "}
                <strong>
                  {modalMode === "koreksi"
                    ? Math.max(0, modal.stock - (parseInt(inputQty) || 0))
                    : modal.stock + (parseInt(inputQty) || 0)}
                </strong>
              </span>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}