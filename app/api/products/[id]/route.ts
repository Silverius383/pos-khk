// app/api/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const product = await prisma.product.findFirst({
      where: { id, deleted_at: null }, // 👈 exclude soft-deleted
    });
    if (!product) {
      return NextResponse.json({ success: false, error: "Produk tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Gagal mengambil data" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, category, buy_price, sell_price, stock, min_stock, expired_date } = body;

    if (!name || !buy_price || !sell_price) {
      return NextResponse.json({ success: false, error: "Nama, harga beli, dan harga jual wajib diisi" }, { status: 400 });
    }

    // 👇 Prevent updating a soft-deleted product
    const existing = await prisma.product.findFirst({ where: { id, deleted_at: null } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Produk tidak ditemukan" }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        category: category || "",
        buy_price: parseInt(buy_price),
        sell_price: parseInt(sell_price),
        stock: parseInt(stock) || 0,
        min_stock: parseInt(min_stock) || 5,
        expired_date: expired_date ? new Date(expired_date) : null,
      },
    });

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("PUT /api/products error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengupdate produk" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    // 👇 Soft delete: set deleted_at instead of removing the row 
    const product = await prisma.product.findFirst({ where: { id, deleted_at: null } });
    if (!product) {
      return NextResponse.json({ success: false, error: "Produk tidak ditemukan" }, { status: 404 });
    }

    await prisma.product.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/products error:", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus produk" }, { status: 500 });
  }
}