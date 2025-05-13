// src/controllers/supervisorController.js
const authMiddleware = require('../middleware/authMiddleware');
const cajaService = require('../services/cajaService');
const telegramService = require('../services/telegramService');
const messageHelper = require('../utils/messageHelper');

const supervisorController = {
  state: {
    pendingConfirmations: {},
    waitingForConcept: {} // Estado para esperar el concepto
  },

  handleSupervisorMenu: async (chatId, userId) => {
    if (!authMiddleware.isSupervisor(userId)) {
      await telegramService.sendSafeMessage(
        chatId, 
        '❌ ¡Ups! No tienes permiso para acceder al menú.'
      );
      return;
    }

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
    if (!authMiddleware.isSupervisor(userId)) return;

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
    if (!authMiddleware.isSupervisor(userId)) return;

    await telegramService.sendSafeMessage(
      chatId, 
      '➕ *Agregar Dinero*:\n¿Cuánto deseas agregar?', 
      { parse_mode: 'Markdown' }
    );
    
    supervisorController.state.pendingConfirmations[userId] = { chatId, tipo: 'agregarDinero' };
  },

  subtractMoney: async (chatId, userId) => {
    if (!authMiddleware.isSupervisor(userId)) return;

    await telegramService.sendSafeMessage(
      chatId, 
      '➖ *Restar Dinero*:\n¿Cuánto deseas restar?', 
      { parse_mode: 'Markdown' }
    );
    
    supervisorController.state.pendingConfirmations[userId] = { chatId, tipo: 'restarDinero' };
  },

  confirmAddMoney: async (chatId, userId) => {
    const confirmacion = supervisorController.state.pendingConfirmations[userId];
    if (!confirmacion || confirmacion.tipo !== 'agregarDinero') {
      await telegramService.sendSafeMessage(
        chatId, 
        '⚠️ No hay una acción pendiente de confirmación.'
      );
      return;
    }

    const cantidad = confirmacion.cantidad;
    const caja = await cajaService.findCaja(chatId);
    
    if (!caja) {
      await telegramService.sendSafeMessage(
        chatId, 
        '⚠️ La caja chica no ha sido iniciada.'
      );
      return;
    }

    // En lugar de actualizar el saldo directamente, solicitamos el concepto
    await telegramService.sendSafeMessage(
      chatId, 
      '📝 Por favor, ingresa el concepto o descripción de este ingreso:',
      { parse_mode: 'Markdown' }
    );
    
    // Guardamos la operación pendiente para procesarla cuando se reciba el concepto
    supervisorController.state.waitingForConcept[userId] = {
      chatId,
      tipo: 'ingreso',
      cantidad
    };
    
    delete supervisorController.state.pendingConfirmations[userId];
  },

  confirmSubtractMoney: async (chatId, userId) => {
    const confirmacion = supervisorController.state.pendingConfirmations[userId];
    if (!confirmacion || confirmacion.tipo !== 'restarDinero') {
      await telegramService.sendSafeMessage(
        chatId, 
        '⚠️ No hay una acción pendiente de confirmación.'
      );
      return;
    }

    const cantidad = confirmacion.cantidad;
    const caja = await cajaService.findCaja(chatId);
    
    if (!caja) {
      await telegramService.sendSafeMessage(
        chatId, 
        '⚠️ La caja chica no ha sido iniciada.'
      );
      return;
    }

    if (cantidad > caja.saldo) {
      await telegramService.sendSafeMessage(
        chatId, 
        `⚠️ No puedes restar una cantidad mayor al saldo actual de la caja chica (*$${caja.saldo.toFixed(2)}* pesos).`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // Solicitamos el concepto
    await telegramService.sendSafeMessage(
      chatId, 
      '📝 Por favor, ingresa el concepto o descripción de este gasto:',
      { parse_mode: 'Markdown' }
    );
    
    // Guardamos la operación pendiente
    supervisorController.state.waitingForConcept[userId] = {
      chatId,
      tipo: 'gasto',
      cantidad
    };
    
    delete supervisorController.state.pendingConfirmations[userId];
  },

  processConceptAndUpdateSaldo: async (chatId, userId, concepto) => {
    const pendingTransaction = supervisorController.state.waitingForConcept[userId];
    
    if (!pendingTransaction) {
      return false; // No hay transacción pendiente, no procesar
    }
    
    try {
      const { tipo, cantidad } = pendingTransaction;
      const caja = await cajaService.findCaja(chatId);
      
      if (!caja) {
        await telegramService.sendSafeMessage(
          chatId, 
          '⚠️ La caja chica no ha sido iniciada.'
        );
        delete supervisorController.state.waitingForConcept[userId];
        return true;
      }
      
      // Actualizar saldo según el tipo de transacción
      let nuevoSaldo;
      if (tipo === 'ingreso') {
        nuevoSaldo = caja.saldo + cantidad;
      } else { // tipo === 'gasto'
        nuevoSaldo = caja.saldo - cantidad;
      }
      
      // Agregar transacción al modelo
      if (!caja.transacciones) {
        caja.transacciones = [];
      }
      
      caja.transacciones.push({
        tipo,
        monto: cantidad,
        concepto,
        fecha: new Date()
      });
      
      caja.saldo = nuevoSaldo;
      await caja.save();
      
      // Enviar confirmación al usuario según el tipo
      let mensaje;
      if (tipo === 'ingreso') {
        mensaje = `✅ Se han agregado *$${cantidad.toFixed(2)}* pesos. Nuevo saldo: *$${nuevoSaldo.toFixed(2)}* pesos. 💵\n📝 Concepto: *${concepto}*`;
      } else {
        mensaje = `✅ Se han restado *$${cantidad.toFixed(2)}* pesos. Nuevo saldo: *$${nuevoSaldo.toFixed(2)}* pesos. 💸\n📝 Concepto: *${concepto}*`;
      }
      
      await telegramService.sendSafeMessage(
        chatId,
        mensaje,
        { parse_mode: 'Markdown' }
      );
      
      // Limpiar el estado
      delete supervisorController.state.waitingForConcept[userId];
      return true;
    } catch (error) {
      console.error('Error al procesar concepto de transacción:', error);
      await telegramService.sendSafeMessage(
        chatId,
        '❌ Error al registrar la transacción. Por favor, intenta nuevamente.'
      );
      delete supervisorController.state.waitingForConcept[userId];
      return true;
    }
  },

  cancelOperation: async (chatId, userId) => {
    await telegramService.sendSafeMessage(chatId, '🚫 Operación cancelada.');
    delete supervisorController.state.pendingConfirmations[userId];
    delete supervisorController.state.waitingForConcept[userId]; // También cancelar conceptos pendientes
  }
};

module.exports = supervisorController;