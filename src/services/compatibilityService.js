// Servicio de compatibilidad para trabajar con MongoDB mientras se migra a PostgreSQL
const CajaChica = require('../models/CajaChica');
const environment = require('../config/environment');

class CompatibilityService {
  constructor() {
    this.isUsingMongoDB = null; // Se determinará en la primera verificación
    this.dbMode = null;
  }

  // Verificar si estamos usando MongoDB o PostgreSQL
  async checkDatabaseMode() {
    // Si ya verificamos, retornar el resultado cacheado
    if (this.dbMode !== null) {
      return this.dbMode;
    }
    
    try {
      const environment = require('../config/environment');
      
      // Si no hay URL de PostgreSQL o es la URL por defecto, usar MongoDB
      if (!environment.database.postgresUrl || 
          environment.database.postgresUrl === "postgresql://postgres:password@localhost:5432/caja_chica?schema=public") {
        this.isUsingMongoDB = true;
        this.dbMode = 'mongodb';
        return 'mongodb';
      }
      
      const prisma = require('../lib/prisma');
      await prisma.$queryRaw`SELECT 1`;
      this.isUsingMongoDB = false;
      this.dbMode = 'postgresql';
      return 'postgresql';
    } catch (error) {
      this.isUsingMongoDB = true;
      this.dbMode = 'mongodb';
      return 'mongodb';
    }
  }

  // Adaptador para encontrar grupo/caja
  async findGroup(chatId) {
    if (this.isUsingMongoDB) {
      const caja = await CajaChica.findOne({ chatId });
      if (!caja) return null;
      
      // Convertir formato MongoDB a formato esperado
      return {
        id: caja._id.toString(),
        telegramId: chatId,
        title: 'Grupo MongoDB',
        balance: caja.saldo,
        isInitialized: caja.saldo > 0,
        organizationId: 'default',
        organization: {
          id: 'default',
          name: 'Organización Principal',
        },
      };
    } else {
      const groupRepository = require('../repositories/groupRepository');
      return await groupRepository.findByTelegramId(chatId);
    }
  }

  // Adaptador para crear transacción
  async createTransaction(data) {
    if (this.isUsingMongoDB) {
      const caja = await CajaChica.findOne({ chatId: data.chatId });
      if (!caja) throw new Error('Caja no encontrada');

      const monto = parseFloat(data.amount);
      const nuevoSaldo = data.type === 'INCOME' 
        ? caja.saldo + monto 
        : caja.saldo - monto;

      if (nuevoSaldo < 0) {
        throw new Error('Saldo insuficiente');
      }

      caja.saldo = nuevoSaldo;
      caja.transacciones.push({
        tipo: data.type === 'INCOME' ? 'ingreso' : 'egreso',
        monto: monto,
        concepto: data.concept,
        fecha: new Date(),
        saldoDespues: nuevoSaldo,
      });

      await caja.save();

      return {
        id: caja.transacciones[caja.transacciones.length - 1]._id,
        amount: monto,
        concept: data.concept,
        type: data.type,
        balanceAfter: nuevoSaldo,
        createdAt: new Date(),
      };
    } else {
      const transactionRepository = require('../repositories/transactionRepository');
      return await transactionRepository.create(data);
    }
  }

  // Adaptador para obtener usuario
  async getUser(telegramId) {
    if (this.isUsingMongoDB) {
      // Crear usuario mock para MongoDB
      const supervisorIds = environment.supervisors.authorized;
      const isSupervisor = supervisorIds.includes(Number(telegramId));
      
      return {
        id: `mongo_user_${telegramId}`,
        telegramId: telegramId,
        role: isSupervisor ? 'SUPERVISOR' : 'MEMBER',
        organizationId: 'default',
        organization: {
          id: 'default',
          name: 'Organización Principal',
        },
      };
    } else {
      const userRepository = require('../repositories/userRepository');
      return await userRepository.findByTelegramId(telegramId);
    }
  }

  // Adaptador para inicializar caja
  async initializeCashBox(chatId, initialBalance, userId) {
    if (this.isUsingMongoDB) {
      const cajaService = require('./cajaService');
      return await cajaService.createCaja(chatId, initialBalance);
    } else {
      const groupRepository = require('../repositories/groupRepository');
      const group = await this.findGroup(chatId);
      if (!group) throw new Error('Grupo no encontrado');
      return await groupRepository.initializeCashBox(group.id, initialBalance, userId);
    }
  }
}

module.exports = new CompatibilityService();