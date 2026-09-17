/**
 * Office Script para Excel Online.
 *
 * Cómo instalarlo:
 * 1. Abre el archivo RegistroPoda.xlsx en Excel Online (dentro de SharePoint).
 * 2. Pestaña "Automatizar" → "Nuevo script".
 * 3. Borra el contenido de ejemplo y pega TODO este archivo.
 * 4. Guárdalo con el nombre "AgregarRegistroPoda".
 * 5. En Power Automate, usa la acción "Excel Online (Business) → Ejecutar
 *    script" (Run script), elige este libro y este script: Power Automate
 *    genera automáticamente un parámetro de entrada por cada argumento de
 *    la función `main` (fecha, distrito, direccion, etc.) — se rellenan con
 *    los campos que vienen del "Analizar JSON" del disparador.
 *
 * Qué hace:
 * - Si la hoja "Registros" o la tabla "TablaPoda" no existen, las crea con
 *   los encabezados correctos (para no depender de que alguien las arme a
 *   mano primero).
 * - Agrega una fila nueva al final de la tabla con el registro recibido.
 * - Devuelve el número de fila insertada (útil para trazabilidad/logs).
 */
function main(
  workbook: ExcelScript.Workbook,
  fecha: string,
  distrito: string,
  direccion: string,
  latitud: string,
  longitud: string,
  situacion: string,
  nombreContacto: string,
  telefono: string,
  enlacesFotos: string,
  carpetaRegistro: string
): number {
  const NOMBRE_HOJA = "Registros";
  const NOMBRE_TABLA = "TablaPoda";
  const ENCABEZADOS = [
    "Fecha",
    "Distrito",
    "Direccion",
    "Latitud",
    "Longitud",
    "Situacion",
    "NombreContacto",
    "Telefono",
    "EnlacesFotos",
    "CarpetaRegistro",
  ];

  let hoja = workbook.getWorksheet(NOMBRE_HOJA);
  if (!hoja) {
    hoja = workbook.addWorksheet(NOMBRE_HOJA);
  }

  let tabla = hoja.getTables().find((t) => t.getName() === NOMBRE_TABLA);
  if (!tabla) {
    const rangoEncabezados = hoja.getRangeByIndexes(0, 0, 1, ENCABEZADOS.length);
    rangoEncabezados.setValues([ENCABEZADOS]);
    tabla = hoja.addTable(rangoEncabezados, true);
    tabla.setName(NOMBRE_TABLA);
  }

  tabla.addRow(-1, [
    fecha,
    distrito,
    direccion,
    latitud,
    longitud,
    situacion,
    nombreContacto,
    telefono,
    enlacesFotos,
    carpetaRegistro,
  ]);

  const filas = tabla.getRangeBetweenHeaderAndTotal().getRowCount();
  return filas;
}
