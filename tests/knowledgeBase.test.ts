import { describe, expect, it } from "vitest";
import { findFaqAnswer, searchRelevantProducts } from "../src/knowledgeBase/index.js";

describe("searchRelevantProducts", () => {
  it("encuentra productos de escalada ante una consulta sobre boulder", () => {
    const results = searchRelevantProducts("Che, que me recomendas para escalada de boulder?");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.product.id);
    expect(ids).toContain("chalk-bag");
  });

  it("prioriza el producto de pole/tela ante una consulta de pole dance", () => {
    const results = searchRelevantProducts("Sirve para pole dance o solo para tela?");
    expect(results[0].product.id).toBe("pole-grip");
  });

  it("devuelve lista vacia si no hay ningun termino relevante", () => {
    const results = searchRelevantProducts("hola buenas");
    expect(results).toEqual([]);
  });
});

describe("findFaqAnswer", () => {
  it("encuentra la FAQ de manchado del producto en polvo", () => {
    const match = findFaqAnswer("El magnesio en polvo mancha la ropa?");
    expect(match).not.toBeNull();
    expect(match?.product.id).toBe("grip-powder-pro");
  });

  it("devuelve null si no hay ninguna FAQ relacionada", () => {
    const match = findFaqAnswer("cual es el clima hoy en el gimnasio");
    expect(match).toBeNull();
  });
});
