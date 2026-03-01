// app/restock/page.tsx
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/layout/AppLayout";
import RestockClient from "./RestockClient";

export default async function RestockPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const products = await prisma.product.findMany({
    where: { deleted_at: null },
    orderBy: [{ stock: "asc" }, { name: "asc" }], // tampilkan stok terendah dulu
  });

  const lowStockCount = products.filter((p) => p.stock <= p.min_stock).length;

  return (
    <AppLayout title="Input Restock Produk" lowStockCount={lowStockCount}>
      <RestockClient initialProducts={JSON.parse(JSON.stringify(products))} />
    </AppLayout>
  );
}