import { describe, expect, it } from "vitest";
import { computeAdSuggestions } from "../src/analytics/adSuggestions.js";
import type { InquiryLog, PostMetric } from "../src/types.js";

function metric(overrides: Partial<PostMetric>): PostMetric {
  return {
    postId: "p1",
    publishedAt: new Date().toISOString(),
    pillar: "product_spotlight",
    productId: null,
    sport: null,
    reach: 100,
    impressions: 100,
    likes: 5,
    comments: 0,
    saves: 0,
    shares: 0,
    ...overrides,
  };
}

describe("computeAdSuggestions", () => {
  it("sugiere recolectar mas datos cuando la muestra es chica", () => {
    const suggestions = computeAdSuggestions([metric({})], [], { minSampleForInsights: 5 });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].type).toBe("targeted_awareness");
  });

  it("sugiere boostear un post organico top con poco alcance relativo", () => {
    const baseline = Array.from({ length: 6 }, (_, i) =>
      metric({ postId: `base-${i}`, likes: 5, comments: 1, reach: 500 })
    );
    const topPerformer = metric({ postId: "top-1", likes: 90, comments: 40, reach: 200 });

    const suggestions = computeAdSuggestions([...baseline, topPerformer], [], {
      followerCount: 10000,
      minSampleForInsights: 5,
    });

    const boost = suggestions.find((s) => s.type === "boost_post");
    expect(boost).toBeDefined();
    expect(boost?.relatedPostId).toBe("top-1");
  });

  it("detecta un segmento de deporte con rendimiento muy por debajo del promedio", () => {
    const strongSport = Array.from({ length: 4 }, (_, i) =>
      metric({ postId: `strong-${i}`, sport: "crossfit", likes: 60, comments: 10, reach: 200 })
    );
    const weakSport = Array.from({ length: 3 }, (_, i) =>
      metric({ postId: `weak-${i}`, sport: "escalada", likes: 2, comments: 0, reach: 200 })
    );

    const suggestions = computeAdSuggestions([...strongSport, ...weakSport], [], { minSampleForInsights: 5 });
    const underperforming = suggestions.find((s) => s.type === "underperforming_content");
    expect(underperforming).toBeDefined();
    expect(underperforming?.title).toContain("escalada");
  });

  it("detecta un producto con alta demanda de consultas y baja presencia en el contenido", () => {
    const metrics = Array.from({ length: 5 }, (_, i) => metric({ postId: `m-${i}`, productId: "pole-grip" }));
    const inquiries: InquiryLog[] = [{ productId: "pole-grip", count: 8 }];

    const suggestions = computeAdSuggestions(metrics, inquiries, { minSampleForInsights: 5, highDemandThreshold: 5 });
    const highDemand = suggestions.find((s) => s.type === "high_demand_product");
    expect(highDemand).toBeUndefined(); // aparece en los 5 posts, no cuenta como "poca presencia"
  });

  it("sugiere destacar un producto con muchas consultas pero solo 1 post reciente", () => {
    const metrics = [
      metric({ postId: "m-1", productId: "pole-grip" }),
      ...Array.from({ length: 4 }, (_, i) => metric({ postId: `other-${i}`, productId: "grip-tape" })),
    ];
    const inquiries: InquiryLog[] = [{ productId: "pole-grip", count: 8 }];

    const suggestions = computeAdSuggestions(metrics, inquiries, { minSampleForInsights: 5, highDemandThreshold: 5 });
    const highDemand = suggestions.find((s) => s.type === "high_demand_product");
    expect(highDemand).toBeDefined();
    expect(highDemand?.relatedProductId).toBe("pole-grip");
  });
});
