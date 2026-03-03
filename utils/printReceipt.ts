// utils/printReceipt.ts
import { Transaction } from "@/types";

const PAPER_WIDTH = 32; // 58mm kertas

function formatRp(amount: number): string {
  return "Rp" + amount.toLocaleString("id-ID");
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const PAYMENT_LABEL: Record<string, string> = {
  tunai:    "Tunai",
  transfer: "Transfer Bank",
  qris:     "QRIS",
};

// ESC/POS commands as strings
function esc(...bytes: number[]): string {
  return bytes.map((b) => String.fromCharCode(b)).join("");
}

const E = {
  INIT:         esc(0x1b, 0x40),
  ALIGN_LEFT:   esc(0x1b, 0x61, 0x00),
  ALIGN_CENTER: esc(0x1b, 0x61, 0x01),
  BOLD_ON:      esc(0x1b, 0x45, 0x01),
  BOLD_OFF:     esc(0x1b, 0x45, 0x00),
  DOUBLE_ON:    esc(0x1d, 0x21, 0x11),
  DOUBLE_OFF:   esc(0x1d, 0x21, 0x00),
  FONT_SMALL:   esc(0x1b, 0x4d, 0x01),
  FONT_NORMAL:  esc(0x1b, 0x4d, 0x00),
  FEED_3:       esc(0x1b, 0x64, 0x03),
  FEED_1:       esc(0x1b, 0x64, 0x01),
  CUT:          esc(0x1d, 0x56, 0x42, 0x00),
  LF:           "\n",
};

function center(text: string): string {
  return E.ALIGN_CENTER + text.slice(0, PAPER_WIDTH) + E.LF + E.ALIGN_LEFT;
}

function left(text: string): string {
  return text.slice(0, PAPER_WIDTH) + E.LF;
}

function divider(): string {
  return "-".repeat(PAPER_WIDTH) + E.LF;
}

function row(label: string, value: string): string {
  const maxLabel = PAPER_WIDTH - value.length - 1;
  const l = label.slice(0, maxLabel).padEnd(maxLabel);
  return l + " " + value + E.LF;
}

export function buildReceiptString(tx: Transaction): string {
  let s = "";

  s += E.INIT + E.FEED_1;

  // Header
  s += E.BOLD_ON + E.DOUBLE_ON + center("KHK FROZEN FOOD") + E.DOUBLE_OFF + E.BOLD_OFF;
  s += E.FONT_SMALL + center("Jl. Cempaka No.108, Salakan") + center("Mertoyudan, Magelang 56172") + E.FONT_NORMAL;
  s += center("Struk Pembelian");
  s += center(formatDate(tx.created_at));
  s += divider();

  // Items
  for (const item of tx.items) {
    s += E.BOLD_ON + left(item.product_name) + E.BOLD_OFF;
    s += row("  " + item.quantity + "x " + formatRp(item.final_price), formatRp(item.subtotal));

    if (item.discount_type !== "none" && item.discount_amount > 0) {
      const discLabel = item.discount_type === "percent"
        ? "  Diskon " + item.discount_value + "%"
        : "  Diskon " + formatRp(item.discount_value);
      s += E.FONT_SMALL + left(discLabel) + E.FONT_NORMAL;
    }
  }

  s += divider();

  if (tx.total_discount > 0) {
    s += row("Total Diskon", "-" + formatRp(tx.total_discount));
  }

  s += E.BOLD_ON + E.DOUBLE_ON + row("TOTAL", formatRp(tx.total_amount)) + E.DOUBLE_OFF + E.BOLD_OFF;
  s += divider();

  const payLabel = PAYMENT_LABEL[tx.payment_method] ?? "Tunai";
  s += row("Pembayaran", payLabel);

  if (tx.payment_method === "tunai" && tx.cash_received) {
    s += row("Uang Diterima", formatRp(tx.cash_received));
    const change = tx.cash_received - tx.total_amount;
    s += E.BOLD_ON + row("Kembalian", formatRp(change)) + E.BOLD_OFF;
  }

  s += divider();
  s += E.ALIGN_CENTER;
  s += "Terima kasih sudah berbelanja di KHK Frozen Food" + E.LF;
  s += E.ALIGN_LEFT;
  s += E.FEED_3 + E.CUT;

  return s;
}

export function printViaRawBT(tx: Transaction): void {
  try {
    const text = buildReceiptString(tx);

    const bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) {
      bytes[i] = text.charCodeAt(i) & 0xff;
    }

    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    window.location.href = "rawbt:base64," + base64;
  } catch (err) {
    console.error("Print error:", err);
    alert("Gagal membuka RawBT. Pastikan aplikasi RawBT sudah terinstall.");
  }
}