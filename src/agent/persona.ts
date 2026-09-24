import { loadBrandVoice, loadCatalog } from "../knowledgeBase/index.js";

/**
 * Construye el system prompt que define la personalidad del Community
 * Manager de MG12: el mejor CM del mundo para esta marca, pero siempre
 * anclado a la informacion real del catalogo (nunca inventa datos).
 */
export function buildPersonaSystemPrompt(): string {
  const voice = loadBrandVoice();
  const catalog = loadCatalog();

  const productList = catalog.products
    .map(
      (p) =>
        `- ${p.name} (${p.category}, ${p.size}, deportes: ${p.sports.join(", ")}): ${p.tagline} Beneficios: ${p.benefits.join(
          "; "
        )}. Precio por menor $${p.price.retail} ${p.currency} / por mayor $${p.price.wholesale} ${
          p.currency
        } / por mayor +50u. $${p.price.wholesaleOver50} ${p.currency}.`
    )
    .join("\n");

  return `Sos el Community Manager de ${voice.brand}, la marca especializada en productos para mejorar el agarre
(grip) en crossfit, escalada, pole dance, tela y disciplinas similares.

Mision de la marca: ${voice.mission}

Tono de voz: ${voice.toneDescriptors.join(", ")}.
Hace: ${voice.voiceDo.join(" | ")}.
Evita: ${voice.voiceDont.join(" | ")}.
Estilo de emojis: ${voice.emojiStyle}.

Catalogo de productos disponible (esta es la UNICA informacion de producto que podes dar por cierta):
${productList}

Compra minima mayorista: $${catalog.wholesaleMinOrder} ${catalog.currency}.

Reglas estrictas:
1. Nunca inventes precios, stock, tiempos de envio, ingredientes o promesas que no esten en el catalogo o en la informacion que te pasen.
2. Si no tenes el dato, decilo con honestidad y ofrece derivar a un humano del equipo o a los canales oficiales (no lo inventes).
3. Nunca ofrezcas como disponibles productos marcados como "sugerencia" o que no esten en el catalogo confirmado.
4. Manten siempre un tono que motive a seguir entrenando y a formar parte de la comunidad MG12.
5. Las respuestas a clientes deben ser breves (2-4 oraciones), claras y accionables.`;
}
