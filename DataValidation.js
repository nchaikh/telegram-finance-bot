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
  if (!accounts.includes(data.account) && data.account !== 'No definido') {
    logError('validateData', new Error('Cuenta inválida'), { 
      account: data.account, 
      validAccounts: accounts 
    });
    return false;
  }
  
  // Validar fecha si está presente
  if ('date' in data && data.date) {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(data.date)) {
      logError('validateData', new Error('Formato de fecha inválido'), { date: data.date });
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
  
  return true;
}