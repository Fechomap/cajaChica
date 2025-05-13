// src/services/cajaService.js
const CajaChica = require('../models/CajaChica');

const cajaService = {
  findCaja: async (chatId) => {
    try {
      return await CajaChica.findOne({ chatId });
    } catch (error) {
      console.error('Error al buscar caja:', error);
      throw error;
    }
  },

  createCaja: async (chatId, saldo) => {
    try {
      const nuevaCaja = new CajaChica({ 
        chatId, 
        saldo,
        transacciones: [{
          tipo: 'ingreso',
          monto: saldo,
          concepto: 'Saldo inicial',
          fecha: new Date()
        }]
      });
      return await nuevaCaja.save();
    } catch (error) {
      console.error('Error al crear caja:', error);
      throw error;
    }
  },

  updateSaldo: async (chatId, nuevoSaldo) => {
    try {
      const caja = await CajaChica.findOne({ chatId });
      if (!caja) {
        throw new Error('Caja no encontrada');
      }
      caja.saldo = nuevoSaldo;
      return await caja.save();
    } catch (error) {
      console.error('Error al actualizar saldo:', error);
      throw error;
    }
  },

  // Nuevo método para registrar transacción con concepto
  registerTransaction: async (chatId, tipo, monto, concepto) => {
    try {
      const caja = await CajaChica.findOne({ chatId });
      if (!caja) {
        throw new Error('Caja no encontrada');
      }
      
      // Actualizar saldo según el tipo de transacción
      if (tipo === 'ingreso') {
        caja.saldo += monto;
      } else if (tipo === 'gasto') {
        caja.saldo -= monto;
      }
      
      // Asegurarse de que existe la propiedad transacciones
      if (!caja.transacciones) {
        caja.transacciones = [];
      }
      
      // Agregar la nueva transacción
      caja.transacciones.push({
        tipo,
        monto,
        concepto,
        fecha: new Date()
      });
      
      return await caja.save();
    } catch (error) {
      console.error('Error al registrar transacción:', error);
      throw error;
    }
  },

  findAllCajas: async () => {
    try {
      return await CajaChica.find({});
    } catch (error) {
      console.error('Error al obtener todas las cajas:', error);
      throw error;
    }
  },

  getTransactionHistory: async (chatId) => {
    try {
      const caja = await CajaChica.findOne({ chatId });
      if (!caja) {
        throw new Error('Caja no encontrada');
      }
      return caja.transacciones || [];
    } catch (error) {
      console.error('Error al obtener historial de transacciones:', error);
      throw error;
    }
  },

  updateChatId: async (oldChatId, newChatId) => {
    try {
      return await CajaChica.findOneAndUpdate(
        { chatId: oldChatId },
        { chatId: newChatId },
        { new: true }
      );
    } catch (error) {
      console.error('Error al actualizar chat ID:', error);
      throw error;
    }
  }
};

module.exports = cajaService;