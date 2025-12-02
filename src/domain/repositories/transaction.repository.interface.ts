import type {
  Transaction,
  CreateTransactionProps,
  TransactionType,
} from '../entities/transaction.entity.js';

export interface TransactionFilters {
  groupId?: string;
  userId?: string;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ITransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByGroupId(
    groupId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Transaction>>;
  findByUserId(
    userId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Transaction>>;
  findWithFilters(
    filters: TransactionFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Transaction>>;
  create(props: CreateTransactionProps): Promise<Transaction>;
  getLastTransaction(groupId: string): Promise<Transaction | null>;
  countByGroupId(groupId: string): Promise<number>;
  sumByGroupIdAndType(
    groupId: string,
    type: TransactionType,
    startDate?: Date,
    endDate?: Date
  ): Promise<number>;
}
