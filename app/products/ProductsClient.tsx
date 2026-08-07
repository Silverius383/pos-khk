// app/products/ProductsClient.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Product, ProductFormData } from "@/types";
import { formatRupiah, calculateMarginPercent } from "@/utils/currency";
import { formatDateShort, isExpired, isNearExpiry } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import {
  PlusIcon, EditIcon, TrashIcon, CheckIcon,
  SearchIcon,
} from "@/components/ui/Icons";

const EMPTY_FORM: ProductFormData = {
  name: "", category: "", buy_price: 0, sell_price: 0,
  stock: 0, min_stock: 5, expired_date: "",
};



interface ProductsClientProps {
  initialProducts: Product[];
}

type ModalType = "add" | "edit" | "delete" | null;

// ── Searchable Category ──────────────────────────────────────────────────────
function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen]           = useState(false);
  const [search, setSearch]       = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCat, setNewCat]       = useState("");
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState("");

  // Fetch kategori dari API saat mount
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); })
      .catch(() => {});
  }, []);

  const filtered = useMemo(
    () => categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch("");
  };

  const handleAdd = async () => {
    const name = newCat.trim();
    if (!name) return;
    setAdding(true);
    setAddError("");
    try {
      const res  = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.success) {
        setAddError(data.error || "Gagal menambah kategori");
        return;
      }
      setCategories((prev) => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCat("");
      onChange(data.data.name); // langsung pilih kategori baru
    } catch {
      setAddError("Gagal menambah kategori");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, cat: { id: string; name: string }) => {
    e.stopPropagation();
    if (!confirm(`Hapus kategori "${cat.name}"?`)) return;
    try {
      const res  = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) { setAddError(data.error || "Gagal menghapus"); return; }
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      if (value === cat.name) onChange("");
    } catch {
      setAddError("Gagal menghapus kategori");
    }
  };

  return (
    <div>
      {/* Trigger */}
      <div
        className="form-input"
        onClick={() => { setOpen((o) => !o); setSearch(""); setAddError(""); }}
        style={{
          cursor: "pointer", display: "flex", justifyContent: "space-between",
          alignItems: "center", userSelect: "none",
          color: value ? "var(--text)" : "var(--text3)",
          borderBottomLeftRadius:  open ? 0 : undefined,
          borderBottomRightRadius: open ? 0 : undefined,
          borderBottom: open ? "1.5px solid var(--primary)" : undefined,
        }}
      >
        <span style={{ fontSize: "14px" }}>{value || "Pilih kategori..."}</span>
        <span style={{
          fontSize: "10px", color: "var(--text3)",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.15s", display: "inline-block",
        }}>▼</span>
      </div>

      {open && (
        <div style={{
          border: "1.5px solid var(--primary)", borderTop: "none",
          borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
          background: "var(--surface)", zIndex: 10, boxShadow: "var(--shadow-md)",
        }}>
          {/* Search */}
          <div style={{ padding: "8px" }}>
            <input
              autoFocus
              className="form-input"
              style={{ fontSize: "13px", padding: "7px 10px" }}
              placeholder="Cari kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* List */}
          <div style={{ maxHeight: "180px", overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "10px 14px", color: "var(--text3)", fontSize: "13px" }}>
                {categories.length === 0 ? "Belum ada kategori" : "Tidak ditemukan"}
              </div>
            ) : (
              filtered.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => select(cat.name)}
                  style={{
                    padding: "9px 14px", fontSize: "13px", cursor: "pointer",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: value === cat.name ? "var(--primary-light)" : "transparent",
                    color: value === cat.name ? "var(--primary)" : "var(--text)",
                    fontWeight: value === cat.name ? 600 : 400,
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    if (value !== cat.name) (e.currentTarget as HTMLDivElement).style.background = "var(--surface2)";
                  }}
                  onMouseLeave={(e) => {
                    if (value !== cat.name) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                  }}
                >
                  <span>{cat.name}</span>
                  <button
                    onClick={(e) => handleDelete(e, cat)}
                    title="Hapus kategori"
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "var(--text3)", fontSize: "14px", padding: "0 2px",
                      lineHeight: 1, flexShrink: 0,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text3)")}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Tambah kategori baru */}
          <div style={{ padding: "8px", borderTop: "1px solid var(--border)" }}>
            {addError && (
              <div style={{ fontSize: "12px", color: "var(--danger)", marginBottom: "6px" }}>
                {addError}
              </div>
            )}
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                className="form-input"
                style={{ fontSize: "13px", padding: "7px 10px", flex: 1 }}
                placeholder="+ Kategori baru..."
                value={newCat}
                onChange={(e) => { setNewCat(e.target.value); setAddError(""); }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                disabled={adding || !newCat.trim()}
                style={{ whiteSpace: "nowrap" }}
              >
                {adding ? "..." : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ProductsClient({ initialProducts }: ProductsClientProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("Semua");
  const [modal, setModal] = useState<ModalType>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };
  const [displayBuyPrice, setDisplayBuyPrice] = useState("");
  const [displaySellPrice, setDisplaySellPrice] = useState("");

  useEffect(() => {
    setDisplayBuyPrice(form.buy_price ? formatRupiah(form.buy_price).replace("Rp ", "") : "");
    setDisplaySellPrice(form.sell_price ? formatRupiah(form.sell_price).replace("Rp ", "") : "");
  }, [form.buy_price, form.sell_price]);

  const handlePriceChange = (field: "buy_price" | "sell_price", value: string) => {
    const rawValue = value.replace(/[^0-9]/g, "");
    const numericValue = parseInt(rawValue) || 0;
    setForm((prev) => ({ ...prev, [field]: numericValue }));
    const formatted = rawValue ? formatRupiah(numericValue).replace("Rp ", "") : "";
    if (field === "buy_price") setDisplayBuyPrice(formatted);
    else setDisplaySellPrice(formatted);
  };

  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))],
    [products]
  );

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const mc = catFilter === "Semua" || p.category === catFilter;
        const ms =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.category.toLowerCase().includes(search.toLowerCase());
        return mc && ms;
      }),
    [products, search, catFilter]
  );

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setError("");
    setModal("add");
  };

  const openEdit = (p: Product) => {
    setForm({
      name:         p.name,
      category:     p.category,
      buy_price:    p.buy_price,
      sell_price:   p.sell_price,
      stock:        p.stock,
      min_stock:    p.min_stock,
      expired_date: p.expired_date
        ? new Date(p.expired_date).toISOString().split("T")[0]
        : "",
    });
    setEditId(p.id);
    setError("");
    setModal("edit");
  };

  const openDelete = (id: string) => {
    setDeleteId(id);
    setModal("delete");
  };

  const handleSave = async () => {
    if (!form.name || !form.buy_price || !form.sell_price) {
      setError("Nama, harga beli, dan harga jual wajib diisi");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url    = modal === "add" ? "/api/products" : `/api/products/${editId}`;
      const method = modal === "add" ? "POST" : "PUT";

      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Terjadi kesalahan");
        return;
      }

      if (modal === "add") {
        setProducts((prev) => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setProducts((prev) => prev.map((p) => (p.id === editId ? data.data : p)));
      }

      setModal(null);
      router.refresh();
    } catch {
      setError("Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);

    try {
      const res  = await fetch(`/api/products/${deleteId}`, { method: "DELETE" });
      const data = await res.json();

      if (!data.success) {
        showToast(data.error || "Gagal menghapus produk", "error");
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      setModal(null);
      router.refresh();
    } catch {
      showToast("Gagal menghapus produk", "error");
    } finally {
      setSaving(false);
    }
  };

  const f = (key: keyof ProductFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = ["buy_price", "sell_price", "stock", "min_stock"].includes(key)
      ? Number(e.target.value)
      : e.target.value;
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const margin = form.buy_price > 0 ? calculateMarginPercent(form.sell_price, form.buy_price) : 0;

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

      {/* Header */}
      <div className="flex-between mb-4">
        <div className="section-title" style={{ margin: 0 }}>
          Daftar Produk ({filtered.length})
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <PlusIcon /> Tambah Produk
        </button>
      </div>

      {/* Search */}
      <div className="search-wrap">
        <span className="search-icon"><SearchIcon /></span>
        <input
          className="form-input"
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingRight: search ? "32px" : undefined }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{
            position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: "16px", lineHeight: 1,
          }}>✕</button>
        )}
      </div>

      {/* Category Filter */}
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

      {/* ✅ Table — fixed height, scrollable, sticky header */}
      <div className="card">
        <div className="table-wrap products-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama Produk</th>
                <th>Kategori</th>
                <th>Harga Beli</th>
                <th>Harga Jual</th>
                <th>Margin</th>
                <th>Stok</th>
                <th>Status</th>
                <th>Expired</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "var(--text3)" }}>
                    Tidak ada produk
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>
                    <span className="badge badge-blue">{p.category || "—"}</span>
                  </td>
                  <td className="td-mono">{formatRupiah(p.buy_price)}</td>
                  <td className="td-mono" style={{ fontWeight: 700 }}>
                    {formatRupiah(p.sell_price)}
                  </td>
                  <td className={`td-mono ${
                    calculateMarginPercent(p.sell_price, p.buy_price) >= 15 ? "text-success"
                    : calculateMarginPercent(p.sell_price, p.buy_price) > 0  ? ""
                    : "text-danger"
                  }`}>
                    {calculateMarginPercent(p.sell_price, p.buy_price)}%
                  </td>
                  <td>
                    <span className={`badge ${
                      p.stock === 0 ? "badge-danger" : p.stock <= p.min_stock ? "badge-warning" : "badge-success"
                    }`}>
                      {p.stock}
                    </span>
                  </td>
                  <td>
                    {isExpired(p.expired_date) ? (
                      <span className="badge badge-danger">Expired</span>
                    ) : isNearExpiry(p.expired_date) ? (
                      <span className="badge badge-warning">Hampir Expired</span>
                    ) : (
                      <span className="badge badge-success">OK</span>
                    )}
                  </td>
                  <td className="text-muted" style={{ fontSize: "13px" }}>
                    {p.expired_date ? formatDateShort(p.expired_date) : "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button className="btn-icon" onClick={() => openEdit(p)} title="Edit">
                        <EditIcon />
                      </button>
                      <button className="btn-icon danger" onClick={() => openDelete(p.id)} title="Hapus">
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(modal === "add" || modal === "edit") && (
        <Modal
          title={modal === "add" ? "Tambah Produk Baru" : "Edit Produk"}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <CheckIcon /> {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </>
          }
        >
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="form-group">
            <label className="form-label">Nama Produk *</label>
            <input
              className="form-input"
              value={form.name}
              onChange={f("name")}
              placeholder="Contoh: Nugget Ayam 500g"
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <CategorySelect
                value={form.category}
                onChange={(val) => setForm((prev) => ({ ...prev, category: val }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Stok Minimum (Alert)</label>
              <input
                className="form-input"
                type="number"
                value={form.min_stock}
                onChange={f("min_stock")}
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Harga Beli *</label>
              <input
                className="form-input"
                value={displayBuyPrice}
                onChange={(e) => handlePriceChange("buy_price", e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Harga Jual *
                {margin > 0 && (
                  <span className="text-success" style={{ marginLeft: "8px", fontWeight: 400 }}>
                    Margin: {margin}%
                  </span>
                )}
              </label>
              <input
                className="form-input"
                value={displaySellPrice}
                onChange={(e) => handlePriceChange("sell_price", e.target.value)}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Stok Saat Ini</label>
              <input
                className="form-input"
                type="number"
                value={form.stock}
                onChange={f("stock")}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal Expired</label>
              <input
                className="form-input"
                type="date"
                value={form.expired_date}
                onChange={f("expired_date")}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {modal === "delete" && (
        <Modal
          title="Hapus Produk"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Batal</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? "Menghapus..." : "Ya, Hapus"}
              </button>
            </>
          }
        >
          <div className="confirm-dialog">
            <div style={{ fontSize: "40px" }}>🗑️</div>
            <p>Yakin ingin menghapus produk ini? Data tidak bisa dikembalikan.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}