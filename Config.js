// Variables de entorno consolidadas
const CONFIG = {
  TELEGRAM_BOT_TOKEN: PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN'),
  GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
  SHEET_ID: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
  MY_CHAT_ID: PropertiesService.getScriptProperties().getProperty('MY_CHAT_ID'),
  TELEGRAM_API_URL: "https://api.telegram.org/bot" + PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN'),
  APP_URL: PropertiesService.getScriptProperties().getProperty('APP_URL'),
  ERROR_SHEET_NAME: 'Bot Errors',
  EXPENSES_SHEET_NAME: 'Registros',
  CONFIG_SHEET_NAME: 'Categorías y subcategorías',

  // Función para cargar categorías y cuentas dinámicamente
  loadConfigData: function() {
    const sheet = SpreadsheetApp.openById(this.SHEET_ID).getSheetByName(this.CONFIG_SHEET_NAME);
    if (!sheet) {
      throw new Error(`Hoja "${this.CONFIG_SHEET_NAME}" no encontrada`);
    }

    const data = sheet.getDataRange().getValues();
    const accounts = [];
    const categories = {};  // Diccionario para categorías y subcategorías

    // Leer columnas (ignorar la primera fila que es el encabezado)
    for (let i = 1; i < data.length; i++) {
      const type = data[i][0]; // Columna A: Tipo
      const category = data[i][1]; // Columna B: Categorías
      const subcategory = data[i][2]; // Columna C: Subcategorías

      // Si la categoría existe, añadir la subcategoría a la lista de subcategorías
      if (category && subcategory && type === "Gastos") {
        if (!categories[category]) {
          categories[category] = [];  // Inicializamos el array si la categoría no existe
        }
        categories[category].push(subcategory);  // Agregamos la subcategoría a la lista correspondiente
      }

      if (data[i][3]) accounts.push(data[i][3]);   // Columna D: Cuentas
    }
    Logger.log(categories);
    Logger.log(accounts);
    return { categories, accounts };
  }
};

// Cargar las categorías y cuentas desde la configuración
const configData = CONFIG.loadConfigData();
const categories = configData.categories;
const accounts = configData.accounts;