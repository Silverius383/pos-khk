// app/api/transactions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculateDiscountAmount, calculateFinalPrice } from "@/utils/currency";
import { revalidatePath } from "next/cache";

const MAX_LIMIT = 500;

export async function GET(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateFrom      = searchParams.get("from");
    const dateTo        = searchParams.get("to");
    const limit         = Math.min(parseInt(searchParams.get("limit") || "50") || 50, MAX_LIMIT);
    const paymentStatus = searchParams.get("payment_status");

    const where: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) (where.created_at as Record<string, Date>).gte = new Date(dateFrom + "T00:00:00.000Z");
      if (dateTo)   (where.created_at as Record<string, Date>).lte = new Date(dateTo   + "T23:59:59.999Z");
    }
    if (paymentStatus) {
      where.payment_status = paymentStatus;
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

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      items,
      payment_method,
      cash_received,
      payment_status = "paid",
      buyer_type     = "walk_in",
      buyer_name,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Keranjang belanja kosong" }, { status: 400 });
    }

    const validMethods    = ["tunai", "transfer", "qris"];
    const validBuyerTypes = ["walk_in", "cafe", "individual"];
    const validStatuses   = ["paid", "pending"];

    const method    = validMethods.includes(payment_method) ? payment_method : "tunai";
    const buyerType = validBuyerTypes.includes(buyer_type) ? buyer_type : "walk_in";
    const payStatus = validStatuses.includes(payment_status) ? payment_status : "paid";

    const resolvedBuyerName =
      buyerType !== "walk_in" && buyer_name ? buyer_name.trim() || null : null;

    // Validasi setiap item sebelum masuk DB transaction
    for (const item of items) {
      if (!item.product_id || typeof item.product_id !== "string") {
        return NextResponse.json({ success: false, error: "product_id tidak valid" }, { status: 400 });
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return NextResponse.json({ success: false, error: "Quantity harus berupa bilangan bulat positif" }, { status: 400 });
      }
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const productIds = items
        .filter((i: { product_id: string }) => i.product_id !== "__gosend__")
        .map((i: { product_id: string }) => i.product_id);
      const products   = await tx.product.findMany({ where: { id: { in: productIds } } });
      const productMap = new Map(products.map((p) => [p.id, p]));

      let totalAmount   = 0;
      let totalDiscount = 0;
      let totalProfit   = 0;
      const itemsData   = [];

      for (const item of items) {
        // ── GoSend: tidak ada di DB, product_id null ─────────────────────────
        if (item.product_id === "__gosend__") {
          const fee = parseInt(item.sell_price) || 0;
          if (fee <= 0) continue;
          totalAmount += fee;
          itemsData.push({
            product_id:      null,
            product_name:    "GoSend",
            quantity:        1,
            sell_price:      fee,
            buy_price:       0,
            discount_type:   "none",
            discount_value:  0,
            discount_amount: 0,
            final_price:     fee,
            subtotal:        fee,
            profit:          0,
          });
          continue;
        }

        // ── Produk biasa ─────────────────────────────────────────────────────
        const product = productMap.get(item.product_id);
        if (!product) throw new Error(`Produk tidak ditemukan`);
        if (product.stock < item.quantity) {
          throw new Error(`Stok ${product.name} tidak cukup. Tersedia: ${product.stock}`);
        }

        const discountType    = item.discount_type  || "none";
        const discountValue   = item.discount_value || 0;
        const discountPerUnit = calculateDiscountAmount(product.sell_price, discountType, discountValue);
        const finalPrice      = calculateFinalPrice(product.sell_price, discountType, discountValue);
        const discountAmount  = discountPerUnit * item.quantity;
        const subtotal        = finalPrice * item.quantity;
        const profit          = (finalPrice - product.buy_price) * item.quantity;

        totalAmount   += subtotal;
        totalDiscount += discountAmount;
        totalProfit   += profit;

        itemsData.push({
          product_id:      product.id,
          product_name:    product.name,
          quantity:        item.quantity,
          sell_price:      product.sell_price,
          buy_price:       product.buy_price,
          discount_type:   discountType,
          discount_value:  discountValue,
          discount_amount: discountAmount,
          final_price:     finalPrice,
          subtotal,
          profit,
        });
      }

      const newTransaction = await tx.transaction.create({
        data: {
          total_amount:    totalAmount,
          total_discount:  totalDiscount,
          total_profit:    totalProfit,
          payment_method:  method,
          cash_received:   method === "tunai" && cash_received > 0 ? cash_received : null,
          payment_status:  payStatus,
          paid_at:         payStatus === "paid" ? new Date() : null,
          buyer_type:      buyerType,
          buyer_name:      resolvedBuyerName,
          items: { create: itemsData },
        },
        include: { items: true },
      });

      // Stok hanya dikurangi untuk produk nyata (bukan GoSend)
      await Promise.all(
        items
          .filter((item: { product_id: string }) => item.product_id !== "__gosend__")
          .map((item: { product_id: string; quantity: number }) =>
            tx.product.update({
              where: { id: item.product_id },
              data:  { stock: { decrement: item.quantity } },
            })
          )
      );

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/products");

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal membuat transaksi";
    console.error("POST /api/transactions error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
