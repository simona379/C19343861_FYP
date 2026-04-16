export default function MapLegend() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "18px",
        left: "18px",
        zIndex: 1000,
        background: "rgba(255,255,255,0.96)",
        borderRadius: "12px",
        padding: "12px 14px",
        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
        border: "1px solid #e5e7eb",
        minWidth: "150px",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          marginBottom: "10px",
          color: "#111827",
        }}
      >
        Score guide
      </div>

      <div style={{ display: "grid", gap: "8px", fontSize: "13px", color: "#374151" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "999px",
              background: "#16a34a",
              display: "inline-block",
            }}
          />
          Best match
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "999px",
              background: "#f59e0b",
              display: "inline-block",
            }}
          />
          Close match
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "999px",
              background: "#dc2626",
              display: "inline-block",
            }}
          />
          Not suitable
        </div>
      </div>
    </div>
  );
}