import WeightSelector from "../panels/WeightSelector";

export default function RightSidebar({
  filtersOpen,
  setFiltersOpen,
  minBudget,
  maxBudget,
  setMinBudget,
  setMaxBudget,
  activeFilters,
  setActiveFilters,
  amenityWeights,
  setAmenityWeights,
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: "72px",
        right: 0,
        width: filtersOpen ? "300px" : "64px",
        height: "calc(100% - 72px)",
        background: "white",
        zIndex: 1100,
        boxShadow: "-4px 0 20px rgba(0,0,0,0.15)",
        transition: "width 0.3s ease",
        overflow: "auto",
        display: "flex",
        flexDirection: "column",
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
        {filtersOpen && (
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#1f2d3d" }}>
            Filters
          </div>
        )}

        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          style={{
            border: "none",
            background: "transparent",
            fontSize: "20px",
            cursor: "pointer",
            color: "#667085",
            marginLeft: "auto",
          }}
        >
          ☰
        </button>
      </div>

      {filtersOpen && (
        <div
          style={{
            padding: "16px 20px",
            overflowY: "auto",
            height: "calc(100% - 65px)",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "14px" }}>
            Budget Range
          </div>

          <div style={{ display: "grid", gap: "10px", marginBottom: "18px" }}>
            <input
              type="range"
              min="200000"
              max="1000000"
              step="10000"
              value={minBudget}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value < maxBudget) setMinBudget(value);
              }}
            />

            <input
              type="range"
              min="200000"
              max="1000000"
              step="10000"
              value={maxBudget}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (value > minBudget) setMaxBudget(value);
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "14px",
              fontWeight: 600,
              color: "#374151",
              marginBottom: "20px",
            }}
          >
            <span>€{(minBudget / 1000).toFixed(0)}k</span>
            <span>€{(maxBudget / 1000).toFixed(0)}k</span>
          </div>

          <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "12px" }}>
            Preferences
          </div>

          <div
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              marginTop: "4px",
              marginBottom: "12px",
            }}
          >
            Higher importance = stronger influence on results
          </div>

          {[
            ["schools", "Schools"],
            ["parks", "Parks"],
            ["universities", "Higher education"],
            ["transport", "DART / Luas access"],
          ].map(([key, label]) => (
            <div
              key={key}
              style={{
                padding: "12px",
                borderRadius: "10px",
                background: "#f8fafc",
                marginBottom: "12px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  fontSize: "14px",
                }}
              >
                <input
                  type="checkbox"
                  checked={activeFilters[key]}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setActiveFilters((prev) => ({ ...prev, [key]: checked }));
                    if (!checked) {
                      setAmenityWeights((prev) => ({ ...prev, [key]: 2 }));
                    }
                  }}
                />
                {label}
              </label>

              {activeFilters[key] && (
                <WeightSelector
                  filterKey={key}
                  amenityWeights={amenityWeights}
                  setAmenityWeights={setAmenityWeights}
                />
              )}
            </div>
          ))}

          <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "14px" }}>
            Score guide
          </div>

          <div style={{ display: "grid", gap: "8px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
              <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
              Best match (80-100%)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
              <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }} />
              Close match (40-79%)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
              <span style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#dc2626", display: "inline-block" }} />
              Not suitable (0-39%)
            </div>
          </div>

          <button
            style={{
              width: "100%",
              background: "#cbd5e1",
              color: "#475569",
              border: "none",
              borderRadius: "10px",
              padding: "9px 12px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "not-allowed",
            }}
            disabled
          >
            Filters update automatically
          </button>
        </div>
      )}
    </div>
  );
}