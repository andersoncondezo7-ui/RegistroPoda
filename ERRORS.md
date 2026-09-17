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
  objeto JSON, y las expresiones tipo `triggerBody()?['municipalidad']`
  fallan.
- Causa: se envía `Content-Type: text/plain` a propósito (ver CORS arriba).
- Solución: agregar un paso "Analizar JSON" (Parse JSON) con
  `json(triggerBody())` como contenido, justo después del disparador. Ya
  documentado en README.md → sección 3, Paso 1.

---

## Historial real de incidencias

_(vacío por ahora — se irá completando a medida que se prueben el flujo y el
despliegue)_
