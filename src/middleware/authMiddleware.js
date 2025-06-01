// src/middleware/authMiddleware.js
const authService = require('../services/authService');
const groupService = require('../services/groupService');

const authMiddleware = {
  // Mantener compatibilidad con sistema anterior
  isSupervisor: async (userId) => {
    // Primero verificar si es supervisor legacy
    if (await authService.isLegacySupervisor(userId)) {
      return true;
    }

    // Luego verificar en el nuevo sistema
    try {
      const context = await authService.getUserContext(userId);
      return context.user && (
        context.user.role === 'OWNER' ||
        context.user.role === 'ADMIN' ||
        context.user.role === 'SUPERVISOR'
      );
    } catch (error) {
      return false;
    }
  },

  // Nuevo middleware para contexto completo
  async attachUserContext(ctx, next) {
    try {
      const userId = ctx.from?.id;
      
      if (userId) {
        // Autenticar usuario
        const user = await authService.authenticateUser(ctx.from);
        ctx.userContext = {
          user,
          organization: user.organization,
        };

        // Si es un grupo, adjuntar información del grupo
        if (ctx.chat && ctx.chat.type !== 'private') {
          try {
            const group = await groupService.registerGroup(ctx.chat, user.organizationId);
            ctx.groupContext = await groupService.getGroupWithAuth(ctx.chat.id, userId);
          } catch (error) {
            // El grupo podría no estar registrado aún
            ctx.groupContext = null;
          }
        }
      }
    } catch (error) {
      console.error('Error adjuntando contexto de usuario:', error);
    }

    return next();
  },

  // Verificar permisos específicos
  requirePermission: (permission) => {
    return async (ctx, next) => {
      try {
        const userId = ctx.from?.id;
        const groupId = ctx.groupContext?.id;

        if (!userId) {
          return ctx.reply('❌ Usuario no autenticado');
        }

        const userContext = await authService.getUserContext(userId);
        await authService.checkPermission(userContext.user.id, permission, groupId);

        return next();
      } catch (error) {
        return ctx.reply(`❌ ${error.message}`);
      }
    };
  },

  // Requerir que sea supervisor del grupo actual
  requireGroupSupervisor: async (ctx, next) => {
    const telegramService = require('../services/telegramService');
    
    try {
      if (!ctx.groupContext) {
        await telegramService.sendSafeMessage(
          ctx.chat.id,
          '❌ Este comando solo funciona en grupos'
        );
        return;
      }

      const userId = ctx.from?.id;
      if (!userId) {
        await telegramService.sendSafeMessage(
          ctx.chat.id,
          '❌ Usuario no autenticado'
        );
        return;
      }

      const userContext = await authService.getUserContext(userId);
      
      // En modo MongoDB, verificar si es supervisor legacy
      if (await authService.isLegacySupervisor(userId)) {
        return next();
      }
      
      // Verificar roles
      if (userContext.user.role === 'OWNER' || 
          userContext.user.role === 'ADMIN' || 
          userContext.user.role === 'SUPERVISOR') {
        return next();
      }

      await telegramService.sendSafeMessage(
        ctx.chat.id,
        '❌ Solo los supervisores pueden usar este comando'
      );
    } catch (error) {
      await telegramService.sendSafeMessage(
        ctx.chat.id,
        `❌ ${error.message}`
      );
    }
  }
};

module.exports = authMiddleware;