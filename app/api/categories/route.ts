// app/api/categories/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/categories — ambil semua kategori, urut alfabet
export async function GET() {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil kategori" }, { status: 500 });
  }
}

// POST /api/categories — tambah kategori baru
export async function POST(request: NextRequest) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const name = (body.name || "").trim();

    if (!name) {
      return NextResponse.json({ success: false, error: "Nama kategori wajib diisi" }, { status: 400 });
    }

    if (name.length > 100) {
      return NextResponse.json({ success: false, error: "Nama kategori maksimal 100 karakter" }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: { name },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error: unknown) {
    // Unique constraint violation — nama sudah ada
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json({ success: false, error: "Kategori sudah ada" }, { status: 409 });
    }
    console.error("POST /api/categories error:", error);
    return NextResponse.json({ success: false, error: "Gagal menambah kategori" }, { status: 500 });
  }
}
