/**
 * Registra datos estructurados en la hoja de gastos
 * @param {Object} data - Datos estructurados del gasto
 * @param {number} timestamp - Marca de tiempo Unix
 */
function logToExpenseSheet(data, timestamp) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.EXPENSES_SHEET_NAME);
    if (!sheet) {
      throw new Error(`Hoja "${CONFIG.EXPENSES_SHEET_NAME}" no encontrada en la planilla`);
    }

    // Usar la fecha proporcionada por el usuario si está disponible, de lo contrario usar timestamp
    let formattedDate;
    if (data.date) {
      formattedDate = data.date; // Ya está en formato dd/MM/yyyy
    } else {
      // Formatear fecha en dd/mm/aaaa desde el timestamp
      const date = new Date(timestamp * 1000);
      formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
    }

    // Asegurar que el amount sea negativo
    const amount = Math.abs(data.amount) * -1;

    // Reemplazo de cuenta
    let account = data.account;
    if (account.toLowerCase().includes("visa")) {
      account = "ICBC Visa Gold";
    } else if (account.toLowerCase().includes("mastercard")) {
      account = "ICBC Mastercard";
    }

    // Insertar datos en la última fila
    const lastRow = sheet.getLastRow() + 1;
    sheet.getRange(lastRow, 1, 1, 10).setValues([
      [formattedDate, amount, account, data.category, data.subcategory, data.description, "", amount, "Gastos", "ARS"]
    ]);

    // Agregar fórmulas en las columnas K y L
    sheet.getRange(lastRow, 11).setFormulaR1C1("=AND(RC1 >= 'Estadísticas'!R1C2; RC1 <= 'Estadísticas'!R2C2)");
    sheet.getRange(lastRow, 12).setFormulaR1C1('=TEXT(RC1; "YYYY-MM")');

    // Ordenar la hoja por la fecha (columna 1) en orden descendente
    const range = sheet.getDataRange();
    range.sort({ column: 1, ascending: false });

  } catch (error) {
    logError('logToExpenseSheet', error);
    throw error;
  }
}

/**
 * Registra errores en la hoja de errores
 * @param {string} functionName - Nombre de la función donde ocurrió el error
 * @param {Error} error - Objeto de error
 * @param {Object} additionalInfo - Información adicional opcional
 */
function logError(functionName, error, additionalInfo = {}) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.ERROR_SHEET_NAME);
    
    // Si la hoja no existe, crearla
    if (!sheet) {
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      const newSheet = ss.insertSheet(CONFIG.ERROR_SHEET_NAME);
      newSheet.appendRow(['Timestamp', 'Function', 'Error Message', 'Stack Trace', 'Additional Info']);
    }
    
    // Registrar el error
    const errorSheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.ERROR_SHEET_NAME);
    errorSheet.appendRow([
      new Date(),
      functionName,
      error.message || String(error),
      error.stack || 'No stack trace',
      JSON.stringify(additionalInfo)
    ]);
  } catch (e) {
    // Si falla el registro en la hoja, intentar con Logger
    Logger.log(`ERROR en ${functionName}: ${error.message || String(error)}`);
    Logger.log(`Error al registrar el error: ${e.message || String(e)}`);
  }
}