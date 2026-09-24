import { describe, expect, it } from "vitest";
import { computeBestTimes } from "../src/analytics/bestTime.js";
import type { PostMetric } from "../src/types.js";

function metric(overrides: Partial<PostMetric>): PostMetric {
  return {
    postId: "p1",
    publishedAt: new Date().toISOString(),
    pillar: "product_spotlight",
    productId: null,
    sport: null,
    reach: 100,
    impressions: 100,
    likes: 10,
    comments: 0,
    saves: 0,
    shares: 0,
    ...overrides,
  };
}

describe("computeBestTimes", () => {
  it("devuelve horarios default de industria cuando no hay historico", () => {
    const slots = computeBestTimes([]);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.source === "default_industria")).toBe(true);
  });

  it("prioriza el bloque horario con mejor tasa de engagement historica", () => {
    // Martes (weekday 2) 19hs: muy buen engagement, 3 muestras
    const goodSlot = "2026-09-29T19:00:00"; // martes
    // Jueves (weekday 4) 13hs: bajo engagement, 3 muestras
    const badSlot = "2026-10-01T13:00:00"; // jueves

    const metrics: PostMetric[] = [
      metric({ postId: "a1", publishedAt: goodSlot, reach: 100, likes: 50, comments: 10 }),
      metric({ postId: "a2", publishedAt: goodSlot, reach: 100, likes: 45, comments: 12 }),
      metric({ postId: "a3", publishedAt: goodSlot, reach: 100, likes: 48, comments: 9 }),
      metric({ postId: "b1", publishedAt: badSlot, reach: 100, likes: 2, comments: 0 }),
      metric({ postId: "b2", publishedAt: badSlot, reach: 100, likes: 3, comments: 0 }),
      metric({ postId: "b3", publishedAt: badSlot, reach: 100, likes: 1, comments: 0 }),
    ];

    const slots = computeBestTimes(metrics, { minSampleSize: 2, topN: 2 });
    expect(slots[0].source).toBe("historico");
    expect(slots[0].weekday).toBe(2);
    expect(slots[0].avgEngagementRate).toBeGreaterThan(slots[1].avgEngagementRate);
  });

  it("ignora metricas con reach 0 para no dividir por cero", () => {
    const metrics = [metric({ reach: 0, likes: 5 })];
    const slots = computeBestTimes(metrics);
    expect(slots.every((s) => s.source === "default_industria")).toBe(true);
  });
});
