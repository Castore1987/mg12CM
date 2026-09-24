import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, "..");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const REPORTS_DIR = path.join(ROOT_DIR, "reports");

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

export const config = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  ig: {
    accessToken: process.env.IG_ACCESS_TOKEN ?? "",
    businessAccountId: process.env.IG_BUSINESS_ACCOUNT_ID ?? "",
    graphApiVersion: process.env.GRAPH_API_VERSION ?? "v21.0",
    followerCount: Number(process.env.IG_FOLLOWER_COUNT ?? "0"),
  },
  autoPublish: bool(process.env.AUTO_PUBLISH, false),
};

export function requireAnthropicKey(): string {
  if (!config.anthropicApiKey) {
    throw new Error(
      "Falta ANTHROPIC_API_KEY en el .env. Necesaria para generar captions y respuestas con Claude."
    );
  }
  return config.anthropicApiKey;
}

/**
 * IG_ACCESS_TOKEN es opcional: si no esta seteado, se asume que el propio
 * entorno de red adjunta la autenticacion contra graph.facebook.com (por
 * ejemplo, una credencial de API configurada a nivel de sesion/entorno). En
 * un despliegue normal (servidor propio, sin ese mecanismo) hay que setear
 * IG_ACCESS_TOKEN si o si.
 */
export function requireInstagramCredentials(): { accessToken: string; businessAccountId: string } {
  if (!config.ig.businessAccountId) {
    throw new Error(
      "Falta IG_BUSINESS_ACCOUNT_ID en el .env. Ver README para el setup de Meta for Developers."
    );
  }
  return { accessToken: config.ig.accessToken, businessAccountId: config.ig.businessAccountId };
}
