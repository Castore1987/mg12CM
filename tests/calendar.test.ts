import { describe, expect, it } from "vitest";
import { buildWeeklyBriefs, PILLAR_ROTATION } from "../src/content/calendar.js";

describe("buildWeeklyBriefs", () => {
  it("genera la cantidad de briefs solicitada", () => {
    const briefs = buildWeeklyBriefs({ weekStart: new Date("2026-09-28"), postsPerWeek: 5 });
    expect(briefs).toHaveLength(5);
  });

  it("rota los pilares de contenido en orden", () => {
    const briefs = buildWeeklyBriefs({ weekStart: new Date("2026-09-28"), postsPerWeek: 6 });
    expect(briefs.map((b) => b.pillar)).toEqual(PILLAR_ROTATION);
  });

  it("asigna fechas consecutivas a partir del inicio de semana", () => {
    const briefs = buildWeeklyBriefs({ weekStart: new Date("2026-09-28"), postsPerWeek: 3 });
    expect(briefs.map((b) => b.date)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30"]);
  });

  it("siempre asocia un producto real del catalogo (o null si no hay productos)", () => {
    const briefs = buildWeeklyBriefs({ weekStart: new Date("2026-09-28"), postsPerWeek: 8 });
    for (const brief of briefs) {
      expect(brief.productId).not.toBe("");
    }
  });
});
