import { describe, expect, it } from "vitest";
import { findFaqAnswer, searchRelevantProducts } from "../src/knowledgeBase/index.js";

describe("searchRelevantProducts", () => {
  it("encuentra productos etiquetados para escalada ante una consulta de boulder", () => {
    const results = searchRelevantProducts("Che, que me recomendas para escalada de boulder?");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.product.sports.includes("escalada"))).toBe(true);
  });

  it("prioriza el Super Grip (resina) ante una consulta de pole dance/tela", () => {
    const results = searchRelevantProducts("Sirve para pole dance o solo para tela?");
    expect(results[0].product.id).toBe("super-grip-125");
  });

  it("devuelve lista vacia si no hay ningun termino relevante", () => {
    const results = searchRelevantProducts("hola buenas");
    expect(results).toEqual([]);
  });
});

describe("findFaqAnswer", () => {
  it("devuelve null mientras el catalogo no tenga FAQs cargadas", () => {
    const match = findFaqAnswer("El liquid grip mancha la ropa?");
    expect(match).toBeNull();
  });
});
