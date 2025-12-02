import { TransactionType } from '../../../domain/entities/transaction.entity.js';

import type { Transaction } from '../../../domain/entities/transaction.entity.js';
import type {
  ITransactionRepository,
  PaginatedResult,
} from '../../../domain/repositories/transaction.repository.interface.js';
import type { TransactionFiltersDto } from '../../dtos/transaction.dto.js';

export class GetTransactionsUseCase {
  constructor(private readonly transactionRepository: ITransactionRepository) {}

  async byGroupId(groupId: string, page = 1, limit = 20): Promise<PaginatedResult<Transaction>> {
    return this.transactionRepository.findByGroupId(groupId, { page, limit });
  }

  async byUserId(userId: string, page = 1, limit = 20): Promise<PaginatedResult<Transaction>> {
    return this.transactionRepository.findByUserId(userId, { page, limit });
  }

  async withFilters(filters: TransactionFiltersDto): Promise<PaginatedResult<Transaction>> {
    return this.transactionRepository.findWithFilters(
      {
        groupId: filters.groupId,
        userId: filters.userId,
        type: filters.type ? TransactionType[filters.type] : undefined,
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
      { page: filters.page, limit: filters.limit }
    );
  }

  async getById(id: string): Promise<Transaction | null> {
    return this.transactionRepository.findById(id);
  }
}
