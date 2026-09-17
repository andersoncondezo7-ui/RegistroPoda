# Reporte de Poda — Luz del Sur

Formulario web para registrar los casos de poda que deriva la municipalidad.
Es una página estática (HTML/CSS/JS puro, sin build ni backend) pensada para
publicarse en **GitHub Pages** y enviar cada reporte a un flujo de
**Power Automate**, que a su vez:

- Guarda la(s) foto(s) en una biblioteca de documentos de **SharePoint**,
  organizadas en carpetas por distrito / mes / registro.
- Agrega una fila con los datos del reporte a un **Excel de SharePoint**.

Además, justo al guardar, el propio navegador abre **WhatsApp** con un
mensaje-resumen del registro ya escrito, para que quien llenó el formulario
solo tenga que presionar Enviar (mismo patrón que ya usan en su app
"Registroenvio": pantalla de "procesando" → redirección a `wa.me` con el
texto listo). No requiere cuenta de WhatsApp Business API.

## Contenido del proyecto

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura del formulario (5 campos). |
| `style.css` | Estilos, tarjetas visuales con emoji para el tipo de problema. |
| `config.js` | **Único archivo que normalmente hay que editar**: URL de Power Automate, nombre de la empresa, lista de distritos, límites de fotos. |
| `script.js` | Lógica: validación, compresión de fotos, envío del reporte. |
| `sample-payload.json` | Ejemplo del JSON que se envía, útil para generar el esquema en Power Automate. |
| `power-automate/GUIA_FLUJO_POWER_AUTOMATE.md` | **Guía paso a paso para armar el flujo**, con los valores exactos de cada acción para copiar y pegar. |
| `power-automate/RegistroPoda_Plantilla.xlsx` | Plantilla del Excel a subir a SharePoint (hoja "Registros", tabla `TablaPoda`, con validación de distritos). |
| `power-automate/office-script-agregar-registro.ts` | Office Script que agrega cada registro a la tabla del Excel (alternativa a la acción nativa "Agregar una fila"). |
| `Archivo/Distritos.xlsx` | Fuente oficial de los 60 distritos (entregada por el usuario). Si cambia, actualizar `config.js` → `DISTRITOS` y la hoja "Listas" de `RegistroPoda_Plantilla.xlsx`. |
| `PROGRESS.md` | Bitácora de avance del proyecto (léelo antes de pedir cambios nuevos). |
| `ERRORS.md` | Registro de errores/incidencias encontrados y su solución. |

## Los 5 campos del formulario

1. **Distrito** — buscador dinámico: al escribir letras se filtran en vivo
   los distritos de la concesión de Luz del Sur (Lima Metropolitana +
   Huarochirí + Cañete); al seleccionar uno aparece una tarjeta de
   confirmación con opción "Cambiar" (lista completa editable en
   `config.js` → `DISTRITOS`)
2. **Dirección o ubicación** (+ botón opcional para capturar coordenadas GPS)
3. **¿Qué situación observa?** — selección visual con emoji (16 opciones + "Otro")
4. **Foto(s)** — hasta 5, se comprimen automáticamente en el navegador antes de enviarse
5. **Nombre y teléfono de contacto**

> ⚠️ La lista de 60 distritos en `config.js` viene de `Archivo/Distritos.xlsx`
> (fuente entregada por el usuario, 2026-09-17). Dos casos a confirmar:
> "Santa María" (¿es "Santa María del Mar"?) y "Ate-Vitarte" (nombre oficial
> INEI actual es solo "Ate", pero se mantuvo el nombre del archivo fuente).
> El código 42 "Surco" del archivo se consideró duplicado de "Santiago de
> Surco" y no se agregó aparte. Es un solo array editable en `config.js`, no
> requiere tocar ningún otro archivo.

---

## 1. Publicar en GitHub Pages

1. Crea un repositorio en GitHub (puede ser privado si prefieres que solo tu
   equipo lo use internamente; GitHub Pages funciona igual en repos privados
   con plan de pago/organización, o público si no hay restricción).
2. Sube estos archivos a la rama principal (`main`).
3. En el repositorio: **Settings → Pages → Source → Deploy from a branch →
   `main` / `/ (root)`** → Guardar.
4. GitHub entrega una URL tipo `https://<usuario>.github.io/<repo>/`. Esa es
   la que se comparte a la municipalidad (o se enlaza desde un QR / correo).

## 2. Antes de conectar Power Automate

Abre `config.js` y confirma/edita:

```js
POWER_AUTOMATE_URL: "PEGAR_AQUI_LA_URL_DEL_FLUJO_DE_POWER_AUTOMATE",
NOMBRE_EMPRESA: "Luz del Sur",
DISTRITOS: [ "Ate-Vitarte", "Barranco", /* ... */ ],
WHATSAPP: { numeroDestino: "51963799933" },
```

Mientras `POWER_AUTOMATE_URL` no esté configurada, el formulario muestra una
advertencia y no intenta enviar nada.

## 3. Power Automate: crear el flujo

> 📋 Para seguir esto paso a paso con los valores exactos de cada campo,
> usa [`power-automate/GUIA_FLUJO_POWER_AUTOMATE.md`](power-automate/GUIA_FLUJO_POWER_AUTOMATE.md) —
> esta sección es el resumen, esa guía es la versión "copiar y pegar".

Crea un **flujo de nube automatizado en blanco** con estos pasos:

### Paso 1 — Disparador: "Cuando se recibe una solicitud HTTP"
- Método: `POST`.
- Esquema JSON del cuerpo: usa **"Usar carga útil de ejemplo para generar
  esquema"** y pega el contenido de [`sample-payload.json`](sample-payload.json).
- El formulario manda el cuerpo como `Content-Type: application/json` real
  (esta URL de Power Platform sí soporta CORS correctamente, a diferencia
  de las URLs viejas de Logic Apps — ver nota más abajo), así que
  `triggerBody()` ya llega como objeto: se usa directo en todo el flujo,
  **no hace falta ningún paso "Analizar JSON"**.

### Paso 2 — Construir la ruta de la carpeta del registro

Cada envío del formulario ("registro") guarda sus fotos en **su propia
carpeta**, agrupada por distrito y por mes, así:

```
Documentos compartidos/Poda/
  └── {Distrito}/
        └── {yyyy-MM}/
              └── {yyyy-MM-dd}_{HHmmss}_{Distrito}/
                    ├── foto1.jpg
                    └── foto2.jpg
```

Esto responde a la vez a "por distrito", "por día" (carpeta mensual +
nombre de carpeta con fecha) y "por registro" (una carpeta distinta por
cada envío, con hora incluida para que no choquen dos registros del mismo
distrito el mismo día).

Agrega dos pasos **Inicializar variable**:
- `rutaCarpeta` (String):
  `Poda/@{triggerBody()?['distrito']}/@{formatDateTime(utcNow(),'yyyy-MM')}/@{formatDateTime(utcNow(),'yyyy-MM-dd_HHmmss')}_@{triggerBody()?['distrito']}`
- `enlacesFotos` (Array, vacío)

Luego, acción **"Crear nueva carpeta"** (SharePoint) con esa `rutaCarpeta`
(si ya existe, el paso falla; puedes configurar "Configurar ejecución" →
seguir aunque falle, para el caso raro de colisión).

### Paso 3 — "Aplicar a cada" sobre `fotos` (del disparador)
Dentro del ciclo, por cada foto:

1. **Crear archivo** (conector SharePoint)
   - Dirección del sitio: tu sitio de SharePoint.
   - Ruta de la biblioteca: `Documentos compartidos/@{variables('rutaCarpeta')}`
   - Nombre de archivo: `@{items('Aplicar_a_cada')['nombreArchivo']}`
   - Contenido del archivo: `@{base64ToBinary(items('Aplicar_a_cada')['contenidoBase64'])}`
2. **Anexar a variable de matriz** `enlacesFotos` con el valor
   `@{outputs('Crear_archivo')?['body/{Link}']}` (o `{Path}`, según la versión del conector).

### Paso 4 — Registrar la fila en el Excel

Sube [`power-automate/RegistroPoda_Plantilla.xlsx`](power-automate/RegistroPoda_Plantilla.xlsx)
a la biblioteca de SharePoint donde vivirá el registro (ya trae la hoja
"Registros", la tabla `TablaPoda` con las columnas correctas y la lista
desplegable de distritos). Luego elige **una** de estas dos formas de
agregar la fila:

**Opción A — Acción nativa "Agregar una fila a una tabla" (más simple)**

| Columna de la tabla | Valor a mapear |
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
| CarpetaRegistro | `@{outputs('Crear_nueva_carpeta')?['body/Path']}` (o el link equivalente) |

**Opción B — Office Script (más control, es lo que pediste como "Excel script")**

1. Abre `RegistroPoda_Plantilla.xlsx` en Excel Online → pestaña
   **Automatizar → Nuevo script** → pega el contenido de
   [`power-automate/office-script-agregar-registro.ts`](power-automate/office-script-agregar-registro.ts)
   → guárdalo como `AgregarRegistroPoda`.
2. En el flujo, agrega la acción **"Excel Online (Business) → Ejecutar
   script"**, elige el libro y el script `AgregarRegistroPoda`. Power
   Automate genera automáticamente un campo de entrada por cada parámetro
   de la función (`fecha`, `distrito`, `direccion`, ...) — mapea cada uno
   con la misma lógica de la tabla de arriba.
3. Ventaja sobre la Opción A: si la hoja o la tabla no existen todavía
   (por ejemplo, alguien subió un Excel en blanco), el script las crea
   solo. Úsala si quieres más margen para agregar lógica más adelante
   (validaciones, evitar duplicados, etc.).

### Paso 5 — Notificación por WhatsApp (no va en Power Automate)

Esta parte **no ocurre en el flujo**: la notificación por WhatsApp la arma
y la dispara el propio `script.js`, en el navegador, justo después de que
la petición a Power Automate sale — no requiere cuenta de WhatsApp
Business API, tokens ni plantillas aprobadas por Meta. Es el mismo patrón
simple que ya usan en su app "Registroenvio":

1. Al presionar "Enviar reporte", aparece una pantalla de **"Procesando tu
   envío"** con spinner (`#overlayEnvio` en `index.html`) mientras se manda
   la petición a Power Automate.
2. Con la petición ya en camino, `script.js` arma un mensaje de texto con
   los datos del reporte (`construirMensajeWhatsApp()`) y redirige el
   navegador a `https://wa.me/{numero}?text={mensaje}` — esto abre WhatsApp
   (la app en el celular, o WhatsApp Web en escritorio) con el mensaje ya
   escrito.
3. Quien llenó el formulario solo tiene que presionar **Enviar** dentro de
   WhatsApp. Ese mensaje enviado queda en su propio historial de WhatsApp
   como comprobante de que el reporte se registró y de que alguien se dio
   por enterado.
4. El número de destino se configura en `config.js` →
   `WHATSAPP.numeroDestino` (hoy: `51963799933`, sin "+" ni espacios).
5. WhatsApp **solo se abre si Power Automate respondió con éxito**
   (`response.ok`). Si el guardado falla, se muestra un mensaje de error en
   el formulario y no se abre WhatsApp — así no se le avisa a nadie de un
   registro que en realidad no se guardó.

Limitación a tener en cuenta: el mensaje se envía **desde el WhatsApp
personal de quien llena el formulario**, no desde un número institucional
de la empresa, y **requiere que esa persona confirme el envío a mano**
dentro de WhatsApp (no es 100% automático de punta a punta). Si más
adelante se necesita que el aviso salga solo, sin que nadie tenga que
tocar "Enviar", la alternativa es integrar la **WhatsApp Business
Platform (Meta Cloud API)** desde Power Automate con una plantilla de
mensaje aprobada — es más robusto pero requiere crear una cuenta de Meta
for Developers, verificar un número y esperar la aprobación de la
plantilla; se dejó fuera de esta versión porque no es lo que se pidió.

### Guardar el flujo
Al guardar, copia la **URL HTTP POST** generada en el disparador y pégala en
`config.js` → `POWER_AUTOMATE_URL`.

---

## Sobre CORS (ya resuelto, se documenta por si cambia la URL)

Las URLs de disparador de **Power Automate sobre Power Platform** (las que
tienen el dominio `*.environment.api.powerplatform.com`, como la que usa
este proyecto) **sí responden correctamente a la verificación CORS** del
navegador — se comprobó en vivo con `curl` simulando el preflight
(`OPTIONS`) y devuelve `Access-Control-Allow-Origin: *`. Por eso el
formulario manda el `Content-Type: application/json` real, sin ningún
truco, y además puede **leer la respuesta real** del disparador
(`response.ok`) para saber si el registro se guardó antes de abrir
WhatsApp.

⚠️ Esto **no es así en las URLs viejas de Logic Apps clásicas**
(`*.logic.azure.com`) — esas sí bloquean CORS y necesitarían el truco de
`mode: "no-cors"` + `Content-Type: text/plain` (con la limitación de que,
en ese caso, no se puede leer la respuesta real). Si en algún momento la
URL del flujo cambia a ese formato, hay que revisar `enviarReporte()` en
`script.js`.

Cómo verificar que todo funciona de extremo a extremo:
1. Prueba el disparador directo con `curl` (ver
   `power-automate/GUIA_FLUJO_POWER_AUTOMATE.md` → "Probar el disparador
   directamente con curl") — si responde `202 Accepted`, el disparador está
   bien.
2. Envía un reporte de prueba desde el formulario.
3. Revisa en Power Automate → tu flujo → **Historial de ejecuciones** que
   haya corrido correctamente.
4. Confirma que aparece la fila en el Excel y el archivo en SharePoint.

## Notas de fotos y conectividad

Las fotos se redimensionan (máx. 1600px de ancho) y se comprimen a JPEG
calidad ~0.72 en el propio navegador antes de convertirlas a base64 y
enviarlas. Esto reduce mucho el tamaño de la petición para el personal que
reporta desde el campo con datos móviles. Ajustable en `config.js` →
`FOTOS`.

## Próximas mejoras posibles (no incluidas en esta versión)

- Cola de reintento local (localStorage) para reportes que fallan por falta
  de conexión.
- Estado del caso (pendiente/en proceso/atendido) editable desde otra vista.
