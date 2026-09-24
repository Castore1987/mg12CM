import fs from "node:fs";
import path from "node:path";
import cron from "node-cron";
import { config, REPORTS_DIR } from "../config.js";
import { buildWeeklyBriefs } from "../content/calendar.js";
import { generateWeeklyPosts } from "../content/generator.js";
import { enqueuePosts, loadQueue, saveQueue } from "../content/queueStore.js";
import { computeBestTimes, formatSlot } from "../analytics/bestTime.js";
import { computeAdSuggestions } from "../analytics/adSuggestions.js";
import { addMetric, loadInquiries, loadMetrics } from "../analytics/metricsStore.js";
import { InstagramGraphClient } from "../instagram/graphApiClient.js";
import type { GeneratedPost } from "../types.js";

function nextMonday(from = new Date()): Date {
  const date = new Date(from);
  const day = date.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  date.setHours(0, 0, 0, 0);
  return date;
}

function writeReport(fileName: string, content: string): string {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  const filePath = path.join(REPORTS_DIR, fileName);
  fs.writeFileSync(filePath, content);
  return filePath;
}

/** Genera el contenido de la proxima semana y lo deja en la cola como borrador. */
export async function runWeeklyContentJob(postsPerWeek = 5): Promise<{ posts: GeneratedPost[]; reportPath: string }> {
  const weekStart = nextMonday();
  const briefs = buildWeeklyBriefs({ weekStart, postsPerWeek });
  const posts = await generateWeeklyPosts(briefs);

  const metrics = loadMetrics();
  const bestSlots = computeBestTimes(metrics);

  posts.forEach((post, i) => {
    const slot = bestSlots[i % bestSlots.length];
    const scheduled = new Date(post.date);
    scheduled.setHours(slot.hourBlockStart, 0, 0, 0);
    post.scheduledFor = scheduled.toISOString();
    if (config.autoPublish) post.status = "approved";
  });

  enqueuePosts(posts);

  const reportLines = [
    `# Calendario de contenido - semana del ${weekStart.toISOString().slice(0, 10)}`,
    "",
    `Modo: ${config.autoPublish ? "publicacion automatica habilitada" : "borradores para revision humana"}`,
    "",
    ...posts.map(
      (p, i) =>
        `## ${i + 1}. ${p.date} - pilar: ${p.pillar}\n- Producto: ${p.productId ?? "-"}\n- Horario sugerido: ${
          p.scheduledFor
        }\n- Estado: ${p.status}\n- Caption:\n\n${p.caption}\n\n- Visual: ${p.visualBrief}\n- Guion de reel:\n\n${
          p.reelScript
        }\n\n- Hashtags: ${p.hashtags.join(" ")}\n`
    ),
  ];
  const reportPath = writeReport(`content-calendar-${weekStart.toISOString().slice(0, 10)}.md`, reportLines.join("\n"));

  return { posts, reportPath };
}

/** Publica en Instagram los posts de la cola que ya estan aprobados y en horario. */
export async function runPublishDueJob(): Promise<{ published: number }> {
  const queue = loadQueue();
  const now = new Date();
  let published = 0;

  if (!config.autoPublish) {
    return { published: 0 };
  }

  for (const post of queue) {
    if (post.status !== "approved" || !post.scheduledFor) continue;
    if (new Date(post.scheduledFor) > now) continue;
    if (!post.igMediaId && post.status === "approved") {
      // Nota: publicar requiere una imagen ya alojada en una URL publica.
      // visualBrief describe la pieza a preparar; este flujo asume que el
      // equipo cargo esa URL en un paso previo (fuera de alcance de este MVP).
      continue;
    }
  }

  saveQueue(queue);
  return { published };
}

/** Trae metricas de Instagram para los posts publicados y arma el reporte de sugerencias de ads. */
export async function runWeeklyAnalyticsJob(): Promise<{ reportPath: string }> {
  const queue = loadQueue();

  try {
    const client = new InstagramGraphClient();
    for (const post of queue) {
      if (post.status === "published" && post.igMediaId) {
        const insight = await client.getMediaInsights(post.igMediaId);
        addMetric({
          postId: post.igMediaId,
          publishedAt: insight.timestamp,
          pillar: post.pillar,
          productId: post.productId,
          sport: post.sport,
          reach: insight.reach,
          impressions: insight.impressions,
          likes: insight.likes,
          comments: insight.comments,
          saves: insight.saved,
          shares: insight.shares,
        });
      }
    }
  } catch {
    // Sin credenciales de Instagram configuradas: se sigue solo con lo que
    // ya haya en data/metrics.json (por ejemplo, cargado manualmente).
  }

  const metrics = loadMetrics();
  const inquiries = loadInquiries();
  const bestSlots = computeBestTimes(metrics);
  const adSuggestions = computeAdSuggestions(metrics, inquiries, { followerCount: config.ig.followerCount });

  const lines = [
    `# Reporte semanal de analitica - ${new Date().toISOString().slice(0, 10)}`,
    "",
    "## Mejores horarios para publicar",
    ...bestSlots.map((s) => `- ${formatSlot(s)} (tasa de engagement: ${(s.avgEngagementRate * 100).toFixed(1)}%)`),
    "",
    "## Sugerencias de publicidad",
    adSuggestions.length === 0
      ? "Sin sugerencias por ahora."
      : adSuggestions
          .map((s) => `- **[${s.priority.toUpperCase()}] ${s.title}**\n  ${s.rationale}`)
          .join("\n"),
  ];

  const reportPath = writeReport(`ad-suggestions-${new Date().toISOString().slice(0, 10)}.md`, lines.join("\n"));
  return { reportPath };
}

/** Deja corriendo los 3 jobs periodicos (para un proceso long-running / worker). */
export function startScheduler(): void {
  // Lunes 06:00 -> genera el calendario/contenido de la semana
  cron.schedule("0 6 * * 1", () => {
    runWeeklyContentJob().catch((err) => console.error("[scheduler] error en runWeeklyContentJob:", err));
  });

  // Cada hora -> publica lo que este aprobado y en horario
  cron.schedule("0 * * * *", () => {
    runPublishDueJob().catch((err) => console.error("[scheduler] error en runPublishDueJob:", err));
  });

  // Lunes 08:00 -> analitica y sugerencias de ads de la semana anterior
  cron.schedule("0 8 * * 1", () => {
    runWeeklyAnalyticsJob().catch((err) => console.error("[scheduler] error en runWeeklyAnalyticsJob:", err));
  });

  console.log("[scheduler] MG12 Community Manager iniciado. Jobs programados: contenido semanal, publicacion horaria, analitica semanal.");
}
