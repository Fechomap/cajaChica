import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterUserUseCase } from '../../../src/application/use-cases/user/register-user.use-case.js';
import { User, UserRole } from '../../../src/domain/entities/user.entity.js';
import type { IUserRepository } from '../../../src/domain/repositories/user.repository.interface.js';
import { TelegramId } from '../../../src/domain/value-objects/telegram-id.vo.js';
import type { Logger } from '../../../src/infrastructure/logging/logger.js';

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let mockUserRepository: IUserRepository;
  let mockLogger: Logger;

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

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    useCase = new RegisterUserUseCase(mockUserRepository, mockLogger);
  });

  it('should create a new user when user does not exist', async () => {
    const input = {
      telegramId: 123456789,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
    };

    vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValue(null);

    const mockUser = User.create({
      id: 'user-123',
      telegramId: TelegramId.create(input.telegramId),
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    vi.mocked(mockUserRepository.create).mockResolvedValue(mockUser);

    const result = await useCase.execute(input);

    expect(mockUserRepository.findByTelegramId).toHaveBeenCalled();
    expect(mockUserRepository.create).toHaveBeenCalled();
    expect(result.username).toBe('testuser');
  });

  it('should return existing user when user already exists', async () => {
    const input = {
      telegramId: 123456789,
      username: 'existinguser',
    };

    const existingUser = User.create({
      id: 'existing-user-123',
      telegramId: TelegramId.create(input.telegramId),
      username: 'existinguser',
    });

    vi.mocked(mockUserRepository.findByTelegramId).mockResolvedValue(existingUser);

    const result = await useCase.execute(input);

    expect(mockUserRepository.findByTelegramId).toHaveBeenCalled();
    expect(mockUserRepository.create).not.toHaveBeenCalled();
    expect(result.id).toBe('existing-user-123');
  });
});
