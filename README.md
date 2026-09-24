# MG12 Community Manager

Agente de Community Manager para **MG12**, marca de productos para mejorar el
agarre (grip) en crossfit, escalada, pole dance, tela y disciplinas afines.

El agente:

- **Responde consultas de clientes/seguidores** usando la info real del catalogo (no inventa datos).
- **Genera contenido para Instagram** de forma periodica (calendario semanal con captions, hashtags, brief visual y guion de reel listo para grabar).
- **Analiza metricas** de los posts publicados para detectar los mejores dias/horarios para publicar.
- **Publica en el mejor horario** (opcional, requiere habilitarlo explicitamente).
- **Sugiere publicidad paga** cuando los datos lo justifican (posts organicos que conviene boostear, segmentos que rinden mal, productos con mucha demanda de consultas y poca presencia en el contenido).
- **Sugiere sorteos, promociones y colaboraciones** para sumar seguidores, engagement o ventas (ver seccion 6).

> Este repo es el "cerebro" del Community Manager. Para que publique de
> verdad en Instagram necesita credenciales reales de Meta (ver mas abajo).
> Sin esas credenciales igual sirve para generar contenido, responder
> consultas y practicar el flujo completo en modo borrador.

## 1. Los 6 productos (y como agregar mas)

Toda la info de producto vive en [`data/products.json`](data/products.json).
Catalogo real (lista de precios de septiembre): 3 formulas en 2 presentaciones
cada una =6 SKUs.

| Producto | Categoria | Deportes | Precio menor | Precio mayor | Mayor +50u. |
|---|---|---|---|---|---|
| Liquid Grip 150ml | Magnesio liquido | escalada, crossfit, calistenia, pole dance | $26.500 | $18.500 | $14.800 |
| Liquid Grip 60ml | Magnesio liquido | escalada, crossfit, calistenia, pole dance | $10.750 | $6.450 | $5.200 |
| Super Grip 125ml | Resina liquida | crossfit, calistenia, halterofilia, escalada, gimnasia, pole dance, (tela a confirmar) | $22.100 | $15.400 | $12.300 |
| Super Grip 60ml | Resina liquida | crossfit, calistenia, halterofilia, escalada, gimnasia, pole dance, (tela a confirmar) | $8.300 | $6.000 | $4.800 |
| Dry Grip 100cc | Magnesio en polvo | crossfit, halterofilia, calistenia, escalada | $12.000 | $9.600 | $7.700 |
| Dry Grip 60cc | Magnesio en polvo | crossfit, halterofilia, calistenia, escalada | $6.000 | $4.300 | $3.400 |

Todos los precios estan en ARS. Compra minima mayorista: **$250.000**
(`wholesaleMinOrder` en `data/products.json`).

**Actualizado el 2026-09-24 con datos reales** extraidos del perfil publico de
Instagram [@mg12cba.ok](https://www.instagram.com/mg12cba.ok/) (370
seguidores, 8 posts): descripciones, beneficios, modo de uso del Liquid Grip
("agitar, aplicar y dejar secar") y los deportes de cada formula salen de las
captions reales que la marca ya publico, no son invencion. Tambien se cargaron
los datos de contacto reales (`contact` en `data/products.json`): MG12 no
tiene tienda online, vende por WhatsApp (351-294-9676), DM de Instagram o mail
(mg12.ventas@gmail.com), y hace venta por mayor directa a boxes/gimnasios
desde Cordoba. Lo que sigue en `PENDIENTE` (sobre todo el modo de uso de
Super Grip y Dry Grip) es porque no aparece en ningun post todavia — no lo
inventamos, hay que pedirselo al equipo. "Tela" queda como segmento candidato
para Super Grip: el brief original de MG12 lo menciona pero no aparecio en el
contenido analizado, conviene confirmarlo.

Para agregar un producto nuevo, sumalo al array `products` con la misma
estructura. En [`data/product-suggestions.json`](data/product-suggestions.json)
dejamos 3 ideas de productos nuevos para ampliar la linea (grip trainer,
toallitas antibacteriales con grip, magnesio para escalada infantil) como
sugerencias de negocio — el agente nunca los ofrece como si ya existieran,
solo son inspiracion hasta que el equipo confirme si se producen.

La voz de marca (tono, que hacer/evitar, hashtags por deporte) esta en
[`data/brand-voice.json`](data/brand-voice.json), tambien actualizada con el
estilo real observado (bastante emoji, listas con checks ✅, preguntas de
enganche, CTA siempre con una via de contacto) y con `realPostExamples`, dos
captions reales usadas como referencia de tono para el generador de
contenido. Es editable si el equipo quiere calibrar el tono distinto.

> Nota de contexto (no es un dato que vaya a quedar desactualizado en el
> agente, es solo para quien lea este README): al analizar la cuenta, el
> ultimo post encontrado era de 2026-05-23 y en total hay 8 posts en ~14
> meses. Vale la pena retomar una cadencia mas regular — el modulo de
> `suggest-growth` (seccion 6) tiene tacticas concretas para eso.

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

### Que necesito de vos (y que NO)

**Nunca compartas el mail y la contraseña de la cuenta de Instagram/Facebook**
en el chat ni en ningun lado: no hace falta, va contra las politicas de Meta
usarlos con automatizaciones de terceros, y expone la cuenta a que la bloqueen
o se la roben. Lo que realmente se necesita para la integracion real son las
credenciales de la seccion 3 (`IG_ACCESS_TOKEN` + `IG_BUSINESS_ACCOUNT_ID`),
que se generan desde developers.facebook.com y **no exponen la contraseña**.
Si queres, te puedo guiar paso a paso para generarlas cuando llegue el momento.

Mientras tanto, sin ninguna credencial de Meta, puedo trabajar igual si me
compartis:
- El **link (o @usuario) de la cuenta de Instagram**, para revisar lo que ya
  esta publicado (bio, destacadas, tipo de fotos/reels, tono actual) y usarlo
  como base para escribir descripciones y ajustar `data/brand-voice.json`.
  Ojo: Instagram limita mucho lo que se puede ver sin haber iniciado sesion
  (suele mostrar solo la bio y poco mas), asi que si el analisis automatico
  trae poca info, lo mejor es que me pases capturas o texto de los ultimos
  posts/captions, o un export de Instagram Insights (Meta Business Suite ->
  Estadisticas -> Exportar datos) para calcular mejores horarios con datos
  reales en vez de los defaults del rubro.
- Fotos o videos que ya tengan de los productos (para describir mejor cada
  uno) y cualquier venta/consulta frecuente que reciban, para afinar las
  sugerencias de publicidad y de contenido.

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
npm run cm -- suggest-growth --goal seguidores -n 3   # sugiere sorteos/promos/colaboraciones (goal: seguidores|engagement|ventas|contenido)
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

## 6. Sorteos, promociones y otras formas de sumar seguidores

`data/growth-playbook.json` tiene un catalogo editable de tacticas de
crecimiento (sorteos, promociones, colaboraciones con boxes/estudios,
programa de embajadores, desafios de UGC en Reels, etc.), pensadas para una
marca sin tienda online que vende por DM/WhatsApp. `npm run cm -- suggest-growth`
las sugiere filtradas por objetivo y las va rotando semana a semana para no
repetir siempre la misma. Sumale o edita tacticas directamente en ese archivo
segun lo que el equipo pueda sostener (stock disponible para regalar,
relaciones con instructores/estudios, etc.).

## 7. Modo de trabajo recomendado (seguro por default)

Por default (`AUTO_PUBLISH=false`) el agente **nunca publica solo**: genera
borradores, vos los revisas con `queue`/`approve`, y recien ahi se publican.
Esto es intencional: es el mejor Community Manager que puede ser, pero la voz
publica de la marca conviene que la revise una persona hasta tener confianza
en el sistema. Cuando quieras que publique automaticamente en el mejor
horario sin intervencion, poné `AUTO_PUBLISH=true`.

## 8. Tests

```bash
npm test
```

Cubre la logica determinista (busqueda en la base de conocimiento, calculo
de mejores horarios, reglas de sugerencia de ads, generacion del calendario).
No testea las llamadas reales a Claude ni a Instagram (requieren credenciales
y red).

## 9. Estructura del proyecto

```
data/                  Catalogo de productos, voz de marca, sugerencias, playbook de crecimiento, y estado runtime (cola, metricas)
src/knowledgeBase/     Carga y busqueda sobre el catalogo (retrieval simple por palabras clave)
src/agent/             Persona del CM, cliente de Claude, respondedor de consultas
src/content/           Calendario de contenido, generador de captions/guiones de reel
src/analytics/         Mejor horario, sugerencias de ads, almacenamiento de metricas
src/growth/            Catalogo de sorteos/promociones y logica de sugerencia
src/instagram/         Cliente de la Instagram Graph API
src/scheduler/         Jobs periodicos (cron) que orquestan todo
src/cli.ts             Interfaz de linea de comandos
reports/               Reportes generados (calendario semanal, sugerencias de ads)
```

## Roadmap sugerido (no implementado todavia)

- Integrar Instagram Messaging API para responder DMs automaticamente (hoy el respondedor esta listo para eso, falta el canal).
- Generacion real de video/imagen (hoy el agente escribe el guion de reel y el brief visual, pero la grabacion/edicion la hace el equipo).
- Subida automatica de imagenes/videos a un storage publico antes de publicar (hoy se asume que la URL ya existe).
- Dashboard web simple sobre los reportes de `reports/`.
- Sumar otras redes (TikTok, etc.) reutilizando el mismo motor de contenido y persona de marca.
