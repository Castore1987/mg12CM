import { describe, expect, it } from "vitest";
import { loadGrowthTactics, suggestGrowthTactics } from "../src/growth/playbook.js";

describe("growth playbook", () => {
  it("carga tacticas del catalogo", () => {
    expect(loadGrowthTactics().length).toBeGreaterThan(0);
  });

  it("filtra por objetivo", () => {
    const tactics = suggestGrowthTactics({ goal: "ventas", limit: 10 });
    expect(tactics.length).toBeGreaterThan(0);
    expect(tactics.every((t) => t.goals.includes("ventas"))).toBe(true);
  });

  it("respeta el limite pedido", () => {
    const tactics = suggestGrowthTactics({ limit: 2 });
    expect(tactics).toHaveLength(2);
  });

  it("rota las sugerencias segun el offset", () => {
    const first = suggestGrowthTactics({ limit: 3, offset: 0 });
    const rotated = suggestGrowthTactics({ limit: 3, offset: 1 });
    expect(rotated[0].id).not.toBe(first[0].id);
  });

  it("devuelve vacio si no hay tacticas para un objetivo inexistente", () => {
    // @ts-expect-error probamos un valor invalido a proposito
    const tactics = suggestGrowthTactics({ goal: "inexistente" });
    expect(tactics).toEqual([]);
  });
});
