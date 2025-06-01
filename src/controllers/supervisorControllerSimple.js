// Controlador simplificado que funciona con MongoDB mientras migramos
const cajaService = require('../services/cajaService');
const telegramService = require('../services/telegramService');
const messageHelper = require('../utils/messageHelper');
const authService = require('../services/authService');

const supervisorController = {
  state: {
    pendingConfirmations: {},
    waitingForConcept: {}
  },

  handleSupervisorMenu: async (ctx) => {
    const chatId = ctx.chat.id;
    
    await telegramService.sendSafeMessage(
      chatId, 
      '🛠️ *Menú de Supervisores*:\nElige una opción:', 
      { 
        parse_mode: 'Markdown', 
        ...messageHelper.getSupervisorMenu() 
      }
    );
  },

  initializeCaja: async (chatId, userId) => {
    const caja = await cajaService.findCaja(chatId);
    if (caja) {
      await telegramService.sendSafeMessage(
        chatId, 
        '⚠️ La caja chica ya ha sido iniciada y no puede reiniciarse.'
      );
      return;
    }

    await telegramService.sendSafeMessage(
      chatId, 
      '🏁 *Iniciar Caja Chica*:\nPor favor, ingresa el monto inicial:', 
      { parse_mode: 'Markdown' }
    );
    
    supervisorController.state.pendingConfirmations[userId] = { chatId, tipo: 'iniciarCaja' };
  },

  addMoney: async (chatId, userId) => {
    await telegramService.sendSafeMessage(
      chatId, 
      '➕ *Agregar Dinero*:\n¿Cuánto deseas agregar?', 
      { parse_mode: 'Markdown' }
    );
    
    supervisorController.state.pendingConfirmations[userId] = { chatId, tipo: 'agregarDinero' };
  },

  subtractMoney: async (chatId, userId) => {
    // NUEVO: Establecer el estado esperando concepto
    supervisorController.state.waitingForConcept[userId] = { chatId, tipo: 'restarDinero' };
    
    await telegramService.sendSafeMessage(
      chatId, 
      '➖ *Restar Dinero*:\n¿Para qué es el gasto? (describe el concepto)', 
      { parse_mode: 'Markdown' }
    );
  },

  viewBalance: async (chatId, userId) => {
    const caja = await cajaService.findCaja(chatId);
    
    if (!caja) {
      await telegramService.sendSafeMessage(
        chatId, 
        '⚠️ Primero debes iniciar la caja chica.'
      );
      return;
    }
    
    await telegramService.sendSaldoMessage(chatId, caja.saldo);
  },

  confirmAddMoney: async (chatId, userId, cantidad) => {
    try {
      const updatedCaja = await cajaService.updateSaldo(chatId, cantidad, 'add');
      await telegramService.sendOperationConfirmation(chatId, 'add', cantidad, updatedCaja.saldo);
      delete supervisorController.state.pendingConfirmations[userId];
    } catch (error) {
      console.error('Error en confirmAddMoney:', error);
      await telegramService.sendSafeMessage(chatId, '❌ Error al actualizar el saldo.');
    }
  },

  confirmSubtractMoney: async (chatId, userId, cantidad, concepto) => {
    try {
      const updatedCaja = await cajaService.registerTransaction(chatId, cantidad, 'egreso', concepto);
      await telegramService.sendOperationConfirmation(chatId, 'subtract', cantidad, updatedCaja.saldo);
      delete supervisorController.state.pendingConfirmations[userId];
    } catch (error) {
      console.error('Error en confirmSubtractMoney:', error);
      await telegramService.sendSafeMessage(chatId, '❌ Error al actualizar el saldo.');
    }
  },

  cancelOperation: async (chatId, userId) => {
    delete supervisorController.state.pendingConfirmations[userId];
    await telegramService.sendSafeMessage(chatId, '❌ Operación cancelada.');
  },

  processConceptAndUpdateSaldo: async (chatId, userId, concepto) => {
    // Establecer el concepto y pedir la cantidad
    supervisorController.state.pendingConfirmations[userId] = { 
      chatId, 
      tipo: 'restarDinero',
      concepto: concepto 
    };
    
    await telegramService.sendSafeMessage(
      chatId, 
      `📝 Concepto registrado: *${concepto}*\n\n💵 Ahora, ¿cuánto dinero deseas restar?`, 
      { parse_mode: 'Markdown' }
    );
    
    // Limpiar el estado de espera de concepto
    delete supervisorController.state.waitingForConcept[userId];
  }
};

module.exports = supervisorController;