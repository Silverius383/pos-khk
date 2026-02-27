// prisma/seed.ts
// Jalankan: npm run db:seed

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Hapus data lama
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.product.deleteMany();

  // Produk contoh
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Nugget Ayam 500g",
        category: "Nugget",
        buy_price: 25000,
        sell_price: 32000,
        stock: 20,
        min_stock: 5,
      },
    }),
    prisma.product.create({
      data: {
        name: "Sosis Sapi 1kg",
        category: "Sosis",
        buy_price: 45000,
        sell_price: 58000,
        stock: 15,
        min_stock: 3,
      },
    }),
    prisma.product.create({
      data: {
        name: "Bakso Ikan 500g",
        category: "Bakso",
        buy_price: 18000,
        sell_price: 24000,
        stock: 3,
        min_stock: 5,
      },
    }),
    prisma.product.create({
      data: {
        name: "Dimsum Udang 250g",
        category: "Dimsum",
        buy_price: 22000,
        sell_price: 30000,
        stock: 8,
        min_stock: 4,
      },
    }),
    prisma.product.create({
      data: {
        name: "Kentang Goreng 1kg",
        category: "Frozen Potato",
        buy_price: 35000,
        sell_price: 45000,
        stock: 12,
        min_stock: 5,
      },
    }),
    prisma.product.create({
      data: {
        name: "Siomay Ayam 300g",
        category: "Dimsum",
        buy_price: 20000,
        sell_price: 27000,
        stock: 6,
        min_stock: 3,
      },
    }),
  ]);

  console.log(`✅ ${products.length} produk dibuat`);

  // Contoh pengeluaran
  await prisma.expense.createMany({
    data: [
      { name: "Listrik Freezer Bulan Ini", amount: 150000, category: "Listrik" },
      { name: "Beli Stok Nugget (2 karton)", amount: 500000, category: "Pembelian Stok" },
      { name: "Plastik Kresek", amount: 15000, category: "Operasional" },
    ],
  });

  console.log("✅ Pengeluaran contoh dibuat");
  console.log("🎉 Seeding selesai!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
