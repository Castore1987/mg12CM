import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../config.js";
import type { BrandVoice, Product, ProductCatalog, ProductSuggestion } from "../types.js";

let catalogCache: ProductCatalog | null = null;
let brandVoiceCache: BrandVoice | null = null;
let suggestionsCache: ProductSuggestion[] | null = null;

export function loadCatalog(): ProductCatalog {
  if (!catalogCache) {
    const raw = fs.readFileSync(path.join(DATA_DIR, "products.json"), "utf-8");
    catalogCache = JSON.parse(raw) as ProductCatalog;
  }
  return catalogCache;
}

export function loadProducts(): Product[] {
  return loadCatalog().products;
}

export function loadBrandVoice(): BrandVoice {
  if (!brandVoiceCache) {
    const raw = fs.readFileSync(path.join(DATA_DIR, "brand-voice.json"), "utf-8");
    brandVoiceCache = JSON.parse(raw) as BrandVoice;
  }
  return brandVoiceCache;
}

export function loadProductSuggestions(): ProductSuggestion[] {
  if (!suggestionsCache) {
    const raw = fs.readFileSync(path.join(DATA_DIR, "product-suggestions.json"), "utf-8");
    suggestionsCache = (JSON.parse(raw) as { suggestions: ProductSuggestion[] }).suggestions;
  }
  return suggestionsCache;
}

export function getProductById(id: string): Product | undefined {
  return loadProducts().find((p) => p.id === id);
}

export function listSports(): string[] {
  const sports = new Set<string>();
  for (const product of loadProducts()) {
    for (const sport of product.sports) sports.add(sport);
  }
  return Array.from(sports);
}

export interface ScoredProduct {
  product: Product;
  score: number;
  matchedTerms: string[];
}

const STOPWORDS = new Set([
  "el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "y", "o",
  "a", "en", "que", "para", "con", "por", "es", "se", "mi", "tu", "su", "me",
  "hola", "buenas", "buenos", "dias", "tardes", "noches", "como", "cual",
  "cuales", "que", "porque", "the", "a", "an", "is", "for", "with", "and",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

/**
 * Busqueda determinista por superposicion de palabras clave contra nombre,
 * categoria, deportes, tagline, features y FAQs de cada producto.
 * No usa embeddings a proposito: es rapida, sin costo de API y testeable.
 */
export function searchRelevantProducts(query: string, limit = 3): ScoredProduct[] {
  const queryTerms = new Set(tokenize(query));
  if (queryTerms.size === 0) return [];

  const results: ScoredProduct[] = loadProducts().map((product) => {
    const haystack = [
      product.name,
      product.category,
      product.tagline,
      product.description,
      product.idealFor,
      ...product.sports,
      ...product.keyFeatures,
      ...product.benefits,
      ...product.faqs.flatMap((f) => [f.q, f.a]),
    ].join(" ");
    const productTerms = new Set(tokenize(haystack));

    const matchedTerms = Array.from(queryTerms).filter((t) => productTerms.has(t));
    // Coincidencia exacta de nombre de deporte o producto pesa mas
    const sportBoost = product.sports.some((s) => normalize(query).includes(normalize(s))) ? 2 : 0;
    const nameBoost = normalize(query).includes(normalize(product.name)) ? 3 : 0;

    return {
      product,
      score: matchedTerms.length + sportBoost + nameBoost,
      matchedTerms,
    };
  });

  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function findFaqAnswer(query: string): { product: Product; faq: { q: string; a: string } } | null {
  const queryTerms = new Set(tokenize(query));
  let best: { product: Product; faq: { q: string; a: string }; score: number } | null = null;

  for (const product of loadProducts()) {
    for (const faq of product.faqs) {
      const faqTerms = new Set(tokenize(faq.q));
      const overlap = Array.from(queryTerms).filter((t) => faqTerms.has(t)).length;
      if (overlap > 0 && (!best || overlap > best.score)) {
        best = { product, faq, score: overlap };
      }
    }
  }

  return best ? { product: best.product, faq: best.faq } : null;
}
