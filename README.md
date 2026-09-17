# Reporte de Poda — Luz del Sur

Formulario web para registrar los casos de poda que deriva la municipalidad.
Es una página estática (HTML/CSS/JS puro, sin build ni backend) pensada para
publicarse en **GitHub Pages** y enviar cada reporte a un flujo de
**Power Automate**, que a su vez:

- Guarda la(s) foto(s) en una biblioteca de documentos de **SharePoint**,
  organizadas en carpetas por distrito / mes / registro.
- Agrega una fila con los datos del reporte a un **Excel de SharePoint**.
- Envía una **notificación por WhatsApp** avisando que llegó un registro nuevo.

## Contenido del proyecto

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura del formulario (5 campos). |
| `style.css` | Estilos, tarjetas visuales con emoji para el tipo de problema. |
| `config.js` | **Único archivo que normalmente hay que editar**: URL de Power Automate, nombre de la empresa, lista de distritos, límites de fotos. |
| `script.js` | Lógica: validación, compresión de fotos, envío del reporte. |
| `sample-payload.json` | Ejemplo del JSON que se envía, útil para generar el esquema en Power Automate. |
| `power-automate/RegistroPoda_Plantilla.xlsx` | Plantilla del Excel a subir a SharePoint (hoja "Registros", tabla `TablaPoda`, con validación de distritos). |
| `power-automate/office-script-agregar-registro.ts` | Office Script que agrega cada registro a la tabla del Excel (alternativa a la acción nativa "Agregar una fila"). |
| `power-automate/whatsapp-envio-ejemplo.json` | Cuerpo de ejemplo para la acción HTTP que envía la notificación por WhatsApp. |
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
DISTRITOS: [ "Ate", "Barranco", /* ... */ ],
```

Mientras `POWER_AUTOMATE_URL` no esté configurada, el formulario muestra una
advertencia y no intenta enviar nada.

## 3. Power Automate: crear el flujo

Crea un **flujo de nube automatizado en blanco** con estos pasos:

### Paso 1 — Disparador: "Cuando se recibe una solicitud HTTP"
- Método: `POST`.
- Esquema JSON del cuerpo: usa **"Usar carga útil de ejemplo para generar
  esquema"** y pega el contenido de [`sample-payload.json`](sample-payload.json).
- **Importante (ver limitación de CORS más abajo):** el formulario envía el
  cuerpo con `Content-Type: text/plain`, así que el disparador puede recibirlo
  como texto. Agrega justo después un paso **Analizar JSON** (Parse JSON)
  usando el mismo esquema, con el contenido:
  `json(triggerBody())`
  Así el resto del flujo puede usar los campos normalmente
  (`distrito`, `direccion`, `situacionTexto`, `fotos`, etc.).

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
  `Poda/@{body('Analizar_JSON')?['distrito']}/@{formatDateTime(utcNow(),'yyyy-MM')}/@{formatDateTime(utcNow(),'yyyy-MM-dd_HHmmss')}_@{body('Analizar_JSON')?['distrito']}`
- `enlacesFotos` (Array, vacío)

Luego, acción **"Crear nueva carpeta"** (SharePoint) con esa `rutaCarpeta`
(si ya existe, el paso falla; puedes configurar "Configurar ejecución" →
seguir aunque falle, para el caso raro de colisión).

### Paso 3 — "Aplicar a cada" sobre `fotos` (la salida del Parse JSON)
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
| Fecha | `@{body('Analizar_JSON')?['fecha']}` |
| Distrito | `@{body('Analizar_JSON')?['distrito']}` |
| Direccion | `@{body('Analizar_JSON')?['direccion']}` |
| Latitud | `@{body('Analizar_JSON')?['ubicacion']?['lat']}` |
| Longitud | `@{body('Analizar_JSON')?['ubicacion']?['lng']}` |
| Situacion | `@{body('Analizar_JSON')?['situacionTexto']}` |
| NombreContacto | `@{body('Analizar_JSON')?['nombreContacto']}` |
| Telefono | `@{body('Analizar_JSON')?['telefonoContacto']}` |
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

### Paso 5 — Notificación por WhatsApp

Cada vez que se guarda un registro, se envía un WhatsApp a
**+51 963 799 933** avisando que hay un caso nuevo. WhatsApp no permite
automatizar envíos desde un número personal: hace falta una cuenta de
**WhatsApp Business Platform** (Meta) con al menos un número habilitado
para la API y una **plantilla de mensaje aprobada** (los mensajes que
inicia la empresa, fuera de una conversación ya abierta por el cliente,
solo pueden ser plantillas pre-aprobadas por Meta).

1. Crea una app en [developers.facebook.com](https://developers.facebook.com/)
   → agrega el producto **WhatsApp** → registra o usa el número de prueba
   que te da Meta (este es el número que **envía**, no tiene que ser el
   +51 963 799 933 — ese es el destino que recibe el aviso).
2. En **Administrador del WhatsApp Business** crea una plantilla, por
   ejemplo `nuevo_registro_poda`, categoría "Utilidad", texto:
   > Nuevo registro de poda en {{1}}. Situación: {{2}}. Ver fotos: {{3}}
3. Consigue el `PHONE_NUMBER_ID` de tu número y un **token de acceso**
   (para producción, un token de sistema de usuario permanente, no el
   token temporal de prueba de 24h).
4. En el flujo de Power Automate, agrega una acción **HTTP** después de
   guardar la fila en el Excel:
   - Método: `POST`
   - URL: `https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages`
   - Encabezados: `Authorization: Bearer {TU_TOKEN}`, `Content-Type: application/json`
   - Cuerpo: basado en
     [`power-automate/whatsapp-envio-ejemplo.json`](power-automate/whatsapp-envio-ejemplo.json),
     reemplazando `{{distrito}}`, `{{situacionTexto}}` y
     `{{carpetaRegistroURL}}` por contenido dinámico
     (`@{body('Analizar_JSON')?['distrito']}`, etc.) y dejando
     `"to": "51963799933"` fijo.

> Alternativa más rápida para pruebas (sin cuenta de Meta todavía):
> **Twilio WhatsApp Sandbox** — mismo patrón de acción HTTP, pero apuntando
> a la API de Twilio con tu Account SID/Auth Token. Es más simple de
> activar pero requiere que el número +51 963 799 933 se "una" al sandbox
> primero enviando un mensaje de activación, y no es apto para producción
> sin pasar a un número de Twilio verificado.

### Guardar el flujo
Al guardar, copia la **URL HTTP POST** generada en el disparador y pégala en
`config.js` → `POWER_AUTOMATE_URL`.

---

## Limitación de CORS (importante)

El disparador HTTP de Power Automate no incluye encabezados CORS en su
respuesta, así que un navegador no puede leer esa respuesta desde un dominio
distinto (como `github.io`). Para evitarlo, el formulario:

- Envía la petición con `mode: "no-cors"` y `Content-Type: text/plain`, lo
  que evita el bloqueo del navegador (la petición sí llega al flujo).
- A cambio, **no podemos confirmar desde el navegador si el flujo se
  ejecutó correctamente** (solo si la petición salió de la red del
  usuario). El mensaje "✅ Reporte enviado" indica que la petición se envió,
  no que el flujo terminó sin errores internos.

Cómo verificar que todo funciona de extremo a extremo:
1. Envía un reporte de prueba desde el formulario.
2. Revisa en Power Automate → tu flujo → **Historial de ejecuciones** que
   haya corrido correctamente.
3. Confirma que aparece la fila en el Excel y el archivo en SharePoint.

Si más adelante se necesita confirmación en tiempo real dentro del propio
formulario (por ejemplo mostrar "guardado" solo cuando de verdad se guardó),
la solución es poner un pequeño proxy (Azure Function o Logic App con CORS
habilitado) entre el formulario y Power Automate. No es necesario para la
primera versión.

## Notas de fotos y conectividad

Las fotos se redimensionan (máx. 1600px de ancho) y se comprimen a JPEG
calidad ~0.72 en el propio navegador antes de convertirlas a base64 y
enviarlas. Esto reduce mucho el tamaño de la petición para el personal que
reporta desde el campo con datos móviles. Ajustable en `config.js` →
`FOTOS`.

## Próximas mejoras posibles (no incluidas en esta versión)

- Cola de reintento local (localStorage) para reportes que fallan por falta
  de conexión.
- Proxy con CORS para confirmar en pantalla que el flujo terminó sin errores.
- Estado del caso (pendiente/en proceso/atendido) editable desde otra vista.
