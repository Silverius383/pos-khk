// app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const LOW_STOCK_LIMIT    = 10;
const RECENT_TX_LIMIT    = 8;

export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now        = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayStats,
      monthStats,
      todayExpStats,
      monthExpStats,
      lowStockProducts,
      recentTransactions,
    ] = await Promise.all([
      // Aggregate — tidak load seluruh baris
      prisma.transaction.aggregate({
        _sum:   { total_amount: true, total_profit: true },
        _count: { id: true },
        where:  { created_at: { gte: todayStart } },
      }),
      prisma.transaction.aggregate({
        _sum:   { total_amount: true, total_profit: true },
        _count: { id: true },
        where:  { created_at: { gte: monthStart } },
      }),
      prisma.expense.aggregate({
        _sum:  { amount: true },
        where: { created_at: { gte: todayStart } },
      }),
      prisma.expense.aggregate({
        _sum:  { amount: true },
        where: { created_at: { gte: monthStart } },
      }),
      // Low stock: pakai raw SQL untuk perbandingan dua kolom
      prisma.$queryRaw<{ id: string; name: string; category: string; stock: number; min_stock: number }[]>`
        SELECT id, name, category, stock, min_stock
        FROM products
        WHERE stock <= min_stock AND deleted_at IS NULL
        ORDER BY stock ASC
        LIMIT ${LOW_STOCK_LIMIT}
      `,
      prisma.transaction.findMany({
        include: { items: { orderBy: { product_name: "asc" } } },
        orderBy: { created_at: "desc" },
        take:    RECENT_TX_LIMIT,
      }),
    ]);

    const todaySales       = todayStats._sum.total_amount  ?? 0;
    const todayGrossProfit = todayStats._sum.total_profit  ?? 0;
    const todayExpTotal    = todayExpStats._sum.amount     ?? 0;
    const todayTxCount     = todayStats._count.id;

    const monthSales       = monthStats._sum.total_amount  ?? 0;
    const monthGrossProfit = monthStats._sum.total_profit  ?? 0;
    const monthExpTotal    = monthExpStats._sum.amount     ?? 0;
    const monthTxCount     = monthStats._count.id;

    return NextResponse.json({
      success: true,
      data: {
        today_sales:         todaySales,
        today_profit:        todayGrossProfit - todayExpTotal,
        today_tx_count:      todayTxCount,
        month_sales:         monthSales,
        month_profit:        monthGrossProfit - monthExpTotal,
        month_tx_count:      monthTxCount,
        low_stock_products:  lowStockProducts,
        recent_transactions: recentTransactions,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data dashboard" }, { status: 500 });
  }
}
