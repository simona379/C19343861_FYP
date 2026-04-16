import ComparisonRow from "./ComparisonRow";

export default function SummaryTab({
  selectedKey,
  selectedResult,
  selectedArea,
  activeFilters,
  amenityWeights,
  getAreaDescription,
  getAreaSummary,
  schoolComparison,
  parkComparison,
  universityComparison,
  transportComparison,
  getStatusLabel,
}) {
  return (
    <>
      <div
        style={{
          display: "inline-block",
          background: "#f4dd45",
          borderRadius: "10px",
          padding: "6px 10px",
          fontWeight: 700,
          fontSize: "15px",
          marginBottom: "16px",
        }}
      >
        {selectedKey || "—"}
      </div>

      <div
        style={{
          fontSize: "28px",
          fontWeight: 800,
          marginBottom: "6px",
        }}
      >
        {selectedKey ? getAreaDescription(selectedKey) : "—"}
      </div>

      <div
        style={{
          fontSize: "42px",
          letterSpacing: "-1px",
          fontWeight: 800,
          marginBottom: "4px",
          color: "#0b2a4a",
        }}
      >
        {(selectedResult.score * 100).toFixed(0)}%
      </div>

      <div
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "#475569",
          marginBottom: "6px",
        }}
      >
        {getStatusLabel(selectedResult.status)}
      </div>

      <div
        style={{
          fontSize: "16px",
          color: "#64748b",
          marginTop: "18px",
          marginBottom: "18px",
        }}
      >
        Overall suitability score
      </div>

      <div
        style={{
          fontSize: "17px",
          letterSpacing: "-0.2px",
          fontWeight: 700,
          marginTop: "18px",
          marginBottom: "8px",
        }}
      >
        Why this area matches
      </div>

      <div
        style={{
          display: "grid",
          gap: "8px",
          fontSize: "14px",
          marginBottom: "20px",
        }}
      >
        {getAreaSummary(selectedArea, activeFilters).map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>

      <div
        style={{
          fontSize: "17px",
          letterSpacing: "-0.2px",
          fontWeight: 700,
          marginTop: "18px",
          marginBottom: "14px",
        }}
      >
        Compared to other areas
      </div>

      <div
        style={{
          display: "grid",
          gap: "6px",
          fontSize: "14px",
          marginBottom: "16px",
        }}
      >
        {activeFilters.schools && (
          <ComparisonRow label="Schools" comparison={schoolComparison} />
        )}

        {activeFilters.parks && (
          <ComparisonRow label="Parks" comparison={parkComparison} />
        )}

        {activeFilters.universities && (
          <ComparisonRow
            label="Higher education"
            comparison={universityComparison}
          />
        )}

        {activeFilters.transport && (
          <ComparisonRow label="Transport" comparison={transportComparison} />
        )}
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "#475569",
          marginTop: "10px",
          lineHeight: 1.5,
        }}
      >
        <div>
          <strong>Selected criteria:</strong>{" "}
          {[
            activeFilters.budget && "Budget",
            activeFilters.schools && "Schools",
            activeFilters.parks && "Parks",
            activeFilters.universities && "Higher education",
            activeFilters.transport && "Transport",
          ]
            .filter(Boolean)
            .join(", ")}
        </div>

        <div style={{ marginTop: "4px" }}>
          <strong>Priority levels:</strong>{" "}
          {[
            activeFilters.schools &&
              `Schools ${
                amenityWeights.schools === 1
                  ? "Low"
                  : amenityWeights.schools === 2
                    ? "Medium"
                    : "High"
              }`,
            activeFilters.parks &&
              `Parks ${
                amenityWeights.parks === 1
                  ? "Low"
                  : amenityWeights.parks === 2
                    ? "Medium"
                    : "High"
              }`,
            activeFilters.universities &&
              `Higher education ${
                amenityWeights.universities === 1
                  ? "Low"
                  : amenityWeights.universities === 2
                    ? "Medium"
                    : "High"
              }`,
            activeFilters.transport &&
              `Transport ${
                amenityWeights.transport === 1
                  ? "Low"
                  : amenityWeights.transport === 2
                    ? "Medium"
                    : "High"
              }`,
          ]
            .filter(Boolean)
            .join(", ")}
        </div>
      </div>
    </>
  );
}