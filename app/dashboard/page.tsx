// app/dashboard/page.tsx
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/layout/AppLayout";
import DashboardClient from "./DashboardClient";
import { STOCK_PURCHASE_CATEGORY } from "@/lib/constants";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    const [todayTx, monthTx, todayExp, monthExp, recentTransactions, allProducts, salesTrend] =
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
          where: { deleted_at: null },
          orderBy: { stock: "asc" },
        }),
        // Tren penjualan 30 hari terakhir
        prisma.$queryRaw<{ date: string; total: bigint; count: number }[]>`
          SELECT
            TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD') AS date,
            CAST(SUM(total_amount) AS BIGINT) AS total,
            CAST(COUNT(*) AS INTEGER) AS count
          FROM transactions
          WHERE created_at >= NOW() - INTERVAL '30 days'
            AND payment_status = 'paid'
          GROUP BY TO_CHAR(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD')
          ORDER BY date ASC
        `,
      ]);

    const lowStockProducts = allProducts.filter((p) => p.stock <= p.min_stock);

    // Pisahkan pengeluaran: operasional vs pembelian stok
    const todayOpex         = todayExp.filter((e) => e.category !== STOCK_PURCHASE_CATEGORY).reduce((s, e) => s + e.amount, 0);
    const todayStockPurchase = todayExp.filter((e) => e.category === STOCK_PURCHASE_CATEGORY).reduce((s, e) => s + e.amount, 0);

    const monthOpex          = monthExp.filter((e) => e.category !== STOCK_PURCHASE_CATEGORY).reduce((s, e) => s + e.amount, 0);
    const monthStockPurchase = monthExp.filter((e) => e.category === STOCK_PURCHASE_CATEGORY).reduce((s, e) => s + e.amount, 0);

    const todayGross  = todayTx.reduce((s, t) => s + t.total_profit, 0);
    const monthGross  = monthTx.reduce((s, t) => s + t.total_profit, 0);

    const stats = {
      today_sales:              todayTx.reduce((s, t) => s + t.total_amount, 0),
      today_discount:           todayTx.reduce((s, t) => s + t.total_discount, 0),
      today_expenses:           todayExp.reduce((s, e) => s + e.amount, 0),
      today_profit:             todayGross - todayOpex,
      today_tx_count:           todayTx.length,
      today_new_hutang_count:   todayTx.filter((t) => t.payment_status === "pending").length,
      today_new_hutang_amount:  todayTx.filter((t) => t.payment_status === "pending").reduce((s, t) => s + t.total_amount, 0),
      month_sales:              monthTx.reduce((s, t) => s + t.total_amount, 0),
      month_profit:             monthGross - monthOpex,
      month_profit_after_stock: monthGross - monthOpex - monthStockPurchase,
      month_tx_count:           monthTx.length,
      month_opex:               monthOpex,
      month_stock_purchase:     monthStockPurchase,
    };

    const todayHutang = todayTx.filter((t) => t.payment_status === "pending");

    return (
      <AppLayout title="Dashboard" lowStockCount={lowStockProducts.length}>
        <DashboardClient
          stats={stats}
          lowStockProducts={JSON.parse(JSON.stringify(lowStockProducts))}
          recentTransactions={JSON.parse(JSON.stringify(recentTransactions))}
          todayHutang={JSON.parse(JSON.stringify(todayHutang))}
          salesTrend={salesTrend.map((r) => ({
            date: r.date,
            total: Number(r.total),
            count: Number(r.count),
          }))}
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