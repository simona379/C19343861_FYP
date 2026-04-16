import PriceTrendChart from "../charts/PriceTrendChart";
import AmenityComparisonChart from "../charts/AmenityComparisonChart";

export default function AnalysisTab({
  selectedArea,
  trendData,
  chartData,
  chartOptions,
  amenityComparisonData,
  amenityComparisonOptions,
}) {
  return (
    <>
      <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "18px" }}>
        Area Insights
      </div>

      <div style={{ display: "grid", gap: "18px", marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
          <span>Median Price</span>
          <strong>
            {selectedArea?.median_price
              ? `€${selectedArea.median_price.toLocaleString()}`
              : "—"}
          </strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
          <span>Transactions</span>
          <strong>{selectedArea?.transactions || "—"}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
          <span>YoY Change</span>
          <strong
            style={{
              color:
                selectedArea?.yoy_percent > 0
                  ? "#17a35b"
                  : selectedArea?.yoy_percent < 0
                    ? "#dc2626"
                    : "#374151",
            }}
          >
            {selectedArea?.yoy_percent != null ? `${selectedArea.yoy_percent}%` : "—"}
          </strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
          <span>Parks</span>
          <strong>{selectedArea?.park_count ?? 0}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
          <span>Schools</span>
          <strong>{selectedArea?.school_count ?? 0}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
          <span>Higher Education</span>
          <strong>{selectedArea?.university_count ?? 0}</strong>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px" }}>
          <span>DART / Luas Access</span>
          <strong>{selectedArea?.rail_tram_count ?? 0}</strong>
        </div>
      </div>

      <PriceTrendChart
        data={chartData}
        options={chartOptions}
        trendData={trendData}
      />

      <div style={{ height: "18px" }} />

      <AmenityComparisonChart
        selectedArea={selectedArea}
        data={amenityComparisonData}
        options={amenityComparisonOptions}
      />
    </>
  );
}