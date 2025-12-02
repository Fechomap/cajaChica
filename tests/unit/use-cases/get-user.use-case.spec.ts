import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetUserUseCase } from '../../../src/application/use-cases/user/get-user.use-case.js';
import { User } from '../../../src/domain/entities/user.entity.js';
import { UserNotFoundError } from '../../../src/domain/errors/user-not-found.error.js';
import type { IUserRepository } from '../../../src/domain/repositories/user.repository.interface.js';
import { TelegramId } from '../../../src/domain/value-objects/telegram-id.vo.js';

describe('GetUserUseCase', () => {
  let useCase: GetUserUseCase;
  let mockUserRepository: IUserRepository;

  const createMockUser = (overrides: Partial<{ id: string; telegramId: number }> = {}) => {
    return User.create({
      id: overrides.id ?? 'user-123',
      telegramId: TelegramId.create(overrides.telegramId ?? 123456789),
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    });
  };

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn(),
      findByTelegramId: vi.fn(),
      findByOrganizationId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateLastActive: vi.fn(),
    };

    useCase = new GetUserUseCase(mockUserRepository);
  });

  describe('byId', () => {
    it('should return user when found by id', async () => {
      const mockUser = createMockUser({ id: 'user-123' });
      vi.mocked(mockUserRepository.findById).mockResolvedValue(mockUser);

      const result = await useCase.byId('user-123');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user-123');
      expect(result.id).toBe('user-123');
    });

    it('should throw UserNotFoundError when user not found by id', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(useCase.byId('non-existent')).rejects.toThrow(UserNotFoundError);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('byTelegramId', () => {
    it('should return user when found by telegram id', async () => {
      const mockUser = createMockUser({ telegramId: 123456789 });
      vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValue(mockUser);

      const result = await useCase.byTelegramId(123456789);

      expect(mockUserRepository.findByTelegramId).toHaveBeenCalled();
      expect(result.telegramId.toNumber()).toBe(123456789);
    });

    it('should throw UserNotFoundError when user not found by telegram id', async () => {
      vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValue(null);

      await expect(useCase.byTelegramId(999999999)).rejects.toThrow(UserNotFoundError);
    });

    it('should accept string telegram id', async () => {
      const mockUser = createMockUser();
      vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValue(mockUser);

      await useCase.byTelegramId('123456789');

      expect(mockUserRepository.findByTelegramId).toHaveBeenCalled();
    });

    it('should accept bigint telegram id', async () => {
      const mockUser = createMockUser();
      vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValue(mockUser);

      await useCase.byTelegramId(BigInt(123456789));

      expect(mockUserRepository.findByTelegramId).toHaveBeenCalled();
    });
  });

  describe('byTelegramIdOrNull', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser();
      vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValue(mockUser);

      const result = await useCase.byTelegramIdOrNull(123456789);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-123');
    });

    it('should return null when user not found', async () => {
      vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValue(null);

      const result = await useCase.byTelegramIdOrNull(999999999);

      expect(result).toBeNull();
    });

    it('should not throw error when user not found', async () => {
      vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValue(null);

      await expect(useCase.byTelegramIdOrNull(999999999)).resolves.toBeNull();
    });
  });
});
