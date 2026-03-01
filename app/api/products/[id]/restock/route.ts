// app/api/products/[id]/restock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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
    const body = await request.json();
    const { qty } = body;

    if (!qty || typeof qty !== "number" || qty <= 0) {
      return NextResponse.json({ success: false, error: "Jumlah restock harus lebih dari 0" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({ where: { id, deleted_at: null } });
    if (!product) {
      return NextResponse.json({ success: false, error: "Produk tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { stock: { increment: qty } },
    });

    revalidatePath("/dashboard");
    revalidatePath("/products");
    revalidatePath("/transactions");

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH restock error:", error);
    return NextResponse.json({ success: false, error: "Gagal update stok" }, { status: 500 });
  }
}