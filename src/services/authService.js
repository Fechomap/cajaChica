const userRepository = require('../repositories/userRepository');
const organizationService = require('./organizationService');
const compatibilityService = require('./compatibilityService');

class AuthService {
  async authenticateUser(telegramUser) {
    // Verificar modo de base de datos
    const dbMode = await compatibilityService.checkDatabaseMode();
    
    if (dbMode === 'mongodb') {
      // Modo compatibilidad con MongoDB
      return await compatibilityService.getUser(telegramUser.id);
    }
    
    let user = await userRepository.findByTelegramId(telegramUser.id);

    if (!user) {
      // Crear nuevo usuario
      user = await userRepository.create({
        telegramId: telegramUser.id,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        photoUrl: telegramUser.photo_url,
      });

      // Asignar a organización por defecto si es necesario
      if (!user.organizationId) {
        const defaultOrg = await organizationService.getDefaultOrganization();
        user = await userRepository.assignToOrganization(
          user.id,
          defaultOrg.id,
          'MEMBER'
        );
      }
    } else {
      // Actualizar información del usuario
      user = await userRepository.update(user.id, {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        photoUrl: telegramUser.photo_url,
        lastActiveAt: new Date(),
      });
    }

    return user;
  }

  async getUserContext(telegramId) {
    const dbMode = await compatibilityService.checkDatabaseMode();
    
    if (dbMode === 'mongodb') {
      const user = await compatibilityService.getUser(telegramId);
      return {
        user,
        organization: user.organization,
        supervisedGroups: [],
      };
    }
    
    const user = await userRepository.findByTelegramId(telegramId);
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    return {
      user,
      organization: user.organization,
      supervisedGroups: await userRepository.getSupervisedGroups(user.id),
    };
  }

  async checkPermission(userId, permission, groupId = null) {
    const dbMode = await compatibilityService.checkDatabaseMode();
    
    if (dbMode === 'mongodb') {
      // En modo MongoDB, verificar si es supervisor
      const user = await compatibilityService.getUser(userId);
      const hasPermission = user.role === 'SUPERVISOR' || user.role === 'ADMIN';
      
      if (!hasPermission) {
        throw new Error('No tienes permisos para realizar esta acción');
      }
      
      return true;
    }
    
    const hasPermission = await userRepository.hasPermission(userId, permission, groupId);
    
    if (!hasPermission) {
      throw new Error('No tienes permisos para realizar esta acción');
    }

    return true;
  }

  async isLegacySupervisor(telegramId) {
    // Mantener compatibilidad con sistema anterior
    const supervisorIds = (process.env.SUPERVISORES_IDS || '').split(',').map(id => id.trim());
    return supervisorIds.includes(String(telegramId));
  }

  async migrateLegacySupervisor(telegramId, organizationId) {
    const user = await userRepository.findByTelegramId(telegramId);
    
    if (user && this.isLegacySupervisor(telegramId)) {
      // Actualizar a rol SUPERVISOR si es supervisor legacy
      return userRepository.update(user.id, {
        role: 'SUPERVISOR',
        organizationId,
      });
    }

    return user;
  }
}

module.exports = new AuthService();