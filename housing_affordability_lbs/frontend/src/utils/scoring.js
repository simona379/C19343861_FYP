// -----------------------------
// Thresholds
// -----------------------------
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

// -----------------------------
// Amenity scoring
// -----------------------------
export function scoreAmenity(value, thresholds) {
  const numericValue = Number(value ?? 0);

  if (numericValue >= thresholds.strong) return 1;
  if (numericValue >= thresholds.close) return 0.5;
  return 0;
}

// -----------------------------
// Budget scoring
// -----------------------------
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

// -----------------------------
// Classification
// -----------------------------
export function classifyArea({
  area,
  filters,
  thresholds,
  weights,
  minBudget,
  maxBudget,
}) {
  if (!area) return { status: "no-data", score: 0 };

  const criteria = [];

  // Budget
  if (filters.budget) {
    const budgetScore = getBudgetScore(area, minBudget, maxBudget);
    const budgetWeight = 4;

    criteria.push({
      score: budgetScore,
      weight: budgetWeight,
    });
  }

  // Schools
  if (filters.schools) {
    criteria.push({
      score: scoreAmenity(area.school_count, thresholds.schools),
      weight: weights.schools,
    });
  }

  // Parks
  if (filters.parks) {
    criteria.push({
      score: scoreAmenity(area.park_count, thresholds.parks),
      weight: weights.parks,
    });
  }

  // Universities
  if (filters.universities) {
    criteria.push({
      score: scoreAmenity(area.university_count, thresholds.universities),
      weight: weights.universities,
    });
  }

  // Transport
  if (filters.transport) {
    criteria.push({
      score: scoreAmenity(area.rail_tram_count, thresholds.transport),
      weight: weights.transport,
    });
  }

  if (criteria.length === 0) {
    return { status: "neutral", score: 0 };
  }

  const weightedSum = criteria.reduce(
    (sum, item) => sum + item.score * item.weight,
    0
  );

  const totalWeight = criteria.reduce(
    (sum, item) => sum + item.weight,
    0
  );

  const finalScore = weightedSum / totalWeight;

  if (finalScore >= 0.8) return { status: "best-match", score: finalScore };
  if (finalScore >= 0.4) return { status: "close-match", score: finalScore };

  return { status: "outside-range", score: finalScore };
}

// -----------------------------
// Comparison Analysis
// -----------------------------

export function getComparison(value, average) {
  if (!average || average === 0) return null;

  const diffPercent = ((value - average) / average) * 100;

  return {
    percent: Math.abs(diffPercent).toFixed(0),
    direction: diffPercent >= 0 ? "above" : "below",
  };
}

// -----------------------------
// Area Summary Analysis
// -----------------------------

export function getAreaSummary({
  area,
  filters,
  thresholds,
  minBudget,
  maxBudget,
}) {
  if (!area) return [];

  const summary = [];

  // Budget
  if (filters.budget) {
    const price = Number(area.median_price ?? 0);
    if (price >= minBudget && price <= maxBudget) {
      summary.push("✔ Within budget");
    } else {
      summary.push("✖ Outside budget");
    }
  }

  // Schools
  if (filters.schools) {
    if ((area.school_count ?? 0) >= thresholds.schools.strong) {
      summary.push("✔ Strong school access");
    } else {
      summary.push("✖ Limited school access");
    }
  }

  // Parks
  if (filters.parks) {
    if ((area.park_count ?? 0) >= thresholds.parks.strong) {
      summary.push("✔ Good park access");
    } else {
      summary.push("✖ Limited parks");
    }
  }

  // Universities
  if (filters.universities) {
    if ((area.university_count ?? 0) >= thresholds.universities.strong) {
      summary.push("✔ Strong higher education access");
    } else {
      summary.push("✖ Limited higher education access");
    }
  }

  // Transport
  if (filters.transport) {
    if ((area.rail_tram_count ?? 0) >= thresholds.transport.strong) {
      summary.push("✔ Strong transport links");
    } else {
      summary.push("✖ Limited transport");
    }
  }

  return summary;
}