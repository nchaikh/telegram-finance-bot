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
    
    // Validar los datos estructurados
    if (validateData(structuredData)) {
      // Log para pruebas
      Logger.log(structuredData);
      
      // En lugar de guardar directamente, enviar mensaje de confirmación
      sendConfirmationMessage(chatId, structuredData, message.date);
    } else {
      // Informar del error al usuario
      sendTelegramMessage(chatId, "❌ No pude procesar correctamente tu gasto. Por favor intenta de nuevo con el formato: [cantidad] [descripción]");
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
    sendTelegramMessage(chatId, "❌ Lo siento, los datos del gasto ya no están disponibles. Por favor ingresa el gasto nuevamente.");
    return;
  }
  
  const savedData = JSON.parse(savedDataJson);
  
  // Responder al callback
  answerCallbackQuery(callbackQuery.id);
  
  if (callbackData.action === 'confirm') {
    // Guardar en la hoja de cálculo
    logToExpenseSheet(savedData.data, savedData.timestamp);
    
    // Actualizar el mensaje original
    editMessageText(
      chatId, 
      messageId, 
      `✅ <b>Gasto registrado:</b>\n💰 ${savedData.data.amount}\n📝 ${savedData.data.description}\n🏷️ ${savedData.data.subcategory}\n💳 ${savedData.data.account}`
    );
  } else if (callbackData.action === 'cancel') {
    // Actualizar el mensaje original
    editMessageText(
      chatId, 
      messageId, 
      "❌ Registro de gasto cancelado."
    );
  }
  
  // Limpiar datos en cache
  cache.remove(cacheKey);
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
  
  // Crear mensaje
  const message = `⚠️ <b>Confirma este gasto:</b>\n💰 ${data.amount}\n📝 ${data.description}\n🏷️ ${data.subcategory}\n💳 ${data.account}`;
  
  // Botones de confirmar y cancelar
  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: "✅ Confirmar",
          callback_data: JSON.stringify({ action: 'confirm', id: expenseId })
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
 * Maneja las solicitudes GET (método no permitido)
 * @return {Object} Mensaje de error
 */
function doGet(e) {
  return ContentService.createTextOutput("Method GET not allowed");
}