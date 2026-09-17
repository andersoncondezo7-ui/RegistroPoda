# PROGRESS — Bitácora del proyecto "Reporte de Poda"

> Léeme primero. Aquí se registra qué se hizo y qué falta, para no tener que
> repasar toda la conversación en cada sesión nueva.

## Estado actual: 🟡 Repo publicado en GitHub — falta activar Pages y configurar Power Automate

## Repositorio

- Remoto: https://github.com/andersoncondezo7-ui/RegistroPoda
- Rama: `main` (ya tiene el primer commit subido)

## Hecho (2026-09-17)

- [x] Definidos los 5 campos del formulario según especificación del usuario:
      Municipalidad, Dirección/ubicación, Situación observada (visual con
      emoji), Foto(s), Nombre y teléfono de contacto.
- [x] Clasificación visual de "situación observada" ampliada a 16 opciones
      con emoji (lista provista por el usuario), incluyendo "Otro".
- [x] `index.html` + `style.css` + `script.js` + `config.js` creados.
      Formulario estático, sin dependencias externas, responsive (mobile-first).
- [x] Compresión de fotos en el navegador (máx. 1600px, JPEG ~0.72) antes de
      convertir a base64 y enviar, para no saturar el flujo ni el móvil del
      usuario.
- [x] Botón opcional de captura de ubicación GPS (no es un 6º campo
      obligatorio, es un complemento de "Dirección o ubicación").
- [x] Envío al flujo de Power Automate resuelto con `fetch(..., {mode:
      "no-cors", headers: {"Content-Type":"text/plain"}})` para evitar el
      bloqueo de CORS del disparador HTTP (documentado en README.md).
- [x] `sample-payload.json` creado para generar el esquema del disparador en
      Power Automate.
- [x] `README.md` con guía paso a paso: publicar en GitHub Pages + construir
      el flujo de Power Automate (SharePoint fotos + Excel de SharePoint).
- [x] `ERRORS.md` creado para registrar incidencias.
- [x] Repositorio git inicializado, commit creado y subido a
      https://github.com/andersoncondezo7-ui/RegistroPoda (rama `main`).
      `gh` CLI no se pudo instalar (requiere UAC/administrador, no disponible
      en este entorno); se usó un Personal Access Token temporal solo para el
      push, vía `git -c http.extraheader`, sin guardarlo en `.git/config` ni
      en ningún archivo. El usuario ya lo revocó/debe revocarlo tras el push.

## Hecho (2026-09-17, segunda ronda — Luz del Sur + distrito + carpetas + WhatsApp)

- [x] Campo 1 cambiado de "Municipalidad" (texto libre) a **"Distrito"**,
      con **buscador dinámico** (combobox con filtrado en vivo, resaltado de
      coincidencias, navegación por teclado y tarjeta de "Distrito
      seleccionado" con botón "Cambiar" — patrón pedido por el usuario a
      partir de una captura de referencia, sin copiar sus colores rojos).
      Implementado en `index.html` (`#comboboxDistrito`), `style.css`
      (`.combobox`, `.distrito-seleccionado`) y `script.js`
      (`configurarDistrito()`).
- [x] `NOMBRE_EMPRESA` cambiado a "Luz del Sur" en `config.js`.
- [x] Lista de distritos **reemplazada por la oficial**: el usuario compartió
      `Archivo/Distritos.xlsx` (60 distritos con código interno, incluye
      Lima Metropolitana + provincias de Huarochirí y Cañete). Se extrajeron
      solo los nombres (se ignoraron los códigos) y se compararon contra la
      lista anterior armada de memoria — esa lista tenía un error real
      ("San Juan de Lurigancho" no está en el archivo oficial, se quitó) y
      le faltaban 36 distritos, ya agregados. Dos casos quedan marcados
      para confirmar en `config.js` y `README.md`: "Santa María" (¿del
      Mar?) y "Ate-Vitarte" (nombre INEI actual es "Ate"). El código 42
      "Surco" se trató como duplicado de "Santiago de Surco" y no se agregó
      aparte.
- [x] `power-automate/RegistroPoda_Plantilla.xlsx` creado con el skill de
      xlsx: hoja "Registros", tabla `TablaPoda` (columnas Fecha, Distrito,
      Direccion, Latitud, Longitud, Situacion, NombreContacto, Telefono,
      EnlacesFotos, CarpetaRegistro), 2 filas de ejemplo, y una hoja oculta
      "Listas" con los 60 distritos como origen de una validación de datos
      (lista desplegable) en la columna Distrito hasta la fila 500.
- [x] `power-automate/office-script-agregar-registro.ts` creado: Office
      Script para Excel Online que agrega una fila a `TablaPoda` (crea la
      hoja/tabla si no existen). Pensado para la acción "Excel Online
      (Business) → Ejecutar script" de Power Automate, como alternativa con
      más control a la acción nativa "Agregar una fila".
- [x] Diseño de organización de carpetas en SharePoint por
      **distrito → mes → carpeta por registro** (con fecha y hora en el
      nombre para que no choquen registros del mismo día), documentado en
      README.md → sección 3, Paso 2.
- [x] Módulo de notificación por WhatsApp documentado (README.md → sección
      3, Paso 5): vía WhatsApp Business Platform (Meta Cloud API), acción
      HTTP en Power Automate con plantilla de mensaje pre-aprobada,
      destino fijo **+51 963 799 933**. Alternativa mencionada: Twilio
      WhatsApp Sandbox para pruebas rápidas.
      `power-automate/whatsapp-envio-ejemplo.json` tiene el cuerpo de
      ejemplo de la petición HTTP.
- [x] README.md actualizado con todo lo anterior (tabla de archivos, los 5
      campos, secciones nuevas del flujo de Power Automate).

## Pendiente / próximos pasos

- [ ] Activar GitHub Pages en https://github.com/andersoncondezo7-ui/RegistroPoda
      → Settings → Pages → Source: `main` / `/ (root)`.

- [ ] **Usuario debe crear el flujo en Power Automate** siguiendo
      `README.md` → sección 3, y pegar la URL resultante en `config.js` →
      `POWER_AUTOMATE_URL`. (No se puede automatizar desde aquí: Power
      Automate se configura en su portal web, no por código.)
- [ ] Subir `power-automate/RegistroPoda_Plantilla.xlsx` a la biblioteca de
      SharePoint elegida (ya trae la tabla `TablaPoda` y la validación de
      distritos armada, no hace falta crearla desde cero).
- [ ] Crear/confirmar la biblioteca de documentos en SharePoint donde se
      guardarán las fotos (carpetas por distrito/mes/registro).
- [ ] Confirmar con el usuario los 2 nombres de distrito marcados como
      dudosos ("Santa María" vs "Santa María del Mar", "Ate-Vitarte" vs
      "Ate") antes de dar la lista por definitiva.
- [ ] Crear la cuenta de WhatsApp Business Platform (Meta) o decidir usar
      Twilio, y la plantilla de mensaje aprobada, para poder completar el
      Paso 5 del flujo (por ahora solo está documentado/diseñado, no se
      puede crear la cuenta externa desde aquí).
- [ ] Probar un envío real de extremo a extremo (formulario → Power Automate
      → SharePoint/Excel/WhatsApp) y confirmar en el historial de
      ejecuciones del flujo.
- [ ] Hacer commit + push de esta segunda ronda de cambios (Distrito,
      Luz del Sur, plantilla Excel, Office Script, WhatsApp) — pendiente al
      momento de escribir esto.

## Decisiones tomadas (para no repreguntar)

- Sin backend propio ni build step: HTML/CSS/JS puro, para poder hostear en
  GitHub Pages directamente.
- Comunicación directa navegador → Power Automate (sin proxy intermedio) —
  implica la limitación de CORS documentada en README.md. Se aceptó como
  solución v1; un proxy con CORS queda como mejora futura si se necesita
  confirmación en pantalla del guardado real.
- Foto(s) es un campo obligatorio (mínimo 1), configurable en `config.js` →
  `FOTOS.minCantidadRequerida`.
- "Situación observada" es selección única (radio), no múltiple.
- "Distrito" es un buscador dinámico (combobox), no un `<select>` nativo:
  con 60 opciones un desplegable nativo es incómodo en celular; el patrón
  de "tarjeta de seleccionado + Cambiar" lo pidió el usuario mostrando una
  captura de otra app (colores rojos), pero se implementó con la paleta
  verde/azul ya existente del sitio — el usuario aclaró explícitamente "no
  te guíes de los colores", solo del patrón de interacción.
- La lista de distritos se basa en `Archivo/Distritos.xlsx` (fuente del
  usuario), no en el mapa público de concesión — puede incluir zonas
  rurales de Huarochirí/Cañete que Luz del Sur atiende aunque no sean
  "Lima" en sentido estricto de Lima Metropolitana.

## Cómo continuar esta conversación en una sesión nueva

Si esto se retoma en otra sesión: lee este archivo y `ERRORS.md` primero, no
hace falta releer todo el hilo. El contexto completo del negocio (empresa
distribuidora eléctrica, casos derivados por la municipalidad) está resumido
en `README.md`.
