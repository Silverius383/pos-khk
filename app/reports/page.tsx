// app/reports/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/layout/AppLayout";
import ReportsClient from "./ReportsClient";
import { todayISO, currentMonth } from "@/utils/date";

export default async function ReportsPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const from = currentMonth() + "-01";
  const to = todayISO();

  try {
    const allProducts = await prisma.product.findMany({
      where: { deleted_at: null }, // 👈 exclude soft-deleted
      select: { stock: true, min_stock: true },
    });
    const lowStockCount = allProducts.filter((p) => p.stock <= p.min_stock).length;
    const dateFilter = {
      gte: new Date(from + "T00:00:00.000Z"),
      lte: new Date(to + "T23:59:59.999Z"),
    };
    const [transactions, expenses] = await Promise.all([
      prisma.transaction.findMany({
        where: { created_at: dateFilter },
        include: { items: true },
        orderBy: { created_at: "desc" },
      }),
      prisma.expense.findMany({
        where: { created_at: dateFilter },
        orderBy: { created_at: "desc" },
      }),
    ]);

    return (
      <AppLayout title="Laporan Penjualan" lowStockCount={lowStockCount}>
        <ReportsClient
          initialTransactions={JSON.parse(JSON.stringify(transactions))}
          initialExpenses={JSON.parse(JSON.stringify(expenses))}
          defaultFrom={from}
          defaultTo={to}
        />
      </AppLayout>
    );
  } catch (error) {
    console.error("Reports DB error:", error);
    return (
      <AppLayout title="Laporan Penjualan">
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