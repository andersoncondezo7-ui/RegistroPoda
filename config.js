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
  NOMBRE_EMPRESA: "Luz del Sur",

  // Distritos dentro de la zona de concesión de Luz del Sur (Lima
  // Metropolitana + provincias de Huarochirí y Cañete). Tomados de
  // Archivo/Distritos.xlsx (lista oficial de la empresa, 2026-09-17).
  // Si falta o sobra alguno, este array es lo único que hay que editar.
  DISTRITOS: [
    "Asia",
    "Ate-Vitarte",
    "Barranco",
    "Calango",
    "Callahuanca",
    "Carampoma",
    "Cerro Azul",
    "Chaclacayo",
    "Chilca",
    "Chorrillos",
    "Cieneguilla",
    "El Agustino",
    "Huachupampa",
    "Huanza",
    "Imperial",
    "Jesús María",
    "La Molina",
    "La Victoria",
    "Laraos",
    "Lima Cercado",
    "Lince",
    "Lunahuaná",
    "Lurigancho-Chosica",
    "Lurín",
    "Mala",
    "Matucana",
    "Miraflores",
    "Nuevo Imperial",
    "Pacarán",
    "Pachacámac",
    "Pucusana",
    "Punta Hermosa",
    "Punta Negra",
    "Quilmaná",
    "Ricardo Palma",
    "San Antonio",
    "San Antonio de Chaclla",
    "San Bartolo",
    "San Bartolomé",
    "San Borja",
    "San Isidro",
    "San Juan de Iris",
    "San Juan de Miraflores",
    "San Luis",
    "San Luis de Cañete",
    "San Mateo",
    "San Mateo de Otao",
    "San Pedro de Casta",
    "San Vicente de Cañete",
    "Santa Anita",
    "Santa Cruz de Cocachacra",
    "Santa Cruz de Flores",
    "Santa Eulalia",
    "Santa María", // ⚠️ el origen la lista así, a confirmar si es "Santa María del Mar"
    "Santiago de Surco", // el origen también trae "Surco" como código aparte (42); se tomó como duplicado y no se agregó
    "Santiago de Tuna",
    "Surquillo",
    "Villa El Salvador",
    "Villa María del Triunfo",
    "Zúñiga",
  ],

  // Límites para las fotos adjuntas. Las fotos se comprimen automáticamente
  // en el navegador antes de enviarse, para no saturar el flujo de Power
  // Automate ni la conexión de datos móvil de quien reporta.
  FOTOS: {
    maxCantidad: 5,
    maxAnchoPx: 1600,
    calidadJPEG: 0.72,
    minCantidadRequerida: 1,
  },

  // Notificación por WhatsApp: al guardar el reporte, el navegador abre
  // WhatsApp con un mensaje-resumen ya escrito (enlace "wa.me"), para que
  // quien llena el formulario solo tenga que presionar Enviar dentro de
  // WhatsApp. No requiere cuenta de WhatsApp Business API ni backend: el
  // mensaje queda registrado en el WhatsApp de quien lo envía, como
  // comprobante de que el reporte se hizo.
  WHATSAPP: {
    numeroDestino: "51963799933", // sin "+" ni espacios
  },
};
