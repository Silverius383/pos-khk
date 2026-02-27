// app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/transactions - Riwayat transaksi (dengan filter tanggal)
export async function GET(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("from");
    const dateTo = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) (where.created_at as Record<string, Date>).gte = new Date(dateFrom + "T00:00:00.000Z");
      if (dateTo) (where.created_at as Record<string, Date>).lte = new Date(dateTo + "T23:59:59.999Z");
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { items: { orderBy: { product_name: "asc" } } },
      orderBy: { created_at: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data transaksi" }, { status: 500 });
  }
}

// POST /api/transactions - Buat transaksi baru (ATOMIC)
export async function POST(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items } = body;
    // items: Array<{ product_id, quantity }>

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Keranjang belanja kosong" }, { status: 400 });
    }

    // ─── ATOMIC TRANSACTION ───────────────────────────────────────────────
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Lock & validasi semua produk
      const productIds = items.map((i: { product_id: string }) => i.product_id);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalAmount = 0;
      let totalProfit = 0;
      const itemsData = [];

      for (const item of items) {
        const product = productMap.get(item.product_id);

        if (!product) {
          throw new Error(`Produk dengan ID ${item.product_id} tidak ditemukan`);
        }

        // Business rule: stok tidak boleh negatif
        if (product.stock < item.quantity) {
          throw new Error(`Stok ${product.name} tidak cukup. Stok tersedia: ${product.stock}`);
        }

        const itemTotal = product.sell_price * item.quantity;
        const itemProfit = (product.sell_price - product.buy_price) * item.quantity;

        totalAmount += itemTotal;
        totalProfit += itemProfit;

        itemsData.push({
          product_id: product.id,
          product_name: product.name, // snapshot
          quantity: item.quantity,
          sell_price: product.sell_price, // snapshot
          buy_price: product.buy_price, // snapshot
          profit: itemProfit,
        });
      }

      // 2. Buat transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          total_amount: totalAmount,
          total_profit: totalProfit,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      // 3. Kurangi stok semua produk
      await Promise.all(
        items.map((item: { product_id: string; quantity: number }) =>
          tx.product.update({
            where: { id: item.product_id },
            data: { stock: { decrement: item.quantity } },
          })
        )
      );

      return newTransaction;
    });
    // ─────────────────────────────────────────────────────────────────────

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat transaksi";
    console.error("POST /api/transactions error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
