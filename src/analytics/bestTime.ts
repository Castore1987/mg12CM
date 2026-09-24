import type { BestTimeSlot, PostMetric } from "../types.js";

const HOUR_BLOCKS: [number, number][] = [
  [6, 9],
  [9, 12],
  [12, 15],
  [15, 18],
  [18, 21],
  [21, 24],
];

/**
 * Horarios recomendados por buenas practicas del nicho fitness/deportivo
 * cuando todavia no hay suficiente historico propio para decidir con datos.
 * Se reemplazan automaticamente por datos reales apenas hay muestra suficiente.
 */
const INDUSTRY_DEFAULT_SLOTS: BestTimeSlot[] = [
  { weekday: 2, hourBlockStart: 18, hourBlockEnd: 21, avgEngagementRate: 0, sampleSize: 0, source: "default_industria" },
  { weekday: 4, hourBlockStart: 12, hourBlockEnd: 15, avgEngagementRate: 0, sampleSize: 0, source: "default_industria" },
  { weekday: 6, hourBlockStart: 9, hourBlockEnd: 12, avgEngagementRate: 0, sampleSize: 0, source: "default_industria" },
];

function engagementRate(metric: PostMetric): number | null {
  if (metric.reach <= 0) return null;
  const engagement = metric.likes + metric.comments + metric.saves + metric.shares;
  return engagement / metric.reach;
}

function hourBlockFor(hour: number): [number, number] {
  return HOUR_BLOCKS.find(([start, end]) => hour >= start && hour < end) ?? [21, 24];
}

/**
 * Calcula, a partir del historico de metricas de posts, los mejores
 * dia-de-semana + bloque horario segun tasa de engagement promedio.
 * Si no hay muestra suficiente (`minSampleSize` por slot), completa con
 * los horarios default de la industria para no dejar el calendario vacio.
 */
export function computeBestTimes(
  metrics: PostMetric[],
  options: { minSampleSize?: number; topN?: number } = {}
): BestTimeSlot[] {
  const { minSampleSize = 2, topN = 3 } = options;

  const buckets = new Map<string, { weekday: number; hourBlockStart: number; hourBlockEnd: number; rates: number[] }>();

  for (const metric of metrics) {
    const rate = engagementRate(metric);
    if (rate === null) continue;

    const date = new Date(metric.publishedAt);
    const weekday = date.getDay();
    const [hourBlockStart, hourBlockEnd] = hourBlockFor(date.getHours());
    const key = `${weekday}-${hourBlockStart}`;

    if (!buckets.has(key)) {
      buckets.set(key, { weekday, hourBlockStart, hourBlockEnd, rates: [] });
    }
    buckets.get(key)!.rates.push(rate);
  }

  const historicalSlots: BestTimeSlot[] = Array.from(buckets.values())
    .filter((b) => b.rates.length >= minSampleSize)
    .map((b) => ({
      weekday: b.weekday,
      hourBlockStart: b.hourBlockStart,
      hourBlockEnd: b.hourBlockEnd,
      avgEngagementRate: b.rates.reduce((a, c) => a + c, 0) / b.rates.length,
      sampleSize: b.rates.length,
      source: "historico" as const,
    }))
    .sort((a, b) => b.avgEngagementRate - a.avgEngagementRate);

  if (historicalSlots.length >= topN) {
    return historicalSlots.slice(0, topN);
  }

  const missing = topN - historicalSlots.length;
  return [...historicalSlots, ...INDUSTRY_DEFAULT_SLOTS.slice(0, missing)];
}

const WEEKDAY_NAMES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

export function formatSlot(slot: BestTimeSlot): string {
  const originLabel = slot.source === "historico" ? `historico, n=${slot.sampleSize}` : "recomendacion default";
  return `${WEEKDAY_NAMES[slot.weekday]} ${slot.hourBlockStart}:00-${slot.hourBlockEnd}:00 (${originLabel})`;
}
