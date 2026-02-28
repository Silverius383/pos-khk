// components/ui/PageLoader.tsx
export default function PageLoader() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      padding: "4px",
      animation: "fadeIn 0.2s ease",
    }}>
      {/* Stats row skeleton */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "16px",
      }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card" style={{ padding: "20px" }}>
            <div className="skeleton" style={{ height: "12px", width: "60%", marginBottom: "12px" }} />
            <div className="skeleton" style={{ height: "28px", width: "80%" }} />
            <div className="skeleton" style={{ height: "10px", width: "40%", marginTop: "10px" }} />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="card" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div className="skeleton" style={{ height: "16px", width: "160px" }} />
          <div className="skeleton" style={{ height: "32px", width: "120px", borderRadius: "8px" }} />
        </div>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)" }}>
          <div className="skeleton" style={{ height: "36px", width: "100%", borderRadius: "8px" }} />
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            gap: "16px",
            alignItems: "center",
            opacity: 1 - i * 0.1,
          }}>
            <div className="skeleton" style={{ height: "14px", flex: 2 }} />
            <div className="skeleton" style={{ height: "14px", flex: 1 }} />
            <div className="skeleton" style={{ height: "14px", flex: 1 }} />
            <div className="skeleton" style={{ height: "14px", flex: 1 }} />
            <div className="skeleton" style={{ height: "24px", width: "60px", borderRadius: "20px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}