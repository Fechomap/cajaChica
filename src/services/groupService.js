const groupRepository = require('../repositories/groupRepository');
const organizationService = require('./organizationService');
const authService = require('./authService');
const compatibilityService = require('./compatibilityService');

class GroupService {
  async registerGroup(chat, organizationId = null) {
    const dbMode = await compatibilityService.checkDatabaseMode();
    
    if (dbMode === 'mongodb') {
      // En modo MongoDB, retornar un grupo mock
      return await compatibilityService.findGroup(chat.id) || {
        id: chat.id.toString(),
        telegramId: chat.id,
        title: chat.title || chat.first_name || 'Grupo',
        organizationId: 'default',
        isActive: true,
      };
    }
    
    // Verificar si el grupo ya existe
    let group = await groupRepository.findByTelegramId(chat.id);

    if (!group) {
      // Si no se especifica organización, usar la por defecto
      if (!organizationId) {
        const defaultOrg = await organizationService.getDefaultOrganization();
        organizationId = defaultOrg.id;
      }

      // Verificar límites
      await organizationService.checkResourceLimits(organizationId, 'groups');

      // Crear nuevo grupo
      group = await groupRepository.create({
        telegramId: chat.id,
        organizationId,
        title: chat.title || chat.first_name || 'Grupo sin nombre',
        type: chat.type.toUpperCase(),
        username: chat.username,
        description: chat.description,
      });
    } else if (!group.isActive) {
      // Reactivar grupo inactivo
      group = await groupRepository.update(group.id, {
        isActive: true,
        title: chat.title || chat.first_name || group.title,
      });
    }

    return group;
  }

  async getGroupWithAuth(chatId, userId) {
    const dbMode = await compatibilityService.checkDatabaseMode();
    
    if (dbMode === 'mongodb') {
      const group = await compatibilityService.findGroup(chatId);
      if (!group) {
        // Crear grupo temporal
        return {
          id: chatId.toString(),
          telegramId: chatId,
          title: 'Grupo',
          organizationId: 'default',
          isActive: true,
          userCanManage: await authService.isLegacySupervisor(userId),
          userIsSupervisor: await authService.isLegacySupervisor(userId),
        };
      }
      
      return {
        ...group,
        userCanManage: await authService.isLegacySupervisor(userId),
        userIsSupervisor: await authService.isLegacySupervisor(userId),
      };
    }
    
    const group = await groupRepository.findByTelegramId(chatId);
    
    if (!group) {
      throw new Error('Grupo no registrado');
    }

    if (!group.isActive) {
      throw new Error('Grupo inactivo');
    }

    // Verificar permisos del usuario
    const user = await authService.getUserContext(userId);
    const isSupervisor = await groupRepository.isSupervisor(group.id, user.user.id);
    const canManage = user.user.role === 'OWNER' || 
                     user.user.role === 'ADMIN' || 
                     isSupervisor;

    return {
      ...group,
      userCanManage: canManage,
      userIsSupervisor: isSupervisor,
    };
  }

  async initializeCashBox(groupId, userId, initialBalance) {
    // Verificar permisos
    await authService.checkPermission(userId, 'balance.initialize', groupId);

    const group = await groupRepository.findById(groupId);
    
    if (!group) {
      throw new Error('Grupo no encontrado');
    }

    if (group.isInitialized) {
      throw new Error('La caja ya ha sido inicializada');
    }

    if (initialBalance < 0) {
      throw new Error('El saldo inicial no puede ser negativo');
    }

    return groupRepository.initializeCashBox(groupId, initialBalance, userId);
  }

  async addSupervisor(groupId, supervisorUserId, addedByUserId) {
    // Verificar permisos
    await authService.checkPermission(addedByUserId, 'group.manageSupervisors', groupId);

    // Verificar que el supervisor existe
    const supervisorContext = await authService.getUserContext(supervisorUserId);
    
    if (!supervisorContext.user) {
      throw new Error('Usuario supervisor no encontrado');
    }

    // Verificar que no sea ya supervisor
    const isSupervisor = await groupRepository.isSupervisor(groupId, supervisorContext.user.id);
    
    if (isSupervisor) {
      throw new Error('El usuario ya es supervisor de este grupo');
    }

    return groupRepository.addSupervisor(groupId, supervisorContext.user.id, addedByUserId);
  }

  async removeSupervisor(groupId, supervisorUserId, removedByUserId) {
    // Verificar permisos
    await authService.checkPermission(removedByUserId, 'group.manageSupervisors', groupId);

    return groupRepository.removeSupervisor(groupId, supervisorUserId);
  }

  async getSupervisors(groupId) {
    return groupRepository.getSupervisors(groupId);
  }

  async getOrganizationGroups(organizationId, includeInactive = false) {
    return groupRepository.getByOrganization(organizationId, includeInactive);
  }

  async deactivateGroup(groupId, userId) {
    // Verificar permisos
    await authService.checkPermission(userId, 'group.deactivate', groupId);

    return groupRepository.update(groupId, {
      isActive: false,
    });
  }
}

module.exports = new GroupService();