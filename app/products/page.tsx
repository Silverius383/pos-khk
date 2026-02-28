// app/products/page.tsx
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/layout/AppLayout";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  try {
    const products = await prisma.product.findMany({
      where: { deleted_at: null }, // 👈 exclude soft-deleted
      orderBy: { name: "asc" },
    });
    const lowStockCount = products.filter((p) => p.stock <= p.min_stock).length;

    return (
      <AppLayout title="Manajemen Produk" lowStockCount={lowStockCount}>
        <ProductsClient initialProducts={JSON.parse(JSON.stringify(products))} />
      </AppLayout>
    );
  } catch (error) {
    console.error("Products DB error:", error);
    return (
      <AppLayout title="Manajemen Produk">
        <div className="alert alert-danger">
          <strong>⚠️ Database belum terhubung.</strong>
          <div style={{ marginTop: "8px", fontSize: "13px" }}>
            Pastikan <code>DATABASE_URL</code> di file <code>.env.local</code> sudah diisi, lalu
            jalankan <code>npm run db:push</code>.
          </div>
        </div>
      </AppLayout>
    );
  }
}