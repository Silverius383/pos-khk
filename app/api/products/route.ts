// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/products - Ambil semua produk
export async function GET(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    const products = await prisma.product.findMany({
      where: {
        deleted_at: null, 
        AND: [
          search ? { name: { contains: search, mode: "insensitive" } } : {},
          category && category !== "Semua" ? { category } : {},
        ],
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data produk" }, { status: 500 });
  }
}

// POST /api/products - Tambah produk baru
export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, category, buy_price, sell_price, stock, min_stock, expired_date } = body;

    if (!name || !buy_price || !sell_price) {
      return NextResponse.json({ success: false, error: "Nama, harga beli, dan harga jual wajib diisi" }, { status: 400 });
    }

    if (sell_price < buy_price) {
      return NextResponse.json({ success: false, error: "Harga jual tidak boleh lebih rendah dari harga beli" }, { status: 400 });
    }

    const product = await prisma.product.create({
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

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json({ success: false, error: "Gagal menambah produk" }, { status: 500 });
  }
}
