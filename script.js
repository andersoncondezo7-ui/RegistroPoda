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
  configurarDistrito();
  configurarUbicacion();
  configurarFotos();
  configurarEnvio();
});

function aplicarConfiguracion() {
  document.getElementById("nombreEmpresa").textContent = CONFIG.NOMBRE_EMPRESA || "Reporte de Poda";
  document.title = `Reporte de Poda — ${CONFIG.NOMBRE_EMPRESA || ""}`;
  document.getElementById("maxFotosTexto").textContent = CONFIG.FOTOS?.maxCantidad ?? 5;
}

function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function configurarDistrito() {
  const input = document.getElementById("buscadorDistrito");
  const lista = document.getElementById("listaDistritoResultados");
  const hidden = document.getElementById("distrito");
  const bloqueSeleccionado = document.getElementById("distritoSeleccionado");
  const valorSeleccionado = document.getElementById("distritoSeleccionadoValor");
  const btnCambiar = document.getElementById("btnCambiarDistrito");
  const distritos = CONFIG.DISTRITOS || [];

  let resultados = [];
  let indiceActivo = -1;

  function cerrarLista() {
    lista.hidden = true;
    lista.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    indiceActivo = -1;
  }

  function resaltar(texto, consulta) {
    const idx = normalizarTexto(texto).indexOf(consulta);
    if (idx === -1 || !consulta) return texto;
    return `${texto.slice(0, idx)}<mark>${texto.slice(idx, idx + consulta.length)}</mark>${texto.slice(idx + consulta.length)}`;
  }

  function mostrarResultados() {
    const consulta = normalizarTexto(input.value);
    resultados = consulta
      ? distritos.filter((d) => normalizarTexto(d).includes(consulta)).slice(0, 8)
      : distritos.slice(0, 8);

    lista.innerHTML = "";
    indiceActivo = -1;

    if (resultados.length === 0) {
      const vacio = document.createElement("li");
      vacio.className = "combobox__vacio";
      vacio.textContent = "No se encontraron distritos con ese nombre.";
      lista.appendChild(vacio);
    } else {
      resultados.forEach((nombre, i) => {
        const li = document.createElement("li");
        li.className = "combobox__opcion";
        li.role = "option";
        li.id = `distritoOpcion-${i}`;
        li.innerHTML = resaltar(nombre, consulta);
        li.addEventListener("mousedown", (e) => {
          e.preventDefault();
          seleccionarDistrito(nombre);
        });
        lista.appendChild(li);
      });
    }
    lista.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function marcarActiva() {
    lista.querySelectorAll(".combobox__opcion").forEach((el, i) => {
      el.classList.toggle("activa", i === indiceActivo);
    });
  }

  function seleccionarDistrito(nombre) {
    hidden.value = nombre;
    valorSeleccionado.textContent = nombre;
    bloqueSeleccionado.hidden = false;
    document.getElementById("comboboxDistrito").hidden = true;
    hidden.classList.remove("campo-invalido");
    cerrarLista();
  }

  input.addEventListener("input", mostrarResultados);
  input.addEventListener("focus", mostrarResultados);

  input.addEventListener("keydown", (e) => {
    if (lista.hidden) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      indiceActivo = Math.min(indiceActivo + 1, resultados.length - 1);
      marcarActiva();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      indiceActivo = Math.max(indiceActivo - 1, 0);
      marcarActiva();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (indiceActivo >= 0 && resultados[indiceActivo]) {
        seleccionarDistrito(resultados[indiceActivo]);
      }
    } else if (e.key === "Escape") {
      cerrarLista();
    }
  });

  input.addEventListener("blur", () => setTimeout(cerrarLista, 100));

  btnCambiar.addEventListener("click", () => {
    hidden.value = "";
    bloqueSeleccionado.hidden = true;
    document.getElementById("comboboxDistrito").hidden = false;
    input.value = "";
    input.focus();
  });
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

  marcar("buscadorDistrito", document.getElementById("distrito").value.trim() !== "");
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
    distrito: document.getElementById("distrito").value.trim(),
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
    document.getElementById("distritoSeleccionado").hidden = true;
    document.getElementById("comboboxDistrito").hidden = false;
    document.getElementById("buscadorDistrito").value = "";
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
