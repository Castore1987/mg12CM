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

  try {
    const system = buildPersonaSystemPrompt();
    const prompt = `Redacta un caption de Instagram para este post.

Pilar de contenido: ${brief.pillar}
Producto relacionado: ${product ? product.name : "ninguno en particular"}
Deporte: ${brief.sport ?? "general"}
Brief: ${brief.briefNotes}

Devolve SOLO el texto del caption (sin hashtags, los agrego yo aparte),
en 3 a 6 lineas, cerrando con una pregunta o CTA a la comunidad.
Despues, en una segunda parte separada por "---VISUAL---", describí en 1-2
lineas la idea de foto/video/reel para acompañar el post.`;

    const raw = await askClaude({ system, prompt, maxTokens: 500 });
    const [captionPart, visualPart] = raw.split("---VISUAL---");
    caption = captionPart.trim();
    visualBrief = (visualPart ?? "").trim() || "Definir pieza visual (foto/reel) alineada al brief.";
  } catch {
    // Fallback sin IA: se puede editar a mano antes de publicar.
    caption = `${brief.briefNotes}\n\n(Borrador automatico - falta redaccion final o ANTHROPIC_API_KEY)`;
    visualBrief = "Definir pieza visual (foto/reel) alineada al brief.";
  }

  return {
    ...brief,
    caption,
    hashtags,
    visualBrief,
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
