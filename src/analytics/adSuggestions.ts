import { getProductById } from "../knowledgeBase/index.js";
import type { AdSuggestion, InquiryLog, PostMetric } from "../types.js";

function engagementRate(metric: PostMetric): number | null {
  if (metric.reach <= 0) return null;
  const engagement = metric.likes + metric.comments + metric.saves + metric.shares;
  return engagement / metric.reach;
}

function mean(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;
}

function stdev(values: number[], avg: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export interface AdSuggestionOptions {
  followerCount?: number;
  minSampleForInsights?: number;
  highDemandThreshold?: number;
}

/**
 * Reglas de negocio (deterministas, sin IA) para decidir cuando conviene
 * sugerir publicidad paga:
 *  1. Boost de posts organicos que ya funcionan muy bien pero con alcance
 *     limitado respecto a los seguidores.
 *  2. Aviso de contenido/segmento que rinde sistematicamente por debajo del
 *     promedio (para refrescar creatividad o reforzar con ads).
 *  3. Productos con alta demanda en consultas de clientes pero poca
 *     presencia en el calendario de contenido reciente.
 */
export function computeAdSuggestions(
  metrics: PostMetric[],
  inquiries: InquiryLog[],
  options: AdSuggestionOptions = {}
): AdSuggestion[] {
  const { followerCount = 0, minSampleForInsights = 5, highDemandThreshold = 5 } = options;
  const suggestions: AdSuggestion[] = [];

  const withRate = metrics
    .map((m) => ({ metric: m, rate: engagementRate(m) }))
    .filter((x): x is { metric: PostMetric; rate: number } => x.rate !== null);

  if (withRate.length < minSampleForInsights) {
    suggestions.push({
      type: "targeted_awareness",
      title: "Recolectar mas datos antes de escalar inversion en ads",
      rationale: `Solo hay ${withRate.length} posts con metricas registradas (minimo recomendado: ${minSampleForInsights}). Conviene primero publicar de forma organica siguiendo el calendario y registrar metricas, para poder decidir publicidad con datos reales en vez de intuicion.`,
      priority: "baja",
    });
  } else {
    const rates = withRate.map((x) => x.rate);
    const avgRate = mean(rates);
    const sd = stdev(rates, avgRate);

    // 1) Boost candidates: alto engagement organico, bajo alcance relativo a followers
    for (const { metric, rate } of withRate) {
      const isTopPerformer = rate > avgRate + sd;
      const lowRelativeReach = followerCount > 0 && metric.reach < followerCount * 0.3;
      if (isTopPerformer && lowRelativeReach) {
        suggestions.push({
          type: "boost_post",
          title: `Potenciar con ads el post ${metric.postId}`,
          rationale: `Este post tiene una tasa de engagement de ${(rate * 100).toFixed(1)}%, muy por encima del promedio (${(
            avgRate * 100
          ).toFixed(1)}%), pero llego solo a ${metric.reach} cuentas de ${followerCount} seguidores. Es un buen candidato para invertir en alcance porque ya probo que el contenido funciona.`,
          relatedPostId: metric.postId,
          relatedProductId: metric.productId ?? undefined,
          suggestedAudience: metric.sport
            ? `Intereses/comportamiento relacionados a ${metric.sport}, similar a la audiencia actual (lookalike de seguidores)`
            : "Lookalike de seguidores actuales",
          suggestedBudgetHint: "Presupuesto de prueba bajo (ej. 3-5 dias) para validar retorno antes de escalar.",
          priority: "alta",
        });
      }
    }

    // 2) Underperforming segments por deporte
    const bySport = new Map<string, number[]>();
    for (const { metric, rate } of withRate) {
      if (!metric.sport) continue;
      if (!bySport.has(metric.sport)) bySport.set(metric.sport, []);
      bySport.get(metric.sport)!.push(rate);
    }
    for (const [sport, sportRates] of bySport.entries()) {
      if (sportRates.length < 3) continue;
      const sportAvg = mean(sportRates);
      if (sportAvg < avgRate * 0.6) {
        suggestions.push({
          type: "underperforming_content",
          title: `Contenido de ${sport} rindiendo por debajo del promedio`,
          rationale: `Los posts de ${sport} promedian ${(sportAvg * 100).toFixed(1)}% de engagement, muy por debajo del promedio general (${(
            avgRate * 100
          ).toFixed(1)}%) en ${sportRates.length} publicaciones. Conviene renovar el formato/creatividad de ese segmento o reforzarlo con un ads de awareness para reactivar interes.`,
          suggestedAudience: `Seguidores y lookalike interesados en ${sport}`,
          priority: "media",
        });
      }
    }
  }

  // 3) Alta demanda en consultas vs. baja presencia en contenido reciente
  for (const inquiry of inquiries) {
    if (inquiry.count < highDemandThreshold || !inquiry.productId) continue;
    const postsAboutProduct = metrics.filter((m) => m.productId === inquiry.productId).length;
    if (postsAboutProduct <= 1) {
      const product = getProductById(inquiry.productId);
      suggestions.push({
        type: "high_demand_product",
        title: `Alta demanda de consultas sobre ${product?.name ?? inquiry.productId}`,
        rationale: `Se registraron ${inquiry.count} consultas de clientes sobre este producto pero aparecio en solo ${postsAboutProduct} post(s) recientes. Conviene dedicarle un post destacado y considerar un ads de conversion, ya que el interes organico (via DMs/comentarios) ya esta validado.`,
        relatedProductId: inquiry.productId,
        suggestedAudience: "Retargeting de quienes interactuaron con el perfil + intereses del deporte asociado",
        priority: "alta",
      });
    }
  }

  return suggestions.sort((a, b) => priorityWeight(b) - priorityWeight(a));
}

function priorityWeight(s: AdSuggestion): number {
  return { alta: 3, media: 2, baja: 1 }[s.priority];
}
