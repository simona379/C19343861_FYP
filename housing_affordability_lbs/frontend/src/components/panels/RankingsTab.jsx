export default function RankingsTab({
  rankedAreas,
  getAreaDescription,
  setSelectedKey,
  setActivePanelTab,
  setPanelOpen,
}) {
  return (
    <>
      <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "18px" }}>
        Best Matching Areas
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        {rankedAreas.map((item, index) => (
          <div
            key={item.key}
            className="ranking-card"
            onClick={() => {
              setSelectedKey(item.key);
              setActivePanelTab("selected");
              setPanelOpen(true);
            }}
            style={{
              border: "1px solid #e6e6e6",
              borderRadius: "12px",
              padding: "14px",
              cursor: "pointer",
              background: "white",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "all 0.15s ease",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
                gap: "12px",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: "18px", lineHeight: 1.2 }}>
                  #{index + 1}. {getAreaDescription(item.key)}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                  {item.key}
                </div>
              </div>

              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  color:
                    item.status === "best-match"
                      ? "#16a34a"
                      : item.status === "close-match"
                        ? "#f59e0b"
                        : "#dc2626",
                }}
              >
                {item.status === "best-match"
                  ? "Best match"
                  : item.status === "close-match"
                    ? "Close match"
                    : "Not suitable"}
              </span>
            </div>

            <div style={{ fontSize: "14px", color: "#475569" }}>
              Median price: €{item.area.median_price.toLocaleString()}
            </div>
            <div style={{ fontSize: "14px", color: "#475569" }}>
              Score: {(item.score * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </>
  );
}