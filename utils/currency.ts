// utils/currency.ts
// Helper format mata uang Rupiah

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRupiahShort(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}rb`;
  }
  return formatRupiah(amount);
}

export function parseRupiah(value: string): number {
  return parseInt(value.replace(/[^0-9]/g, ""), 10) || 0;
}

export function calculateProfit(sellPrice: number, buyPrice: number, qty: number): number {
  return (sellPrice - buyPrice) * qty;
}

export function calculateMarginPercent(sellPrice: number, buyPrice: number): number {
  if (buyPrice === 0) return 0;
  return Math.round(((sellPrice - buyPrice) / buyPrice) * 100);
}
