// components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SnowflakeIcon, DashboardIcon, CartIcon, ProductIcon,
  ExpenseIcon, ReportIcon, LogoutIcon,
} from "@/components/ui/Icons";

const NAV_ITEMS = [
  { href: "/dashboard",     label: "Dashboard",     Icon: DashboardIcon },
  { href: "/transactions",  label: "Kasir / POS",   Icon: CartIcon },
  { href: "/products",      label: "Produk",        Icon: ProductIcon },
  { href: "/expenses",      label: "Pengeluaran",   Icon: ExpenseIcon },
  { href: "/reports",       label: "Laporan",       Icon: ReportIcon },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  lowStockCount?: number;
}

export default function Sidebar({ isOpen, onClose, lowStockCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const now = new Date().toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="overlay-backdrop" style={{ zIndex: 150 }} onClick={onClose} />
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <SnowflakeIcon size={26} />
          </div>
          <div>
            <div className="sidebar-logo-text">Toko Frozen</div>
            <div className="sidebar-logo-sub">Food POS System</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={onClose}
              >
                <Icon size={20} />
                <span className="nav-item-label">{label}</span>
                {href === "/products" && lowStockCount > 0 && (
                  <span className="nav-badge">{lowStockCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="sidebar-bottom">
          <div className="sidebar-date">{now}</div>
          <button className="nav-item" onClick={handleLogout}>
            <LogoutIcon size={20} />
            <span className="nav-item-label">Keluar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
