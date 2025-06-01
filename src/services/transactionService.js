const transactionRepository = require('../repositories/transactionRepository');
const groupRepository = require('../repositories/groupRepository');
const authService = require('./authService');
const organizationService = require('./organizationService');
const { Decimal } = require('@prisma/client/runtime/library');

class TransactionService {
  async createTransaction(data, userId) {
    const { groupId, type, amount, concept } = data;

    // Verificar permisos
    await authService.checkPermission(userId, 'transaction.create', groupId);

    // Verificar que el grupo existe y está activo
    const group = await groupRepository.findById(groupId);
    
    if (!group) {
      throw new Error('Grupo no encontrado');
    }

    if (!group.isActive) {
      throw new Error('El grupo está inactivo');
    }

    if (!group.isInitialized) {
      throw new Error('La caja chica no ha sido inicializada');
    }

    // Verificar límites de transacciones
    await organizationService.checkResourceLimits(group.organizationId, 'transactions');

    // Validar datos
    if (amount <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    if (!concept || concept.trim().length < 3) {
      throw new Error('El concepto debe tener al menos 3 caracteres');
    }

    // Crear transacción
    try {
      const transaction = await transactionRepository.create({
        groupId,
        userId,
        type,
        amount: new Decimal(amount),
        concept: concept.trim(),
      });

      return transaction;
    } catch (error) {
      if (error.message === 'Saldo insuficiente') {
        const group = await groupRepository.findById(groupId);
        throw new Error(`Saldo insuficiente. Saldo actual: $${group.balance}`);
      }
      throw error;
    }
  }

  async getTransaction(transactionId, userId) {
    const transaction = await transactionRepository.findById(transactionId);
    
    if (!transaction) {
      throw new Error('Transacción no encontrada');
    }

    // Verificar permisos
    await authService.checkPermission(userId, 'transaction.view', transaction.groupId);

    return transaction;
  }

  async getGroupTransactions(groupId, userId, options = {}) {
    // Verificar permisos
    await authService.checkPermission(userId, 'transaction.view', groupId);

    return transactionRepository.getByGroup(groupId, options);
  }

  async getTransactionSummary(groupId, userId, startDate, endDate) {
    // Verificar permisos
    await authService.checkPermission(userId, 'balance.view', groupId);

    const group = await groupRepository.findById(groupId);
    
    if (!group) {
      throw new Error('Grupo no encontrado');
    }

    const summary = await transactionRepository.getSummary(groupId, startDate, endDate);

    return {
      group: {
        id: group.id,
        title: group.title,
        currentBalance: group.balance,
      },
      period: {
        start: startDate,
        end: endDate,
      },
      ...summary,
    };
  }

  async getTopConcepts(groupId, userId, limit = 5) {
    // Verificar permisos
    await authService.checkPermission(userId, 'transaction.view', groupId);

    return transactionRepository.getTopConcepts(groupId, limit);
  }

  async addAttachment(transactionId, attachmentData, userId) {
    const transaction = await transactionRepository.findById(transactionId);
    
    if (!transaction) {
      throw new Error('Transacción no encontrada');
    }

    // Verificar permisos
    await authService.checkPermission(userId, 'transaction.create', transaction.groupId);

    // Solo el creador puede agregar adjuntos
    if (transaction.userId !== userId) {
      throw new Error('Solo el creador de la transacción puede agregar archivos');
    }

    return transactionRepository.addAttachment(transactionId, attachmentData);
  }

  async getBalance(groupId, userId) {
    // Verificar permisos
    await authService.checkPermission(userId, 'balance.view', groupId);

    const group = await groupRepository.findById(groupId);
    
    if (!group) {
      throw new Error('Grupo no encontrado');
    }

    const lastTransactions = await transactionRepository.getByGroup(groupId, { limit: 5 });

    return {
      balance: group.balance,
      isInitialized: group.isInitialized,
      lastTransactions: lastTransactions.transactions,
    };
  }
}

module.exports = new TransactionService();