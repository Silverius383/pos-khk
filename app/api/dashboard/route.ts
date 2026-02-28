// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayTx, monthTx, todayExp, monthExp, lowStockProducts, recentTransactions] =
      await Promise.all([
        prisma.transaction.findMany({ where: { created_at: { gte: todayStart } } }),
        prisma.transaction.findMany({ where: { created_at: { gte: monthStart } } }),
        prisma.expense.findMany({ where: { created_at: { gte: todayStart } } }),
        prisma.expense.findMany({ where: { created_at: { gte: monthStart } } }),
        // 👇 added deleted_at: null to both the Prisma query and the raw SQL fallback
        prisma.product.findMany({
          where: {
            deleted_at: null,
            stock: { lte: prisma.product.fields.min_stock },
          },
          orderBy: { stock: "asc" },
          take: 10,
        }).catch(() =>
          prisma.$queryRaw`SELECT * FROM products WHERE stock <= min_stock AND deleted_at IS NULL ORDER BY stock ASC LIMIT 10`
        ),
        prisma.transaction.findMany({
          include: { items: true },
          orderBy: { created_at: "desc" },
          take: 8,
        }),
      ]);

    const todaySales = todayTx.reduce((s, t) => s + t.total_amount, 0);
    const todayGrossProfit = todayTx.reduce((s, t) => s + t.total_profit, 0);
    const todayExpTotal = todayExp.reduce((s, e) => s + e.amount, 0);

    const monthSales = monthTx.reduce((s, t) => s + t.total_amount, 0);
    const monthGrossProfit = monthTx.reduce((s, t) => s + t.total_profit, 0);
    const monthExpTotal = monthExp.reduce((s, e) => s + e.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        today_sales: todaySales,
        today_profit: todayGrossProfit - todayExpTotal,
        today_tx_count: todayTx.length,
        month_sales: monthSales,
        month_profit: monthGrossProfit - monthExpTotal,
        month_tx_count: monthTx.length,
        low_stock_products: lowStockProducts,
        recent_transactions: recentTransactions,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data dashboard" }, { status: 500 });
  }
}