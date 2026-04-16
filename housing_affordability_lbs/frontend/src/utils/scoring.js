
export function getThresholds(values) {
  const cleaned = values
    .map((v) => Number(v))
    .filter((v) => !Number.isNaN(v))
    .sort((a, b) => a - b);

  if (cleaned.length === 0) {
    return { close: 0, strong: 0 };
  }

  const closeIndex = Math.floor(cleaned.length * 0.5);
  const strongIndex = Math.floor(cleaned.length * 0.75);

  return {
    close: cleaned[Math.min(closeIndex, cleaned.length - 1)],
    strong: cleaned[Math.min(strongIndex, cleaned.length - 1)],
  };
}

export function scoreAmenity(value, thresholds) {
  const numericValue = Number(value ?? 0);

  if (numericValue >= thresholds.strong) return 1;
  if (numericValue >= thresholds.close) return 0.5;
  return 0;
}

export function getBudgetScore(area, minBudget, maxBudget) {
  if (!area) return 0;

  const price = Number(area.median_price ?? 0);
  const tolerance = 50000;

  if (price >= minBudget && price <= maxBudget) return 1;

  if (
    (price >= minBudget - tolerance && price < minBudget) ||
    (price > maxBudget && price <= maxBudget + tolerance)
  ) {
    return 0.5;
  }

  return 0;
}

export function classifyArea(area, filters, amenityWeights, thresholds, minBudget, maxBudget) {
  if (!area) return { status: "no-data", score: 0 };

  const criteria = [];

  if (filters.budget) {
    const budgetScore = getBudgetScore(area, minBudget, maxBudget);
    const budgetWeight = 4;
    criteria.push({ score: budgetScore, weight: budgetWeight });
  }

  if (filters.schools) {
    criteria.push({
      score: scoreAmenity(area.school_count, thresholds.schoolThresholds),
      weight: amenityWeights.schools,
    });
  }

  if (filters.parks) {
    criteria.push({
      score: scoreAmenity(area.park_count, thresholds.parkThresholds),
      weight: amenityWeights.parks,
    });
  }

  if (filters.universities) {
    criteria.push({
      score: scoreAmenity(area.university_count, thresholds.universityThresholds),
      weight: amenityWeights.universities,
    });
  }

  if (filters.transport) {
    criteria.push({
      score: scoreAmenity(area.rail_tram_count, thresholds.railTramThresholds),
      weight: amenityWeights.transport,
    });
  }

  if (criteria.length === 0) {
    return { status: "neutral", score: 0 };
  }

  const weightedSum = criteria.reduce((sum, item) => sum + item.score * item.weight, 0);
  const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
  const finalScore = weightedSum / totalWeight;

  if (finalScore >= 0.8) return { status: "best-match", score: finalScore };
  if (finalScore >= 0.4) return { status: "close-match", score: finalScore };
  return { status: "outside-range", score: finalScore };
}

export function getSuitabilityColour(status) {
  if (status === "best-match") return "#16a34a";
  if (status === "close-match") return "#f59e0b";
  if (status === "outside-range") return "#dc2626";
  return "#e5e7eb";
}

export function getAreaSummary(area, filters, thresholds, minBudget, maxBudget) {
  if (!area) return [];

  const summary = [];

  if (filters.budget) {
    const price = Number(area.median_price ?? 0);

    if (price >= minBudget && price <= maxBudget) {
      summary.push("✔ Within budget");
    } else {
      summary.push("✖ Outside budget");
    }
  }

  if (filters.schools) {
    if ((area.school_count ?? 0) >= thresholds.schoolThresholds.strong) {
      summary.push("✔ Strong school access");
    } else {
      summary.push("✖ Limited school access");
    }
  }

  if (filters.parks) {
    if ((area.park_count ?? 0) >= thresholds.parkThresholds.strong) {
      summary.push("✔ Good park access");
    } else {
      summary.push("✖ Limited parks");
    }
  }

  if (filters.universities) {
    if ((area.university_count ?? 0) >= thresholds.universityThresholds.strong) {
      summary.push("✔ Strong higher education access");
    } else {
      summary.push("✖ Limited higher education access");
    }
  }

  if (filters.transport) {
    if ((area.rail_tram_count ?? 0) >= thresholds.railTramThresholds.strong) {
      summary.push("✔ Strong transport links");
    } else {
      summary.push("✖ Limited transport");
    }
  }

  return summary;
}

export function averageOf(stats, field) {
  const values = Object.values(stats)
    .map((area) => Number(area?.[field] ?? 0))
    .filter((value) => !Number.isNaN(value));

  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getComparison(value, average) {
  if (!average || average === 0) return null;

  const diffPercent = ((value - average) / average) * 100;

  return {
    percent: Math.abs(diffPercent).toFixed(0),
    direction: diffPercent >= 0 ? "above" : "below",
  };
}