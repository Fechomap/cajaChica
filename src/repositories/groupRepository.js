const prisma = require('../lib/prisma');

class GroupRepository {
  async findByTelegramId(telegramId) {
    return prisma.group.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: {
        organization: true,
        supervisors: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findById(id) {
    return prisma.group.findUnique({
      where: { id },
      include: {
        organization: true,
        supervisors: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async create(data) {
    return prisma.group.create({
      data: {
        ...data,
        telegramId: BigInt(data.telegramId),
      },
      include: {
        organization: true,
      },
    });
  }

  async update(id, data) {
    return prisma.group.update({
      where: { id },
      data,
      include: {
        organization: true,
        supervisors: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async addSupervisor(groupId, userId, addedBy = null) {
    return prisma.groupSupervisor.create({
      data: {
        groupId,
        userId,
        addedBy,
      },
      include: {
        user: true,
        group: true,
      },
    });
  }

  async removeSupervisor(groupId, userId) {
    return prisma.groupSupervisor.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });
  }

  async getSupervisors(groupId) {
    const supervisors = await prisma.groupSupervisor.findMany({
      where: { groupId },
      include: {
        user: true,
      },
    });

    return supervisors.map(s => s.user);
  }

  async isSupervisor(groupId, userId) {
    const supervisor = await prisma.groupSupervisor.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    return !!supervisor;
  }

  async initializeCashBox(groupId, initialBalance, userId) {
    return prisma.$transaction(async (tx) => {
      // Actualizar el grupo
      const group = await tx.group.update({
        where: { id: groupId },
        data: {
          isInitialized: true,
          initialBalance,
          balance: initialBalance,
        },
      });

      // Crear transacción inicial
      await tx.transaction.create({
        data: {
          groupId,
          userId,
          type: 'INCOME',
          amount: initialBalance,
          concept: 'Saldo inicial de caja chica',
          balanceAfter: initialBalance,
        },
      });

      // Crear log
      await tx.cashBoxLog.create({
        data: {
          groupId,
          userId,
          action: 'INITIALIZE',
          details: {
            initialBalance: initialBalance.toString(),
          },
        },
      });

      return group;
    });
  }

  async getByOrganization(organizationId, includeInactive = false) {
    const where = {
      organizationId,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    return prisma.group.findMany({
      where,
      include: {
        supervisors: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

module.exports = new GroupRepository();