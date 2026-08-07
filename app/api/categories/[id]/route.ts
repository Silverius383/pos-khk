// app/api/categories/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// DELETE /api/categories/:id — hapus kategori
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAuth())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    await prisma.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2025"
    ) {
      return NextResponse.json({ success: false, error: "Kategori tidak ditemukan" }, { status: 404 });
    }
    console.error("DELETE /api/categories/[id] error:", error);
    return NextResponse.json({ success: false, error: "Gagal menghapus kategori" }, { status: 500 });
  }
}
