import SummaryTab from "../panels/SummaryTab";
import RankingsTab from "../panels/RankingsTab";
import AnalysisTab from "../panels/AnalysisTab";

export default function LeftPanel(props) {
  const {
    panelOpen,
    setPanelOpen,
    activePanelTab,
    setActivePanelTab,
  } = props;

  return (
    <div
      style={{
        position: "absolute",
        top: "72px",
        left: 0,
        width: "380px",
        height: "calc(100% - 72px)",
        background: "white",
        zIndex: 1200,
        boxShadow: "4px 0 20px rgba(0,0,0,0.18)",
        transform: panelOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s ease",
        overflowY: "auto",
        pointerEvents: panelOpen ? "auto" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "18px 20px",
          borderBottom: "1px solid #e6e6e6",
        }}
      >
        <div style={{ fontSize: "18px", fontWeight: 700, color: "#1f2d3d" }}>
          Selected Area
        </div>

        <button
          onClick={() => setPanelOpen(false)}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "22px",
            cursor: "pointer",
            color: "#667085",
          }}
        >
          x
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          padding: "16px 20px 0 20px",
        }}
      >
        <button
          onClick={() => setActivePanelTab("selected")}
          style={{
            border: "none",
            borderRadius: "10px",
            padding: "8px 12px",
            fontWeight: 700,
            cursor: "pointer",
            background: activePanelTab === "selected" ? "#0b2a4a" : "#e5e7eb",
            color: activePanelTab === "selected" ? "white" : "#1f2d3d",
          }}
        >
          Summary
        </button>

        <button
          onClick={() => setActivePanelTab("rankings")}
          style={{
            border: "none",
            borderRadius: "10px",
            padding: "8px 12px",
            fontWeight: 700,
            cursor: "pointer",
            background: activePanelTab === "rankings" ? "#0b2a4a" : "#e5e7eb",
            color: activePanelTab === "rankings" ? "white" : "#1f2d3d",
          }}
        >
          Rankings
        </button>

        <button
          onClick={() => setActivePanelTab("analysis")}
          style={{
            border: "none",
            borderRadius: "10px",
            padding: "8px 12px",
            fontWeight: 700,
            cursor: "pointer",
            background: activePanelTab === "analysis" ? "#0b2a4a" : "#e5e7eb",
            color: activePanelTab === "analysis" ? "white" : "#1f2d3d",
          }}
        >
          Analysis
        </button>
      </div>

      <div style={{ padding: "24px" }}>
        {activePanelTab === "selected" && <SummaryTab {...props} />}
        {activePanelTab === "rankings" && <RankingsTab {...props} />}
        {activePanelTab === "analysis" && <AnalysisTab {...props} />}
      </div>
    </div>
  );
}