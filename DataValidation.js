/**
 * Valida los datos estructurados
 * @param {Object} data - Datos estructurados a validar
 * @return {boolean} True si los datos son válidos, false en caso contrario
 */
function validateData(data) {
  // Verificar campos requeridos básicos
  let requiredFields = ['tipo', 'monto', 'descripcion', 'categoria', 'subcategoria', 'cuenta'];
  if (data.tipo === 'inversión' || data.tipo === 'venta_inversión') {
    requiredFields = requiredFields.concat(['activo', 'cantidad', 'precio_unitario']);
  }
  const missingFields = requiredFields.filter(field => !(field in data));

  if (missingFields.length > 0) {
    logError('validateData', new Error('Faltan campos requeridos'), { data, missingFields });
    return { valid: false, error: `❌ Faltan campos requeridos: ${missingFields.join(', ')}` };
  }

  // Cargar categorías y cuentas dinámicamente
  const { expense_categories, income_categories, investment_categories, accounts } = CONFIG.loadConfigData();

  // Validar tipo de registro
  const validTypes = ['gasto', 'ingreso', 'transferencia', 'inversión', 'venta_inversión'];
  if (!validTypes.includes(data.tipo)) {
    logError('validateData', new Error('Tipo de registro inválido'), {
      type: data.tipo,
      validTypes: validTypes
    });
    return { valid: false, error: '❌ Tipo de registro inválido. Debe ser gasto, ingreso, transferencia, inversión o venta_inversión.' };
  }

  // Validar monto
  if (isNaN(parseFloat(data.monto)) || parseFloat(data.monto) <= 0) {
    logError('validateData', new Error('Monto inválido - debe ser un número positivo'), { amount: data.monto });
    return { valid: false, error: '❌ Monto inválido. Debe ser un número positivo.' };
  }

  // Validar descripción
  if (!data.descripcion || data.descripcion.trim() === '') {
    logError('validateData', new Error('Descripción vacía'), { description: data.descripcion });
    return { valid: false, error: '❌ La descripción no puede estar vacía.' };
  }

  // Validar según el tipo de registro
  if (data.tipo === 'transferencia') {
    // Para transferencias, validar que tenga segunda cuenta
    if (!('cuenta_destino' in data) || !data.cuenta_destino) {
      logError('validateData', new Error('Transferencia debe incluir cuenta destino (cuenta_destino)'), { data });
      return { valid: false, error: '❌ Transferencia debe incluir cuenta destino (cuenta_destino).' };
    }

    // Validar que ambas cuentas existan
    if (!accounts.includes(data.cuenta) && data.cuenta !== 'No definido') {
      logError('validateData', new Error('Cuenta origen inválida'), {
        account: data.cuenta,
        validAccounts: accounts
      });
      return { valid: false, error: '❌ Cuenta origen inválida.' };
    }

    if (!accounts.includes(data.cuenta_destino) && data.cuenta_destino !== 'No definido') {
      logError('validateData', new Error('Cuenta destino inválida'), {
        account: data.cuenta_destino,
        validAccounts: accounts
      });
      return { valid: false, error: '❌ Cuenta destino inválida.' };
    }

    // Validar que las cuentas sean diferentes
    if (data.cuenta === data.cuenta_destino) {
      logError('validateData', new Error('Las cuentas origen y destino deben ser diferentes'), {
        account: data.cuenta,
        second_account: data.cuenta_destino
      });
      return { valid: false, error: '❌ Las cuentas origen y destino deben ser diferentes.' };
    }

    // Para transferencias, no validar categorías (pueden ser genéricas)
  } else if (data.tipo === 'inversión') {
    // Validar categoría de inversiones
    if (!Object.keys(investment_categories).includes(data.categoria)) {
      logError('validateData', new Error('Categoría inválida para inversiones'), {
        category: data.categoria,
        validCategories: Object.keys(investment_categories),
        type: data.tipo
      });
      return { valid: false, error: '❌ Categoría inválida para inversiones.' };
    }

    // Validar subcategoría
    if (!investment_categories[data.categoria].includes(data.subcategoria)) {
      logError('validateData', new Error('Subcategoría inválida para la categoría seleccionada en inversiones'), {
        category: data.categoria,
        subcategory: data.subcategoria,
        validSubcategories: investment_categories[data.categoria],
        type: data.tipo
      });
      return { valid: false, error: '❌ Subcategoría inválida para la categoría seleccionada en inversiones.' };
    }

    // Validar formato de subcategoría
    if (!validateSubcategoryFormat(data.categoria, data.subcategoria)) {
      logError('validateData', new Error('Formato de subcategoría inválido - debe ser "Categoría > Subcategoría" y coincidir con la categoría'), {
        category: data.categoria,
        subcategory: data.subcategoria,
        expectedFormat: `${data.categoria} > [subcategoría]`
      });
      return { valid: false, error: '❌ Formato de subcategoría inválido. Debe ser "Categoría > Subcategoría" y coincidir con la categoría.' };
    }

    // Validar activo
    if (!data.activo || data.activo.trim() === '') {
      logError('validateData', new Error('Activo vacío'), { activo: data.activo });
      return { valid: false, error: '❌ El activo no puede estar vacío.' };
    }

    // Validar cantidad
    if (isNaN(parseFloat(data.cantidad)) || parseFloat(data.cantidad) <= 0) {
      logError('validateData', new Error('Cantidad inválida - debe ser un número positivo'), { cantidad: data.cantidad });
      return { valid: false, error: '❌ Cantidad inválida. Debe ser un número positivo.' };
    }

    // Validar precio_unitario
    if (isNaN(parseFloat(data.precio_unitario)) || parseFloat(data.precio_unitario) <= 0) {
      logError('validateData', new Error('Precio unitario inválido - debe ser un número positivo'), { precio_unitario: data.precio_unitario });
      return { valid: false, error: '❌ Precio unitario inválido. Debe ser un número positivo.' };
    }

    // Validar que monto = cantidad * precio_unitario (negativo)
    const expectedMonto = -parseFloat(data.cantidad) * parseFloat(data.precio_unitario);
    if (Math.abs(parseFloat(data.monto) - expectedMonto) > 0.01) {
      logError('validateData', new Error('Monto no coincide con cantidad * precio_unitario'), {
        monto: data.monto,
        expected: expectedMonto,
        cantidad: data.cantidad,
        precio_unitario: data.precio_unitario
      });
      return { valid: false, error: '❌ El monto no coincide con cantidad * precio_unitario.' };
    }

    // Validar cuenta
    if (!accounts.includes(data.cuenta) && data.cuenta !== 'No definido') {
      logError('validateData', new Error('Cuenta inválida'), {
        account: data.cuenta,
        validAccounts: accounts
      });
      return { valid: false, error: '❌ Cuenta inválida.' };
    }
  } else if (data.tipo === 'venta_inversión') {
    // Similar a inversión, pero monto positivo
    if (!Object.keys(investment_categories).includes(data.categoria)) {
      logError('validateData', new Error('Categoría inválida para ventas de inversiones'), {
        category: data.categoria,
        validCategories: Object.keys(investment_categories),
        type: data.tipo
      });
      return { valid: false, error: '❌ Categoría inválida para ventas de inversiones.' };
    }

    // Validar subcategoría
    if (!investment_categories[data.categoria].includes(data.subcategoria)) {
      logError('validateData', new Error('Subcategoría inválida para la categoría seleccionada en ventas de inversiones'), {
        category: data.categoria,
        subcategory: data.subcategoria,
        validSubcategories: investment_categories[data.categoria],
        type: data.tipo
      });
      return { valid: false, error: '❌ Subcategoría inválida para la categoría seleccionada en ventas de inversiones.' };
    }

    // Validar formato de subcategoría
    if (!validateSubcategoryFormat(data.categoria, data.subcategoria)) {
      logError('validateData', new Error('Formato de subcategoría inválido - debe ser "Categoría > Subcategoría" y coincidir con la categoría'), {
        category: data.categoria,
        subcategory: data.subcategoria,
        expectedFormat: `${data.categoria} > [subcategoría]`
      });
      return { valid: false, error: '❌ Formato de subcategoría inválido. Debe ser "Categoría > Subcategoría" y coincidir con la categoría.' };
    }

    // Validar activo
    if (!data.activo || data.activo.trim() === '') {
      logError('validateData', new Error('Activo vacío'), { activo: data.activo });
      return { valid: false, error: '❌ El activo no puede estar vacío.' };
    }

    // Validar cantidad
    if (isNaN(parseFloat(data.cantidad)) || parseFloat(data.cantidad) <= 0) {
      logError('validateData', new Error('Cantidad inválida - debe ser un número positivo'), { cantidad: data.cantidad });
      return { valid: false, error: '❌ Cantidad inválida. Debe ser un número positivo.' };
    }

    // Validar precio_unitario
    if (isNaN(parseFloat(data.precio_unitario)) || parseFloat(data.precio_unitario) <= 0) {
      logError('validateData', new Error('Precio unitario inválido - debe ser un número positivo'), { precio_unitario: data.precio_unitario });
      return { valid: false, error: '❌ Precio unitario inválido. Debe ser un número positivo.' };
    }

    // Validar que monto = cantidad * precio_unitario (positivo)
    const expectedMonto = parseFloat(data.cantidad) * parseFloat(data.precio_unitario);
    if (Math.abs(parseFloat(data.monto) - expectedMonto) > 0.01) {
      logError('validateData', new Error('Monto no coincide con cantidad * precio_unitario'), {
        monto: data.monto,
        expected: expectedMonto,
        cantidad: data.cantidad,
        precio_unitario: data.precio_unitario
      });
      return { valid: false, error: '❌ El monto no coincide con cantidad * precio_unitario.' };
    }

    // Validar cuenta
    if (!accounts.includes(data.cuenta) && data.cuenta !== 'No definido') {
      logError('validateData', new Error('Cuenta inválida'), {
        account: data.cuenta,
        validAccounts: accounts
      });
      return { valid: false, error: '❌ Cuenta inválida.' };
    }
  } else {
    // Para gastos e ingresos, validar categorías
    let categories;
    let categoryType;

    if (data.tipo === 'gasto') {
      categories = expense_categories;
      categoryType = 'gastos';
    } else if (data.tipo === 'ingreso') {
      categories = income_categories;
      categoryType = 'ingresos';
    }

    // Validar categoría
    if (!Object.keys(categories).includes(data.categoria)) {
      logError('validateData', new Error(`Categoría inválida para ${categoryType}`), {
        category: data.categoria,
        validCategories: Object.keys(categories),
        type: data.tipo
      });
      return { valid: false, error: `❌ Categoría inválida para ${categoryType}.` };
    }

    // Validar subcategoría
    if (!categories[data.categoria].includes(data.subcategoria)) {
      logError('validateData', new Error(`Subcategoría inválida para la categoría seleccionada en ${categoryType}`), {
        category: data.categoria,
        subcategory: data.subcategoria,
        validSubcategories: categories[data.categoria],
        type: data.tipo,
        ...getValidationErrorDetails(data)
      });
      return { valid: false, error: `❌ Subcategoría inválida para la categoría seleccionada en ${categoryType}.` };
    }

    // Validar formato de subcategoría usando función auxiliar
    if (!validateSubcategoryFormat(data.categoria, data.subcategoria)) {
      logError('validateData', new Error('Formato de subcategoría inválido - debe ser "Categoría > Subcategoría" y coincidir con la categoría'), {
        category: data.categoria,
        subcategory: data.subcategoria,
        expectedFormat: `${data.categoria} > [subcategoría]`
      });
      return { valid: false, error: '❌ Formato de subcategoría inválido. Debe ser "Categoría > Subcategoría" y coincidir con la categoría.' };
    }

    // Validar cuenta principal
    if (!accounts.includes(data.cuenta) && data.cuenta !== 'No definido') {
      logError('validateData', new Error('Cuenta inválida'), {
        account: data.cuenta,
        validAccounts: accounts
      });
      return { valid: false, error: '❌ Cuenta inválida.' };
    }
  }

  // Validar fecha si está presente
  if ('fecha' in data && data.fecha) {
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(data.fecha)) {
      logError('validateData', new Error('Formato de fecha inválido - debe ser dd/MM/yyyy'), { date: data.fecha });
      return { valid: false, error: '❌ Formato de fecha inválido. Debe ser dd/MM/yyyy.' };
    }

    // Verificar que la fecha sea válida
    const [day, month, year] = data.fecha.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    if (isNaN(dateObj.getTime()) || dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year) {
      logError('validateData', new Error('Fecha inválida'), { date: data.fecha });
      return { valid: false, error: '❌ Fecha inválida.' };
    }
  }

  // Validar número de cuotas si está presente
  if ('cuotas' in data && data.cuotas !== undefined && data.cuotas !== null && data.cuotas !== 'No especificado') {
    const cuotas = parseInt(data.cuotas);
    if (isNaN(cuotas) || cuotas < 1 || cuotas > 60) {
      logError('validateData', new Error('Número de cuotas inválido - debe ser un número entero entre 1 y 60'), {
        cuotas: data.cuotas
      });
      return { valid: false, error: '❌ Número de cuotas inválido. Debe ser un número entero entre 1 y 60.' };
    }

    // Validar que las cuotas solo se apliquen a gastos
    if (data.tipo !== 'gasto') {
      logError('validateData', new Error('Las cuotas solo se aplican a gastos'), {
        type: data.tipo,
        cuotas: data.cuotas
      });
      return { valid: false, error: '❌ Las cuotas solo se aplican a gastos.' };
    }
  }

  return { valid: true, error: null };
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
  const { expense_categories, income_categories, investment_categories, accounts } = CONFIG.loadConfigData();
  
  return {
    receivedData: data,
    availableAccounts: accounts,
    availableExpenseCategories: Object.keys(expense_categories),
    availableIncomeCategories: Object.keys(income_categories),
    availableInvestmentCategories: Object.keys(investment_categories),
    timestamp: new Date().toISOString()
  };
}
