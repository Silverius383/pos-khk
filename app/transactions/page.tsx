// app/transactions/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/layout/AppLayout";
import TransactionsClient from "./TransactionsClient";

export default async function TransactionsPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  try {
    const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
    const lowStockCount = products.filter((p) => p.stock <= p.min_stock).length;

    return (
      <AppLayout title="Kasir / POS" lowStockCount={lowStockCount}>
        <TransactionsClient initialProducts={JSON.parse(JSON.stringify(products))} />
      </AppLayout>
    );
  } catch (error) {
    console.error("Transactions DB error:", error);
    return (
      <AppLayout title="Kasir / POS">
        <div className="alert alert-danger">
          <strong>⚠️ Database belum terhubung.</strong>
          <div style={{ marginTop: "8px", fontSize: "13px" }}>
            Pastikan <code>DATABASE_URL</code> di <code>.env.local</code> sudah diisi, lalu
            jalankan <code>npm run db:push</code>.
          </div>
        </div>
      </AppLayout>
    );
  }
}
