// ==========================================================================
// CONFIGURACIÓN DEL FORMULARIO DE REPORTE DE PODA
// Edita solo este archivo para ajustar el formulario a tu empresa.
// No es necesario tocar index.html ni script.js.
// ==========================================================================
const CONFIG = {
  // URL del disparador HTTP del flujo de Power Automate
  // ("Cuando se recibe una solicitud HTTP"). Se obtiene DESPUÉS de crear
  // y guardar el flujo. Ver README.md → sección "3. Power Automate".
  POWER_AUTOMATE_URL: "PEGAR_AQUI_LA_URL_DEL_FLUJO_DE_POWER_AUTOMATE",

  // Nombre visible en el encabezado del formulario.
  NOMBRE_EMPRESA: "Empresa de Distribución Eléctrica",

  // Lista fija de municipalidades (opcional).
  // Si se deja vacía [], el campo "Municipalidad" será de texto libre.
  // Si se llena, el campo se muestra como lista desplegable.
  // Ejemplo: ["Municipalidad de San Isidro", "Municipalidad de Miraflores"]
  MUNICIPALIDADES: [],

  // Límites para las fotos adjuntas. Las fotos se comprimen automáticamente
  // en el navegador antes de enviarse, para no saturar el flujo de Power
  // Automate ni la conexión de datos móvil de quien reporta.
  FOTOS: {
    maxCantidad: 5,
    maxAnchoPx: 1600,
    calidadJPEG: 0.72,
    minCantidadRequerida: 1,
  },
};
