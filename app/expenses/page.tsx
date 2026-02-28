// app/expenses/page.tsx
export const dynamic = "force-dynamic"; // 👈 always recalculate lowStockCount fresh

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/layout/AppLayout";
import ExpensesClient from "./ExpensesClient";
import { currentMonth } from "@/utils/date";

export default async function ExpensesPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  try {
    const allProducts = await prisma.product.findMany({
      where: { deleted_at: null },
      select: { stock: true, min_stock: true },
    });
    const lowStockCount = allProducts.filter((p) => p.stock <= p.min_stock).length;

    const month = currentMonth();
    const [year, m] = month.split("-").map(Number);
    const expenses = await prisma.expense.findMany({
      where: {
        created_at: {
          gte: new Date(year, m - 1, 1),
          lt:  new Date(year, m, 1),
        },
      },
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