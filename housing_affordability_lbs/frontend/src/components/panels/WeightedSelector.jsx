export default function WeightSelector({
  filterKey,
  amenityWeights,
  setAmenityWeights,
}) {
  const selectedWeight = amenityWeights[filterKey];

  const labels = {
    1: "Low",
    2: "Medium",
    3: "High",
  };

  return (
    <div
      style={{
        marginTop: "8px",
        marginLeft: "26px",
        marginBottom: "4px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          color: "#64748b",
          marginBottom: "6px",
          fontWeight: 600,
        }}
      >
        How important is this?
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        {[1, 2, 3].map((value) => {
          const isActive = selectedWeight === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() =>
                setAmenityWeights((prev) => ({
                  ...prev,
                  [filterKey]: value,
                }))
              }
              style={{
                border: isActive ? "2px solid #0b2a4a" : "1px solid #cbd5e1",
                background: isActive ? "#0b2a4a" : "transparent",
                color: isActive ? "white" : "#475569",
                borderRadius: "999px",
                padding: "6px 10px",
                minWidth: "60px",
                height: "30px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {labels[value]}
            </button>
          );
        })}
      </div>
    </div>
  );
}