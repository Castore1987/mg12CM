#!/usr/bin/env node
import { Command } from "commander";
import { runPublishDueJob, runWeeklyAnalyticsJob, runWeeklyContentJob, startScheduler } from "./scheduler/index.js";
import { loadQueue, updatePost } from "./content/queueStore.js";
import { generateReply } from "./agent/responder.js";
import { computeBestTimes, formatSlot } from "./analytics/bestTime.js";
import { computeAdSuggestions } from "./analytics/adSuggestions.js";
import { loadInquiries, loadMetrics, logInquiry } from "./analytics/metricsStore.js";
import { config } from "./config.js";

const program = new Command();
program.name("mg12-cm").description("Agente Community Manager de MG12 para Instagram");

program
  .command("generate-content")
  .description("Genera el calendario/contenido de la proxima semana y lo deja en la cola (data/queue.json)")
  .option("-p, --posts <n>", "cantidad de posts en la semana", "5")
  .action(async (opts) => {
    const { posts, reportPath } = await runWeeklyContentJob(Number(opts.posts));
    console.log(`Generados ${posts.length} posts. Reporte: ${reportPath}`);
  });

program
  .command("queue")
  .description("Muestra la cola de posts (borradores/aprobados/publicados)")
  .action(() => {
    const queue = loadQueue();
    if (queue.length === 0) {
      console.log("La cola esta vacia. Corre 'generate-content' primero.");
      return;
    }
    queue.forEach((p, i) => {
      console.log(`[${i}] ${p.date} | ${p.pillar} | ${p.status} | horario: ${p.scheduledFor ?? "sin asignar"}`);
    });
  });

program
  .command("approve <index>")
  .description("Aprueba un post de la cola para su publicacion")
  .action((index: string) => {
    updatePost(Number(index), { status: "approved" });
    console.log(`Post ${index} aprobado.`);
  });

program
  .command("publish-now")
  .description("Publica en Instagram los posts aprobados que ya esten en horario (respeta AUTO_PUBLISH)")
  .action(async () => {
    if (!config.autoPublish) {
      console.log("AUTO_PUBLISH=false: no se publica nada automaticamente. Cambialo en .env si queres habilitarlo.");
      return;
    }
    const { published } = await runPublishDueJob();
    console.log(`Publicados: ${published}`);
  });

program
  .command("analyze-best-times")
  .description("Calcula los mejores dias/horarios para publicar segun el historico de metricas")
  .action(() => {
    const slots = computeBestTimes(loadMetrics());
    slots.forEach((s) => console.log(`- ${formatSlot(s)}`));
  });

program
  .command("suggest-ads")
  .description("Analiza metricas y consultas para sugerir publicidad")
  .action(() => {
    const suggestions = computeAdSuggestions(loadMetrics(), loadInquiries(), {
      followerCount: config.ig.followerCount,
    });
    if (suggestions.length === 0) {
      console.log("Sin sugerencias por ahora.");
      return;
    }
    suggestions.forEach((s) => {
      console.log(`\n[${s.priority.toUpperCase()}] ${s.title}\n${s.rationale}`);
    });
  });

program
  .command("analytics-report")
  .description("Corre el job semanal de analitica (trae insights de IG si hay credenciales) y genera el reporte")
  .action(async () => {
    const { reportPath } = await runWeeklyAnalyticsJob();
    console.log(`Reporte generado: ${reportPath}`);
  });

program
  .command("respond <message>")
  .description("Prueba la respuesta del agente a una consulta de un cliente")
  .option("--product <productId>", "registrar la consulta como interes en un producto (para el motor de ads)")
  .action(async (message: string, opts) => {
    if (opts.product) logInquiry(opts.product);
    const reply = await generateReply(message);
    console.log(reply);
  });

program
  .command("start")
  .description("Deja corriendo el scheduler (contenido semanal, publicacion horaria, analitica semanal)")
  .action(() => {
    startScheduler();
  });

program.parseAsync(process.argv);
