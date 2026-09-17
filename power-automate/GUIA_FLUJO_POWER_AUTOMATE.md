# Guía paso a paso — Flujo de Power Automate

Esta guía es para armar el flujo dentro del portal de Power Automate
(make.powerautomate.com). Trae los valores exactos para copiar y pegar en
cada acción, en el mismo orden en que hay que agregarlas. Es la versión
detallada de README.md → sección "3. Power Automate".

## 0. Antes de empezar

Ten a la mano:
- Acceso a Power Automate con permisos para crear flujos en tu entorno.
- La dirección del **sitio de SharePoint** donde se va a guardar todo
  (fotos + Excel).
- Haber subido [`RegistroPoda_Plantilla.xlsx`](RegistroPoda_Plantilla.xlsx)
  a una biblioteca de documentos de ese sitio (si no lo hiciste aún, hazlo
  antes del Paso 5).

## Estado actual de este proyecto

✅ **El disparador (Paso 1) ya existe** — la URL ya está pegada en
`config.js` → `POWER_AUTOMATE_URL`. Esta URL **no cambia** mientras no
borres ni vuelvas a crear el disparador desde cero (agregar o editar pasos
después del disparador no la afecta).

⚠️ **2026-09-17 — Corrección importante:** la primera versión de esta guía
pedía mandar el cuerpo como `Content-Type: text/plain` desde el navegador
(para esquivar un supuesto bloqueo de CORS) y agregar un paso extra
"Analizar JSON" para volver a convertirlo a objeto. Se probó en vivo contra
esta URL con `curl` y **esa URL sí soporta CORS de verdad** (a diferencia
de las URLs viejas de Logic Apps) — el truco de `text/plain` en realidad
causaba que el disparador **rechazara la petición con error 400**
(`TriggerInputSchemaMismatch: Expected Object but got String`), sin que el
navegador se enterara (por eso el formulario parecía funcionar pero nada
llegaba al flujo). Ya se corrigió en `script.js`: ahora se manda
`Content-Type: application/json` directo, así que **ya no hace falta el
paso "Analizar JSON"** — el disparador entrega el objeto ya parseado y se
usa `triggerBody()` directo en todas las expresiones de abajo. Detalle
completo en `../ERRORS.md`.

---

## Paso 1 — Disparador "Cuando se recibe una solicitud HTTP"

(Ya creado. Solo para referencia/verificación, por si hay que revisarlo.)

- **Quién puede invocar**: Cualquiera.
- **Método**: `POST`.
- **Esquema JSON del cuerpo** — entra a la acción del disparador →
  "Mostrar esquema avanzado" o el cuadro de texto del esquema, y verifica
  que tenga esto (si no, pégalo tal cual):

```json
{
  "type": "object",
  "properties": {
    "fecha": { "type": "string" },
    "distrito": { "type": "string" },
    "direccion": { "type": "string" },
    "ubicacion": {
      "type": ["object", "null"],
      "properties": {
        "lat": { "type": "number" },
        "lng": { "type": "number" }
      }
    },
    "situacionId": { "type": "string" },
    "situacionTexto": { "type": "string" },
    "nombreContacto": { "type": "string" },
    "telefonoContacto": { "type": "string" },
    "fotos": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "nombreArchivo": { "type": "string" },
          "tipoContenido": { "type": "string" },
          "contenidoBase64": { "type": "string" }
        }
      }
    }
  }
}
```

> Este mismo esquema está también en [`sample-payload.json`](../sample-payload.json)
> con valores de ejemplo, por si Power Automate te pide "usar una carga
> útil de ejemplo" en vez de un esquema directo.

Con este esquema ya configurado, Power Automate te va a mostrar
`distrito`, `direccion`, `situacionTexto`, etc. como **contenido dinámico**
directo del disparador (sin ningún paso intermedio) en cualquier acción
que agregues después.

## Paso 2 — Dos "Inicializar variable"

Agrega dos acciones **"Inicializar variable"**, una después de la otra:

**Variable 1**
- Nombre: `rutaCarpeta`
- Tipo: `String`
- Valor:
  ```
  Poda/@{triggerBody()?['distrito']}/@{formatDateTime(utcNow(),'yyyy-MM')}/@{formatDateTime(utcNow(),'yyyy-MM-dd_HHmmss')}_@{triggerBody()?['distrito']}
  ```

**Variable 2**
- Nombre: `enlacesFotos`
- Tipo: `Array`
- Valor: (déjalo vacío)

## Paso 3 — Acción "Crear nueva carpeta" (SharePoint)

- **Dirección del sitio**: elige tu sitio de SharePoint.
- **Ruta de la carpeta a crear**: `Documentos compartidos/@{variables('rutaCarpeta')}`

> Esto crea, para cada registro que llegue, una carpeta única con la forma
> `Poda/{Distrito}/{año-mes}/{fecha-hora}_{Distrito}/` — así las fotos
> quedan agrupadas por distrito, por mes, y una carpeta distinta por cada
> envío (ver README.md → sección 3, Paso 2, para el detalle del diseño).

Configuración recomendada de este paso: en los tres puntos → **"Configurar
ejecución después"** → marca también "ha fallado", por si alguna vez dos
registros del mismo distrito caen exactamente en el mismo segundo (muy
raro, pero así el flujo no se corta ahí).

## Paso 4 — "Aplicar a cada" para subir las fotos

- Agrega un **"Aplicar a cada"**.
- **Salida de entrada anterior**: `@{triggerBody()?['fotos']}`

Dentro del ciclo, dos acciones:

**4.1 — Crear archivo (SharePoint)**
- Dirección del sitio: la misma de siempre.
- Ruta de la biblioteca de documentos: `Documentos compartidos/@{variables('rutaCarpeta')}`
- Nombre de archivo: `@{items('Aplicar_a_cada')['nombreArchivo']}`
- Contenido del archivo: `@{base64ToBinary(items('Aplicar_a_cada')['contenidoBase64'])}`

**4.2 — Anexar a variable de matriz**
- Nombre: `enlacesFotos`
- Valor: `@{outputs('Crear_archivo')?['body/{Link}']}`
  (si tu conector no tiene `{Link}`, prueba `{Path}` — depende de la
  versión del conector SharePoint que tengas).

## Paso 5 — Registrar la fila en el Excel

Elige **una** de las dos opciones (no hace falta hacer las dos):

### Opción A — "Agregar una fila a una tabla" (más simple, recomendada para empezar)

- Ubicación: SharePoint Sitio.
- Dirección del sitio / biblioteca / archivo: donde subiste
  `RegistroPoda_Plantilla.xlsx`.
- Tabla: `TablaPoda`.
- Completa cada columna así:

| Columna de la tabla | Valor a pegar |
|---|---|
| Fecha | `@{triggerBody()?['fecha']}` |
| Distrito | `@{triggerBody()?['distrito']}` |
| Direccion | `@{triggerBody()?['direccion']}` |
| Latitud | `@{triggerBody()?['ubicacion']?['lat']}` |
| Longitud | `@{triggerBody()?['ubicacion']?['lng']}` |
| Situacion | `@{triggerBody()?['situacionTexto']}` |
| NombreContacto | `@{triggerBody()?['nombreContacto']}` |
| Telefono | `@{triggerBody()?['telefonoContacto']}` |
| EnlacesFotos | `@{join(variables('enlacesFotos'), '; ')}` |
| CarpetaRegistro | `@{outputs('Crear_nueva_carpeta')?['body/Path']}` |

### Opción B — Office Script "Ejecutar script" (más control)

1. Abre `RegistroPoda_Plantilla.xlsx` en Excel Online (dentro de
   SharePoint) → pestaña **Automatizar** → **Nuevo script**.
2. Borra el contenido de ejemplo y pega todo el contenido de
   [`office-script-agregar-registro.ts`](office-script-agregar-registro.ts).
3. Guarda el script con el nombre **`AgregarRegistroPoda`**.
4. En el flujo, agrega la acción **"Excel Online (Business)" → "Ejecutar
   script"**.
   - Ubicación / Sitio de documentos / Archivo: el mismo Excel.
   - Script: `AgregarRegistroPoda`.
   - Power Automate genera automáticamente un campo de entrada por cada
     parámetro de la función. Complétalos así:

| Parámetro del script | Valor a pegar |
|---|---|
| fecha | `@{triggerBody()?['fecha']}` |
| distrito | `@{triggerBody()?['distrito']}` |
| direccion | `@{triggerBody()?['direccion']}` |
| latitud | `@{string(triggerBody()?['ubicacion']?['lat'])}` |
| longitud | `@{string(triggerBody()?['ubicacion']?['lng'])}` |
| situacion | `@{triggerBody()?['situacionTexto']}` |
| nombreContacto | `@{triggerBody()?['nombreContacto']}` |
| telefono | `@{triggerBody()?['telefonoContacto']}` |
| enlacesFotos | `@{join(variables('enlacesFotos'), '; ')}` |
| carpetaRegistro | `@{outputs('Crear_nueva_carpeta')?['body/Path']}` |

> Nota: los parámetros `latitud`/`longitud` del script están tipados como
> texto (`string`), por eso se envuelven con `string(...)` — si el reporte
> no tiene GPS, ese valor llegará como `null`/vacío y el script lo guarda
> tal cual, sin error.

## Paso 6 — Notificación por WhatsApp: **no va acá**

El aviso por WhatsApp **no es parte de este flujo**. Lo dispara el propio
navegador (`script.js`) justo después de recibir una respuesta exitosa de
este disparador, con un enlace `https://wa.me/...` y un mensaje ya armado
— ver README.md → sección 3, Paso 5, para el detalle. No hace falta
agregar ninguna acción de WhatsApp aquí. Si el flujo falla, el navegador
ya no abre WhatsApp (se corrigió junto con lo del Content-Type — antes
abría WhatsApp igual, aunque el guardado hubiera fallado).

## Paso 7 — Guardar y probar

1. Guarda el flujo.
2. Botón **"Probar"** (arriba a la derecha) → "Manualmente" → Guardar y
   probar → usa el formulario real (o pega el contenido de
   `sample-payload.json` con una herramienta como Postman/curl si quieres
   probar sin fotos reales de por medio).
3. Ve a **"Historial de ejecuciones"** del flujo y confirma que cada paso
   quedó en verde. Si algo falla, el paso marcado en rojo te dice
   exactamente qué expresión o campo revisar.
4. Verifica en SharePoint que:
   - Se creó la carpeta `Poda/{Distrito}/{año-mes}/{fecha-hora}_{Distrito}/`
     con las fotos adentro.
   - Se agregó la fila nueva en `TablaPoda` dentro de
     `RegistroPoda_Plantilla.xlsx`.

### Probar el disparador directamente con curl (sin pasar por el formulario)

Útil para descartar si el problema está en el disparador o más adelante en
el flujo:

```bash
curl -i -X POST "TU_URL_DE_POWER_AUTOMATE" \
  -H "Content-Type: application/json" \
  --data-binary @sample-payload.json
```

- **`202 Accepted`** (con un header `x-ms-workflow-run-id`) → el
  disparador aceptó la petición y creó una ejecución real. Si aun así no
  ves nada en SharePoint/Excel, el problema está en los pasos 2 en
  adelante — revisa el historial de ejecuciones.
- **`400 Bad Request`** con `"TriggerInputSchemaMismatch"` → el cuerpo no
  coincide con el esquema del disparador (revisa el `Content-Type` que
  estás mandando, o el esquema del Paso 1).
- **`404`** o **`401`/`403`** → la URL está mal copiada, vencida, o el
  disparador fue borrado/recreado (hay que actualizar `config.js`).

## Problemas comunes

- **El formulario "se envía" pero no aparece nada en Power Automate** →
  esto ya pasó una vez (ver el aviso al inicio de esta guía): probar
  siempre primero con el `curl` de arriba para confirmar que el
  disparador realmente acepta la petición (código `202`), antes de asumir
  que el problema está en los pasos siguientes del flujo.
- **La carpeta ya existe / el paso "Crear nueva carpeta" falla** → normal
  si se prueba dos veces seguidas muy rápido con los mismos datos (mismo
  distrito, mismo segundo). En producción casi no pasa porque el nombre de
  carpeta incluye hora, minuto y segundo.
- **La fila del Excel sale con columnas vacías** → revisa que las
  expresiones digan `triggerBody()?['...']` con el nombre de campo exacto
  (en minúsculas, tal como está en el JSON: `distrito`, no `Distrito`).
- Para cualquier otro error, revisa primero [`../ERRORS.md`](../ERRORS.md)
  — puede que ya esté documentado ahí.
