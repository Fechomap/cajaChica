import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateTransactionUseCase } from '../../../src/application/use-cases/transaction/create-transaction.use-case.js';
import { Group, ChatType } from '../../../src/domain/entities/group.entity.js';
import { Transaction, TransactionType } from '../../../src/domain/entities/transaction.entity.js';
import { InsufficientBalanceError } from '../../../src/domain/errors/insufficient-balance.error.js';
import { GroupNotFoundError } from '../../../src/domain/errors/group-not-found.error.js';
import type { IGroupRepository } from '../../../src/domain/repositories/group.repository.interface.js';
import type { ITransactionRepository } from '../../../src/domain/repositories/transaction.repository.interface.js';
import { Money } from '../../../src/domain/value-objects/money.vo.js';
import { TelegramId } from '../../../src/domain/value-objects/telegram-id.vo.js';
import type { Logger } from '../../../src/infrastructure/logging/logger.js';

describe('CreateTransactionUseCase', () => {
  let useCase: CreateTransactionUseCase;
  let mockTransactionRepository: ITransactionRepository;
  let mockGroupRepository: IGroupRepository;
  let mockLogger: Logger;

  const mockGroup = Group.fromPersistence({
    id: 'group-123',
    telegramId: TelegramId.create(123456789),
    organizationId: 'org-123',
    title: 'Test Group',
    type: ChatType.GROUP,
    balance: Money.create(1000),
    isInitialized: true,
    initialBalance: Money.create(1000),
    settings: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    mockTransactionRepository = {
      findById: vi.fn(),
      findByGroupId: vi.fn(),
      findByUserId: vi.fn(),
      findWithFilters: vi.fn(),
      create: vi.fn(),
      getLastTransaction: vi.fn(),
      countByGroupId: vi.fn(),
      sumByGroupIdAndType: vi.fn(),
    };

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
    } as unknown as Logger;

    useCase = new CreateTransactionUseCase(
      mockTransactionRepository,
      mockGroupRepository,
      mockLogger
    );
  });

  it('should create income transaction and update balance', async () => {
    const input = {
      groupId: 'group-123',
      userId: 'user-123',
      type: 'INCOME' as const,
      amount: 500,
      concept: 'Test income',
    };

    vi.mocked(mockGroupRepository.findById).mockResolvedValue(mockGroup);

    const mockTransaction = Transaction.fromPersistence({
      id: 'tx-123',
      groupId: input.groupId,
      userId: input.userId,
      type: TransactionType.INCOME,
      amount: Money.create(500),
      concept: input.concept,
      balanceAfter: Money.create(1500),
      createdAt: new Date(),
    });

    vi.mocked(mockTransactionRepository.create).mockResolvedValue(mockTransaction);
    vi.mocked(mockGroupRepository.updateBalance).mockResolvedValue(mockGroup);

    const result = await useCase.execute(input);

    expect(mockTransactionRepository.create).toHaveBeenCalled();
    expect(mockGroupRepository.updateBalance).toHaveBeenCalled();
    expect(result.amount.amount).toBe(500);
  });

  it('should throw error for expense exceeding balance', async () => {
    const input = {
      groupId: 'group-123',
      userId: 'user-123',
      type: 'EXPENSE' as const,
      amount: 2000,
      concept: 'Large expense',
    };

    vi.mocked(mockGroupRepository.findById).mockResolvedValue(mockGroup);

    await expect(useCase.execute(input)).rejects.toThrow(InsufficientBalanceError);
  });

  it('should throw error when group not found', async () => {
    const input = {
      groupId: 'nonexistent',
      userId: 'user-123',
      type: 'INCOME' as const,
      amount: 100,
      concept: 'Test',
    };

    vi.mocked(mockGroupRepository.findById).mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(GroupNotFoundError);
  });
});
