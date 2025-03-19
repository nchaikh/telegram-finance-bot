/**
 * Valida los datos estructurados
 * @param {Object} data - Datos estructurados a validar
 * @return {boolean} True si los datos son válidos, false en caso contrario
 */
function validateData(data) {
  // Verificar si los datos existen y son un objeto
  if (!data || typeof data !== 'object') {
    logError('validateData', new Error('Datos inválidos o no son un objeto'), { data });
    return false;
  }
  
  // Verificar campos requeridos
  if (!('amount' in data) || !('description' in data) || !('category' in data) || !('subcategory' in data) || !('account' in data)) {
    logError('validateData', new Error('Faltan campos requeridos'), { data, missingFields: 
      ['amount', 'description', 'category', 'subcategory', 'account'].filter(field => !(field in data)) });
    return false;
  }

  // Cargar categorías y cuentas dinámicamente
  const { categories, accounts } = CONFIG.loadConfigData();
  
  // Validar monto
  if (isNaN(parseFloat(data.amount))) {
    logError('validateData', new Error('Monto inválido'), { amount: data.amount });
    return false;
  }
  
  // Validar descripción
  if (data.description.trim() === '') {
    logError('validateData', new Error('Descripción vacía'), { description: data.description });
    return false;
  }
  
  // Validar categoría
  if (!Object.keys(categories).includes(data.category)) {
    logError('validateData', new Error('Categoría inválida'), { 
      category: data.category, 
      validCategories: Object.keys(categories) 
    });
    return false;
  }
  
  // Validar subcategoría
  if (!categories[data.category].includes(data.subcategory)) {
    logError('validateData', new Error('Subcategoría inválida para la categoría seleccionada'), { 
      category: data.category, 
      subcategory: data.subcategory, 
      validSubcategories: categories[data.category] 
    });
    return false;
  }
  
  // Validar cuenta
  if (!accounts.includes(data.account)) {
    logError('validateData', new Error('Cuenta inválida'), { 
      account: data.account, 
      validAccounts: accounts 
    });
    return false;
  }
  
  return true;
}