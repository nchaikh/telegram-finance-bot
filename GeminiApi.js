/**
 * Process text with Gemini API
 * @param {string} text - Text to process
 * @param {string} customPrompt - Optional custom prompt to use instead of the default
 * @return {Object} - Structured data
 */
function processTextWithGemini(text, customPrompt) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
  const apiKey = CONFIG.GEMINI_API_KEY;
  
  // Obtener la fecha actual para resolver referencias relativas
  const today = new Date();
  const currentDateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "dd/MM/yyyy");
  
  // Usar el prompt personalizado si se proporciona, de lo contrario usar el predeterminado
  const prompt = customPrompt || `Extrae el monto, una descripción, la categoría, la subcategoría, la cuenta y la fecha de este mensaje de gasto.
  
  Elige una categoría y subcategoría de esta lista:
  ${Object.entries(categories).map(([cat, subcats]) => 
    subcats.map(subcat => `- ${cat} > ${subcat}`).join('\n  ')
  ).join('\n  ')}
  La subcategoría debes escribirla tal cual como aparece en la lista con el formato "Categoría > Subcategoría".
  
  Elige una cuenta de esta lista: ${accounts.join(', ')}. Si el usuario no especifica la cuenta, usa "No definido" por defecto.
  
  Hoy es ${currentDateString}. Si el usuario menciona una fecha (como "ayer", "el lunes", "hace 3 días", etc.), extráela y conviértela a formato dd/MM/yyyy. Si no menciona una fecha, no incluyas el campo "date" en la respuesta.
  
  Devuelve los datos en formato JSON como este: { "amount": number, "description": string, "category": string, "subcategory": string, "account": string, "date": string (opcional) }.
  
  Mensaje: "${text}"`;
  
  const payload = {
    "contents": [{
      "parts": [{
        "text": prompt
      }]
    }]
  };
  
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  // Usar el parámetro de consulta en la URL en lugar del encabezado de autorización
  const requestUrl = `${url}?key=${apiKey}`;
  const response = UrlFetchApp.fetch(requestUrl, options);
  
  // Verificar el código de respuesta
  if (response.getResponseCode() !== 200) {
    throw new Error(`Error en la API de Gemini: ${response.getContentText()}`);
  }
  
  const json = JSON.parse(response.getContentText());
  // Asegurarse de que el texto de respuesta sea JSON válido (eliminar posibles backticks o formato markdown)
  const responseText = json.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
  const extractedJson = JSON.parse(responseText);
  return extractedJson;
}

/**
 * Process audio with Gemini API
 * @param {Blob} audioBlob - Audio blob to process
 * @param {string} mimeType - MIME type of the audio
 * @param {string} customPrompt - Optional custom prompt to use instead of the default
 * @return {Object} - Structured data
 */
function processAudioWithGemini(audioBlob, mimeType, customPrompt) {
  const apiKey = CONFIG.GEMINI_API_KEY;
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
  const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  // Obtener la fecha actual para resolver referencias relativas
  const today = new Date();
  const currentDateString = Utilities.formatDate(today, Session.getScriptTimeZone(), "dd/MM/yyyy");

  // Paso 1: Subir el archivo de audio
  const uploadOptions = {
    method: 'POST',
    headers: {
      'Content-Type': mimeType // e.g., 'audio/ogg' para mensajes de voz de Telegram
    },
    payload: audioBlob,
    muteHttpExceptions: true
  };

  const uploadResponse = UrlFetchApp.fetch(uploadUrl, uploadOptions);
  if (uploadResponse.getResponseCode() !== 200) {
    throw new Error(`Error al subir el audio a Gemini: ${uploadResponse.getContentText()}`);
  }
  const uploadResult = JSON.parse(uploadResponse.getContentText());
  const fileUri = uploadResult.file.uri;

  // Paso 2: Procesar el audio con Gemini
  // Usar el prompt personalizado si se proporciona, de lo contrario usar el predeterminado
  const prompt = customPrompt || `Genera una transcripción del discurso en este archivo de audio, luego extrae el monto, una descripción, la categoría, la subcategoría, la cuenta y la fecha del mensaje de gasto transcrito.
  
  Elige una categoría y subcategoría de esta lista:
  ${Object.entries(categories).map(([cat, subcats]) => 
    subcats.map(subcat => `- ${cat} > ${subcat}`).join('\n  ')
  ).join('\n  ')}
  La subcategoría debes escribirla tal cual como aparece en la lista con el formato "Categoría > Subcategoría".
  
  Elige una cuenta de esta lista: ${accounts.join(', ')}. Si el usuario no especifica la cuenta, usa "No definido" por defecto.
  
  Hoy es ${currentDateString}. Si el usuario menciona una fecha (como "ayer", "el lunes", "hace 3 días", etc.), extráela y conviértela a formato dd/MM/yyyy. Si no menciona una fecha, no incluyas el campo "date" en la respuesta.
  
  Devuelve los datos en formato JSON como este: { "amount": number, "description": string, "category": string, "subcategory": string, "account": string, "date": string (opcional) }.
  `;

  const payload = {
    "contents": [
      {
        "parts": [
          { "text": prompt },
          { "fileData": { "mimeType": mimeType, "fileUri": fileUri } }
        ]
      }
    ]
  };

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(generateUrl, options);
  if (response.getResponseCode() !== 200) {
    throw new Error(`Error en la API de Gemini (procesamiento): ${response.getContentText()}`);
  }

  const json = JSON.parse(response.getContentText());
  const responseText = json.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
  return JSON.parse(responseText);
}