import { InstagramGraphClient } from "../instagram/graphApiClient.js";
import { searchRelevantProducts } from "../knowledgeBase/index.js";
import { addMetric } from "./metricsStore.js";

/**
 * Trae metricas reales de Instagram para los posts recientes de la cuenta
 * (tanto los publicados por este sistema como los que ya existian de forma
 * organica) y las guarda en data/metrics.json. El producto/deporte de cada
 * post se infiere buscando el caption real contra el catalogo, ya que los
 * posts organicos no tienen ese dato asociado de antemano.
 */
export async function syncOrganicMetrics(limit = 25): Promise<{ synced: number; failed: number }> {
  const client = new InstagramGraphClient();
  const media = await client.listRecentMedia(limit);

  let synced = 0;
  let failed = 0;

  for (const item of media) {
    try {
      const insight = await client.getMediaInsights(item.id);
      const match = searchRelevantProducts(item.caption ?? "", 1)[0];

      addMetric({
        postId: item.id,
        publishedAt: insight.timestamp,
        pillar: "product_spotlight",
        productId: match?.product.id ?? null,
        sport: match?.product.sports[0] ?? null,
        reach: insight.reach,
        likes: insight.likes,
        comments: insight.comments,
        saves: insight.saved,
        shares: insight.shares,
      });
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return { synced, failed };
}
