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