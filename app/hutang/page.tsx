// app/hutang/page.tsx
export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AppLayout from "@/components/layout/AppLayout";
import HutangClient from "./HutangClient";

export default async function HutangPage() {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const [pendingTx, products] = await Promise.all([
    prisma.transaction.findMany({
      where:   { payment_status: "pending" },
      include: { items: true },
      orderBy: { created_at: "asc" },
    }),
    prisma.product.findMany({ where: { deleted_at: null } }),
  ]);

  const lowStockCount = products.filter((p) => p.stock <= p.min_stock).length;

  return (
    <AppLayout title="Hutang Pelanggan" lowStockCount={lowStockCount}>
      <HutangClient initialTransactions={JSON.parse(JSON.stringify(pendingTx))} />
    </AppLayout>
  );
}
