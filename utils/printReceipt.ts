// utils/printReceipt.ts
import { Transaction } from "@/types";

// ESC/POS commands
const ESC = 0x1b;
const GS  = 0x1d;

const CMD = {
  INIT:           [ESC, 0x40],
  ALIGN_LEFT:     [ESC, 0x61, 0x00],
  ALIGN_CENTER:   [ESC, 0x61, 0x01],
  ALIGN_RIGHT:    [ESC, 0x61, 0x02],
  BOLD_ON:        [ESC, 0x45, 0x01],
  BOLD_OFF:       [ESC, 0x45, 0x00],
  DOUBLE_ON:      [GS,  0x21, 0x11],
  DOUBLE_OFF:     [GS,  0x21, 0x00],
  FONT_SMALL:     [ESC, 0x4d, 0x01],
  FONT_NORMAL:    [ESC, 0x4d, 0x00],
  CUT:            [GS,  0x56, 0x42, 0x00],
  FEED_3:         [ESC, 0x64, 0x03],
  FEED_1:         [ESC, 0x64, 0x01],
  LF:             [0x0a],
};

const PAPER_WIDTH = 32; // 58mm ≈ 32 karakter per baris

// ── Helpers ────────────────────────────────────────────────────────────────

function toBytes(str: string): number[] {
  // Encode string to Latin-1 bytes (supported by most thermal printers)
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes.push(code < 256 ? code : 0x3f); // '?' for unsupported chars
  }
  return bytes;
}

function line(text: string): number[] {
  return [...toBytes(text.slice(0, PAPER_WIDTH)), ...CMD.LF];
}

function center(text: string): number[] {
  const padded = text.slice(0, PAPER_WIDTH);
  return [...CMD.ALIGN_CENTER, ...toBytes(padded), ...CMD.LF, ...CMD.ALIGN_LEFT];
}

function divider(): number[] {
  return line("-".repeat(PAPER_WIDTH));
}

function row(left: string, right: string): number[] {
  // Left-aligned label, right-aligned value in one line
  const maxLeft = PAPER_WIDTH - right.length - 1;
  const l = left.slice(0, maxLeft).padEnd(maxLeft);
  return line(`${l} ${right}`);
}

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

// ── Main builder ───────────────────────────────────────────────────────────

export function buildReceiptBytes(tx: Transaction): Uint8Array {
  const buf: number[] = [];

  const push = (...chunks: number[][]) => chunks.forEach((c) => buf.push(...c));

  push(CMD.INIT, CMD.FEED_1);

  // Header
  push(
    CMD.BOLD_ON,
    CMD.DOUBLE_ON,
    ...center("KHK FROZEN FOOD"),
    CMD.DOUBLE_OFF,
    CMD.BOLD_OFF,
  );
  push(...center("Struk Pembelian"));
  push(...center(formatDate(tx.created_at)));
  push(...divider());

  // Items
  for (const item of tx.items) {
    // Product name (truncate if too long)
    push(CMD.BOLD_ON, ...line(item.product_name.slice(0, PAPER_WIDTH)), CMD.BOLD_OFF);

    // Qty x price = subtotal
    const qtyPrice = `  ${item.quantity}x ${formatRp(item.final_price)}`;
    push(...row(qtyPrice, formatRp(item.subtotal)));

    // Discount info if any
    if (item.discount_type !== "none" && item.discount_amount > 0) {
      const discLabel = item.discount_type === "percent"
        ? `  Diskon ${item.discount_value}%`
        : `  Diskon ${formatRp(item.discount_value)}`;
      push(CMD.FONT_SMALL, ...line(discLabel), CMD.FONT_NORMAL);
    }
  }

  push(...divider());

  // Discount total
  if (tx.total_discount > 0) {
    push(...row("Total Diskon", `-${formatRp(tx.total_discount)}`));
  }

  // Grand total — big
  push(
    CMD.BOLD_ON,
    CMD.DOUBLE_ON,
    ...row("TOTAL", formatRp(tx.total_amount)),
    CMD.DOUBLE_OFF,
    CMD.BOLD_OFF,
  );

  push(...divider());

  // Payment info
  const payLabel = PAYMENT_LABEL[tx.payment_method] ?? "Tunai";
  push(...row("Pembayaran", payLabel));

  if (tx.payment_method === "tunai" && tx.cash_received) {
    push(...row("Uang Diterima", formatRp(tx.cash_received)));
    const change = tx.cash_received - tx.total_amount;
    push(CMD.BOLD_ON, ...row("Kembalian", formatRp(change)), CMD.BOLD_OFF);
  }

  push(...divider());

  // Footer
  push(
    CMD.ALIGN_CENTER,
    ...center("Terima kasih sudah berbelanja!"),
    ...center("KHK Frozen Food"),
    CMD.ALIGN_LEFT,
  );

  push(CMD.FEED_3, CMD.CUT);

  return new Uint8Array(buf);
}

// ── Print via RawBT ────────────────────────────────────────────────────────

export function printViaRawBT(tx: Transaction): void {
  try {
    const bytes  = buildReceiptBytes(tx);

    // Convert to base64
    let binary = "";
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    const base64 = btoa(binary);

    // RawBT URL scheme
    const url = `rawbt:base64,${base64}`;
    window.location.href = url;
  } catch (err) {
    console.error("Print error:", err);
    alert("Gagal membuka RawBT. Pastikan aplikasi RawBT sudah terinstall.");
  }
}