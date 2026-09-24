import { askClaude } from "../agent/claudeClient.js";
import { buildPersonaSystemPrompt } from "../agent/persona.js";
import { getProductById, loadBrandVoice } from "../knowledgeBase/index.js";
import type { GeneratedPost, PostBrief } from "../types.js";

function hashtagsFor(sport: string | null): string[] {
  const voice = loadBrandVoice();
  const sportTags = sport ? voice.hashtagsBySport[sport] ?? [] : [];
  return Array.from(new Set([...voice.baseHashtags, ...sportTags]));
}

/**
 * Convierte un brief determinista (de calendar.ts) en un post completo:
 * caption + hashtags + sugerencia visual, usando Claude con la persona del
 * Community Manager. Si Claude no esta disponible (sin API key), devuelve
 * un borrador basado solo en el brief para que el flujo no se rompa.
 */
export async function generatePostFromBrief(brief: PostBrief): Promise<GeneratedPost> {
  const product = brief.productId ? getProductById(brief.productId) : undefined;
  const hashtags = hashtagsFor(brief.sport);

  let caption: string;
  let visualBrief: string;
  let reelScript: string;

  try {
    const system = buildPersonaSystemPrompt();
    const prompt = `Redacta un caption de Instagram para este post.

Pilar de contenido: ${brief.pillar}
Producto relacionado: ${product ? product.name : "ninguno en particular"}
Deporte: ${brief.sport ?? "general"}
Brief: ${brief.briefNotes}

Devolve la respuesta en 3 partes, cada una separada por el marcador exacto indicado:

1) El texto del caption (sin hashtags, los agrego yo aparte), en 3 a 6 lineas,
cerrando con una pregunta o CTA a la comunidad.
2) Marcador "---VISUAL---" seguido de 1-2 lineas describiendo la idea de
foto/video para acompañar el post.
3) Marcador "---REEL---" seguido de un guion corto de reel/video listo para
grabar: Hook (primeros 2 segundos), 3-4 escenas numeradas con que se ve y que
texto en pantalla lleva cada una, y CTA final hablado o en texto. Maximo 8
lineas. No hace falta que todos los posts sean reels, pero siempre proponé
como se veria en formato video corto, porque es el formato que mas alcance
tiene en Instagram hoy.`;

    const raw = await askClaude({ system, prompt, maxTokens: 700 });
    const [captionPart, rest] = raw.split("---VISUAL---");
    const [visualPart, reelPart] = (rest ?? "").split("---REEL---");
    caption = captionPart.trim();
    visualBrief = (visualPart ?? "").trim() || "Definir pieza visual (foto/reel) alineada al brief.";
    reelScript = (reelPart ?? "").trim() || "Definir guion de reel alineado al brief.";
  } catch {
    // Fallback sin IA: se puede editar a mano antes de publicar.
    caption = `${brief.briefNotes}\n\n(Borrador automatico - falta redaccion final o ANTHROPIC_API_KEY)`;
    visualBrief = "Definir pieza visual (foto/reel) alineada al brief.";
    reelScript = "Definir guion de reel alineado al brief (falta redaccion final o ANTHROPIC_API_KEY).";
  }

  return {
    ...brief,
    caption,
    hashtags,
    visualBrief,
    reelScript,
    status: "draft",
    scheduledFor: null,
    publishedAt: null,
    igMediaId: null,
  };
}

export async function generateWeeklyPosts(briefs: PostBrief[]): Promise<GeneratedPost[]> {
  const posts: GeneratedPost[] = [];
  for (const brief of briefs) {
    posts.push(await generatePostFromBrief(brief));
  }
  return posts;
}
