import { askClaude } from "./claudeClient.js";
import { buildPersonaSystemPrompt } from "./persona.js";
import { findFaqAnswer, searchRelevantProducts, type ScoredProduct } from "../knowledgeBase/index.js";

export interface InquiryContext {
  matchedProducts: ScoredProduct[];
  faqMatch: ReturnType<typeof findFaqAnswer>;
}

/**
 * Recupera el contexto relevante del catalogo para una consulta (sin llamar
 * a ningun LLM). Es pura y testeable: dado un mensaje, siempre devuelve el
 * mismo set de productos/FAQ relacionados.
 */
export function buildInquiryContext(message: string): InquiryContext {
  return {
    matchedProducts: searchRelevantProducts(message, 3),
    faqMatch: findFaqAnswer(message),
  };
}

function ruleBasedFallback(context: InquiryContext): string {
  if (context.faqMatch) {
    return `${context.faqMatch.faq.a} (info de ${context.faqMatch.product.name})`;
  }
  if (context.matchedProducts.length > 0) {
    const p = context.matchedProducts[0].product;
    return `Te cuento sobre ${p.name}: ${p.tagline} ${p.benefits[0] ?? ""} Mas info: ${p.url}`.trim();
  }
  return "Gracias por escribirnos! No tenemos un dato puntual para esa consulta todavia, asi que la vamos a derivar al equipo de MG12 para darte una respuesta precisa.";
}

/**
 * Genera la respuesta final a una consulta de un seguidor/cliente, usando
 * SOLO la informacion de contexto recuperada del catalogo real. Intenta
 * redactarla con Claude (mejor tono, mas natural); si Claude no esta
 * disponible (sin API key o error de red) cae a una respuesta basada en
 * reglas para que el flujo nunca se rompa.
 */
export async function generateReply(message: string): Promise<string> {
  const context = buildInquiryContext(message);

  try {
    if (context.matchedProducts.length === 0 && !context.faqMatch) {
      return await askClaude({
        system: buildPersonaSystemPrompt(),
        prompt: `Un seguidor escribio: "${message}"

No encontramos ningun producto o FAQ del catalogo relacionado a esta consulta.
Respondele con calidez, sin inventar datos de producto, y ofreciendo derivar
la consulta al equipo humano de MG12 si hace falta un dato especifico.`,
        maxTokens: 300,
      });
    }

    const contextBlock = context.matchedProducts
      .map(
        (m) =>
          `Producto: ${m.product.name}\nTagline: ${m.product.tagline}\nBeneficios: ${m.product.benefits.join(
            "; "
          )}\nUso: ${m.product.usage}\nPrecio: ${m.product.price} ${m.product.currency}\nLink: ${m.product.url}`
      )
      .join("\n\n");

    const faqBlock = context.faqMatch
      ? `\n\nFAQ relacionada de ${context.faqMatch.product.name}:\nP: ${context.faqMatch.faq.q}\nR: ${context.faqMatch.faq.a}`
      : "";

    return await askClaude({
      system: buildPersonaSystemPrompt(),
      prompt: `Un seguidor escribio: "${message}"

Contexto real del catalogo para responder (no agregues nada que no este aca):
${contextBlock}${faqBlock}

Redacta la respuesta como Community Manager de MG12: breve (2-4 oraciones),
calida, honesta y que invite a seguir la conversacion o comprar si aplica.`,
      maxTokens: 350,
    });
  } catch {
    return ruleBasedFallback(context);
  }
}
