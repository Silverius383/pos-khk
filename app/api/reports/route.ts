// app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const MAX_TX_LIMIT = 500;

export async function GET(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to   = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ success: false, error: "Parameter from dan to wajib diisi" }, { status: 400 });
    }

    // Validasi format tanggal
    const fromDate = new Date(from + "T00:00:00.000Z");
    const toDate   = new Date(to   + "T23:59:59.999Z");
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ success: false, error: "Format tanggal tidak valid" }, { status: 400 });
    }

    const dateFilter = { gte: fromDate, lte: toDate };

    const [txAggregate, topProducts, transactions, expenses] = await Promise.all([
      // Aggregate ringkasan — tidak load semua baris
      prisma.transaction.aggregate({
        _sum:   { total_amount: true, total_discount: true, total_profit: true },
        _count: { id: true },
        where:  { created_at: dateFilter },
      }),

      // Top 10 produk via groupBy di database
      prisma.transactionItem.groupBy({
        by:      ["product_name"],
        _sum:    { quantity: true, subtotal: true, discount_amount: true },
        orderBy: { _sum: { quantity: "desc" } },
        take:    10,
        where:   { transaction: { created_at: dateFilter } },
      }),

      // Daftar transaksi dengan limit aman
      prisma.transaction.findMany({
        where:   { created_at: dateFilter },
        include: { items: { orderBy: { product_name: "asc" } } },
        orderBy: { created_at: "desc" },
        take:    MAX_TX_LIMIT,
      }),

      // Daftar pengeluaran
      prisma.expense.findMany({
        where:   { created_at: dateFilter },
        orderBy: { created_at: "desc" },
      }),
    ]);

    const totalSales    = txAggregate._sum.total_amount   ?? 0;
    const totalDiscount = txAggregate._sum.total_discount ?? 0;
    const grossProfit   = txAggregate._sum.total_profit   ?? 0;
    const txCount       = txAggregate._count.id;
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netProfit     = grossProfit - totalExpenses;

    const topProductsMapped = topProducts.map((p) => ({
      name:     p.product_name,
      qty:      p._sum.quantity      ?? 0,
      revenue:  p._sum.subtotal      ?? 0,
      discount: p._sum.discount_amount ?? 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        total_sales:    totalSales,
        total_discount: totalDiscount,
        gross_profit:   grossProfit,
        total_expenses: totalExpenses,
        net_profit:     netProfit,
        tx_count:       txCount,
        top_products:   topProductsMapped,
        transactions,
        expenses,
      },
    });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data laporan" }, { status: 500 });
  }
}
