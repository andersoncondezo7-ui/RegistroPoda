// ==========================================================================
// Lógica del formulario de Reporte de Poda.
// Depende de config.js (debe cargarse antes de este archivo).
// ==========================================================================

const TIPOS_PROBLEMA = [
  { id: "arbol_cerca_cables", emoji: "🌳", texto: "Árbol cerca de los cables" },
  { id: "ramas_cerca_cables", emoji: "🌿", texto: "Ramas cerca de los cables" },
  { id: "ramas_tocando_cables", emoji: "⚡", texto: "Ramas tocando los cables" },
  { id: "palmera_cerca_cables", emoji: "🌴", texto: "Palmera cerca de los cables" },
  { id: "hojas_palmera_tocando_cables", emoji: "🌴", texto: "Hojas de palmera tocando los cables" },
  { id: "ramas_golpean_viento", emoji: "🌬️", texto: "Ramas que golpean los cables con el viento" },
  { id: "arbol_inclinado", emoji: "🌳", texto: "Árbol inclinado hacia los cables" },
  { id: "riesgo_caida_arbol", emoji: "⚠️", texto: "Riesgo de caída de árbol" },
  { id: "riesgo_caida_ramas", emoji: "⚠️", texto: "Riesgo de caída de ramas" },
  { id: "arbol_caido_cables", emoji: "🌳", texto: "Árbol caído sobre los cables" },
  { id: "vegetacion_dificulta_acceso", emoji: "🚧", texto: "Vegetación que dificulta el acceso a postes o equipos eléctricos" },
  { id: "humo_chispas", emoji: "🔥", texto: "Se observa humo, chispas o quemaduras" },
  { id: "cerca_viviendas", emoji: "🏠", texto: "Árbol o ramas cerca de viviendas y cables" },
  { id: "riesgo_peatones", emoji: "🚶", texto: "Árbol o ramas representan riesgo para peatones o vehículos" },
  { id: "vegetacion_crecida_postes", emoji: "🌱", texto: "Vegetación crecida alrededor de postes eléctricos" },
  { id: "otro", emoji: "📷", texto: "Otro (adjuntar fotografía)" },
];

let fotosProcesadas = []; // [{ nombre, tipo, base64 }]
let ubicacionGPS = null;  // { lat, lng }

document.addEventListener("DOMContentLoaded", () => {
  aplicarConfiguracion();
  renderTiposProblema();
  configurarUbicacion();
  configurarFotos();
  configurarEnvio();
});

function aplicarConfiguracion() {
  document.getElementById("nombreEmpresa").textContent = CONFIG.NOMBRE_EMPRESA || "Reporte de Poda";
  document.title = `Reporte de Poda — ${CONFIG.NOMBRE_EMPRESA || ""}`;

  const datalist = document.getElementById("listaMunicipalidades");
  (CONFIG.MUNICIPALIDADES || []).forEach((nombre) => {
    const opt = document.createElement("option");
    opt.value = nombre;
    datalist.appendChild(opt);
  });

  document.getElementById("maxFotosTexto").textContent = CONFIG.FOTOS?.maxCantidad ?? 5;
}

function renderTiposProblema() {
  const grid = document.getElementById("situacionGrid");
  TIPOS_PROBLEMA.forEach((tipo) => {
    const card = document.createElement("label");
    card.className = "situacion-card";
    card.innerHTML = `
      <input type="radio" name="situacion" value="${tipo.id}" required>
      <span class="situacion-card__emoji">${tipo.emoji}</span>
      <span class="situacion-card__texto">${tipo.texto}</span>
    `;
    grid.appendChild(card);
  });

  grid.addEventListener("change", (e) => {
    if (e.target.name !== "situacion") return;
    document.querySelectorAll(".situacion-card").forEach((c) => c.classList.remove("is-selected"));
    e.target.closest(".situacion-card").classList.add("is-selected");
    document.getElementById("otroDetalleWrap").hidden = e.target.value !== "otro";
  });
}

function configurarUbicacion() {
  const btn = document.getElementById("btnUbicacion");
  const estado = document.getElementById("ubicacionEstado");

  btn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      estado.textContent = "Este dispositivo no permite obtener la ubicación automáticamente.";
      return;
    }
    estado.textContent = "Obteniendo ubicación...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        ubicacionGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        estado.textContent = `✅ Ubicación capturada (${ubicacionGPS.lat.toFixed(5)}, ${ubicacionGPS.lng.toFixed(5)})`;
      },
      () => {
        estado.textContent = "No se pudo obtener la ubicación. Puede continuar solo con la dirección.";
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function configurarFotos() {
  const input = document.getElementById("fotos");
  const preview = document.getElementById("previewFotos");

  input.addEventListener("change", async () => {
    const max = CONFIG.FOTOS?.maxCantidad ?? 5;
    const archivos = Array.from(input.files).slice(0, max - fotosProcesadas.length);

    for (const archivo of archivos) {
      if (fotosProcesadas.length >= max) break;
      try {
        const foto = await comprimirImagen(archivo);
        fotosProcesadas.push(foto);
        agregarPreview(foto);
      } catch (err) {
        console.error("No se pudo procesar la foto:", archivo.name, err);
      }
    }
    input.value = "";
  });

  function agregarPreview(foto) {
    const item = document.createElement("div");
    item.className = "preview-item";
    item.innerHTML = `<img src="data:${foto.tipo};base64,${foto.base64}" alt="${foto.nombre}">
      <button type="button" aria-label="Quitar foto">✕</button>`;
    item.querySelector("button").addEventListener("click", () => {
      fotosProcesadas = fotosProcesadas.filter((f) => f !== foto);
      item.remove();
    });
    preview.appendChild(item);
  }
}

function comprimirImagen(archivo) {
  const maxAncho = CONFIG.FOTOS?.maxAnchoPx ?? 1600;
  const calidad = CONFIG.FOTOS?.calidadJPEG ?? 0.72;

  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("Error leyendo archivo"));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Error decodificando imagen"));
      img.onload = () => {
        const escala = Math.min(1, maxAncho / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", calidad);
        resolve({
          nombre: archivo.name.replace(/\.[^.]+$/, "") + ".jpg",
          tipo: "image/jpeg",
          base64: dataUrl.split(",")[1],
        });
      };
      img.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

function configurarEnvio() {
  const form = document.getElementById("formPoda");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const payload = construirPayload();
    await enviarReporte(payload);
  });
}

function validarFormulario() {
  let valido = true;
  const marcar = (id, ok) => {
    const el = document.getElementById(id);
    el.classList.toggle("campo-invalido", !ok);
    if (!ok) valido = false;
  };

  marcar("municipalidad", document.getElementById("municipalidad").value.trim() !== "");
  marcar("direccion", document.getElementById("direccion").value.trim() !== "");
  marcar("nombreContacto", document.getElementById("nombreContacto").value.trim() !== "");
  marcar("telefonoContacto", document.getElementById("telefonoContacto").value.trim() !== "");

  const situacionSeleccionada = document.querySelector('input[name="situacion"]:checked');
  if (!situacionSeleccionada) valido = false;

  if (situacionSeleccionada?.value === "otro") {
    marcar("otroDetalle", document.getElementById("otroDetalle").value.trim() !== "");
  }

  const minFotos = CONFIG.FOTOS?.minCantidadRequerida ?? 1;
  if (fotosProcesadas.length < minFotos) {
    valido = false;
    mostrarMensaje(`Debe adjuntar al menos ${minFotos} foto(s).`, "error");
  }

  if (!valido && !document.getElementById("mensajeEstado").textContent) {
    mostrarMensaje("Por favor complete los campos obligatorios (*).", "error");
  }

  return valido;
}

function construirPayload() {
  const situacionInput = document.querySelector('input[name="situacion"]:checked');
  const tipo = TIPOS_PROBLEMA.find((t) => t.id === situacionInput.value);

  return {
    fecha: new Date().toISOString(),
    municipalidad: document.getElementById("municipalidad").value.trim(),
    direccion: document.getElementById("direccion").value.trim(),
    ubicacion: ubicacionGPS,
    situacionId: tipo.id,
    situacionTexto: tipo.id === "otro"
      ? document.getElementById("otroDetalle").value.trim()
      : `${tipo.emoji} ${tipo.texto}`,
    nombreContacto: document.getElementById("nombreContacto").value.trim(),
    telefonoContacto: document.getElementById("telefonoContacto").value.trim(),
    fotos: fotosProcesadas.map((f) => ({
      nombreArchivo: f.nombre,
      tipoContenido: f.tipo,
      contenidoBase64: f.base64,
    })),
  };
}

async function enviarReporte(payload) {
  const boton = document.getElementById("btnEnviar");
  boton.disabled = true;
  mostrarMensaje("Enviando reporte...", "cargando");

  if (!CONFIG.POWER_AUTOMATE_URL || CONFIG.POWER_AUTOMATE_URL.startsWith("PEGAR_AQUI")) {
    mostrarMensaje("⚠️ El formulario aún no está conectado a Power Automate. Configure POWER_AUTOMATE_URL en config.js.", "error");
    boton.disabled = false;
    return;
  }

  try {
    // Se usa 'no-cors' + Content-Type text/plain porque el disparador HTTP de
    // Power Automate no responde a la verificación CORS (preflight) que los
    // navegadores exigen para peticiones JSON entre dominios distintos.
    // Con esta combinación la petición se envía como "solicitud simple" y el
    // navegador no bloquea el envío, aunque no podemos leer la respuesta del
    // flujo (ver README.md → sección "Limitación de CORS").
    await fetch(CONFIG.POWER_AUTOMATE_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });

    mostrarMensaje("✅ Reporte enviado correctamente. Gracias por su reporte.", "exito");
    document.getElementById("formPoda").reset();
    document.getElementById("previewFotos").innerHTML = "";
    document.getElementById("otroDetalleWrap").hidden = true;
    document.getElementById("ubicacionEstado").textContent = "";
    document.querySelectorAll(".situacion-card").forEach((c) => c.classList.remove("is-selected"));
    fotosProcesadas = [];
    ubicacionGPS = null;
  } catch (err) {
    console.error("Error al enviar el reporte:", err);
    mostrarMensaje("❌ No se pudo enviar el reporte. Verifique su conexión a internet e intente nuevamente.", "error");
  } finally {
    boton.disabled = false;
  }
}

function mostrarMensaje(texto, tipo) {
  const el = document.getElementById("mensajeEstado");
  el.hidden = false;
  el.textContent = texto;
  el.className = `mensaje-estado mensaje-estado--${tipo}`;
  if (tipo !== "cargando") el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
