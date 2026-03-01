// app/restock/loading.tsx
import AppLayout from "@/components/layout/AppLayout";
import PageLoader from "@/components/ui/PageLoader";

export default function Loading() {
  return (
    <AppLayout title="Input Restock Produk">
      <PageLoader />
    </AppLayout>
  );
}