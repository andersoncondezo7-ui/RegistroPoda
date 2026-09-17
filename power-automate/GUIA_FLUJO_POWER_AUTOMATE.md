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
  antes del Paso 6).

## Estado actual de este proyecto

✅ **El disparador (Paso 1) ya existe** — la URL ya está pegada en
`config.js` → `POWER_AUTOMATE_URL`:
```
https://default1c0051dd45964b1a9849d060735057.69.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/18/workflows/edc7c562ac794e5b9be26c9a16668b4f/triggers/manual/paths/invoke?...
```
Esta URL **no cambia** mientras no borres ni vuelvas a crear el
disparador desde cero (agregar o editar pasos después del disparador no la
afecta). Si alguna vez la regeneras, hay que actualizar `config.js` de
nuevo.

Lo que falta armar dentro del flujo son los pasos 2 en adelante.

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

## Paso 2 — Acción "Analizar JSON" (Parse JSON)

**Por qué hace falta:** el formulario envía el cuerpo con
`Content-Type: text/plain` a propósito (para evitar el bloqueo de CORS del
navegador — ver README.md → "Limitación de CORS"). Eso significa que
`triggerBody()` llega como **texto**, no como objeto, así que hay que
convertirlo.

- Busca la acción **"Analizar JSON"**.
- **Contenido**: `json(triggerBody())`
- **Esquema**: el mismo JSON de arriba (puedes copiar/pegar el mismo
  bloque, o usar "Generar desde ejemplo" con `sample-payload.json`).

De aquí en adelante, todas las expresiones de esta guía usan
`body('Analizar_JSON')` — si Power Automate le puso otro nombre a este
paso (por ejemplo `Analizar_JSON_1`), ajusta el nombre en las expresiones
o, mejor, renombra el paso a `Analizar_JSON` (los tres puntos → Cambiar
nombre) para que las expresiones de esta guía funcionen tal cual.

## Paso 3 — Dos "Inicializar variable"

Agrega dos acciones **"Inicializar variable"**, una después de la otra:

**Variable 1**
- Nombre: `rutaCarpeta`
- Tipo: `String`
- Valor:
  ```
  Poda/@{body('Analizar_JSON')?['distrito']}/@{formatDateTime(utcNow(),'yyyy-MM')}/@{formatDateTime(utcNow(),'yyyy-MM-dd_HHmmss')}_@{body('Analizar_JSON')?['distrito']}
  ```

**Variable 2**
- Nombre: `enlacesFotos`
- Tipo: `Array`
- Valor: (déjalo vacío)

## Paso 4 — Acción "Crear nueva carpeta" (SharePoint)

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

## Paso 5 — "Aplicar a cada" para subir las fotos

- Agrega un **"Aplicar a cada"**.
- **Salida de entrada anterior**: `@{body('Analizar_JSON')?['fotos']}`

Dentro del ciclo, dos acciones:

**5.1 — Crear archivo (SharePoint)**
- Dirección del sitio: la misma de siempre.
- Ruta de la biblioteca de documentos: `Documentos compartidos/@{variables('rutaCarpeta')}`
- Nombre de archivo: `@{items('Aplicar_a_cada')['nombreArchivo']}`
- Contenido del archivo: `@{base64ToBinary(items('Aplicar_a_cada')['contenidoBase64'])}`

**5.2 — Anexar a variable de matriz**
- Nombre: `enlacesFotos`
- Valor: `@{outputs('Crear_archivo')?['body/{Link}']}`
  (si tu conector no tiene `{Link}`, prueba `{Path}` — depende de la
  versión del conector SharePoint que tengas).

## Paso 6 — Registrar la fila en el Excel

Elige **una** de las dos opciones (no hace falta hacer las dos):

### Opción A — "Agregar una fila a una tabla" (más simple, recomendada para empezar)

- Ubicación: SharePoint Sitio.
- Dirección del sitio / biblioteca / archivo: donde subiste
  `RegistroPoda_Plantilla.xlsx`.
- Tabla: `TablaPoda`.
- Completa cada columna así:

| Columna de la tabla | Valor a pegar |
|---|---|
| Fecha | `@{body('Analizar_JSON')?['fecha']}` |
| Distrito | `@{body('Analizar_JSON')?['distrito']}` |
| Direccion | `@{body('Analizar_JSON')?['direccion']}` |
| Latitud | `@{body('Analizar_JSON')?['ubicacion']?['lat']}` |
| Longitud | `@{body('Analizar_JSON')?['ubicacion']?['lng']}` |
| Situacion | `@{body('Analizar_JSON')?['situacionTexto']}` |
| NombreContacto | `@{body('Analizar_JSON')?['nombreContacto']}` |
| Telefono | `@{body('Analizar_JSON')?['telefonoContacto']}` |
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
| fecha | `@{body('Analizar_JSON')?['fecha']}` |
| distrito | `@{body('Analizar_JSON')?['distrito']}` |
| direccion | `@{body('Analizar_JSON')?['direccion']}` |
| latitud | `@{string(body('Analizar_JSON')?['ubicacion']?['lat'])}` |
| longitud | `@{string(body('Analizar_JSON')?['ubicacion']?['lng'])}` |
| situacion | `@{body('Analizar_JSON')?['situacionTexto']}` |
| nombreContacto | `@{body('Analizar_JSON')?['nombreContacto']}` |
| telefono | `@{body('Analizar_JSON')?['telefonoContacto']}` |
| enlacesFotos | `@{join(variables('enlacesFotos'), '; ')}` |
| carpetaRegistro | `@{outputs('Crear_nueva_carpeta')?['body/Path']}` |

> Nota: los parámetros `latitud`/`longitud` del script están tipados como
> texto (`string`), por eso se envuelven con `string(...)` — si el reporte
> no tiene GPS, ese valor llegará como `null`/vacío y el script lo guarda
> tal cual, sin error.

## Paso 7 — Notificación por WhatsApp: **no va acá**

El aviso por WhatsApp **no es parte de este flujo**. Lo dispara el propio
navegador (`script.js`) justo después de mandar la petición a este
disparador, con un enlace `https://wa.me/...` y un mensaje ya armado — ver
README.md → sección 3, Paso 5, para el detalle. No hace falta agregar
ninguna acción de WhatsApp aquí.

## Paso 8 — Guardar y probar

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

## Problemas comunes

- **"Analizar JSON" falla o los campos llegan vacíos** → revisa que el
  contenido del paso sea exactamente `json(triggerBody())` y no
  `triggerBody()` a secas (sin el `json(...)` alrededor, el texto plano no
  se convierte a objeto).
- **La carpeta ya existe / el paso "Crear nueva carpeta" falla** → normal
  si se prueba dos veces seguidas muy rápido con los mismos datos (mismo
  distrito, mismo segundo). En producción casi no pasa porque el nombre de
  carpeta incluye hora, minuto y segundo.
- **La fila del Excel sale con columnas vacías** → normalmente es un
  nombre de paso mal escrito en la expresión (por ejemplo
  `body('Analizar_JSON')` vs `body('Analizar_JSON_1')` si Power Automate
  le puso un número al final). Revisa el nombre real del paso en el
  diseñador y ajusta las expresiones.
- Para cualquier otro error, revisa primero [`../ERRORS.md`](../ERRORS.md)
  — puede que ya esté documentado ahí.
