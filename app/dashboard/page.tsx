// app/dashboard/page.tsx
"use client";

export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/layout/AppLayout";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const [todayTx, monthTx, todayExp, monthExp, recentTransactions, allProducts] =
      await Promise.all([
        prisma.transaction.findMany({ where: { created_at: { gte: todayStart } } }),
        prisma.transaction.findMany({ where: { created_at: { gte: monthStart } } }),
        prisma.expense.findMany({ where: { created_at: { gte: todayStart } } }),
        prisma.expense.findMany({ where: { created_at: { gte: monthStart } } }),
        prisma.transaction.findMany({
          include: { items: true },
          orderBy: { created_at: "desc" },
          take: 8,
        }),
        prisma.product.findMany({
          where: { deleted_at: null }, // 👈 exclude soft-deleted
          orderBy: { stock: "asc" },
        }),
      ]);

    const lowStockProducts = allProducts.filter((p) => p.stock <= p.min_stock);

    const stats = {
      today_sales: todayTx.reduce((s, t) => s + t.total_amount, 0),
      today_profit:
        todayTx.reduce((s, t) => s + t.total_profit, 0) -
        todayExp.reduce((s, e) => s + e.amount, 0),
      today_tx_count: todayTx.length,
      month_sales: monthTx.reduce((s, t) => s + t.total_amount, 0),
      month_profit:
        monthTx.reduce((s, t) => s + t.total_profit, 0) -
        monthExp.reduce((s, e) => s + e.amount, 0),
      month_tx_count: monthTx.length,
    };

    return (
      <AppLayout title="Dashboard" lowStockCount={lowStockProducts.length}>
        <DashboardClient
          stats={stats}
          lowStockProducts={JSON.parse(JSON.stringify(lowStockProducts))}
          recentTransactions={JSON.parse(JSON.stringify(recentTransactions))}
        />
      </AppLayout>
    );
  } catch (error) {
    console.error("Dashboard DB error:", error);
    return (
      <AppLayout title="Dashboard">
        <div className="alert alert-danger">
          <strong>⚠️ Database belum terhubung.</strong>
          <div style={{ marginTop: "8px", fontSize: "13px" }}>
            Pastikan <code>DATABASE_URL</code> di file <code>.env.local</code> sudah diisi dengan
            benar, lalu jalankan <code>npm run db:push</code> di terminal.
          </div>
        </div>
      </AppLayout>
    );
  }
}