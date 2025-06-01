const prisma = require('../lib/prisma');
const { Decimal } = require('@prisma/client/runtime/library');

class TransactionRepository {
  async create(data) {
    return prisma.$transaction(async (tx) => {
      // Obtener el balance actual
      const group = await tx.group.findUnique({
        where: { id: data.groupId },
        select: { balance: true },
      });

      const currentBalance = new Decimal(group.balance);
      const amount = new Decimal(data.amount);
      
      // Calcular nuevo balance
      const newBalance = data.type === 'INCOME' 
        ? currentBalance.plus(amount)
        : currentBalance.minus(amount);

      // Verificar que no quede negativo
      if (newBalance.lessThan(0)) {
        throw new Error('Saldo insuficiente');
      }

      // Crear transacción
      const transaction = await tx.transaction.create({
        data: {
          ...data,
          amount,
          balanceAfter: newBalance,
        },
        include: {
          user: true,
          group: true,
          attachments: true,
        },
      });

      // Actualizar balance del grupo
      await tx.group.update({
        where: { id: data.groupId },
        data: { balance: newBalance },
      });

      // Crear log
      await tx.cashBoxLog.create({
        data: {
          groupId: data.groupId,
          userId: data.userId,
          action: data.type,
          details: {
            amount: amount.toString(),
            concept: data.concept,
            balanceAfter: newBalance.toString(),
          },
        },
      });

      return transaction;
    });
  }

  async findById(id) {
    return prisma.transaction.findUnique({
      where: { id },
      include: {
        user: true,
        group: {
          include: {
            organization: true,
          },
        },
        attachments: true,
      },
    });
  }

  async getByGroup(groupId, options = {}) {
    const { limit = 10, offset = 0, startDate, endDate, type } = options;

    const where = { groupId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: true,
          attachments: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      hasMore: offset + limit < total,
    };
  }

  async getSummary(groupId, startDate, endDate) {
    const where = {
      groupId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    const [income, expense, transactions] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, type: 'INCOME' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: 'EXPENSE' },
        _sum: { amount: true },
      }),
      prisma.transaction.findMany({
        where,
        include: {
          user: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalIncome: income._sum.amount || new Decimal(0),
      totalExpense: expense._sum.amount || new Decimal(0),
      netFlow: (income._sum.amount || new Decimal(0)).minus(expense._sum.amount || new Decimal(0)),
      transactionCount: transactions.length,
      transactions,
    };
  }

  async addAttachment(transactionId, attachmentData) {
    return prisma.attachment.create({
      data: {
        ...attachmentData,
        transactionId,
      },
    });
  }

  async getTopConcepts(groupId, limit = 5) {
    const result = await prisma.$queryRaw`
      SELECT concept, COUNT(*) as count, SUM(amount) as total
      FROM "Transaction"
      WHERE "groupId" = ${groupId} AND type = 'EXPENSE'
      GROUP BY concept
      ORDER BY count DESC
      LIMIT ${limit}
    `;

    return result;
  }
}

module.exports = new TransactionRepository();