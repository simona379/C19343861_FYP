import { Bar } from "react-chartjs-2";

export default function AmenityComparisonChart({
  selectedArea,
  data,
  options,
}) {
  return (
    <div
      style={{
        background: "#fcfcfd",
        borderRadius: "12px",
        padding: "14px",
        border: "1px solid #eef2f7",
      }}
    >
      <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "14px" }}>
        Amenity Comparison
      </div>

      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "10px" }}>
        Selected area compared with the average across all routing key areas
      </div>

      <div
        style={{
          height: "280px",
          borderTop: "1px solid #e6e6e6",
          paddingTop: "14px",
        }}
      >
        {selectedArea ? (
          <Bar data={data} options={options} />
        ) : (
          <div style={{ color: "#94a3b8", fontSize: "14px" }}>
            Select an area to view amenity comparison
          </div>
        )}
      </div>
    </div>
  );
}