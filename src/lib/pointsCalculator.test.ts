import { describe, it, expect } from "vitest";
import { calculateComponentPoints } from "./pointsCalculator";

describe("calculateComponentPoints", () => {
  const totalSeconds = 30;

  it("gives max points at start of round", () => {
    expect(calculateComponentPoints(0, totalSeconds)).toBe(500);
  });

  it("gives max points during grace period (first 10%)", () => {
    expect(calculateComponentPoints(2, totalSeconds)).toBe(500);
    expect(calculateComponentPoints(3, totalSeconds)).toBe(500);
  });

  it("starts decaying after grace period", () => {
    const points = calculateComponentPoints(4, totalSeconds);
    expect(points).toBeLessThan(500);
    expect(points).toBeGreaterThan(250);
  });

  it("gives min points at end of round", () => {
    expect(calculateComponentPoints(30, totalSeconds)).toBe(250);
  });

  it("decays linearly between grace period and end", () => {
    const midpoint = calculateComponentPoints(16.5, totalSeconds);
    expect(midpoint).toBeCloseTo(375, 0);
  });

  it("handles different round lengths", () => {
    expect(calculateComponentPoints(0, 60)).toBe(500);
    expect(calculateComponentPoints(60, 60)).toBe(250);
    expect(calculateComponentPoints(0, 15)).toBe(500);
    expect(calculateComponentPoints(15, 15)).toBe(250);
  });

  it("rounds up (ceil) the result", () => {
    const points = calculateComponentPoints(10, totalSeconds);
    expect(Number.isInteger(points)).toBe(true);
  });
});
