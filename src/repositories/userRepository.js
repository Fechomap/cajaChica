const prisma = require('../lib/prisma');

class UserRepository {
  async findByTelegramId(telegramId) {
    return prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: {
        organization: true,
        supervisorGroups: {
          include: {
            group: true,
          },
        },
      },
    });
  }

  async create(data) {
    return prisma.user.create({
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
    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        lastActiveAt: new Date(),
      },
      include: {
        organization: true,
      },
    });
  }

  async assignToOrganization(userId, organizationId, role = 'MEMBER') {
    return prisma.user.update({
      where: { id: userId },
      data: {
        organizationId,
        role,
      },
      include: {
        organization: true,
      },
    });
  }

  async getSupervisedGroups(userId) {
    const supervisorGroups = await prisma.groupSupervisor.findMany({
      where: { userId },
      include: {
        group: {
          include: {
            organization: true,
          },
        },
      },
    });

    return supervisorGroups.map(sg => sg.group);
  }

  async hasPermission(userId, permission, groupId = null) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        permissions: true,
        supervisorGroups: groupId ? {
          where: { groupId },
        } : true,
      },
    });

    if (!user) return false;

    // Owners tienen todos los permisos
    if (user.role === 'OWNER') return true;

    // Admins tienen la mayoría de permisos
    if (user.role === 'ADMIN' && permission !== 'organization.delete') return true;

    // Supervisores tienen permisos en sus grupos
    if (groupId && user.supervisorGroups.length > 0) {
      const supervisorPermissions = [
        'transaction.create',
        'transaction.view',
        'balance.view',
        'balance.initialize',
      ];
      return supervisorPermissions.includes(permission);
    }

    // Verificar permisos específicos
    return user.permissions.includes(permission);
  }
}

module.exports = new UserRepository();