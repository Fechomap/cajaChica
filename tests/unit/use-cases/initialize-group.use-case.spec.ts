import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InitializeGroupUseCase } from '../../../src/application/use-cases/group/initialize-group.use-case.js';
import { Group, ChatType } from '../../../src/domain/entities/group.entity.js';
import { GroupNotFoundError } from '../../../src/domain/errors/group-not-found.error.js';
import { DomainError } from '../../../src/domain/errors/domain.error.js';
import type { IGroupRepository } from '../../../src/domain/repositories/group.repository.interface.js';
import { Money } from '../../../src/domain/value-objects/money.vo.js';
import { TelegramId } from '../../../src/domain/value-objects/telegram-id.vo.js';
import type { ILogger } from '../../../src/application/interfaces/index.js';

describe('InitializeGroupUseCase', () => {
  let useCase: InitializeGroupUseCase;
  let mockGroupRepository: IGroupRepository;
  let mockLogger: ILogger;

  const createMockGroup = (overrides: Partial<{ isInitialized: boolean }> = {}) => {
    return Group.fromPersistence({
      id: 'group-123',
      telegramId: TelegramId.create(-1001234567890),
      organizationId: 'org-123',
      title: 'Test Group',
      type: ChatType.SUPERGROUP,
      balance: Money.zero(),
      isInitialized: overrides.isInitialized ?? false,
      settings: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(() => {
    mockGroupRepository = {
      findById: vi.fn(),
      findByTelegramId: vi.fn(),
      findByOrganizationId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateBalance: vi.fn(),
      initialize: vi.fn(),
      delete: vi.fn(),
      countByOrganizationId: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };

    useCase = new InitializeGroupUseCase(mockGroupRepository, mockLogger);
  });

  it('should initialize group with initial balance', async () => {
    const mockGroup = createMockGroup({ isInitialized: false });
    const initializedGroup = Group.fromPersistence({
      ...mockGroup.toJSON(),
      isInitialized: true,
      initialBalance: Money.create(5000),
      balance: Money.create(5000),
    });

    vi.mocked(mockGroupRepository.findById).mockResolvedValue(mockGroup);
    vi.mocked(mockGroupRepository.initialize).mockResolvedValue(initializedGroup);

    const result = await useCase.execute({
      groupId: 'group-123',
      initialBalance: 5000,
    });

    expect(mockGroupRepository.findById).toHaveBeenCalledWith('group-123');
    expect(mockGroupRepository.initialize).toHaveBeenCalled();
    expect(result.isInitialized).toBe(true);
    expect(result.balance.amount).toBe(5000);
  });

  it('should throw GroupNotFoundError when group does not exist', async () => {
    vi.mocked(mockGroupRepository.findById).mockResolvedValue(null);

    await expect(
      useCase.execute({
        groupId: 'non-existent',
        initialBalance: 1000,
      })
    ).rejects.toThrow(GroupNotFoundError);

    expect(mockGroupRepository.initialize).not.toHaveBeenCalled();
  });

  it('should throw DomainError when group is already initialized', async () => {
    const initializedGroup = createMockGroup({ isInitialized: true });
    vi.mocked(mockGroupRepository.findById).mockResolvedValue(initializedGroup);

    await expect(
      useCase.execute({
        groupId: 'group-123',
        initialBalance: 1000,
      })
    ).rejects.toThrow(DomainError);

    expect(mockGroupRepository.initialize).not.toHaveBeenCalled();
  });

  it('should log initialization process', async () => {
    const mockGroup = createMockGroup({ isInitialized: false });
    const initializedGroup = Group.fromPersistence({
      ...mockGroup.toJSON(),
      isInitialized: true,
      balance: Money.create(1000),
    });

    vi.mocked(mockGroupRepository.findById).mockResolvedValue(mockGroup);
    vi.mocked(mockGroupRepository.initialize).mockResolvedValue(initializedGroup);

    await useCase.execute({
      groupId: 'group-123',
      initialBalance: 1000,
    });

    expect(mockLogger.info).toHaveBeenCalledTimes(2);
  });
});
