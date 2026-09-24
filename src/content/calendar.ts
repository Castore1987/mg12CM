import { loadProducts } from "../knowledgeBase/index.js";
import type { ContentPillar, PostBrief, Product } from "../types.js";

export const PILLAR_ROTATION: ContentPillar[] = [
  "product_spotlight",
  "tip_tutorial",
  "engagement_question",
  "testimonial_social_proof",
  "behind_the_scenes",
  "ugc_repost",
];

const PILLAR_BRIEF_TEMPLATES: Record<ContentPillar, (product: Product | null) => string> = {
  product_spotlight: (p) =>
    `Presentar ${p?.name ?? "un producto MG12"} destacando su principal beneficio (${
      p?.benefits[0] ?? "mejora de agarre"
    }) para ${p?.idealFor ?? "la comunidad MG12"}.`,
  tip_tutorial: (p) =>
    `Tip practico de entrenamiento relacionado a ${p?.sports?.[0] ?? "el deporte de la semana"} donde el agarre es clave; mencionar de forma natural a ${p?.name ?? "un producto MG12"} como solucion.`,
  testimonial_social_proof: (p) =>
    `Espacio para testimonio o repost de un atleta usando ${p?.name ?? "un producto MG12"}. Si no hay testimonio real disponible, generar un pedido a la comunidad para compartir su experiencia.`,
  engagement_question: (p) =>
    `Pregunta abierta a la comunidad sobre su rutina o mayor dificultad de agarre en ${p?.sports?.[0] ?? "su deporte"}, para generar comentarios.`,
  behind_the_scenes: () =>
    `Contenido de detras de escena de MG12 (produccion, equipo, packing de pedidos, evento patrocinado) para humanizar la marca.`,
  ugc_repost: (p) =>
    `Invitacion a etiquetar a MG12 en fotos/videos usando ${p?.name ?? "productos MG12"} para ser repostcreado, con mencion de credito al autor original.`,
};

export interface CalendarOptions {
  weekStart: Date;
  postsPerWeek?: number;
}

/**
 * Genera los "briefs" de la semana (que publicar, sobre que producto/pilar),
 * rotando pilares y productos de forma determinista para asegurar variedad
 * y cobertura pareja de todo el catalogo a lo largo del tiempo.
 */
export function buildWeeklyBriefs({ weekStart, postsPerWeek = 5 }: CalendarOptions): PostBrief[] {
  const products = loadProducts();
  const briefs: PostBrief[] = [];

  for (let i = 0; i < postsPerWeek; i++) {
    const pillar = PILLAR_ROTATION[i % PILLAR_ROTATION.length];
    const product = products.length > 0 ? products[i % products.length] : null;
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);

    briefs.push({
      date: date.toISOString().slice(0, 10),
      pillar,
      productId: product?.id ?? null,
      sport: product?.sports?.[0] ?? null,
      briefNotes: PILLAR_BRIEF_TEMPLATES[pillar](product ?? null),
    });
  }

  return briefs;
}
