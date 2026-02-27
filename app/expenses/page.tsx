// app/expenses/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/layout/AppLayout";
import ExpensesClient from "./ExpensesClient";

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const allProducts = await prisma.product.findMany({ select: { stock: true, min_stock: true } });
    const lowStockCount = allProducts.filter((p) => p.stock <= p.min_stock).length;
    const expenses = await prisma.expense.findMany({
      where: { created_at: { gte: monthStart } },
      orderBy: { created_at: "desc" },
    });

    return (
      <AppLayout title="Pengeluaran" lowStockCount={lowStockCount}>
        <ExpensesClient initialExpenses={JSON.parse(JSON.stringify(expenses))} />
      </AppLayout>
    );
  } catch (error) {
    console.error("Expenses DB error:", error);
    return (
      <AppLayout title="Pengeluaran">
        <div className="alert alert-danger">
          <strong>⚠️ Database belum terhubung.</strong>
          <div style={{ marginTop: "8px", fontSize: "13px" }}>
            Pastikan <code>DATABASE_URL</code> di <code>.env.local</code> sudah diisi, lalu
            jalankan <code>npm run db:push</code>.
          </div>
        </div>
      </AppLayout>
    );
  }
}
