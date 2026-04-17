import { describe, it, expect } from "vitest";
import {
  getThresholds,
  scoreAmenity,
  getBudgetScore,
  classifyArea,
  getComparison,
  getAreaSummary,
} from "./scoring";

describe("getThresholds", () => {
  it("returns zeros for empty input", () => {
    expect(getThresholds([])).toEqual({ close: 0, strong: 0 });
  });

  it("handles numeric strings and ignores invalid values", () => {
    expect(getThresholds(["10", 20, null, undefined, "abc", 30])).toEqual({
      close: 20,
      strong: 30,
    });
  });

  it("handles a single value", () => {
    expect(getThresholds([7])).toEqual({ close: 7, strong: 7 });
  });
});

describe("scoreAmenity", () => {
  const thresholds = { close: 10, strong: 20 };

  it("returns 1 when value is at or above strong", () => {
    expect(scoreAmenity(20, thresholds)).toBe(1);
    expect(scoreAmenity(25, thresholds)).toBe(1);
  });

  it("returns 0.5 when value is at or above close but below strong", () => {
    expect(scoreAmenity(10, thresholds)).toBe(0.5);
    expect(scoreAmenity(15, thresholds)).toBe(0.5);
  });

  it("returns 0 when below close or missing", () => {
    expect(scoreAmenity(5, thresholds)).toBe(0);
    expect(scoreAmenity(null, thresholds)).toBe(0);
    expect(scoreAmenity(undefined, thresholds)).toBe(0);
  });
});

describe("getBudgetScore", () => {
  it("returns 1 when price is inside budget", () => {
    expect(getBudgetScore({ median_price: 600000 }, 500000, 750000)).toBe(1);
  });

  it("returns 1 exactly on min and max boundaries", () => {
    expect(getBudgetScore({ median_price: 500000 }, 500000, 750000)).toBe(1);
    expect(getBudgetScore({ median_price: 750000 }, 500000, 750000)).toBe(1);
  });

  it("returns 0.5 when within tolerance outside range", () => {
    expect(getBudgetScore({ median_price: 460000 }, 500000, 750000)).toBe(0.5);
    expect(getBudgetScore({ median_price: 790000 }, 500000, 750000)).toBe(0.5);
  });

  it("returns 0 when outside tolerance or area missing", () => {
    expect(getBudgetScore({ median_price: 400000 }, 500000, 750000)).toBe(0);
    expect(getBudgetScore(null, 500000, 750000)).toBe(0);
    expect(getBudgetScore({}, 500000, 750000)).toBe(0);
  });
});

describe("classifyArea", () => {
  const thresholds = {
    schools: { close: 10, strong: 20 },
    parks: { close: 5, strong: 10 },
    universities: { close: 1, strong: 3 },
    transport: { close: 2, strong: 4 },
  };

  const weights = {
    schools: 2,
    parks: 2,
    universities: 2,
    transport: 2,
  };

  it("returns no-data for null area", () => {
    expect(
      classifyArea({
        area: null,
        filters: { budget: true },
        thresholds,
        weights,
        minBudget: 500000,
        maxBudget: 750000,
      })
    ).toEqual({ status: "no-data", score: 0 });
  });

  it("returns neutral when no filters are active", () => {
    expect(
      classifyArea({
        area: { median_price: 600000 },
        filters: {
          budget: false,
          schools: false,
          parks: false,
          universities: false,
          transport: false,
        },
        thresholds,
        weights,
        minBudget: 500000,
        maxBudget: 750000,
      })
    ).toEqual({ status: "neutral", score: 0 });
  });

  it("returns best-match for strong budget and amenity performance", () => {
    const result = classifyArea({
      area: {
        median_price: 600000,
        school_count: 25,
        park_count: 12,
        university_count: 4,
        rail_tram_count: 5,
      },
      filters: {
        budget: true,
        schools: true,
        parks: true,
        universities: true,
        transport: true,
      },
      thresholds,
      weights,
      minBudget: 500000,
      maxBudget: 750000,
    });

    expect(result.status).toBe("best-match");
    expect(result.score).toBeGreaterThanOrEqual(0.8);
  });

  it("returns outside-range for poor performance", () => {
    const result = classifyArea({
      area: {
        median_price: 900000,
        school_count: 0,
        park_count: 0,
        university_count: 0,
        rail_tram_count: 0,
      },
      filters: {
        budget: true,
        schools: true,
        parks: true,
        universities: true,
        transport: true,
      },
      thresholds,
      weights,
      minBudget: 500000,
      maxBudget: 750000,
    });

    expect(result.status).toBe("outside-range");
    expect(result.score).toBeLessThan(0.4);
  });
});

describe("getComparison", () => {
  it("returns null when average is zero or missing", () => {
    expect(getComparison(10, 0)).toBeNull();
    expect(getComparison(10, null)).toBeNull();
  });

  it("returns above comparison correctly", () => {
    expect(getComparison(15, 10)).toEqual({
      percent: "50",
      direction: "above",
    });
  });

  it("returns below comparison correctly", () => {
    expect(getComparison(5, 10)).toEqual({
      percent: "50",
      direction: "below",
    });
  });
});

describe("getAreaSummary", () => {
  const thresholds = {
    schools: { strong: 20 },
    parks: { strong: 10 },
    universities: { strong: 3 },
    transport: { strong: 4 },
  };

  it("returns empty array for missing area", () => {
    expect(
      getAreaSummary({
        area: null,
        filters: { budget: true },
        thresholds,
        minBudget: 500000,
        maxBudget: 750000,
      })
    ).toEqual([]);
  });

  it("returns positive summary lines for strong area", () => {
    const result = getAreaSummary({
      area: {
        median_price: 600000,
        school_count: 25,
        park_count: 12,
        university_count: 4,
        rail_tram_count: 5,
      },
      filters: {
        budget: true,
        schools: true,
        parks: true,
        universities: true,
        transport: true,
      },
      thresholds,
      minBudget: 500000,
      maxBudget: 750000,
    });

    expect(result).toContain("✔ Within budget");
    expect(result).toContain("✔ Strong school access");
    expect(result).toContain("✔ Good park access");
    expect(result).toContain("✔ Strong higher education access");
    expect(result).toContain("✔ Strong transport links");
  });

  it("returns negative summary lines for weak area", () => {
    const result = getAreaSummary({
      area: {
        median_price: 900000,
        school_count: 5,
        park_count: 2,
        university_count: 0,
        rail_tram_count: 1,
      },
      filters: {
        budget: true,
        schools: true,
        parks: true,
        universities: true,
        transport: true,
      },
      thresholds,
      minBudget: 500000,
      maxBudget: 750000,
    });

    expect(result).toContain("✖ Outside budget");
    expect(result).toContain("✖ Limited school access");
    expect(result).toContain("✖ Limited parks");
    expect(result).toContain("✖ Limited higher education access");
    expect(result).toContain("✖ Limited transport");
  });
});