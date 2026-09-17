# ERRORS — Registro de errores e incidencias

> Cada vez que algo falle (en el formulario, en el flujo de Power Automate,
> en el despliegue de GitHub Pages, etc.), se agrega una entrada aquí con
> fecha, síntoma, causa y solución. Así no se repite el mismo diagnóstico.

## Formato de entrada

```
## AAAA-MM-DD — Título corto del problema
- Síntoma:
- Causa:
- Solución / estado:
```

---

## Riesgos conocidos anticipados (aún no ocurridos, documentados por si aparecen)

### CORS al enviar el formulario a Power Automate
- Síntoma esperado: `fetch` falla o el navegador bloquea la petición al
  intentar leer la respuesta del flujo (mensaje tipo "No 'Access-Control-
  Allow-Origin' header").
- Causa: el disparador HTTP de Power Automate no agrega encabezados CORS.
- Solución aplicada preventivamente: `script.js` usa `mode: "no-cors"` con
  `Content-Type: text/plain`. Ver detalle en `README.md` → "Limitación de
  CORS". Si aun así hay problemas, verificar que la URL en `config.js` sea
  exactamente la del disparador (incluye el parámetro `sig=`).

### Payload demasiado grande (fotos)
- Síntoma esperado: el flujo de Power Automate falla o tarda mucho con
  varias fotos de alta resolución.
- Causa: fotos de cámara sin comprimir pueden pesar 5-10 MB cada una; en
  base64 crecen ~33% más.
- Solución aplicada preventivamente: compresión automática en el navegador
  (`config.js` → `FOTOS.maxAnchoPx` / `calidadJPEG`) antes de enviar.

### Parseo del cuerpo como texto plano en Power Automate
- Síntoma esperado: en el flujo, `triggerBody()` llega como string en vez de
  objeto JSON, y las expresiones tipo `triggerBody()?['distrito']`
  fallan.
- Causa: se envía `Content-Type: text/plain` a propósito (ver CORS arriba).
- Solución: agregar un paso "Analizar JSON" (Parse JSON) con
  `json(triggerBody())` como contenido, justo después del disparador. Ya
  documentado en README.md → sección 3, Paso 1.

---

## Historial real de incidencias

## 2026-09-17 — El formulario "enviaba" pero nada llegaba a Power Automate (error 400 invisible)
- Síntoma: el usuario reportó que enviaba respuestas desde el formulario
  (WhatsApp se abría normal) pero nada aparecía vinculado al flujo de
  Power Automate — ni ejecuciones nuevas, ni filas en el Excel, ni fotos
  en SharePoint.
- Diagnóstico: se probó el disparador directo con `curl`, mandando el
  mismo `Content-Type: text/plain` y `mode: no-cors` que usaba
  `script.js`. Resultado real (invisible para el navegador por el
  `no-cors`): **`400 Bad Request`**, con
  `"code":"TriggerInputSchemaMismatch","message":"...Expected Object but
  got String."`. O sea: el disparador **rechazaba la petición antes de
  que el flujo llegara a ejecutarse**, porque con `Content-Type:
  text/plain` Power Automate valida el cuerpo completo como si fuera un
  string, no como el objeto que pide el esquema del disparador — nunca
  llegaba a existir el paso "Analizar JSON" que se pensaba usar para
  reconvertirlo, porque el rechazo pasa antes, a nivel del propio
  disparador.
- Por qué no se notó antes: `script.js` mandaba la petición con `fetch(...,
  {mode: "no-cors"})`, que resuelve la promesa igual aunque el servidor
  responda 400/500 (respuesta "opaca", sin código ni cuerpo visibles para
  JS) — el formulario asumía éxito y abría WhatsApp igual.
- Causa raíz de fondo: se asumió (sin probarlo) que esta URL de disparador
  tenía la misma limitación de CORS que las URLs clásicas de Logic Apps,
  y se diseñó todo el envío alrededor de esa suposición
  (`text/plain` + `no-cors`) desde el principio del proyecto.
- Cómo se confirmó la causa y la solución: se probó con `curl` mandando
  `Content-Type: application/json` (JSON real) al mismo disparador →
  `202 Accepted` con `x-ms-workflow-run-id` (ejecución real creada). Y se
  probó un `OPTIONS` simulando el preflight del navegador → el disparador
  respondió con `Access-Control-Allow-Origin: *` y los demás encabezados
  CORS correctos. Es decir: **esta URL sí soporta CORS de verdad**, el
  truco de `text/plain`/`no-cors` nunca hacía falta y de hecho era lo que
  rompía todo.
- Solución: `script.js` ahora manda `Content-Type: application/json` con
  `fetch` normal (sin `mode: "no-cors"`), lee `response.ok` de verdad, y
  solo abre WhatsApp si la respuesta fue exitosa (si falla, muestra un
  error real al usuario). El paso "Analizar JSON" del flujo ya no hace
  falta — `triggerBody()` llega parseado. Se actualizaron
  `power-automate/GUIA_FLUJO_POWER_AUTOMATE.md` y `README.md` con las
  expresiones corregidas (`triggerBody()?[...]` en vez de
  `body('Analizar_JSON')?[...]`).
- Lección: **nunca asumir el comportamiento de CORS/errores de un
  endpoint sin probarlo con `curl` primero**, sobre todo cuando el diseño
  usa `mode: "no-cors"` — ese modo oculta activamente cualquier error del
  servidor. Antes de dar por buena una integración así, probar con curl
  el código de respuesta real, no solo confiar en que el `fetch()` del
  navegador "no tiró error".

## 2026-09-17 — El overlay "Procesando tu envío" aparecía sin hacer clic en Enviar
- Síntoma: el usuario mandó una captura mostrando el overlay visible apenas
  entrar al formulario, sin haber enviado nada.
- Causa: `.overlay` en `style.css` tenía `display: flex` explícito. Una
  regla de author-stylesheet con `display` distinto de `none` gana sobre
  la regla por defecto del navegador `[hidden] { display: none }`, aunque
  el elemento tenga el atributo `hidden`. Resultado: el overlay se
  mostraba siempre, ignorando `hidden`.
- Solución: se agregó `.overlay[hidden] { display: none; }` (mayor
  especificidad que `.overlay` sola, por el selector de atributo extra) en
  `style.css`. Corregido en el commit `6468013`.
- Lección: cualquier elemento que se oculte con el atributo `hidden` y a
  la vez tenga una clase con `display: flex/grid/block` propio necesita
  una regla `.clase[hidden] { display: none; }` explícita — si se agregan
  más overlays/paneles a futuro, revisar este mismo patrón antes de que
  vuelva a pasar.

## 2026-09-17 — No se pudo instalar GitHub CLI (`gh`) para publicar el repo
- Síntoma: `winget install --id GitHub.cli` descargó el instalador pero la
  instalación terminó con "Ha cancelado la instalación" / código 1602.
  También falló cualquier comando de PowerShell con "Acceso denegado".
- Causa: el instalador de `gh` es un MSI que requiere elevación (UAC), y el
  entorno de ejecución no puede aprobar ese diálogo ni ejecutar PowerShell
  con privilegios elevados.
- Solución: se evitó `gh` por completo. El repo remoto se creó manualmente
  en github.com (sin README/.gitignore) y el push se hizo con `git` puro,
  autenticando con un Personal Access Token de un solo uso pasado por
  `git -c http.extraheader="Authorization: Basic <token en base64>"` — no
  requiere instalar nada ni guardar el token en `.git/config`. El token se
  revocó después del push. Repetir este mismo método para cualquier push
  futuro que no pueda hacerse desde la terminal propia del usuario.

## 2026-09-17 — Lista de distritos armada de memoria tenía un distrito incorrecto y le faltaban 36
- Síntoma: la primera versión de `config.js` → `DISTRITOS` tenía 25
  distritos "de memoria" (advertidos explícitamente como no verificados),
  incluyendo "San Juan de Lurigancho".
- Causa: sin una fuente oficial a mano en ese momento, se usó conocimiento
  general aproximado del área de concesión de Luz del Sur.
- Solución: el usuario compartió `Archivo/Distritos.xlsx` (61 filas con
  formato "código = NOMBRE"). Se extrajeron los nombres (ignorando los
  códigos) y se comparó contra la lista anterior: "San Juan de Lurigancho"
  **no** aparece en el archivo oficial (se quitó) y faltaban 36 distritos,
  la mayoría de las provincias de Huarochirí y Cañete (se agregaron). Se
  actualizó tanto `config.js` como la hoja "Listas" de
  `RegistroPoda_Plantilla.xlsx`. Lección: cuando el usuario puede
  proporcionar una fuente oficial, pedirla antes de completar con memoria
  aproximada, aunque eso implique una vuelta adicional.

## 2026-09-17 — "No se ve el cambio" en GitHub Pages: era caché del navegador, no el deploy
- Síntoma: el usuario mandó una captura del formulario publicado mostrando
  el nombre viejo ("Empresa de Distribución Eléctrica") y el buscador de
  distrito sin resultados al escribir "Lima".
- Causa real: el deploy de GitHub Pages estaba correcto y actualizado; el
  navegador del usuario tenía cacheado un `config.js` viejo (de antes de
  cambiar a "Luz del Sur" y agregar `DISTRITOS`). `config.js` se sirve con
  `Cache-Control: max-age=600` desde el CDN de GitHub Pages, y el
  navegador puede quedarse con una copia más vieja aún si no revalida.
- Cómo se diagnosticó: `curl` directo a
  `https://andersoncondezo7-ui.github.io/RegistroPoda/config.js` mostró
  que el servidor ya tenía `NOMBRE_EMPRESA: "Luz del Sur"` y los 60
  distritos — es decir, el problema no estaba del lado del repo/deploy.
- Solución: pedir al usuario un hard refresh (Ctrl+Shift+R) o abrir en
  incógnito. Lección: ante un "no se actualizó", verificar primero con
  curl lo que el servidor realmente está sirviendo antes de tocar código
  o el deploy — evita perseguir un bug que no existe.

## 2026-09-17 — Diseño inicial de WhatsApp (Meta Cloud API) no era lo que el usuario quería
- Síntoma: no fue un error técnico, sino un desvío de alcance: se diseñó
  la notificación de WhatsApp con la WhatsApp Business Platform (Meta
  Cloud API) desde Power Automate (tokens, plantillas aprobadas, HTTP
  action), cuando el pedido original ("que me diga que he registrado
  algo... simplemente lo vincules y se genere") ya insinuaba algo mucho
  más simple.
- Causa: se interpretó "plantilla para generar un mensaje de WhatsApp"
  como una integración formal de negocio, en vez de preguntar primero por
  el nivel de automatización esperado.
- Solución: el usuario mostró capturas de su otra app ("Registroenvio"),
  que arma el mensaje y redirige a `https://wa.me/{numero}?text=...` para
  que la persona confirme el envío a mano — sin backend ni cuentas
  externas. Se rediseñó todo el módulo sobre ese patrón (ver PROGRESS.md,
  ronda del 2026-09-17). Lección: cuando el usuario describe algo de forma
  ambigua y ya tiene un patrón de referencia funcionando en otro proyecto
  propio, preguntar por esa referencia antes de diseñar desde cero.
