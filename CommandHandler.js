/**
 * Maneja los comandos de Telegram
 * @param {Object} message - Mensaje de Telegram
 * @param {Number} chatId - ID del chat
 * @return {Boolean} - True si se procesó un comando
 */
function handleCommands(message, chatId) {
  if (!message.text || !message.text.startsWith('/')) {
    return false;
  }
  
  const parts = message.text.split(' ');
  const command = parts[0].toLowerCase();
  
  switch (command) {
    case '/reload':
      reloadConfig(chatId);
      return true;
    
    case '/listacategorias':
      listCategories(chatId);
      return true;
    
    case '/listasubcategorias':
      const categoryParam = parts.slice(1).join(' ');
      if (categoryParam.trim() === '') {
        sendTelegramMessage(chatId, "Enviar con nombre de categoría (Ej: /listasubcategorias Vivienda)");
        return true;
      }
      listSubcategories(chatId, categoryParam);
      return true;

    case '/listacuentas':
      listAccounts(chatId);
      return true;
      
    case '/agregarcategoria':
      if (parts.length < 2) {
        sendTelegramMessage(chatId, "❌ Formato: /agregarcategoria [nombre]");
        return true;
      }
      addCategory(chatId, parts.slice(1).join(' '));
      return true;
      
    case '/agregarcuenta':
      if (parts.length < 2) {
        sendTelegramMessage(chatId, "❌ Formato: /agregarcuenta [nombre]");
        return true;
      }
      addAccount(chatId, parts.slice(1).join(' '));
      return true;
      
    case '/borrarcategoria':
      if (parts.length < 2) {
        sendTelegramMessage(chatId, "❌ Formato: /borrarcategoria [nombre]");
        return true;
      }
      deleteCategory(chatId, parts.slice(1).join(' '));
      return true;
      
    case '/borrarcuenta':
      if (parts.length < 2) {
        sendTelegramMessage(chatId, "❌ Formato: /borrarcuenta [nombre]");
        return true;
      }
      deleteAccount(chatId, parts.slice(1).join(' '));
      return true;
      
    case '/ayuda':
      sendHelpMessage(chatId);
      return true;
      
    default:
      return false;
  }
}

/**
 * Recarga la configuración
 */
function reloadConfig(chatId) {
  try {
    const configData = CONFIG.loadConfigData();
    // Actualizar variables globales
    categories.length = 0;
    accounts.length = 0;
    
    // Agregar nuevos elementos
    configData.categories.forEach(c => categories.push(c));
    configData.accounts.forEach(a => accounts.push(a));
    
    sendTelegramMessage(chatId, "✅ Configuración recargada exitosamente");
  } catch (error) {
    sendTelegramMessage(chatId, "❌ Error al recargar: " + error.message);
    logError('reloadConfig', error);
  }
}

/**
 * Lista las categorías
 */
function listCategories(chatId) {
  const message = `📋 <b>Categorías disponibles:</b>\n\n` + Object.keys(categories).map(c => `• ${c}`).join('\n');
  sendTelegramMessage(chatId, message);
}

/**
 * Lista las subcategorías de una categoría específica
 * @param {string} chatId - ID del chat
 * @param {string} category - Categoría para mostrar subcategorías
 */
function listSubcategories(chatId, category) {
  if (categories[category]) {
    // Mostrar subcategorías de la categoría especificada
    const message = `📋 <b>Subcategorías de ${category}:</b>\n\n` + 
                    categories[category].map(sc => `• ${sc}`).join('\n');
    sendTelegramMessage(chatId, message);
  } else {
    // Categoría no encontrada
    const availableCategories = Object.keys(categories).join('\n• ');
    sendTelegramMessage(chatId, `❌ Categoría "${category}" no encontrada.\n\nCategorías disponibles:\n• ${availableCategories}`);
  }
}

/**
 * Lista las cuentas
 */
function listAccounts(chatId) {
  const message = `💳 Cuentas disponibles:\n\n` + accounts.map(a => `• ${a}`).join('\n');
  sendTelegramMessage(chatId, message);
}

/**
 * Agrega una categoría
 */
function addCategory(chatId, category) {
  try {
    if (categories.includes(category)) {
      sendTelegramMessage(chatId, `❌ La categoría "${category}" ya existe`);
      return;
    }
    
    // Obtener la hoja de configuración
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.CONFIG_SHEET_NAME);
    
    // Encontrar la primera celda vacía en la columna A (ignorando la primera fila de encabezados)
    const data = sheet.getDataRange().getValues();
    let emptyRow = 1;  // Comenzar después del encabezado
    for (let i = 1; i < data.length; i++) {
      if (!data[i][0]) {
        emptyRow = i + 1;
        break;
      }
      emptyRow = i + 2;  // Si llegamos al final, usamos la siguiente fila
    }
    
    // Agregar la nueva categoría
    sheet.getRange(`A${emptyRow}`).setValue(category);
    
    // Actualizar la lista en memoria
    categories.push(category);
    
    sendTelegramMessage(chatId, `✅ Categoría "${category}" agregada correctamente`);
  } catch (error) {
    sendTelegramMessage(chatId, "❌ Error al agregar categoría: " + error.message);
    logError('addCategory', error);
  }
}

/**
 * Agrega una cuenta
 */
function addAccount(chatId, account) {
  try {
    if (accounts.includes(account)) {
      sendTelegramMessage(chatId, `❌ La cuenta "${account}" ya existe`);
      return;
    }
    
    // Obtener la hoja de configuración
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.CONFIG_SHEET_NAME);
    
    // Encontrar la primera celda vacía en la columna B (ignorando la primera fila de encabezados)
    const data = sheet.getDataRange().getValues();
    let emptyRow = 1;  // Comenzar después del encabezado
    for (let i = 1; i < data.length; i++) {
      if (!data[i][1]) {
        emptyRow = i + 1;
        break;
      }
      emptyRow = i + 2;  // Si llegamos al final, usamos la siguiente fila
    }
    
    // Agregar la nueva cuenta
    sheet.getRange(`B${emptyRow}`).setValue(account);
    
    // Actualizar la lista en memoria
    accounts.push(account);
    
    sendTelegramMessage(chatId, `✅ Cuenta "${account}" agregada correctamente`);
  } catch (error) {
    sendTelegramMessage(chatId, "❌ Error al agregar cuenta: " + error.message);
    logError('addAccount', error);
  }
}

/**
 * Borra una categoría
 */
function deleteCategory(chatId, category) {
  try {
    if (!categories.includes(category)) {
      sendTelegramMessage(chatId, `❌ La categoría "${category}" no existe`);
      return;
    }
    
    // Obtener la hoja de configuración
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.CONFIG_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // Encontrar la fila que contiene la categoría
    let rowToDelete = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === category) {
        rowToDelete = i + 1;  // +1 porque getValues() es 0-indexado pero getRange() es 1-indexado
        break;
      }
    }
    
    if (rowToDelete === -1) {
      sendTelegramMessage(chatId, `❌ Error: No se encontró la categoría "${category}" en la hoja`);
      return;
    }
    
    // Limpiar la celda (no borrar la fila para mantener la estructura)
    sheet.getRange(`A${rowToDelete}`).setValue("");
    
    // Actualizar la lista en memoria
    const index = categories.indexOf(category);
    categories.splice(index, 1);
    
    sendTelegramMessage(chatId, `✅ Categoría "${category}" eliminada correctamente`);
  } catch (error) {
    sendTelegramMessage(chatId, "❌ Error al eliminar categoría: " + error.message);
    logError('deleteCategory', error);
  }
}

/**
 * Borra una cuenta
 */
function deleteAccount(chatId, account) {
  try {
    if (!accounts.includes(account)) {
      sendTelegramMessage(chatId, `❌ La cuenta "${account}" no existe`);
      return;
    }
    
    // Obtener la hoja de configuración
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.CONFIG_SHEET_NAME);
    const data = sheet.getDataRange().getValues();
    
    // Encontrar la fila que contiene la cuenta
    let rowToDelete = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === account) {
        rowToDelete = i + 1;  // +1 porque getValues() es 0-indexado pero getRange() es 1-indexado
        break;
      }
    }
    
    if (rowToDelete === -1) {
      sendTelegramMessage(chatId, `❌ Error: No se encontró la cuenta "${account}" en la hoja`);
      return;
    }
    
    // Limpiar la celda (no borrar la fila para mantener la estructura)
    sheet.getRange(`B${rowToDelete}`).setValue("");
    
    // Actualizar la lista en memoria
    const index = accounts.indexOf(account);
    accounts.splice(index, 1);
    
    sendTelegramMessage(chatId, `✅ Cuenta "${account}" eliminada correctamente`);
  } catch (error) {
    sendTelegramMessage(chatId, "❌ Error al eliminar cuenta: " + error.message);
    logError('deleteAccount', error);
  }
}

/**
 * Envía un mensaje de ayuda
 */
function sendHelpMessage(chatId) {
  const message = `🤖 Comandos disponibles:

/reload - Recargar configuración
/listacategorias - Ver categorías disponibles
/listasubcategorias [categoría] - Ver subcategorías de una categoría
/listacuentas - Ver cuentas disponibles
/agregarcategoria [nombre] - Agregar categoría
/agregarcuenta [nombre] - Agregar cuenta
/borrarcategoria [nombre] - Borrar categoría
/borrarcuenta [nombre] - Borrar cuenta
/ayuda - Ver esta ayuda`;

  sendTelegramMessage(chatId, message);
}