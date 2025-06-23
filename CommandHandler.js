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
        // Mostrar la lista de categorías disponibles como comandos clickeables
        // Removemos tildes y espacios para crear comandos válidos
        const categoriesList = Object.keys(categories).map(c => {
          const normalizedCategory = removeDiacritics(c).replace(/\s+/g, '_');
          return `• /ls_${normalizedCategory}`;
        }).join('\n');
        const message = `📋 <b>Categorías disponibles:</b>\n\n${categoriesList}\n\n<i>Seleccione una categoría tocando en la opción deseada</i>`;
        sendTelegramMessage(chatId, message);
        return true;
      }
      listSubcategories(chatId, categoryParam);
      return true;
      
    // Manejar el comando con formato de guion bajo
    case (command.match(/^\/ls_/) || {}).input:
      const cmdCategory = command.replace('/ls_', '').replace(/_/g, ' ');
      // Buscar la categoría correspondiente ignorando tildes
      const matchedCategory = findCategoryIgnoringAccents(cmdCategory);
      if (matchedCategory) {
        listSubcategories(chatId, matchedCategory);
      } else {
        sendTelegramMessage(chatId, `❌ No se encontró la categoría "${cmdCategory}"`);
      }
      return true;

    case '/listacuentas':
      listAccounts(chatId);
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
    
    // Limpiar las variables globales
    Object.keys(categories).forEach(key => delete categories[key]);
    accounts.length = 0;
    
    // Agregar nuevos elementos
    Object.keys(configData.categories).forEach(category => {
      categories[category] = [...configData.categories[category]];
    });
    
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
    // Intentar encontrar la categoría ignorando tildes
    const matchedCategory = findCategoryIgnoringAccents(category);
    if (matchedCategory) {
      const message = `📋 <b>Subcategorías de ${matchedCategory}:</b>\n\n` + 
                      categories[matchedCategory].map(sc => `• ${sc}`).join('\n');
      sendTelegramMessage(chatId, message);
    } else {
      // Categoría no encontrada
      const availableCategories = Object.keys(categories).join('\n• ');
      sendTelegramMessage(chatId, `❌ Categoría "${category}" no encontrada.\n\nCategorías disponibles:\n• ${availableCategories}`);
    }
  }
}

/**
 * Elimina tildes y signos diacríticos de una cadena
 * @param {string} str - Cadena a normalizar
 * @return {string} - Cadena sin tildes
 */
function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Encuentra una categoría ignorando tildes
 * @param {string} searchCategory - Categoría a buscar
 * @return {string|null} - Categoría encontrada o null
 */
function findCategoryIgnoringAccents(searchCategory) {
  const normalizedSearch = removeDiacritics(searchCategory.toLowerCase());
  
  for (const category of Object.keys(categories)) {
    if (removeDiacritics(category.toLowerCase()) === normalizedSearch) {
      return category; // Devuelve la categoría original con tildes
    }
  }
  
  return null;
}

/**
 * Lista las cuentas
 */
function listAccounts(chatId) {
  const message = `💳 Cuentas disponibles:\n\n` + accounts.map(a => `• ${a}`).join('\n');
  sendTelegramMessage(chatId, message);
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
/ayuda - Ver esta ayuda`;

  sendTelegramMessage(chatId, message);
}