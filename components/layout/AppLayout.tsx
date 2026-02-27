// components/layout/AppLayout.tsx
"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { MenuIcon } from "@/components/ui/Icons";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  lowStockCount?: number;
}

export default function AppLayout({ children, title, lowStockCount }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const now = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        lowStockCount={lowStockCount}
      />

      <main className="main-content">
        <div className="topbar">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <MenuIcon />
          </button>
          <div className="topbar-title">{title}</div>
          <div className="topbar-date">{now}</div>
        </div>

        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
