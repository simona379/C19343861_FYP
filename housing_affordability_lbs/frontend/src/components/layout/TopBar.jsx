export default function TopBar() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "72px",
        background: "#0b2a4a",
        color: "white",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        boxSizing: "border-box",
      }}
    >
      <div>
        <div style={{ fontSize: "24px", fontWeight: 800 }}>
          myhousingmap.uk
        </div>
        <div style={{ fontSize: "13px", opacity: 0.9, marginTop: "2px" }}>
          Interactive Housing Price Map
        </div>
      </div>

      <div
        style={{
          background: "#6fa3eb",
          padding: "8px 16px",
          borderRadius: "999px",
          fontSize: "14px",
          fontWeight: 600,
        }}
      >
        Select an area to explore insights
      </div>
    </div>
  );
}