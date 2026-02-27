// app/products/ProductsClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Product, ProductFormData } from "@/types";
import { formatRupiah, calculateMarginPercent } from "@/utils/currency";
import { formatDateShort, isExpired, isNearExpiry } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import {
  PlusIcon, EditIcon, TrashIcon, CheckIcon,
  SearchIcon, WarningIcon,
} from "@/components/ui/Icons";

const EMPTY_FORM: ProductFormData = {
  name: "", category: "", buy_price: 0, sell_price: 0,
  stock: 0, min_stock: 5, expired_date: "",
};

interface ProductsClientProps {
  initialProducts: Product[];
}

type ModalType = "add" | "edit" | "delete" | null;

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
      name: p.name,
      category: p.category,
      buy_price: p.buy_price,
      sell_price: p.sell_price,
      stock: p.stock,
      min_stock: p.min_stock,
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
      const url = modal === "add" ? "/api/products" : `/api/products/${editId}`;
      const method = modal === "add" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Terjadi kesalahan");
        return;
      }

      // Update local state
      if (modal === "add") {
        setProducts((prev) => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        setProducts((prev) =>
          prev.map((p) => (p.id === editId ? data.data : p))
        );
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
      const res = await fetch(`/api/products/${deleteId}`, { method: "DELETE" });
      const data = await res.json();

      if (!data.success) {
        alert(data.error || "Gagal menghapus produk");
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      setModal(null);
      router.refresh();
    } catch {
      alert("Gagal menghapus produk");
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
        />
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

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
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
                  <td className="td-mono text-success">
                    {calculateMarginPercent(p.sell_price, p.buy_price)}%
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        p.stock === 0
                          ? "badge-danger"
                          : p.stock <= p.min_stock
                          ? "badge-warning"
                          : "badge-success"
                      }`}
                    >
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
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                Batal
              </button>
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
              <input
                className="form-input"
                value={form.category}
                onChange={f("category")}
                placeholder="Contoh: Nugget, Sosis, Bakso"
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
              <label className="form-label">Harga Beli (Rp) *</label>
              <input
                className="form-input"
                type="number"
                value={form.buy_price || ""}
                onChange={f("buy_price")}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Harga Jual (Rp) *</label>
              <input
                className="form-input"
                type="number"
                value={form.sell_price || ""}
                onChange={f("sell_price")}
                placeholder="0"
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
              <label className="form-label">Tanggal Expired (Opsional)</label>
              <input
                className="form-input"
                type="date"
                value={form.expired_date}
                onChange={f("expired_date")}
              />
            </div>
          </div>

          {form.buy_price > 0 && form.sell_price > 0 && (
            <div className={`alert ${margin >= 0 ? "alert-success" : "alert-danger"}`}>
              <CheckIcon />
              Margin: {formatRupiah(form.sell_price - form.buy_price)} per unit ({margin}%)
            </div>
          )}
        </Modal>
      )}

      {/* Delete Modal */}
      {modal === "delete" && (
        <Modal
          title="Hapus Produk?"
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>
                Batal
              </button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                <TrashIcon /> {saving ? "Menghapus..." : "Hapus"}
              </button>
            </>
          }
        >
          <div className="confirm-dialog">
            <div style={{ fontSize: "48px" }}>🗑️</div>
            <p>Produk ini akan dihapus permanen.</p>
            <p style={{ marginTop: "4px" }}>Riwayat transaksi tidak akan terpengaruh.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
