// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SnowflakeIcon } from "@/components/ui/Icons";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password) {
      setError("Password wajib diisi");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        credentials: "include", // penting: agar cookie tersimpan
      });

      const data = await res.json();

      if (data.success) {
        // Gunakan window.location untuk hard redirect agar cookie terbaca
        window.location.href = "/dashboard";
      } else {
        setError(data.error || "Password salah");
      }
    } catch (err) {
      console.error("Login fetch error:", err);
      setError("Gagal menghubungi server. Pastikan aplikasi berjalan dengan benar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <div style={{ color: "#2563EB" }}>
            <SnowflakeIcon size={32} />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, lineHeight: 1.2 }}>
              KHK Frozen Food
            </div>
            <div style={{ color: "var(--text2)", fontSize: "12px" }}>
              Point of Sales System
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "6px" }}>
          Selamat Datang 👋
        </h1>
        <p style={{ color: "var(--text2)", fontSize: "14px", marginBottom: "28px" }}>
          Masukkan password untuk melanjutkan
        </p>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleLogin()}
            autoFocus
            style={{ fontSize: "16px", padding: "14px" }}
            disabled={loading}
          />
        </div>

        <button
          className="btn btn-primary btn-lg"
          style={{ width: "100%" }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "⏳ Memproses..." : "Masuk →"}
        </button>

        <p style={{ marginTop: "20px", fontSize: "12px", color: "var(--text3)", textAlign: "center" }}>
          Password default: <strong style={{ color: "var(--text2)" }}>admin123</strong><br />
          Ubah di file <code style={{ background: "var(--surface2)", padding: "1px 6px", borderRadius: "4px" }}>.env.local</code>
        </p>
      </div>
    </div>
  );
}
