// app/expenses/ExpensesClient.tsx
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Expense } from "@/types";
import { formatRupiah } from "@/utils/currency";
import { formatDateTime, currentMonth, monthLabel } from "@/utils/date";
import Modal from "@/components/ui/Modal";
import { PlusIcon, TrashIcon, CheckIcon } from "@/components/ui/Icons";
import { EXPENSE_CATEGORIES } from "@/lib/constants";

interface ExpensesClientProps {
  initialExpenses: Expense[];
}

export default function ExpensesClient({ initialExpenses }: ExpensesClientProps) {
  const router = useRouter();
  const [expenses, setExpenses]   = useState<Expense[]>(initialExpenses);
  const [filterMonth, setFilterMonth] = useState(currentMonth());
  const [modal, setModal]         = useState(false);
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [form, setForm]           = useState({ name: "", amount: 0, category: "Operasional" });
  const [displayAmount, setDisplayAmount] = useState(""); // 👈 formatted display value
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Rupiah input handler ──────────────────────────────────────────────
  const handleAmountChange = (value: string) => {
    const raw     = value.replace(/[^0-9]/g, "");          // strip non-digits
    const numeric = parseInt(raw) || 0;
    setForm((p) => ({ ...p, amount: numeric }));
    setDisplayAmount(raw ? formatRupiah(numeric).replace("Rp ", "") : "");
  };

  const loadExpenses = async (month: string) => {
    setLoadingExpenses(true);
    try {
      const res  = await fetch(`/api/expenses?month=${month}`);
      const data = await res.json();
      if (data.success) setExpenses(data.data);
    } catch {
      showToast("Gagal memuat data pengeluaran", "error");
    } finally {
      setLoadingExpenses(false);
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
          name:     form.name,
          amount:   form.amount,
          category: form.category,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Gagal menyimpan");
        return;
      }

      setExpenses((prev) => [data.data, ...prev]);
      setForm({ name: "", amount: 0, category: "Operasional" });
      setDisplayAmount("");
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
      const res  = await fetch(`/api/expenses/${deleteId}`, { method: "DELETE" });
      const data = await res.json();

      if (!data.success) {
        showToast("Gagal menghapus data", "error");
        return;
      }

      setExpenses((prev) => prev.filter((e) => e.id !== deleteId));
      setDeleteId(null);
      router.refresh();
    } catch {
      showToast("Gagal menghapus data", "error");
    } finally {
      setSaving(false);
    }
  };

  const openModal = () => {
    setError("");
    setForm({ name: "", amount: 0, category: "Operasional" });
    setDisplayAmount("");
    setModal(true);
  };

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
          Pengeluaran & Biaya Operasional
        </div>
        <button className="btn btn-primary" onClick={openModal}>
          <PlusIcon /> Tambah Pengeluaran
        </button>
      </div>

      {/* Month filter */}
      <div className="filter-bar mb-6">
        <label className="form-label" style={{ margin: 0 }}>Filter Bulan:</label>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const [y, m] = filterMonth.split("-").map(Number);
            const prev = new Date(y, m - 2, 1);
            const val  = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
            handleMonthChange(val);
          }}
          title="Bulan sebelumnya"
        >←</button>
        <input
          type="month"
          className="form-input"
          style={{ width: "auto" }}
          value={filterMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
        />
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const [y, m] = filterMonth.split("-").map(Number);
            const next = new Date(y, m, 1);
            const val  = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
            handleMonthChange(val);
          }}
          title="Bulan berikutnya"
          disabled={filterMonth >= new Date().toISOString().slice(0, 7)}
        >→</button>
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
      <div className="card" style={{ opacity: loadingExpenses ? 0.6 : 1, transition: "opacity 0.2s" }}>
        {loadingExpenses && (
          <div style={{ textAlign: "center", padding: "8px", fontSize: "13px", color: "var(--text3)" }}>
            ⏳ Memuat data...
          </div>
        )}
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
              {/* 👇 Rupiah formatted input */}
              <div style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: "12px", top: "50%",
                  transform: "translateY(-50%)", color: "var(--text3)",
                  fontWeight: 600, pointerEvents: "none", fontSize: "13px",
                }}>
                  Rp
                </span>
                <input
                  className="form-input"
                  style={{ paddingLeft: "36px" }}
                  type="text"
                  inputMode="numeric"
                  value={displayAmount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                />
              </div>
              {/* Live preview */}
              {form.amount > 0 && (
                <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--text3)" }}>
                  {formatRupiah(form.amount)}
                </div>
              )}
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