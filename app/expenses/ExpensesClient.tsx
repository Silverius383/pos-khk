// app/expenses/ExpensesClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Expense } from "@/types";
import { formatRupiah } from "@/utils/currency";
import { formatDateTime, currentMonth, monthLabel } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import { PlusIcon, TrashIcon, CheckIcon } from "@/components/ui/Icons";

interface ExpensesClientProps {
  initialExpenses: Expense[];
}

const EXPENSE_CATEGORIES = [
  "Operasional",
  "Pembelian Stok",
  "Listrik",
  "Transport",
  "Lainnya",
];

export default function ExpensesClient({ initialExpenses }: ExpensesClientProps) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [filterMonth, setFilterMonth] = useState(currentMonth());
  const [modal, setModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", amount: "", category: "Operasional" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load expenses for selected month
  const loadExpenses = async (month: string) => {
    try {
      const res = await fetch(`/api/expenses?month=${month}`);
      const data = await res.json();
      if (data.success) setExpenses(data.data);
    } catch {
      console.error("Gagal memuat data");
    }
  };

  const handleMonthChange = (m: string) => {
    setFilterMonth(m);
    loadExpenses(m);
  };

  const total = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const handleAdd = async () => {
    if (!form.name || !form.amount) {
      setError("Keterangan dan jumlah wajib diisi");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          amount: parseInt(form.amount),
          category: form.category,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Gagal menyimpan");
        return;
      }

      setExpenses((prev) => [data.data, ...prev]);
      setForm({ name: "", amount: "", category: "Operasional" });
      setModal(false);
      router.refresh();
    } catch {
      setError("Gagal menyimpan pengeluaran");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/expenses/${deleteId}`, { method: "DELETE" });
      const data = await res.json();

      if (!data.success) {
        alert("Gagal menghapus data");
        return;
      }

      setExpenses((prev) => prev.filter((e) => e.id !== deleteId));
      setDeleteId(null);
      router.refresh();
    } catch {
      alert("Gagal menghapus data");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex-between mb-4">
        <div className="section-title" style={{ margin: 0 }}>
          Pengeluaran & Biaya Operasional
        </div>
        <button className="btn btn-primary" onClick={() => { setError(""); setModal(true); }}>
          <PlusIcon /> Tambah Pengeluaran
        </button>
      </div>

      {/* Month filter */}
      <div className="filter-bar mb-6">
        <label className="form-label" style={{ margin: 0 }}>Filter Bulan:</label>
        <input
          type="month"
          className="form-input"
          style={{ width: "auto" }}
          value={filterMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
        />
        <span className="text-muted">{monthLabel(filterMonth)}</span>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginBottom: "20px" }}>
        <div className="stat-card orange">
          <div className="stat-label">Total Pengeluaran</div>
          <div className="stat-value">{formatRupiah(total)}</div>
          <div className="stat-sub">{expenses.length} item</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Periode</div>
          <div className="stat-value" style={{ fontSize: "18px" }}>
            {monthLabel(filterMonth)}
          </div>
          <div className="stat-sub">{byCategory.length} kategori</div>
        </div>
      </div>

      {/* Per-category summary */}
      {byCategory.length > 0 && (
        <div className="card mb-4" style={{ marginBottom: "20px" }}>
          <div className="card-header">
            <div className="card-title">Ringkasan Per Kategori</div>
          </div>
          <div className="card-body" style={{ padding: "0" }}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Kategori</th><th className="text-right">Jumlah</th><th className="text-right">%</th></tr>
                </thead>
                <tbody>
                  {byCategory.map(([cat, amount]) => (
                    <tr key={cat}>
                      <td style={{ fontWeight: 600 }}>{cat}</td>
                      <td className="td-mono text-right text-danger">{formatRupiah(amount)}</td>
                      <td className="td-mono text-right text-muted">
                        {total > 0 ? Math.round((amount / total) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Expense list */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th>Kategori</th>
                <th className="text-right">Jumlah</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "40px", color: "var(--text3)" }}>
                    Tidak ada pengeluaran bulan ini
                  </td>
                </tr>
              )}
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="text-muted" style={{ fontSize: "13px" }}>
                    {formatDateTime(e.created_at)}
                  </td>
                  <td style={{ fontWeight: 600 }}>{e.name}</td>
                  <td>
                    <span className="badge badge-gray">{e.category}</span>
                  </td>
                  <td className="td-mono text-right text-danger">
                    {formatRupiah(e.amount)}
                  </td>
                  <td>
                    <button
                      className="btn-icon danger"
                      onClick={() => setDeleteId(e.id)}
                    >
                      <TrashIcon />
                    </button>
                  </td>
                </tr>
              ))}
              {expenses.length > 0 && (
                <tr style={{ background: "var(--surface2)", fontWeight: 700 }}>
                  <td colSpan={3}>TOTAL</td>
                  <td className="td-mono text-right text-danger">{formatRupiah(total)}</td>
                  <td></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {modal && (
        <Modal
          title="Tambah Pengeluaran"
          onClose={() => setModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
                <CheckIcon /> {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </>
          }
        >
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="form-group">
            <label className="form-label">Keterangan *</label>
            <input
              className="form-input"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Contoh: Listrik freezer, Beli stok nugget..."
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Jumlah (Rp) *</label>
              <input
                className="form-input"
                type="number"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Kategori</label>
              <select
                className="form-input"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <Modal
          title="Hapus Pengeluaran?"
          onClose={() => setDeleteId(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteId(null)}>Batal</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                <TrashIcon /> Hapus
              </button>
            </>
          }
        >
          <div className="confirm-dialog">
            <div style={{ fontSize: "48px" }}>🗑️</div>
            <p>Data pengeluaran ini akan dihapus permanen.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}
