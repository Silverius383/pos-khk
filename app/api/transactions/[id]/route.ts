// app/api/transactions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ── PATCH: Tandai lunas (sudah ada) ──────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    if (existing.payment_status === "paid") {
      return NextResponse.json({ success: false, error: "Transaksi sudah lunas" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { payment_method, cash_received } = body;

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        payment_status: "paid",
        paid_at:        new Date(),
        ...(payment_method ? { payment_method } : {}),
        ...(cash_received  ? { cash_received }  : {}),
      },
      include: { items: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/transactions/[id] error:", error);
    return NextResponse.json({ success: false, error: "Gagal update transaksi" }, { status: 500 });
  }
}

// ── PUT: Edit transaksi (buyer info, payment method, status) ──────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    const body = await request.json();
    const {
      payment_method,
      payment_status,
      cash_received,
      buyer_type,
      buyer_name,
    } = body;

    const validMethods  = ["tunai", "transfer", "qris"];
    const validStatuses = ["paid", "pending"];
    const validBuyers   = ["walk_in", "cafe", "individual"];

    const updateData: Record<string, unknown> = {};

    if (payment_method && validMethods.includes(payment_method)) {
      updateData.payment_method = payment_method;
    }
    if (buyer_type && validBuyers.includes(buyer_type)) {
      updateData.buyer_type = buyer_type;
    }
    // buyer_name hanya boleh diisi untuk non walk_in
    const resolvedBuyerType = (buyer_type && validBuyers.includes(buyer_type))
      ? buyer_type
      : existing.buyer_type;
    updateData.buyer_name = resolvedBuyerType !== "walk_in" && buyer_name
      ? buyer_name.trim() || null
      : null;

    // Handle status change: pending → paid
    if (payment_status === "paid" && existing.payment_status === "pending") {
      updateData.payment_status = "paid";
      updateData.paid_at = new Date();
    }
    // Handle status change: paid → pending (revert)
    if (payment_status === "pending" && existing.payment_status === "paid") {
      updateData.payment_status = "pending";
      updateData.paid_at = null;
    }

    if (cash_received !== undefined) {
      updateData.cash_received = cash_received || null;
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: { items: true },
    });

    revalidatePath("/reports");
    revalidatePath("/dashboard");

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT /api/transactions/[id] error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengedit transaksi" }, { status: 500 });
  }
}

// ── DELETE: Hapus transaksi + kembalikan stok ─────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    // Kembalikan stok untuk setiap item
    await prisma.$transaction(async (tx) => {
      // Restock semua produk
      await Promise.all(
        existing.items.map((item) =>
          tx.product.update({
            where: { id: item.product_id },
            data:  { stock: { increment: item.quantity } },
          }).catch(() => {
            // Produk mungkin sudah dihapus (soft delete), skip saja
            console.warn(`Produk ${item.product_id} tidak ditemukan saat restock, skip.`);
          })
        )
      );

      // Hapus transaksi (items terhapus otomatis via CASCADE)
      await tx.transaction.delete({ where: { id } });
    });

    revalidatePath("/reports");
    revalidatePath("/dashboard");
    revalidatePath("/products");
    revalidatePath("/transactions");

    return NextResponse.json({
      success: true,
      message: `Transaksi berhasil dihapus. Stok ${existing.items.length} produk telah dikembalikan.`,
      restocked: existing.items.map((i) => ({
        product_name: i.product_name,
        qty: i.quantity,
      })),
    });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus transaksi" }, { status: 500 });
  }
}