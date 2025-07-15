/**
 * Configura el webhook de Telegram para recibir mensajes
 */
function setWebhook() {
  const url = `${CONFIG.TELEGRAM_API_URL}/setwebhook?url=${CONFIG.APP_URL}`;
  Logger.log(url);
  try {
    const response = UrlFetchApp.fetch(url).getContentText();
    Logger.log(response);
    return response;
  } catch (error) {
    logError('setWebhook', error);
    throw error;
  }
}

/**
 * Manejador del webhook para los mensajes de Telegram
 * @param {Object} e - Evento de Google Apps Script
 * @return {Object} Respuesta del servidor
 */
function doPost(e) {
  let webhookData;
  try {
    // Parsear los datos del webhook
    webhookData = JSON.parse(e.postData.contents);
    const chatId = webhookData.message?.chat?.id || webhookData.callback_query?.message?.chat?.id;
    
    // Manejar callback de confirmación
    if (webhookData.callback_query) {
      return handleCallbackQuery(webhookData.callback_query);
    }
    
    const message = webhookData.message;

    Logger.log(message);
    
    // Restrict to your chat ID
    if (chatId != CONFIG.MY_CHAT_ID) {
      sendTelegramMessage(chatId, "Chat ID Inválido: " + chatId);
      return;
    }

    // Verificar si es un comando
    if (message.text && handleCommands(message, chatId)) {
      Logger.log("Command detected.");
      return;
    }
    
    // Verificar si estamos en modo de edición
    if (processEditMessage(message, chatId)) {
      Logger.log("Edit mode message processed.");
      return;
    }
    
    let structuredData;
    
    // Manejar mensajes de texto
    if (message.text) {
      structuredData = processTextWithGemini(message.text);
    }
    // Manejar mensajes de voz
    else if (message.voice) {
      const fileId = message.voice.file_id;
      const audioBlob = getAudioBlob(fileId);
      structuredData = processAudioWithGemini(audioBlob, message.voice.mime_type);
    }
    
    // Verificar que structuredData existe antes de validar
    if (structuredData && validateData(structuredData)) {
      // Log para pruebas
      Logger.log("Generated data:" + JSON.stringify(structuredData));

      // Obtener los datos normalizados de la validación
      const normalizedData = normalizeGeminiResponse(structuredData);
      
      // Editar descripción para que siempre comience con mayúscula
      if (normalizedData && normalizedData.description) {
        normalizedData.description = normalizedData.description.charAt(0).toUpperCase() + normalizedData.description.slice(1);
      }
      
      // En lugar de guardar directamente, enviar mensaje de confirmación
      sendConfirmationMessage(chatId, normalizedData, message.date);
    } else {
      // Informar del error al usuario
      sendTelegramMessage(chatId, "❌ No pude procesar correctamente tu registro. Por favor intenta de nuevo con información más clara.");
    }
  } catch (error) {
    logError('doPost', error);
    try {
      // Intentar informar al usuario del error
      if (webhookData && (webhookData.message?.chat || webhookData.callback_query?.message?.chat)) {
        const chatId = webhookData.message?.chat?.id || webhookData.callback_query?.message?.chat?.id;
        sendTelegramMessage(chatId, "❌ Ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.");
      }
    } catch (e) {
      // Error al informar del error, solo registrarlo
      logError('doPost-errorNotification', e);
    }
  }
}

/**
 * Formatea un número como moneda con $ al inicio, puntos para miles y comas para decimales
 * @param {number} amount - Monto a formatear
 * @return {string} Monto formateado
 */
function formatCurrency(amount) {
  return '$' + amount.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Obtiene la fecha formateada del gasto, ya sea desde el campo date o desde el timestamp
 * @param {Object} data - Datos del gasto
 * @param {number} timestamp - Timestamp UNIX del mensaje
 * @return {string} Fecha formateada en dd/MM/yyyy
 */
function getFormattedDate(data, timestamp) {
  if (data.date) {
    return data.date;
  } else {
    const date = new Date(timestamp * 1000);
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
  }
}

/**
 * Formatea los datos del registro para mostrarlos en un mensaje
 * @param {Object} data - Datos del registro
 * @param {string} dateStr - Fecha formateada
 * @param {string} prefix - Prefijo para el mensaje (opcional)
 * @return {string} Mensaje formateado
 */
function formatExpenseForDisplay(data, dateStr, prefix = null) {
  // Determinar el prefijo según el tipo si no se proporciona
  if (!prefix) {
    const typeEmoji = data.type === 'gasto' ? '💸' : 
                     data.type === 'ingreso' ? '💰' : '🔄';
    const typeText = data.type === 'gasto' ? 'Gasto registrado' : 
                    data.type === 'ingreso' ? 'Ingreso registrado' : 'Transferencia registrada';
    prefix = `✅ <b>${typeText}</b> ${typeEmoji}`;
  }
  
  let message = `${prefix}\n🗓️ ${dateStr}\n💰 ${formatCurrency(data.amount)}`;
  
  // Agregar información específica según el tipo
  if (data.type === 'transferencia') {
    message += `\n📤 Origen: ${data.account}`;
    message += `\n📥 Destino: ${data.second_account}`;
  } else {
    // Para gastos e ingresos, mostrar la cuenta
    message += `\n💳 ${data.account}`;
    
    // Agregar información de cuotas si existe (solo para gastos)
    if (data.type === 'gasto' && data.installments && data.installments > 1) {
      const monthlyAmount = parseFloat(data.amount) / parseInt(data.installments);
      message += `\n🔢 ${data.installments} cuotas de ${formatCurrency(monthlyAmount)}`;
    }
    
    message += `\n📝 ${data.description}\n🏷️ ${data.subcategory}`;
  }
  
  return message;
}

/**
 * Normaliza la respuesta de Gemini para extraer los datos correctos
 * @param {Object} response - Respuesta de Gemini que puede tener diferentes formatos
 * @return {Object} Datos normalizados
 */
function normalizeGeminiResponse(response) {
  // Si la respuesta es null o undefined, devolver null
  if (!response) {
    return null;
  }
  
  // Si la respuesta tiene un array 'data' con elementos
  if (response.data && Array.isArray(response.data) && response.data.length > 0) {
    // Tomar el primer elemento del array
    return response.data[0];
  }
  
  // Si la respuesta es un array directamente
  if (Array.isArray(response) && response.length > 0) {
    return response[0];
  }
  
  // Si la respuesta es un objeto directo con los campos esperados
  if (response.type || response.amount || response.description) {
    return response;
  }
  
  // Si ningún formato es reconocido, devolver null
  return null;
}

/**
 * Maneja las respuestas de los botones de confirmación
 * @param {Object} callbackQuery - Objeto callback_query de Telegram
 */
function handleCallbackQuery(callbackQuery) {
  const callbackData = JSON.parse(callbackQuery.data);
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  
  // Recuperar los datos almacenados
  const cacheKey = `expense_${callbackData.id}`;
  const cache = CacheService.getUserCache();
  const savedDataJson = cache.get(cacheKey);
  
  if (!savedDataJson) {
    sendTelegramMessage(chatId, "❌ Lo siento, los datos del registro ya no están disponibles. Por favor ingresa el registro nuevamente.");
    return;
  }
  
  const savedData = JSON.parse(savedDataJson);
  
  // Responder al callback
  answerCallbackQuery(callbackQuery.id);
  
  if (callbackData.action === 'confirm') {
    // Guardar en la hoja de cálculo
    logToExpenseSheet(savedData.data, savedData.timestamp);
    
    // Obtener fecha formateada y actualizar el mensaje
    const displayDate = getFormattedDate(savedData.data, savedData.timestamp);
    
    // Actualizar el mensaje original
    editMessageText(
      chatId, 
      messageId, 
      formatExpenseForDisplay(savedData.data, displayDate)
    );
  } else if (callbackData.action === 'cancel') {
    // Actualizar el mensaje original
    editMessageText(
      chatId, 
      messageId, 
      "❌ Registro cancelado."
    );
  } else if (callbackData.action === 'edit') {
    // Iniciar flujo de edición
    startEditFlow(chatId, messageId, savedData, callbackData.id);
  }
  
  // Solo eliminar caché si confirmó o canceló (no para edición)
  if (callbackData.action !== 'edit') {
    cache.remove(cacheKey);
  }
}

/**
 * Envía mensaje de confirmación con botones
 * @param {string} chatId - ID del chat
 * @param {Object} data - Datos estructurados del gasto
 * @param {number} timestamp - Marca de tiempo
 */
function sendConfirmationMessage(chatId, data, timestamp) {
  // Generar ID único para este gasto
  const expenseId = Utilities.getUuid();
  
  // Almacenar los datos temporalmente
  const cacheData = {
    data: data,
    timestamp: timestamp
  };
  
  const cache = CacheService.getUserCache();
  cache.put(`expense_${expenseId}`, JSON.stringify(cacheData), 21600); // 6 horas de caché
  
  // Obtener fecha formateada para mostrar
  const displayDate = getFormattedDate(data, timestamp);
  
  // Crear mensaje con prefijo de confirmación
  const typeText = data.type === 'gasto' ? 'gasto' : 
                  data.type === 'ingreso' ? 'ingreso' : 'transferencia';
  const confirmPrefix = `⚠️ <b>Confirmar ${typeText}:</b>`;
  
  // Crear mensaje
  const message = formatExpenseForDisplay(data, displayDate, confirmPrefix);
  
  // Botones de confirmar, editar y cancelar
  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: "✅ Confirmar",
          callback_data: JSON.stringify({ action: 'confirm', id: expenseId })
        },
        {
          text: "✏️ Editar",
          callback_data: JSON.stringify({ action: 'edit', id: expenseId })
        },
        {
          text: "❌ Cancelar",
          callback_data: JSON.stringify({ action: 'cancel', id: expenseId })
        }
      ]
    ]
  };
  
  // Enviar mensaje con botones
  sendTelegramMessageWithButtons(chatId, message, inlineKeyboard);
}

/**
 * Inicia el flujo de edición de un gasto
 * @param {string} chatId - ID del chat
 * @param {number} messageId - ID del mensaje original
 * @param {Object} savedData - Datos del gasto guardados
 * @param {string} expenseId - ID único del gasto
 */
function startEditFlow(chatId, messageId, savedData, expenseId) {
  // Obtener fecha formateada
  const displayDate = getFormattedDate(savedData.data, savedData.timestamp);
  
  // Crear prefijo de edición
  const typeText = savedData.data.type === 'gasto' ? 'gasto' : 
                  savedData.data.type === 'ingreso' ? 'ingreso' : 'transferencia';
  const editPrefix = `✏️ <b>Editando ${typeText}:</b>`;
  
  // Actualizar el mensaje original para indicar que está en modo edición
  editMessageText(
    chatId,
    messageId,
    formatExpenseForDisplay(savedData.data, displayDate, editPrefix) + 
    "\n\n<i>Por favor, envía un mensaje indicando qué quieres modificar.</i>"
  );
  
  // Guardar información de que estamos en modo edición para este chat
  const cache = CacheService.getUserCache();
  cache.put(`edit_mode_${chatId}`, JSON.stringify({
    expenseId: expenseId,
    originalData: savedData
  }), 3600); // 1 hora para completar la edición
}

/**
 * Procesa un mensaje de edición
 * @param {Object} message - Mensaje de Telegram
 * @param {string} chatId - ID del chat
 * @return {boolean} - True si se procesó como edición, false en caso contrario
 */
function processEditMessage(message, chatId) {
  const cache = CacheService.getUserCache();
  const editModeJson = cache.get(`edit_mode_${chatId}`);
  
  if (!editModeJson) {
    return false; // No estamos en modo edición
  }
  
  const editMode = JSON.parse(editModeJson);
  const originalData = editMode.originalData;
  
  try {
    // Obtener la fecha actual para el prompt de Gemini
    const today = new Date();
    const currentDateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "dd/MM/yyyy");
    
    // Procesar la edición con Gemini
    let updatedData;
    if (message.text) {
      // Definir un prompt específico para edición
      const editPrompt = `
### CONTEXTO DE EDICIÓN:
Hoy es ${currentDateString}. Tienes que actualizar un registro financiero existente según las instrucciones del usuario.

### DATOS ACTUALES DEL REGISTRO:
- **Tipo**: ${originalData.data.type || 'gasto'}
- **Monto**: ${originalData.data.amount}
- **Descripción**: ${originalData.data.description}
- **Categoría**: ${originalData.data.category}
- **Subcategoría**: ${originalData.data.subcategory}
- **Cuenta**: ${originalData.data.account}
- **Fecha**: ${originalData.data.date || 'No especificada'}
- **Cuotas**: ${originalData.data.installments || 'No especificado'}

### INSTRUCCIÓN DEL USUARIO:
"${message.text}"

### TAREA:
Actualiza ÚNICAMENTE los campos que el usuario solicita modificar. Mantén los demás campos sin cambios.

### REGLAS DE ACTUALIZACIÓN:
1. **Monto**: Si menciona un nuevo monto, actualízalo (solo números positivos)
2. **Descripción**: Si menciona nueva descripción, actualízala
3. **Categoría/Subcategoría**: Si menciona nueva categoría, debe existir en las listas
4. **Cuenta**: Si menciona nueva cuenta, debe existir en la lista
5. **Fecha**: Si menciona nueva fecha, convertirla a formato dd/MM/yyyy
6. **Cuotas**: Si menciona número de cuotas, actualízalo (solo para gastos)
7. **Campos no mencionados**: MANTENER valores originales

### CUENTAS DISPONIBLES:
${accounts.join(', ')}

### CATEGORÍAS DE GASTOS:
${Object.entries(expense_categories).map(([cat, subcats]) => 
  `**${cat}:**\n${subcats.map(subcat => `  - ${subcat.split(' > ')[1]}`).join('\n')}`
).join('\n\n')}

### CATEGORÍAS DE INGRESOS:
${Object.entries(income_categories).map(([cat, subcats]) => 
  `**${cat}:**\n${subcats.map(subcat => `  - ${subcat.split(' > ')[1]}`).join('\n')}`
).join('\n\n')}

### FORMATO DE SUBCATEGORÍA:
- La subcategoría debe devolverse en formato "Categoría > Subcategoría"
- Ejemplo: Si eliges "Nafta" de la categoría "Auto", devuelve "Auto > Nafta"

### VALIDACIONES:
- Subcategoría debe estar en formato "Categoría > Subcategoría"
- Cuenta debe existir en la lista proporcionada
- Monto debe ser número positivo
- Fecha debe estar en formato dd/MM/yyyy
- Cuotas debe ser número entero positivo (solo para gastos)

### RESPUESTA REQUERIDA:
Devuelve ÚNICAMENTE un JSON con TODOS los campos (modificados y sin modificar)`;
      
      updatedData = processTextWithGemini(message.text, editPrompt);
    } else if (message.voice) {
      const fileId = message.voice.file_id;
      const audioBlob = getAudioBlob(fileId);
      
      // Definir un prompt específico para edición con audio
      const editPrompt = `
### TAREA DE EDICIÓN POR AUDIO:
1. Transcribe el audio con máxima precisión
2. Actualiza el registro financiero según las instrucciones del usuario

### CONTEXTO:
Hoy es ${currentDateString}. Tienes que actualizar un registro financiero existente.

### DATOS ACTUALES DEL REGISTRO:
- **Tipo**: ${originalData.data.type || 'gasto'}
- **Monto**: ${originalData.data.amount}
- **Descripción**: ${originalData.data.description}
- **Categoría**: ${originalData.data.category}
- **Subcategoría**: ${originalData.data.subcategory}
- **Cuenta**: ${originalData.data.account}
- **Fecha**: ${originalData.data.date || 'No especificada'}
- **Cuotas**: ${originalData.data.installments || 'No especificado'}

### INSTRUCCIONES:
1. Transcribe completamente el mensaje de voz
2. Identifica qué campos quiere modificar el usuario
3. Actualiza ÚNICAMENTE los campos mencionados
4. Mantén los demás campos sin cambios

### CUENTAS DISPONIBLES:
${accounts.join(', ')}

### CATEGORÍAS DE GASTOS:
${Object.entries(expense_categories).map(([cat, subcats]) => 
  `**${cat}:**\n${subcats.map(subcat => `  - ${subcat.split(' > ')[1]}`).join('\n')}`
).join('\n\n')}

### CATEGORÍAS DE INGRESOS:
${Object.entries(income_categories).map(([cat, subcats]) => 
  `**${cat}:**\n${subcats.map(subcat => `  - ${subcat.split(' > ')[1]}`).join('\n')}`
).join('\n\n')}

### FORMATO DE SUBCATEGORÍA:
- La subcategoría debe devolverse en formato "Categoría > Subcategoría"
- Ejemplo: Si eliges "Nafta" de la categoría "Auto", devuelve "Auto > Nafta"

### VALIDACIONES:
- Subcategoría debe estar en formato "Categoría > Subcategoría"
- Cuenta debe existir en la lista proporcionada
- Monto debe ser número positivo
- Si menciona fecha, convertirla a formato dd/MM/yyyy
- Cuotas debe ser número entero positivo (solo para gastos)

### PROCESO:
1. Transcribe el audio completo
2. Identifica los campos a modificar
3. Actualiza solo los campos mencionados
4. Mantén los demás valores originales

### RESPUESTA REQUERIDA:
Devuelve ÚNICAMENTE un JSON con TODOS los campos (modificados y sin modificar)`;
      
      updatedData = processAudioWithGemini(audioBlob, message.voice.mime_type, editPrompt);
    }
    
    if (updatedData && validateData(updatedData)) {
      // Obtener los datos normalizados
      const normalizedUpdatedData = normalizeGeminiResponse(updatedData);
      
      // Guardar los datos actualizados
      const cacheKey = `expense_${editMode.expenseId}`;
      originalData.data = normalizedUpdatedData; // Actualizar los datos
      cache.put(cacheKey, JSON.stringify(originalData), 21600); // 6 horas
      
      // Eliminar el estado de edición
      cache.remove(`edit_mode_${chatId}`);
      
      // Enviar mensaje de confirmación con datos actualizados
      sendConfirmationMessage(chatId, normalizedUpdatedData, originalData.timestamp);
      
      return true;
    } else {
      sendTelegramMessage(chatId, "❌ No pude procesar correctamente tu edición. Por favor intenta nuevamente con información más clara.");
      return true;
    }
  } catch (error) {
    logError('processEditMessage', error);
    sendTelegramMessage(chatId, "❌ Ocurrió un error procesando tu edición. Por favor intenta de nuevo.");
    return true;
  }
}

/**
 * Maneja las solicitudes GET (método no permitido)
 * @return {Object} Mensaje de error
 */
function doGet(e) {
  return ContentService.createTextOutput("Method GET not allowed");
}