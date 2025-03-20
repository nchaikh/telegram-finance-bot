/**
 * Envía un mensaje a un chat de Telegram
 * @param {string} chatId - ID del chat de Telegram
 * @param {string} text - Texto del mensaje
 * @return {Object} Respuesta de la API de Telegram
 */
function sendTelegramMessage(chatId, text) {
  try {
    const url = `${CONFIG.TELEGRAM_API_URL}/sendmessage?parse_mode=HTML&chat_id=${chatId}&text=${encodeURIComponent(text)}`;
    const options = { "muteHttpExceptions": true };
    return UrlFetchApp.fetch(url, options).getContentText();
  } catch (error) {
    logError('sendTelegramMessage', error);
    throw error;
  }
}

// Get Telegram audio file as Blob
function getAudioBlob(fileId) {
  const getFileUrl = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
  const fileResponse = UrlFetchApp.fetch(getFileUrl);
  const fileJson = JSON.parse(fileResponse.getContentText());
  const filePath = fileJson.result.file_path;
  const audioUrl = `https://api.telegram.org/file/bot${CONFIG.TELEGRAM_BOT_TOKEN}/${filePath}`;
  return UrlFetchApp.fetch(audioUrl).getBlob();
}

/**
 * Envía un mensaje a un chat de Telegram con botones inline
 * @param {string} chatId - ID del chat de Telegram
 * @param {string} text - Texto del mensaje
 * @param {Object} replyMarkup - Objeto con los botones inline
 * @return {Object} Respuesta de la API de Telegram
 */
function sendTelegramMessageWithButtons(chatId, text, replyMarkup) {
  try {
    const url = `${CONFIG.TELEGRAM_API_URL}/sendmessage`;
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: "HTML",
      reply_markup: replyMarkup
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    return UrlFetchApp.fetch(url, options).getContentText();
  } catch (error) {
    logError('sendTelegramMessageWithButtons', error);
    throw error;
  }
}

/**
 * Responde a un callback_query
 * @param {string} callbackQueryId - ID del callback_query
 * @return {Object} Respuesta de la API de Telegram
 */
function answerCallbackQuery(callbackQueryId) {
  try {
    const url = `${CONFIG.TELEGRAM_API_URL}/answerCallbackQuery`;
    const payload = {
      callback_query_id: callbackQueryId
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    return UrlFetchApp.fetch(url, options).getContentText();
  } catch (error) {
    logError('answerCallbackQuery', error);
    throw error;
  }
}

/**
 * Edita un mensaje existente
 * @param {string} chatId - ID del chat
 * @param {string} messageId - ID del mensaje a editar
 * @param {string} text - Nuevo texto
 * @return {Object} Respuesta de la API de Telegram
 */
function editMessageText(chatId, messageId, text) {
  try {
    const url = `${CONFIG.TELEGRAM_API_URL}/editMessageText`;
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: "HTML"
    };
    
    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    return UrlFetchApp.fetch(url, options).getContentText();
  } catch (error) {
    logError('editMessageText', error);
    throw error;
  }
}