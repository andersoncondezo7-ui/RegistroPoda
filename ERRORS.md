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
