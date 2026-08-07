// utils/qris.ts

/** Parse EMV TLV string menjadi array of { tag, value } */
function parseTLV(str: string): { tag: string; value: string }[] {
  const result: { tag: string; value: string }[] = [];
  let i = 0;
  while (i + 4 <= str.length) {
    const tag = str.slice(i, i + 2);
    const len = parseInt(str.slice(i + 2, i + 4), 10);
    if (isNaN(len)) break;
    const value = str.slice(i + 4, i + 4 + len);
    result.push({ tag, value });
    i += 4 + len;
  }
  return result;
}

/** Rebuild TLV array kembali menjadi string */
function buildTLV(fields: { tag: string; value: string }[]): string {
  return fields
    .map(({ tag, value }) => {
      const len = value.length.toString().padStart(2, "0");
      return `${tag}${len}${value}`;
    })
    .join("");
}

/** CRC16/CCITT — poly 0x1021, init 0xFFFF */
function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Generate string QRIS dinamis dengan nominal ter-inject.
 * Mengikuti standar EMV QR Code (QRIS BI).
 *
 * @param baseString - raw string dari QR statis merchant (hasil scan)
 * @param amount     - nominal transaksi dalam Rupiah (bilangan bulat)
 * @returns string QRIS baru yang siap di-encode ke QR image
 */
export function generateQrisString(baseString: string, amount: number): string {
  // Strip 4 karakter CRC di akhir (tag 63) sebelum parse
  const strWithoutCrc = baseString.slice(0, -4);
  const fields = parseTLV(strWithoutCrc);

  // Buang tag 63 (CRC) dan tag 54 (amount) jika sudah ada
  const cleaned = fields.filter((f) => f.tag !== "63" && f.tag !== "54");

  // Ubah tag 01 dari "11" (static) ke "12" (dynamic)
  const updated = cleaned.map((f) => {
    if (f.tag === "01") return { tag: "01", value: "12" };
    return f;
  });

  // Inject tag 54 (Transaction Amount) tepat setelah tag 53 (Currency)
  const idx53 = updated.findIndex((f) => f.tag === "53");
  const insertAt = idx53 >= 0 ? idx53 + 1 : updated.length;
  updated.splice(insertAt, 0, {
    tag: "54",
    value: amount.toString(),
  });

  // Rebuild string + append CRC placeholder "6304" lalu hitung CRC
  const raw = buildTLV(updated) + "6304";
  const checksum = crc16(raw);

  return raw + checksum;
}
