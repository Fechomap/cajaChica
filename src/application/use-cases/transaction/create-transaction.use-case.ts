import { type Transaction } from '../../../domain/entities/transaction.entity.js';
import { GroupNotFoundError } from '../../../domain/errors/group-not-found.error.js';
import { InsufficientBalanceError } from '../../../domain/errors/insufficient-balance.error.js';
import { Money } from '../../../domain/value-objects/money.vo.js';

import type { TransactionType } from '../../../domain/entities/transaction.entity.js';
import type { IGroupRepository } from '../../../domain/repositories/group.repository.interface.js';
import type { ITransactionRepository } from '../../../domain/repositories/transaction.repository.interface.js';
import type { CreateTransactionDto } from '../../dtos/transaction.dto.js';
import type { ILogger } from '../../interfaces/index.js';

export class CreateTransactionUseCase {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly logger: ILogger
  ) {}

  async execute(input: CreateTransactionDto): Promise<Transaction> {
    this.logger.info(
      { groupId: input.groupId, type: input.type, amount: input.amount },
      'Creating transaction'
    );

    // Get group
    const group = await this.groupRepository.findById(input.groupId);
    if (!group) {
      throw new GroupNotFoundError(input.groupId);
    }

    const amount = Money.create(input.amount);
    let newBalance: Money;

    // Calculate new balance
    if (input.type === 'INCOME') {
      newBalance = group.balance.add(amount);
    } else {
      // Check sufficient balance for expense
      if (group.balance.isLessThan(amount)) {
        throw new InsufficientBalanceError(
          `Balance insuficiente. Disponible: ${group.balance.format()}, Requerido: ${amount.format()}`
        );
      }
      newBalance = group.balance.subtract(amount);
    }

    // Create transaction
    const transaction = await this.transactionRepository.create({
      groupId: input.groupId,
      userId: input.userId,
      type: input.type as TransactionType,
      amount,
      concept: input.concept,
      balanceAfter: newBalance,
    });

    // Update group balance
    await this.groupRepository.updateBalance(input.groupId, newBalance);

    this.logger.info(
      { transactionId: transaction.id, newBalance: newBalance.amount },
      'Transaction created successfully'
    );

    return transaction;
  }
}
