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
  const prompt = customPrompt || `
### CONTEXTO:
Hoy es ${currentDateString}. Analiza el siguiente mensaje para extraer información financiera.

### TAREA:
Extrae y estructura la información de registro financiero en formato JSON.

### TIPOS DE REGISTRO:
- **GASTO**: Dinero que sale de una cuenta
- **INGRESO**: Dinero que entra a una cuenta  
- **TRANSFERENCIA**: Dinero que se mueve entre cuentas

### CAMPOS REQUERIDOS:
- **type**: "gasto", "ingreso", o "transferencia"
- **amount**: número positivo (sin símbolos de moneda)
- **description**: descripción clara del movimiento
- **category**: categoría principal
- **subcategory**: subcategoría en formato "Categoría > Subcategoría"
- **account**: cuenta principal del movimiento
- **second_account**: (solo transferencias) cuenta destino
- **date**: formato dd/MM/yyyy (solo si se menciona explícitamente)
- **installments**: número de cuotas (solo si se menciona explícitamente)

### REGLAS DE FECHA:
- Si menciona "ayer" → calcular fecha anterior
- Si menciona "el lunes", "hace 3 días", etc. → calcular fecha específica
- Si NO menciona fecha → NO incluir el campo "date"

### CUENTAS DISPONIBLES:
${accounts.join(', ')}
- Si no especifica cuenta → usar "No definido"

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
- Monto debe ser número positivo
- Subcategoría debe existir en las listas proporcionadas
- Fecha debe estar en formato dd/MM/yyyy
- Para transferencias, incluir both account y second_account
- Cuotas debe ser número entero positivo (mayor a 1)

### MENSAJE A PROCESAR:
"${text}"

### RESPUESTA REQUERIDA:
Devuelve ÚNICAMENTE un JSON válido con los campos extraídos.`;
  
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
  const prompt = customPrompt || `
### TAREA:
1. Transcribe el audio completo con máxima precisión
2. Extrae información financiera de la transcripción

### CONTEXTO:
Hoy es ${currentDateString}. Analiza el mensaje de voz para extraer información de registro financiero.

### INFORMACIÓN A EXTRAER:
- **type**: "gasto", "ingreso", o "transferencia"
- **amount**: número positivo (ignorar símbolos de moneda)
- **description**: descripción del movimiento
- **category**: categoría principal
- **subcategory**: formato "Categoría > Subcategoría"
- **account**: cuenta utilizada
- **second_account**: (solo transferencias) cuenta destino
- **date**: formato dd/MM/yyyy (solo si se menciona)
- **installments**: número de cuotas (solo si se menciona)

### CUENTAS DISPONIBLES:
${accounts.join(', ')}
- Default: "No definido"

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

### PROCESO:
1. Transcribe el audio completo
2. Identifica el tipo de registro financiero
3. Extrae todos los campos relevantes
4. Valida que la subcategoría exista en las listas
5. Si menciona cuotas extraer número de cuotas

### RESPUESTA:
Devuelve ÚNICAMENTE un JSON válido con los campos extraídos.`;

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