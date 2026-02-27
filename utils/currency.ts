// utils/currency.ts

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatRupiahShort(amount: number): string {
  if (amount >= 1_000_000_000) return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`;
  return formatRupiah(amount);
}

export function calculateMarginPercent(sellPrice: number, buyPrice: number): number {
  if (buyPrice === 0) return 0;
  return Math.round(((sellPrice - buyPrice) / buyPrice) * 100);
}

// Hitung nilai diskon dalam Rp dari harga normal
export function calculateDiscountAmount(
  sellPrice: number,
  discountType: "none" | "percent" | "nominal",
  discountValue: number
): number {
  if (discountType === "none" || discountValue <= 0) return 0;
  if (discountType === "percent") {
    return Math.round((sellPrice * Math.min(discountValue, 100)) / 100);
  }
  // nominal
  return Math.min(discountValue, sellPrice);
}

// Hitung harga akhir setelah diskon
export function calculateFinalPrice(
  sellPrice: number,
  discountType: "none" | "percent" | "nominal",
  discountValue: number
): number {
  const discountAmount = calculateDiscountAmount(sellPrice, discountType, discountValue);
  return Math.max(0, sellPrice - discountAmount);
}
