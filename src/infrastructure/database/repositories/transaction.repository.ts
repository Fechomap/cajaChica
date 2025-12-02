import { Transaction as TransactionEntity } from '../../../domain/entities/transaction.entity.js';
import { Money } from '../../../domain/value-objects/money.vo.js';

import type {
  Transaction,
  CreateTransactionProps,
  TransactionType,
} from '../../../domain/entities/transaction.entity.js';
import type {
  ITransactionRepository,
  TransactionFilters,
  PaginationOptions,
  PaginatedResult,
} from '../../../domain/repositories/transaction.repository.interface.js';
import type { PrismaClient, Prisma } from '@prisma/client';

export class TransactionRepository implements ITransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Transaction | null> {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    return tx ? this.toDomain(tx) : null;
  }

  async findByGroupId(
    groupId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Transaction>> {
    return this.findWithFilters({ groupId }, pagination);
  }

  async findByUserId(
    userId: string,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Transaction>> {
    return this.findWithFilters({ userId }, pagination);
  }

  async findWithFilters(
    filters: TransactionFilters,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Transaction>> {
    const where: Prisma.TransactionWhereInput = {};

    if (filters.groupId) where.groupId = filters.groupId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.type) where.type = filters.type;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items: items.map((tx) => this.toDomain(tx)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(props: CreateTransactionProps): Promise<Transaction> {
    const tx = await this.prisma.transaction.create({
      data: {
        groupId: props.groupId,
        userId: props.userId,
        type: props.type,
        amount: props.amount.amount,
        concept: props.concept,
        balanceAfter: props.balanceAfter.amount,
      },
    });
    return this.toDomain(tx);
  }

  async getLastTransaction(groupId: string): Promise<Transaction | null> {
    const tx = await this.prisma.transaction.findFirst({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });
    return tx ? this.toDomain(tx) : null;
  }

  async countByGroupId(groupId: string): Promise<number> {
    return this.prisma.transaction.count({ where: { groupId } });
  }

  async sumByGroupIdAndType(
    groupId: string,
    type: TransactionType,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      where: {
        groupId,
        type,
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  private toDomain(data: {
    id: string;
    groupId: string;
    userId: string;
    type: string;
    amount: Prisma.Decimal;
    concept: string;
    balanceAfter: Prisma.Decimal;
    createdAt: Date;
  }): Transaction {
    return TransactionEntity.fromPersistence({
      id: data.id,
      groupId: data.groupId,
      userId: data.userId,
      type: data.type as TransactionType,
      amount: Money.create(Number(data.amount)),
      concept: data.concept,
      balanceAfter: Money.create(Number(data.balanceAfter)),
      createdAt: data.createdAt,
    });
  }
}
