# Reporte de Poda

Formulario web para registrar los casos de poda que deriva la municipalidad.
Es una página estática (HTML/CSS/JS puro, sin build ni backend) pensada para
publicarse en **GitHub Pages** y enviar cada reporte a un flujo de
**Power Automate**, que a su vez:

- Guarda la(s) foto(s) en una biblioteca de documentos de **SharePoint**.
- Agrega una fila con los datos del reporte a un **Excel de SharePoint**.

## Contenido del proyecto

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura del formulario (5 campos). |
| `style.css` | Estilos, tarjetas visuales con emoji para el tipo de problema. |
| `config.js` | **Único archivo que normalmente hay que editar**: URL de Power Automate, nombre de la empresa, lista de municipalidades, límites de fotos. |
| `script.js` | Lógica: validación, compresión de fotos, envío del reporte. |
| `sample-payload.json` | Ejemplo del JSON que se envía, útil para generar el esquema en Power Automate. |
| `PROGRESS.md` | Bitácora de avance del proyecto (léelo antes de pedir cambios nuevos). |
| `ERRORS.md` | Registro de errores/incidencias encontrados y su solución. |

## Los 5 campos del formulario

1. **Municipalidad**
2. **Dirección o ubicación** (+ botón opcional para capturar coordenadas GPS)
3. **¿Qué situación observa?** — selección visual con emoji (16 opciones + "Otro")
4. **Foto(s)** — hasta 5, se comprimen automáticamente en el navegador antes de enviarse
5. **Nombre y teléfono de contacto**

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
NOMBRE_EMPRESA: "...",
MUNICIPALIDADES: [],   // opcional
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
  (`municipalidad`, `direccion`, `situacionTexto`, `fotos`, etc.).

### Paso 2 — Inicializar variable `enlacesFotos` (Array, vacío)

### Paso 3 — "Aplicar a cada" sobre `fotos` (la salida del Parse JSON)
Dentro del ciclo, por cada foto:

1. **Crear archivo** (conector SharePoint)
   - Dirección del sitio: tu sitio de SharePoint.
   - Ruta de la biblioteca: p. ej. `Documentos compartidos/Poda/@{formatDateTime(utcNow(),'yyyy-MM')}`
   - Nombre de archivo: `@{concat(items('Aplicar_a_cada')['nombreArchivo'])}`
   - Contenido del archivo: `@{base64ToBinary(items('Aplicar_a_cada')['contenidoBase64'])}`
2. **Anexar a variable de matriz** `enlacesFotos` con el valor
   `@{outputs('Crear_archivo')?['body/{Link}']}` (o `{Path}`, según la versión del conector).

### Paso 4 — Agregar una fila a una tabla (Excel Online Business)
- Ubicación: SharePoint.
- Sitio y biblioteca: donde está el archivo Excel.
- Archivo: tu libro `RegistroPoda.xlsx` (debe tener una **tabla** creada,
  por ejemplo llamada `TablaPoda`, con estas columnas):

  | Columna | Origen |
  |---|---|
  | Fecha | `municipalidad`... `Fecha` → `@{body('Analizar_JSON')?['fecha']}` |
  | Municipalidad | `municipalidad` |
  | Direccion | `direccion` |
  | Latitud | `ubicacion?['lat']` |
  | Longitud | `ubicacion?['lng']` |
  | Situacion | `situacionTexto` |
  | NombreContacto | `nombreContacto` |
  | Telefono | `telefonoContacto` |
  | EnlacesFotos | `@{join(variables('enlacesFotos'), '; ')}` |

### Paso 5 (opcional pero recomendado) — Notificación
Agrega un correo o mensaje de Teams a la cuadrilla/área de poda cuando llega
un reporte nuevo, usando los mismos campos.

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
