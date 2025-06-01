class ValidationService {
  validateAmount(amount) {
    const errors = [];

    if (!amount && amount !== 0) {
      errors.push('El monto es requerido');
    }

    const numAmount = parseFloat(amount);

    if (isNaN(numAmount)) {
      errors.push('El monto debe ser un número válido');
    }

    if (numAmount <= 0) {
      errors.push('El monto debe ser mayor a 0');
    }

    if (numAmount > 999999) {
      errors.push('El monto excede el límite permitido');
    }

    // Verificar máximo 2 decimales
    if (amount.toString().includes('.')) {
      const decimals = amount.toString().split('.')[1];
      if (decimals && decimals.length > 2) {
        errors.push('El monto solo puede tener hasta 2 decimales');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: numAmount,
    };
  }

  validateConcept(concept) {
    const errors = [];

    if (!concept || concept.trim().length === 0) {
      errors.push('El concepto es requerido');
    }

    const trimmedConcept = concept ? concept.trim() : '';

    if (trimmedConcept.length < 3) {
      errors.push('El concepto debe tener al menos 3 caracteres');
    }

    if (trimmedConcept.length > 200) {
      errors.push('El concepto no puede exceder 200 caracteres');
    }

    // Verificar caracteres especiales peligrosos
    const dangerousChars = /[<>]/g;
    if (dangerousChars.test(trimmedConcept)) {
      errors.push('El concepto contiene caracteres no permitidos');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: trimmedConcept,
    };
  }

  validateWhatsAppNumber(number) {
    const errors = [];
    const cleanNumber = number.replace(/\D/g, '');

    if (cleanNumber.length !== 10) {
      errors.push('El número debe tener exactamente 10 dígitos');
    }

    if (!/^[0-9]+$/.test(cleanNumber)) {
      errors.push('El número solo debe contener dígitos');
    }

    return {
      isValid: errors.length === 0,
      errors,
      value: cleanNumber,
    };
  }

  validateTransactionData(data) {
    const errors = {};
    
    // Validar monto
    const amountValidation = this.validateAmount(data.amount);
    if (!amountValidation.isValid) {
      errors.amount = amountValidation.errors;
    }

    // Validar concepto
    const conceptValidation = this.validateConcept(data.concept);
    if (!conceptValidation.isValid) {
      errors.concept = conceptValidation.errors;
    }

    // Validar tipo
    if (!['INCOME', 'EXPENSE'].includes(data.type)) {
      errors.type = ['El tipo de transacción no es válido'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      values: {
        amount: amountValidation.value,
        concept: conceptValidation.value,
        type: data.type,
      },
    };
  }

  parseAmountFromText(text) {
    // Remover símbolos de moneda y espacios
    const cleanText = text.replace(/[$,\s]/g, '');
    
    // Buscar números con decimales
    const match = cleanText.match(/(\d+\.?\d{0,2})/);
    
    if (match) {
      return parseFloat(match[1]);
    }
    
    return null;
  }

  formatCurrency(amount) {
    const num = typeof amount === 'number' ? amount : parseFloat(amount.toString());
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(num);
  }
}

module.exports = new ValidationService();