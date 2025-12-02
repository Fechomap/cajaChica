import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetTransactionsUseCase } from '../../../src/application/use-cases/transaction/get-transactions.use-case.js';
import { Transaction, TransactionType } from '../../../src/domain/entities/transaction.entity.js';
import type {
  ITransactionRepository,
  PaginatedResult,
} from '../../../src/domain/repositories/transaction.repository.interface.js';
import { Money } from '../../../src/domain/value-objects/money.vo.js';

describe('GetTransactionsUseCase', () => {
  let useCase: GetTransactionsUseCase;
  let mockTransactionRepository: ITransactionRepository;

  const createMockTransaction = (
    overrides: Partial<{ id: string; type: TransactionType }> = {}
  ) => {
    return Transaction.create({
      id: overrides.id ?? 'tx-123',
      groupId: 'group-123',
      userId: 'user-123',
      type: overrides.type ?? TransactionType.INCOME,
      amount: Money.create(100),
      concept: 'Test transaction',
      balanceAfter: Money.create(1000),
    });
  };

  const createPaginatedResult = <T>(items: T[], total = items.length): PaginatedResult<T> => ({
    items,
    total,
    page: 1,
    limit: 20,
    totalPages: Math.ceil(total / 20),
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

    useCase = new GetTransactionsUseCase(mockTransactionRepository);
  });

  describe('byGroupId', () => {
    it('should return paginated transactions for group', async () => {
      const mockTransactions = [
        createMockTransaction({ id: 'tx-1' }),
        createMockTransaction({ id: 'tx-2' }),
      ];
      const paginatedResult = createPaginatedResult(mockTransactions, 2);
      vi.mocked(mockTransactionRepository.findByGroupId).mockResolvedValue(paginatedResult);

      const result = await useCase.byGroupId('group-123');

      expect(mockTransactionRepository.findByGroupId).toHaveBeenCalledWith('group-123', {
        page: 1,
        limit: 20,
      });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should accept custom pagination parameters', async () => {
      const paginatedResult = createPaginatedResult([], 0);
      vi.mocked(mockTransactionRepository.findByGroupId).mockResolvedValue(paginatedResult);

      await useCase.byGroupId('group-123', 2, 10);

      expect(mockTransactionRepository.findByGroupId).toHaveBeenCalledWith('group-123', {
        page: 2,
        limit: 10,
      });
    });
  });

  describe('byUserId', () => {
    it('should return paginated transactions for user', async () => {
      const mockTransactions = [createMockTransaction()];
      const paginatedResult = createPaginatedResult(mockTransactions);
      vi.mocked(mockTransactionRepository.findByUserId).mockResolvedValue(paginatedResult);

      const result = await useCase.byUserId('user-123');

      expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith('user-123', {
        page: 1,
        limit: 20,
      });
      expect(result.items).toHaveLength(1);
    });

    it('should accept custom pagination parameters', async () => {
      const paginatedResult = createPaginatedResult([]);
      vi.mocked(mockTransactionRepository.findByUserId).mockResolvedValue(paginatedResult);

      await useCase.byUserId('user-123', 3, 50);

      expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith('user-123', {
        page: 3,
        limit: 50,
      });
    });
  });

  describe('withFilters', () => {
    it('should return transactions with filters applied', async () => {
      const mockTransactions = [createMockTransaction({ type: TransactionType.EXPENSE })];
      const paginatedResult = createPaginatedResult(mockTransactions);
      vi.mocked(mockTransactionRepository.findWithFilters).mockResolvedValue(paginatedResult);

      const result = await useCase.withFilters({
        groupId: 'group-123',
        type: 'EXPENSE',
        page: 1,
        limit: 20,
      });

      expect(mockTransactionRepository.findWithFilters).toHaveBeenCalledWith(
        {
          groupId: 'group-123',
          userId: undefined,
          type: TransactionType.EXPENSE,
          startDate: undefined,
          endDate: undefined,
        },
        { page: 1, limit: 20 }
      );
      expect(result.items).toHaveLength(1);
    });

    it('should handle date range filters', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');
      const paginatedResult = createPaginatedResult([]);
      vi.mocked(mockTransactionRepository.findWithFilters).mockResolvedValue(paginatedResult);

      await useCase.withFilters({
        groupId: 'group-123',
        startDate,
        endDate,
        page: 1,
        limit: 20,
      });

      expect(mockTransactionRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate,
          endDate,
        }),
        expect.any(Object)
      );
    });

    it('should handle undefined type filter', async () => {
      const paginatedResult = createPaginatedResult([]);
      vi.mocked(mockTransactionRepository.findWithFilters).mockResolvedValue(paginatedResult);

      await useCase.withFilters({
        groupId: 'group-123',
        page: 1,
        limit: 20,
      });

      expect(mockTransactionRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          type: undefined,
        }),
        expect.any(Object)
      );
    });
  });

  describe('getById', () => {
    it('should return transaction when found', async () => {
      const mockTransaction = createMockTransaction({ id: 'tx-123' });
      vi.mocked(mockTransactionRepository.findById).mockResolvedValue(mockTransaction);

      const result = await useCase.getById('tx-123');

      expect(mockTransactionRepository.findById).toHaveBeenCalledWith('tx-123');
      expect(result?.id).toBe('tx-123');
    });

    it('should return null when transaction not found', async () => {
      vi.mocked(mockTransactionRepository.findById).mockResolvedValue(null);

      const result = await useCase.getById('non-existent');

      expect(result).toBeNull();
    });
  });
});
