// prisma/seed-categories.ts
// Jalankan: npx tsx prisma/seed-categories.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  "Daging Sapi & Ayam",
  "Fillet Dori",
  "French Fries",
  "Belfoods Nugget",
  "Champ Nugget",
  "Fiesta Nugget",
  "Kanzler Nugget",
  "So Good Nugget",
  "Sosis",
  "Ayam Goreng",
  "Cordon Bleu, Katsu, Fish & Chips",
  "Siomay Ayam",
  "Cedea",
  "Giziplus",
  "Indomina",
  "Minaku",
  "Pak Den",
  "Sunfish",
  "Bakso",
  "Italian Pizza & Garlic Bread",
  "Roti Burger, Hot Dog & Isian",
  "Smoke Beef Ham",
  "Home Made Olahan Ayam",
  "Home Made Risoles",
  "Home Made Jajanan",
  "Home Made Cireng, Sempol",
  "Edamame",
  "Kebab",
  "Minipao & Donat",
  "Singkong D9",
  "Jagung Pipil Manis",
  "Mixed Vegetables",
  "Tahu Tofu",
  "Kulit Dimsum / Lumpia",
  "Bumbu Tomyum",
  "Saus & Kecap",
];

async function main() {
  console.log("🌱 Seeding categories...");

  let inserted = 0;
  let skipped  = 0;

  for (const name of CATEGORIES) {
    try {
      await prisma.category.create({ data: { name } });
      inserted++;
    } catch {
      // Sudah ada (unique constraint) — skip
      skipped++;
    }
  }

  console.log(`✅ ${inserted} kategori ditambahkan, ${skipped} sudah ada (dilewati)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
