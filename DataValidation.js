/**
 * Valida los datos estructurados
 * @param {Object} data - Datos estructurados a validar
 * @return {boolean} True si los datos son válidos, false en caso contrario
 */
function validateData(data) {
  // Normalizar la respuesta de Gemini
  const normalizedData = normalizeGeminiResponse(data);
  
  // Verificar si los datos existen y son un objeto después de normalización
  if (!normalizedData || typeof normalizedData !== 'object') {
    logError('validateData', new Error('Datos inválidos o no son un objeto después de normalización'), { 
      originalData: data,
      normalizedData: normalizedData 
    });
    return false;
  }
  
  // Usar los datos normalizados para el resto de la validación
  data = normalizedData;
  
  // Verificar campos requeridos básicos
  const requiredFields = ['type', 'amount', 'description', 'category', 'subcategory', 'account'];
  const missingFields = requiredFields.filter(field => !(field in data));
  
  if (missingFields.length > 0) {
    logError('validateData', new Error('Faltan campos requeridos'), { data, missingFields });
    return false;
  }

  // Cargar categorías y cuentas dinámicamente
  const { expense_categories, income_categories, accounts } = CONFIG.loadConfigData();
  
  // Validar tipo de registro
  const validTypes = ['gasto', 'ingreso', 'transferencia'];
  if (!validTypes.includes(data.type)) {
    logError('validateData', new Error('Tipo de registro inválido'), { 
      type: data.type, 
      validTypes: validTypes 
    });
    return false;
  }
  
  // Validar monto
  if (isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
    logError('validateData', new Error('Monto inválido - debe ser un número positivo'), { amount: data.amount });
    return false;
  }
  
  // Validar descripción
  if (!data.description || data.description.trim() === '') {
    logError('validateData', new Error('Descripción vacía'), { description: data.description });
    return false;
  }
  
  // Validar según el tipo de registro
  if (data.type === 'transferencia') {
    // Para transferencias, validar que tenga segunda cuenta
    if (!('second_account' in data) || !data.second_account) {
      logError('validateData', new Error('Transferencia debe incluir cuenta destino (second_account)'), { data });
      return false;
    }
    
    // Validar que ambas cuentas existan
    if (!accounts.includes(data.account) && data.account !== 'No definido') {
      logError('validateData', new Error('Cuenta origen inválida'), { 
        account: data.account, 
        validAccounts: accounts 
      });
      return false;
    }
    
    if (!accounts.includes(data.second_account) && data.second_account !== 'No definido') {
      logError('validateData', new Error('Cuenta destino inválida'), { 
        account: data.second_account, 
        validAccounts: accounts 
      });
      return false;
    }
    
    // Validar que las cuentas sean diferentes
    if (data.account === data.second_account) {
      logError('validateData', new Error('Las cuentas origen y destino deben ser diferentes'), { 
        account: data.account, 
        second_account: data.second_account 
      });
      return false;
    }
    
    // Para transferencias, no validar categorías (pueden ser genéricas)
  } else {
    // Para gastos e ingresos, validar categorías
    let categories;
    let categoryType;
    
    if (data.type === 'gasto') {
      categories = expense_categories;
      categoryType = 'gastos';
    } else if (data.type === 'ingreso') {
      categories = income_categories;
      categoryType = 'ingresos';
    }
    
    // Validar categoría
    if (!Object.keys(categories).includes(data.category)) {
      logError('validateData', new Error(`Categoría inválida para ${categoryType}`), { 
        category: data.category, 
        validCategories: Object.keys(categories),
        type: data.type
      });
      return false;
    }
    
    // Validar subcategoría
    if (!categories[data.category].includes(data.subcategory)) {
      logError('validateData', new Error(`Subcategoría inválida para la categoría seleccionada en ${categoryType}`), { 
        category: data.category, 
        subcategory: data.subcategory, 
        validSubcategories: categories[data.category],
        type: data.type,
        ...getValidationErrorDetails(data)
      });
      return false;
    }
    
    // Validar formato de subcategoría usando función auxiliar
    if (!validateSubcategoryFormat(data.category, data.subcategory)) {
      logError('validateData', new Error('Formato de subcategoría inválido - debe ser "Categoría > Subcategoría" y coincidir con la categoría'), { 
        category: data.category,
        subcategory: data.subcategory,
        expectedFormat: `${data.category} > [subcategoría]`
      });
      return false;
    }
    
    // Validar cuenta principal
    if (!accounts.includes(data.account) && data.account !== 'No definido') {
      logError('validateData', new Error('Cuenta inválida'), { 
        account: data.account, 
        validAccounts: accounts 
      });
      return false;
    }
  }
  
  // Validar fecha si está presente
  if ('date' in data && data.date) {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(data.date)) {
      logError('validateData', new Error('Formato de fecha inválido - debe ser dd/MM/yyyy'), { date: data.date });
      return false;
    }
    
    // Verificar que la fecha sea válida
    const [day, month, year] = data.date.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    if (isNaN(dateObj.getTime()) || dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year) {
      logError('validateData', new Error('Fecha inválida'), { date: data.date });
      return false;
    }
  }
  
  // Validar número de cuotas si está presente
  if ('installments' in data && data.installments !== undefined && data.installments !== null) {
    const installments = parseInt(data.installments);
    if (isNaN(installments) || installments < 1 || installments > 60) {
      logError('validateData', new Error('Número de cuotas inválido - debe ser un número entero entre 1 y 60'), { 
        installments: data.installments 
      });
      return false;
    }
    
    // Validar que las cuotas solo se apliquen a gastos
    if (data.type !== 'gasto') {
      logError('validateData', new Error('Las cuotas solo se aplican a gastos'), { 
        type: data.type,
        installments: data.installments
      });
      return false;
    }
  }
  
  return true;
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
 * Valida que la subcategoría tenga el formato correcto y coincida con la categoría
 * @param {string} category - Categoría
 * @param {string} subcategory - Subcategoría a validar
 * @return {boolean} True si la subcategoría es válida
 */
function validateSubcategoryFormat(category, subcategory) {
  if (!subcategory || !subcategory.includes(' > ')) {
    return false;
  }
  
  const parts = subcategory.split(' > ');
  if (parts.length !== 2) {
    return false;
  }
  
  // Verificar que la primera parte coincida con la categoría
  return parts[0].trim() === category.trim();
}

/**
 * Obtiene información detallada sobre el error de validación para debugging
 * @param {Object} data - Datos que fallaron la validación
 * @return {Object} Información detallada del error
 */
function getValidationErrorDetails(data) {
  const { expense_categories, income_categories, accounts } = CONFIG.loadConfigData();
  
  return {
    receivedData: data,
    availableAccounts: accounts,
    availableExpenseCategories: Object.keys(expense_categories),
    availableIncomeCategories: Object.keys(income_categories),
    timestamp: new Date().toISOString()
  };
}

/**
 * Valida específicamente los datos de una transferencia
 * @param {Object} data - Datos de la transferencia
 * @param {Array} accounts - Lista de cuentas válidas
 * @return {Object} Resultado de la validación con detalles
 */
function validateTransferData(data, accounts) {
  const errors = [];
  
  // Validar que tenga segunda cuenta
  if (!('second_account' in data) || !data.second_account) {
    errors.push('Falta la cuenta destino (second_account)');
  }
  
  // Validar cuenta origen
  if (!accounts.includes(data.account) && data.account !== 'No definido') {
    errors.push(`Cuenta origen inválida: ${data.account}`);
  }
  
  // Validar cuenta destino
  if (data.second_account && !accounts.includes(data.second_account) && data.second_account !== 'No definido') {
    errors.push(`Cuenta destino inválida: ${data.second_account}`);
  }
  
  // Validar que las cuentas sean diferentes
  if (data.account === data.second_account) {
    errors.push('Las cuentas origen y destino deben ser diferentes');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida específicamente los datos de gastos e ingresos
 * @param {Object} data - Datos del gasto/ingreso
 * @param {Object} categories - Categorías válidas (expense_categories o income_categories)
 * @param {string} type - Tipo de registro ('gasto' o 'ingreso')
 * @return {Object} Resultado de la validación con detalles
 */
function validateExpenseIncomeData(data, categories, type) {
  const errors = [];
  
  // Validar categoría
  if (!Object.keys(categories).includes(data.category)) {
    errors.push(`Categoría inválida para ${type}: ${data.category}`);
  }
  
  // Validar subcategoría
  if (data.category && !categories[data.category]?.includes(data.subcategory)) {
    errors.push(`Subcategoría inválida para la categoría ${data.category}: ${data.subcategory}`);
  }
  
  // Validar formato de subcategoría
  if (!validateSubcategoryFormat(data.category, data.subcategory)) {
    errors.push(`Formato de subcategoría inválido: ${data.subcategory}. Debe ser "${data.category} > [subcategoría]"`);
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida específicamente el número de cuotas
 * @param {Object} data - Datos del registro
 * @return {Object} Resultado de la validación con detalles
 */
function validateInstallments(data) {
  const errors = [];
  
  if ('installments' in data && data.installments !== undefined && data.installments !== null) {
    const installments = parseInt(data.installments);
    
    // Validar que sea un número válido
    if (isNaN(installments)) {
      errors.push(`Número de cuotas inválido: ${data.installments}. Debe ser un número entero.`);
    } else {
      // Validar rango
      if (installments < 1 || installments > 60) {
        errors.push(`Número de cuotas fuera de rango: ${installments}. Debe estar entre 1 y 60.`);
      }
      
      // Validar que solo se aplique a gastos
      if (data.type !== 'gasto') {
        errors.push(`Las cuotas solo se aplican a gastos. Tipo actual: ${data.type}.`);
      }
      
      // Validar que para una cuota no tenga sentido (debe ser mayor a 1)
      if (installments === 1) {
        errors.push('Para una sola cuota, no incluir el campo installments.');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Formatea información sobre cuotas para mostrar en mensajes
 * @param {Object} data - Datos del registro
 * @return {string} Información formateada sobre cuotas
 */
function formatInstallmentsInfo(data) {
  if (!data.installments || data.installments <= 1) {
    return '';
  }
  
  const monthlyAmount = parseFloat(data.amount) / parseInt(data.installments);
  return ` (${data.installments} cuotas de ${formatCurrency(monthlyAmount)} c/u)`;
}
