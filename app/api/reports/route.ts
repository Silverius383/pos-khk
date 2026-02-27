// app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ success: false, error: "Parameter from dan to wajib diisi" }, { status: 400 });
    }

    const dateFilter = {
      gte: new Date(from + "T00:00:00.000Z"),
      lte: new Date(to   + "T23:59:59.999Z"),
    };

    const [transactions, expenses] = await Promise.all([
      prisma.transaction.findMany({
        where:   { created_at: dateFilter },
        include: { items: true },
        orderBy: { created_at: "desc" },
      }),
      prisma.expense.findMany({
        where:   { created_at: dateFilter },
        orderBy: { created_at: "desc" },
      }),
    ]);

    const totalSales    = transactions.reduce((s, t) => s + t.total_amount, 0);
    const totalDiscount = transactions.reduce((s, t) => s + t.total_discount, 0);
    const grossProfit   = transactions.reduce((s, t) => s + t.total_profit, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit     = grossProfit - totalExpenses;

    // Top products (berdasarkan qty terjual)
    const productSales: Record<string, { name: string; qty: number; revenue: number; discount: number }> = {};
    for (const tx of transactions) {
      for (const item of tx.items) {
        if (!productSales[item.product_name]) {
          productSales[item.product_name] = { name: item.product_name, qty: 0, revenue: 0, discount: 0 };
        }
        productSales[item.product_name].qty      += item.quantity;
        productSales[item.product_name].revenue  += item.subtotal;
        productSales[item.product_name].discount += item.discount_amount;
      }
    }
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        total_sales:    totalSales,
        total_discount: totalDiscount,
        gross_profit:   grossProfit,
        total_expenses: totalExpenses,
        net_profit:     netProfit,
        tx_count:       transactions.length,
        top_products:   topProducts,
        transactions,
        expenses,
      },
    });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data laporan" }, { status: 500 });
  }
}
