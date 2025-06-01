// Controlador que utiliza los nuevos servicios PostgreSQL
const groupService = require('../services/groupService');
const transactionService = require('../services/transactionService');
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
    try {
      const group = await groupService.getGroupWithAuth(chatId, userId);
      if (group.isInitialized) {
        await telegramService.sendSafeMessage(
          chatId, 
          '⚠️ La caja chica ya ha sido iniciada y no puede reiniciarse.'
        );
        return;
      }
    } catch (error) {
      if (error.message === 'Grupo no registrado') {
        await telegramService.sendSafeMessage(
          chatId, 
          '⚠️ Este grupo no está registrado. Contacta al administrador.'
        );
        return;
      }
    }

    await telegramService.sendSafeMessage(
      chatId, 
      '🏁 *Iniciar Caja Chica*:\nPor favor, ingresa el monto inicial:', 
      { parse_mode: 'Markdown' }
    );
    
    supervisorController.state.pendingConfirmations[userId] = { chatId, tipo: 'iniciarCaja' };
  },

  addMoney: async (chatId, userId) => {
    // Establecer el estado esperando concepto (igual que restar)
    supervisorController.state.waitingForConcept[userId] = { chatId, tipo: 'agregarDinero' };
    
    await telegramService.sendSafeMessage(
      chatId, 
      '➕ *Agregar Dinero*:\n¿Cuál es el concepto del ingreso? (describe el origen del dinero)', 
      { parse_mode: 'Markdown' }
    );
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
    try {
      const group = await groupService.getGroupWithAuth(chatId, userId);
      const balanceData = await transactionService.getBalance(group.id, userId);
      
      if (!balanceData.isInitialized) {
        await telegramService.sendSafeMessage(
          chatId, 
          '⚠️ Primero debes iniciar la caja chica.'
        );
        return;
      }
      
      await telegramService.sendSaldoMessage(chatId, balanceData.balance);
    } catch (error) {
      await telegramService.sendSafeMessage(
        chatId, 
        '⚠️ Error al obtener el saldo. Grupo no registrado o sin permisos.'
      );
    }
  },

  confirmAddMoney: async (chatId, userId, cantidad, concepto) => {
    try {
      // userId es realmente telegramId, necesitamos obtener el user real
      const user = await authService.getUserContext(userId);
      const group = await groupService.getGroupWithAuth(chatId, userId);
      const transaction = await transactionService.createTransaction({
        groupId: group.id,
        type: 'INCOME',
        amount: cantidad,
        concept: concepto
      }, user.user.id);
      
      const balanceData = await transactionService.getBalance(group.id, user.user.id);
      await telegramService.sendOperationConfirmation(chatId, 'add', cantidad, balanceData.balance);
      delete supervisorController.state.pendingConfirmations[userId];
    } catch (error) {
      console.error('Error en confirmAddMoney:', error);
      await telegramService.sendSafeMessage(chatId, `❌ Error al actualizar el saldo: ${error.message}`);
    }
  },

  confirmSubtractMoney: async (chatId, userId, cantidad, concepto) => {
    try {
      // userId es realmente telegramId, necesitamos obtener el user real
      const user = await authService.getUserContext(userId);
      const group = await groupService.getGroupWithAuth(chatId, userId);
      const transaction = await transactionService.createTransaction({
        groupId: group.id,
        type: 'EXPENSE',
        amount: cantidad,
        concept: concepto
      }, user.user.id);
      
      const balanceData = await transactionService.getBalance(group.id, user.user.id);
      await telegramService.sendOperationConfirmation(chatId, 'subtract', cantidad, balanceData.balance);
      delete supervisorController.state.pendingConfirmations[userId];
    } catch (error) {
      console.error('Error en confirmSubtractMoney:', error);
      await telegramService.sendSafeMessage(chatId, `❌ Error al actualizar el saldo: ${error.message}`);
    }
  },

  cancelOperation: async (chatId, userId) => {
    delete supervisorController.state.pendingConfirmations[userId];
    await telegramService.sendSafeMessage(chatId, '❌ Operación cancelada.');
  },

  processConceptAndUpdateSaldo: async (chatId, userId, concepto) => {
    // Obtener el tipo de operación del estado
    const operacion = supervisorController.state.waitingForConcept[userId];
    
    if (!operacion) return;
    
    // Establecer el concepto y pedir la cantidad
    supervisorController.state.pendingConfirmations[userId] = { 
      chatId, 
      tipo: operacion.tipo,
      concepto: concepto 
    };
    
    const mensaje = operacion.tipo === 'agregarDinero' 
      ? `📝 Concepto registrado: *${concepto}*\n\n💵 Ahora, ¿cuánto dinero deseas agregar?`
      : `📝 Concepto registrado: *${concepto}*\n\n💵 Ahora, ¿cuánto dinero deseas restar?`;
    
    await telegramService.sendSafeMessage(
      chatId, 
      mensaje, 
      { parse_mode: 'Markdown' }
    );
    
    // Limpiar el estado de espera de concepto
    delete supervisorController.state.waitingForConcept[userId];
  }
};

module.exports = supervisorController;