// app/api/qris-notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const QRIS_KEYWORD = "menerima pembayaran qris";

// ── POST: Terima webhook dari MacroDroid ──────────────────────────────────────
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-secret");
  if (!secret || secret !== process.env.QRIS_NOTIFY_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const text: string = (body.text || "").toLowerCase();

    // Validasi isi notif mengandung kata kunci QRIS BCA
    if (!text.includes(QRIS_KEYWORD)) {
      return NextResponse.json({ success: false, error: "Bukan notifikasi QRIS" }, { status: 400 });
    }

    // Simpan event baru + cleanup event lama > 1 jam sekaligus
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await Promise.all([
      prisma.qrisEvent.create({
        data: {
          raw_text: body.text,
          consumed: false,
        },
      }),
      prisma.qrisEvent.deleteMany({
        where: { received_at: { lt: oneHourAgo } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/qris-notify error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// ── GET: Polling dari browser ─────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const afterParam = searchParams.get("after");

    // after = ISO timestamp kapan QrisDisplay mulai ditampilkan
    // Cegah event lama dari transaksi sebelumnya terdeteksi
    const afterDate = afterParam ? new Date(afterParam) : new Date(0);

    const event = await prisma.qrisEvent.findFirst({
      where: {
        consumed:    false,
        received_at: { gt: afterDate },
      },
      orderBy: { received_at: "desc" },
    });

    if (!event) {
      return NextResponse.json({ found: false });
    }

    // Tandai sebagai consumed agar tidak terdeteksi dua kali
    await prisma.qrisEvent.update({
      where: { id: event.id },
      data:  { consumed: true },
    });

    return NextResponse.json({
      found:       true,
      received_at: event.received_at.toISOString(),
    });
  } catch (error) {
    console.error("GET /api/qris-notify error:", error);
    return NextResponse.json({ found: false });
  }
}
