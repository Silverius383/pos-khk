// app/api/transactions/[id]/route.ts
// FILE BARU — PATCH endpoint untuk tandai transaksi pending menjadi lunas

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

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
        // update metode bayar & uang diterima jika dikirim dari client
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