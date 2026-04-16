export function buildTrendChartData(trendData) {
  return {
    labels: trendData.map((row) => row.year),
    datasets: [
      {
        label: "Median Price (€)",
        data: trendData.map((row) => row.median_price),
        borderColor: "#1d4ed8",
        backgroundColor: "#1d4ed8",
        tension: 0.25,
      },
    ],
  };
}

export const trendChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          return `€${context.raw.toLocaleString()}`;
        },
      },
    },
  },
  scales: {
    y: {
      ticks: {
        callback: function (value) {
          return `€${Number(value).toLocaleString()}`;
        },
      },
    },
  },
};

export function buildAmenityComparisonData(selectedArea, averages) {
  return {
    labels: ["Schools", "Parks", "Higher Education", "DART / Luas"],
    datasets: [
      {
        label: "Selected area",
        data: [
          selectedArea?.school_count ?? 0,
          selectedArea?.park_count ?? 0,
          selectedArea?.university_count ?? 0,
          selectedArea?.rail_tram_count ?? 0,
        ],
        backgroundColor: "rgba(29, 78, 216, 0.85)",
        borderRadius: 6,
      },
      {
        label: "Average",
        data: [
          Number((averages.averageSchools ?? 0).toFixed(1)),
          Number((averages.averageParks ?? 0).toFixed(1)),
          Number((averages.averageUniversities ?? 0).toFixed(1)),
          Number((averages.averageTransport ?? 0).toFixed(1)),
        ],
        backgroundColor: "rgba(148, 163, 184, 0.85)",
        borderRadius: 6,
      },
    ],
  };
}

export const amenityComparisonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "top",
    },
    tooltip: {
      callbacks: {
        label: function (context) {
          return `${context.dataset.label}: ${context.raw}`;
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};