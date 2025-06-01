const prisma = require('../lib/prisma');

class OrganizationRepository {
  async create(data) {
    return prisma.organization.create({
      data,
      include: {
        bankInfo: true,
      },
    });
  }

  async findById(id) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        bankInfo: true,
        users: true,
        groups: true,
      },
    });
  }

  async findBySlug(slug) {
    return prisma.organization.findUnique({
      where: { slug },
      include: {
        bankInfo: true,
      },
    });
  }

  async update(id, data) {
    return prisma.organization.update({
      where: { id },
      data,
      include: {
        bankInfo: true,
      },
    });
  }

  async updateBankInfo(organizationId, bankData) {
    return prisma.bankInfo.upsert({
      where: { organizationId },
      update: bankData,
      create: {
        ...bankData,
        organizationId,
      },
    });
  }

  async checkLimits(organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        maxGroups: true,
        maxUsers: true,
        maxTransactions: true,
        _count: {
          select: {
            groups: true,
            users: true,
          },
        },
      },
    });

    const transactionCount = await prisma.transaction.count({
      where: {
        group: {
          organizationId,
        },
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    return {
      groups: {
        current: org._count.groups,
        limit: org.maxGroups,
        available: org.maxGroups - org._count.groups,
      },
      users: {
        current: org._count.users,
        limit: org.maxUsers,
        available: org.maxUsers - org._count.users,
      },
      transactions: {
        current: transactionCount,
        limit: org.maxTransactions,
        available: org.maxTransactions - transactionCount,
      },
    };
  }
}

module.exports = new OrganizationRepository();