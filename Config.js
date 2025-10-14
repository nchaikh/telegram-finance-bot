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
  CONFIG_SHEET_NAME: 'Config Bot',

  // Función para cargar categorías y cuentas dinámicamente
  loadConfigData: function() {
    const sheet = SpreadsheetApp.openById(this.SHEET_ID).getSheetByName(this.CONFIG_SHEET_NAME);
    if (!sheet) {
      throw new Error(`Hoja "${this.CONFIG_SHEET_NAME}" no encontrada`);
    }

    const data = sheet.getDataRange().getValues();
    const accounts = [];
    const accounts_associations = {};
    const expense_categories = {};
    const income_categories = {};
    const investment_categories = {};

    // Leer columnas (ignorar la primera fila que es el encabezado)
    for (let i = 1; i < data.length; i++) {
      const type = data[i][0]; // Columna A: Tipo
      const category = data[i][1]; // Columna B: Categorías
      const subcategory = data[i][2]; // Columna C: Subcategorías
      const account = data[i][3]; // Columna D: Cuentas
      const accountAssociated = data[i][4]; // Columna E: Cuenta Asociada

      // Si la categoría existe, añadir la subcategoría a la lista de subcategorías
      if (category && subcategory && type === "Gastos") {
        if (!expense_categories[category]) {
          expense_categories[category] = [];  // Inicializamos el array si la categoría no existe
        }
        expense_categories[category].push(subcategory);  // Agregamos la subcategoría a la lista correspondiente
      }
      if (type === "Ingresos" && category && subcategory) {
        if (!income_categories[category]) {
          income_categories[category] = [];  // Inicializamos el array si la categoría no existe
        }
        income_categories[category].push(subcategory);  // Agregamos la subcategoría a la lista correspondiente
      }
      if (type === "Inversiones" && category && subcategory) {
        if (!investment_categories[category]) {
          investment_categories[category] = [];  // Inicializamos el array si la categoría no existe
        }
        investment_categories[category].push(subcategory);  // Agregamos la subcategoría a la lista correspondiente
      }

      if (account) {
        accounts.push(account);   // Columna D: Cuentas
        if (accountAssociated) {
          accounts_associations[account] = accountAssociated; // Asociación cuenta -> cuenta padre
        }
      }
    }
    return { income_categories, expense_categories, investment_categories, accounts, accounts_associations };
  }
};

// Cargar las categorías y cuentas desde la configuración
const configData = CONFIG.loadConfigData();
const income_categories = configData.income_categories;
const expense_categories = configData.expense_categories;
const investment_categories = configData.investment_categories;
const accounts = configData.accounts;
const accounts_associations = configData.accounts_associations;