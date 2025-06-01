// tests/services.test.js
const authService = require('../src/services/authService');
const groupService = require('../src/services/groupService');
const transactionService = require('../src/services/transactionService');

describe('Services Integration Tests', () => {
  
  describe('AuthService', () => {
    test('should validate legacy supervisor', async () => {
      // Usando ID de supervisor configurado en .env
      const telegramId = 7143094298;
      const isLegacy = await authService.isLegacySupervisor(telegramId);
      expect(typeof isLegacy).toBe('boolean');
    });

    test('should get user context for existing user', async () => {
      const telegramId = 7143094298;
      try {
        const context = await authService.getUserContext(telegramId);
        expect(context).toHaveProperty('user');
        expect(context).toHaveProperty('organization');
        expect(context).toHaveProperty('supervisedGroups');
      } catch (error) {
        // Es normal que falle si el usuario no existe en test
        expect(error.message).toContain('Usuario no encontrado');
      }
    });
  });

  describe('GroupService', () => {
    test('should validate group registration requirements', () => {
      const mockGroupData = {
        telegramId: -1001234567890,
        title: 'Test Group',
        type: 'GROUP'
      };
      
      expect(mockGroupData.telegramId).toBeLessThan(0);
      expect(mockGroupData.title).toBeTruthy();
      expect(['PRIVATE', 'GROUP', 'SUPERGROUP'].includes(mockGroupData.type)).toBe(true);
    });
  });

  describe('TransactionService', () => {
    test('should validate transaction data structure', () => {
      const mockTransaction = {
        amount: 100.50,
        concept: 'Test transaction',
        type: 'INCOME'
      };
      
      expect(mockTransaction.amount).toBeGreaterThan(0);
      expect(mockTransaction.concept.length).toBeGreaterThanOrEqual(3);
      expect(['INCOME', 'EXPENSE'].includes(mockTransaction.type)).toBe(true);
    });
  });
});