import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "../config.js";
import type { GrowthGoal, GrowthTactic } from "../types.js";

let cache: GrowthTactic[] | null = null;

export function loadGrowthTactics(): GrowthTactic[] {
  if (!cache) {
    const raw = fs.readFileSync(path.join(DATA_DIR, "growth-playbook.json"), "utf-8");
    cache = (JSON.parse(raw) as { tactics: GrowthTactic[] }).tactics;
  }
  return cache;
}

export interface SuggestGrowthOptions {
  goal?: GrowthGoal;
  limit?: number;
  /** Desplazamiento para rotar las sugerencias (ej. numero de semana) y no repetir siempre las mismas. */
  offset?: number;
}

/**
 * Selecciona tacticas de crecimiento del playbook, opcionalmente filtradas
 * por objetivo (seguidores/engagement/ventas/contenido) y rotadas con un
 * offset para variar la sugerencia semana a semana.
 */
export function suggestGrowthTactics({ goal, limit = 3, offset = 0 }: SuggestGrowthOptions = {}): GrowthTactic[] {
  const all = loadGrowthTactics();
  const filtered = goal ? all.filter((t) => t.goals.includes(goal)) : all;
  if (filtered.length === 0) return [];

  const rotated = filtered.map((_, i) => filtered[(i + offset) % filtered.length]);
  return rotated.slice(0, Math.min(limit, rotated.length));
}
