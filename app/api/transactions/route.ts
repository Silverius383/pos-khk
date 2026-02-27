// app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculateDiscountAmount, calculateFinalPrice } from "@/utils/currency";

export async function GET(request: NextRequest) {
  if (!(await requireAuth())) {
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
      if (dateTo)   (where.created_at as Record<string, Date>).lte = new Date(dateTo   + "T23:59:59.999Z");
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

// POST /api/transactions — ATOMIC dengan dukungan diskon
export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { items } = body;
    // items: Array<{ product_id, quantity, discount_type, discount_value }>

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Keranjang belanja kosong" }, { status: 400 });
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const productIds = items.map((i: { product_id: string }) => i.product_id);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalAmount   = 0;
      let totalDiscount = 0;
      let totalProfit   = 0;
      const itemsData   = [];

      for (const item of items) {
        const product = productMap.get(item.product_id);
        if (!product) throw new Error(`Produk tidak ditemukan`);
        if (product.stock < item.quantity) {
          throw new Error(`Stok ${product.name} tidak cukup. Tersedia: ${product.stock}`);
        }

        const discountType  = item.discount_type  || "none";
        const discountValue = item.discount_value || 0;

        // Hitung diskon per unit
        const discountPerUnit = calculateDiscountAmount(product.sell_price, discountType, discountValue);
        const finalPrice      = calculateFinalPrice(product.sell_price, discountType, discountValue);

        const discountAmount = discountPerUnit * item.quantity; // total diskon item
        const subtotal       = finalPrice * item.quantity;
        const profit         = (finalPrice - product.buy_price) * item.quantity;

        totalAmount   += subtotal;
        totalDiscount += discountAmount;
        totalProfit   += profit;

        itemsData.push({
          product_id:      product.id,
          product_name:    product.name,
          quantity:        item.quantity,
          sell_price:      product.sell_price, // snapshot harga normal
          buy_price:       product.buy_price,  // snapshot
          discount_type:   discountType,
          discount_value:  discountValue,
          discount_amount: discountAmount,
          final_price:     finalPrice,
          subtotal:        subtotal,
          profit:          profit,
        });
      }

      const newTransaction = await tx.transaction.create({
        data: {
          total_amount:   totalAmount,
          total_discount: totalDiscount,
          total_profit:   totalProfit,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      // Kurangi stok
      await Promise.all(
        items.map((item: { product_id: string; quantity: number }) =>
          tx.product.update({
            where: { id: item.product_id },
            data:  { stock: { decrement: item.quantity } },
          })
        )
      );

      return newTransaction;
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat transaksi";
    console.error("POST /api/transactions error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
