// app/api/qris-notify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── POST: Terima webhook dari MacroDroid / PayHook / app lainnya ──────────────
export async function POST(request: NextRequest) {
  // Terima secret dari header ATAU URL query param
  const headerSecret = request.headers.get("x-secret");
  const urlSecret    = new URL(request.url).searchParams.get("secret");
  const secret       = headerSecret || urlSecret;
  if (!secret || secret !== process.env.QRIS_NOTIFY_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));

    // Ekstrak teks dari berbagai format payload (MacroDroid, PayHook, dll)
    const rawText =
      body.text ||           // MacroDroid format: { text: "..." }
      body.message ||        // PayHook format: { message: "..." }
      body.content ||        // format lain
      body.body ||
      JSON.stringify(body);  // fallback: simpan seluruh payload sebagai string

    // Cleanup event lama > 1 jam + simpan event baru
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await Promise.all([
      prisma.qrisEvent.create({
        data: { raw_text: String(rawText), consumed: false },
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
    const afterDate  = afterParam ? new Date(afterParam) : new Date(0);

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
