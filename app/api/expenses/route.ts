// app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/expenses
export async function GET(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // format: "2024-01"

    const where: Record<string, unknown> = {};
    if (month) {
      const [year, m] = month.split("-").map(Number);
      where.created_at = {
        gte: new Date(year, m - 1, 1),
        lt: new Date(year, m, 1),
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ success: true, data: expenses });
  } catch (error) {
    console.error("GET /api/expenses error:", error);
    return NextResponse.json({ success: false, error: "Gagal mengambil data pengeluaran" }, { status: 500 });
  }
}

// POST /api/expenses
export async function POST(request: NextRequest) {
  if (!(await requireAuth(request))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, amount, category } = body;

    if (!name || !amount) {
      return NextResponse.json({ success: false, error: "Keterangan dan jumlah wajib diisi" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        name,
        amount: parseInt(amount),
        category: category || "Operasional",
      },
    });

    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (error) {
    console.error("POST /api/expenses error:", error);
    return NextResponse.json({ success: false, error: "Gagal menambah pengeluaran" }, { status: 500 });
  }
}
