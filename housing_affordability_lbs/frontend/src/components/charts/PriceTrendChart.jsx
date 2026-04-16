import { Line } from "react-chartjs-2";

export default function PriceTrendChart({ data, options, trendData }) {
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
        Price Trend
      </div>

      <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "6px" }}>
        Median price over time
      </div>

      <div
        style={{
          height: "260px",
          borderTop: "1px solid #e6e6e6",
          paddingTop: "14px",
        }}
      >
        {trendData.length > 0 ? (
          <Line data={data} options={options} />
        ) : (
          <div style={{ color: "#94a3b8", fontSize: "14px" }}>
            No trend data available
          </div>
        )}
      </div>
    </div>
  );
}