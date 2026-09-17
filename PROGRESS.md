# PROGRESS — Bitácora del proyecto "Reporte de Poda"

> Léeme primero. Aquí se registra qué se hizo y qué falta, para no tener que
> repasar toda la conversación en cada sesión nueva.

## Estado actual: 🟡 Formulario listo — falta configurar Power Automate y publicar

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

## Pendiente / próximos pasos

- [ ] **Usuario debe crear el flujo en Power Automate** siguiendo
      `README.md` → sección 3, y pegar la URL resultante en `config.js` →
      `POWER_AUTOMATE_URL`. (No se puede automatizar desde aquí: Power
      Automate se configura en su portal web, no por código.)
- [ ] Crear el archivo Excel en SharePoint con la tabla `TablaPoda` y las
      columnas listadas en el README (Fecha, Municipalidad, Direccion,
      Latitud, Longitud, Situacion, NombreContacto, Telefono, EnlacesFotos).
- [ ] Crear/confirmar la biblioteca de documentos en SharePoint donde se
      guardarán las fotos.
- [ ] Inicializar el repositorio git y subirlo a GitHub (aún no se ha hecho
      — carpeta local no era un repositorio git al iniciar este proyecto).
- [ ] Activar GitHub Pages en el repo (Settings → Pages).
- [ ] Probar un envío real de extremo a extremo (formulario → Power Automate
      → SharePoint/Excel) y confirmar en el historial de ejecuciones del flujo.
- [ ] Decidir si se necesita lista fija de `MUNICIPALIDADES` en `config.js`
      (por ahora es texto libre).

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

## Cómo continuar esta conversación en una sesión nueva

Si esto se retoma en otra sesión: lee este archivo y `ERRORS.md` primero, no
hace falta releer todo el hilo. El contexto completo del negocio (empresa
distribuidora eléctrica, casos derivados por la municipalidad) está resumido
en `README.md`.
