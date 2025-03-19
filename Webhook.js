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
    const webhookData = JSON.parse(e.postData.contents);
    const chatId = webhookData.message?.chat?.id;
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
      // Guardar en la hoja de cálculo
      logToExpenseSheet(structuredData, message.date);
      // Enviar confirmación
      sendTelegramMessage(chatId, `✅ <b>Gasto registrado:</b>\n💰 ${structuredData.amount}\n📝 ${structuredData.description}\n🏷️ ${structuredData.subcategory}\n💳 ${structuredData.account}`);
    } else {
      // Informar del error al usuario
      sendTelegramMessage(chatId, "❌ No pude procesar correctamente tu gasto. Por favor intenta de nuevo con el formato: [cantidad] [descripción]");
    }
  } catch (error) {
    logError('doPost', error);
    try {
      // Intentar informar al usuario del error
      if (webhookData && webhookData.message && webhookData.message.chat) {
        sendTelegramMessage(webhookData.message.chat.id, "❌ Ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.");
      }
    } catch (e) {
      // Error al informar del error, solo registrarlo
      logError('doPost-errorNotification', e);
    }
  }
}

/**
 * Maneja las solicitudes GET (método no permitido)
 * @return {Object} Mensaje de error
 */
function doGet(e) {
  return ContentService.createTextOutput("Method GET not allowed");
}