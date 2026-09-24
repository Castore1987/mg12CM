# MG12 Community Manager

Agente de Community Manager para **MG12**, marca de productos para mejorar el
agarre (grip) en crossfit, escalada, pole dance, tela y disciplinas afines.

El agente:

- **Responde consultas de clientes/seguidores** usando la info real del catalogo (no inventa datos).
- **Genera contenido para Instagram** de forma periodica (calendario semanal con captions, hashtags y brief visual).
- **Analiza metricas** de los posts publicados para detectar los mejores dias/horarios para publicar.
- **Publica en el mejor horario** (opcional, requiere habilitarlo explicitamente).
- **Sugiere publicidad paga** cuando los datos lo justifican (posts organicos que conviene boostear, segmentos que rinden mal, productos con mucha demanda de consultas y poca presencia en el contenido).

> Este repo es el "cerebro" del Community Manager. Para que publique de
> verdad en Instagram necesita credenciales reales de Meta (ver mas abajo).
> Sin esas credenciales igual sirve para generar contenido, responder
> consultas y practicar el flujo completo en modo borrador.

## 1. Los 6 productos (y como agregar mas)

Toda la info de producto vive en [`data/products.json`](data/products.json).
Ya viene precargado con los 6 productos de la linea de grip (magnesio en
polvo, magnesio liquido, grip pads, chalk bag, pole grip y grip tape) **con
datos de ejemplo marcados como `PENDIENTE`**. El agente va a usar ese
contenido tal cual hasta que lo reemplaces por la info real (precio,
descripcion, modo de uso, link de compra, FAQs, etc.). Por diseño, el agente
**nunca inventa** un dato que no este en este archivo.

Para agregar un producto nuevo, sumalo al array `products` con la misma
estructura. En [`data/product-suggestions.json`](data/product-suggestions.json)
dejamos 3 ideas de productos nuevos para ampliar la linea (grip trainer,
toallitas antibacteriales con grip, magnesio para escalada infantil) como
sugerencias de negocio — el agente nunca los ofrece como si ya existieran,
solo son inspiracion hasta que el equipo confirme si se producen.

La voz de marca (tono, que hacer/evitar, hashtags por deporte) esta en
[`data/brand-voice.json`](data/brand-voice.json) — tambien editable.

## 2. Instalacion

```bash
npm install
cp .env.example .env
```

Completa `.env` con:

| Variable | Para que sirve |
|---|---|
| `ANTHROPIC_API_KEY` | Generar captions y respuestas con Claude (sin esto, el agente sigue funcionando con respuestas basadas en reglas/plantillas, mas simples) |
| `IG_ACCESS_TOKEN`, `IG_BUSINESS_ACCOUNT_ID` | Publicar y leer metricas reales de Instagram (ver seccion 3) |
| `AUTO_PUBLISH` | `true` para que el agente publique solo en el mejor horario; `false` (default) para que todo quede como borrador a revisar |
| `IG_FOLLOWER_COUNT` | Cantidad de seguidores actual, se usa para estimar si un post tuvo poco alcance relativo (para sugerir boost) |

## 3. Conectar Instagram (Meta Graph API)

Instagram no tiene una API publica "simple": hay que pasar por Meta.

1. Crea una app en [developers.facebook.com](https://developers.facebook.com/) (tipo "Business").
2. La cuenta de Instagram debe ser **Business o Creator** y estar vinculada a una **Pagina de Facebook**.
3. En la app, agrega el producto **Instagram Graph API** y pedi estos permisos:
   `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`,
   `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`.
4. Genera un **token de larga duracion** (60 dias, renovable) para la Pagina/cuenta.
5. Obtene el `IG_BUSINESS_ACCOUNT_ID` (el ID de la cuenta de Instagram conectada a la Pagina, no el `@usuario`).
6. Cargalos en `.env`.

Limitaciones a tener en cuenta (son de la propia API de Meta, no de este proyecto):
- Para publicar, la imagen/video debe estar en una **URL publica** (la Graph API no acepta subir el archivo binario directamente).
- Las respuestas automaticas a **DMs** requieren ademas la API de Messenger/Instagram Messaging y cumplir las politicas de Meta sobre bots — este repo trae el flujo de respuesta a **comentarios** (`InstagramGraphClient.replyToComment`) listo, y la logica de generacion de respuesta (`agent/responder.ts`) reutilizable para DMs el dia que se sume esa integracion.
- Hay limites de rate (llamadas por hora) — el scheduler ya esta pensado para correr con baja frecuencia (una vez por hora como mucho).

## 4. Uso por linea de comandos

```bash
npm run cm -- generate-content --posts 5   # genera el calendario/contenido de la proxima semana (borrador)
npm run cm -- queue                        # lista los posts en cola con su estado y horario
npm run cm -- approve 0                    # aprueba el post en el indice 0 de la cola
npm run cm -- publish-now                  # publica en Instagram lo aprobado y en horario (requiere AUTO_PUBLISH=true + credenciales)
npm run cm -- analyze-best-times           # calcula los mejores dias/horarios segun historico (o defaults del rubro si no hay datos)
npm run cm -- suggest-ads                  # sugerencias de publicidad basadas en metricas + consultas de clientes
npm run cm -- analytics-report             # trae insights de Instagram (si hay credenciales) y arma el reporte semanal
npm run cm -- respond "tu consulta aca"    # prueba la respuesta del agente a una consulta de cliente
npm run cm -- start                        # deja el scheduler corriendo (contenido semanal, publicacion horaria, analitica semanal)
```

Los reportes (calendario de contenido y sugerencias de ads) se guardan como
Markdown en `reports/`.

## 5. Como funciona el "mejor horario" y las sugerencias de ads

- **Mejor horario** (`src/analytics/bestTime.ts`): agrupa los posts publicados
  por dia de semana + bloque horario y calcula la tasa de engagement promedio
  ((likes+comentarios+guardados+compartidos) / alcance). Mientras no haya
  suficiente historico propio, completa con horarios recomendados por buenas
  practicas del rubro fitness/deportivo, y los va reemplazando a medida que
  se acumulan datos reales.
- **Sugerencias de publicidad** (`src/analytics/adSuggestions.ts`), reglas:
  1. **Boostear un post**: engagement organico muy por encima del promedio pero alcance bajo respecto a los seguidores.
  2. **Segmento con bajo rendimiento**: un deporte/categoria que rinde sistematicamente muy por debajo del promedio (posible fatiga de contenido).
  3. **Producto con alta demanda**: muchas consultas de clientes sobre un producto (via `respond --product <id>` o integracion futura de DMs) que casi no aparecio en el contenido reciente.

Estas reglas son deterministas (no dependen de IA), por eso estan cubiertas
por tests en `tests/`.

## 6. Modo de trabajo recomendado (seguro por default)

Por default (`AUTO_PUBLISH=false`) el agente **nunca publica solo**: genera
borradores, vos los revisas con `queue`/`approve`, y recien ahi se publican.
Esto es intencional: es el mejor Community Manager que puede ser, pero la voz
publica de la marca conviene que la revise una persona hasta tener confianza
en el sistema. Cuando quieras que publique automaticamente en el mejor
horario sin intervencion, poné `AUTO_PUBLISH=true`.

## 7. Tests

```bash
npm test
```

Cubre la logica determinista (busqueda en la base de conocimiento, calculo
de mejores horarios, reglas de sugerencia de ads, generacion del calendario).
No testea las llamadas reales a Claude ni a Instagram (requieren credenciales
y red).

## 8. Estructura del proyecto

```
data/                 Catalogo de productos, voz de marca, sugerencias, y estado runtime (cola, metricas)
src/knowledgeBase/     Carga y busqueda sobre el catalogo (retrieval simple por palabras clave)
src/agent/             Persona del CM, cliente de Claude, respondedor de consultas
src/content/           Calendario de contenido y generador de captions
src/analytics/         Mejor horario, sugerencias de ads, almacenamiento de metricas
src/instagram/         Cliente de la Instagram Graph API
src/scheduler/         Jobs periodicos (cron) que orquestan todo
src/cli.ts             Interfaz de linea de comandos
reports/               Reportes generados (calendario semanal, sugerencias de ads)
```

## Roadmap sugerido (no implementado todavia)

- Integrar Instagram Messaging API para responder DMs automaticamente (hoy el respondedor esta listo para eso, falta el canal).
- Subida automatica de imagenes/videos a un storage publico antes de publicar (hoy se asume que la URL ya existe).
- Dashboard web simple sobre los reportes de `reports/`.
- Sumar otras redes (TikTok, etc.) reutilizando el mismo motor de contenido y persona de marca.
