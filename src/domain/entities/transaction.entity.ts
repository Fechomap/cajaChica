import type { Money } from '../value-objects/money.vo.js';

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export interface TransactionProps {
  id: string;
  groupId: string;
  userId: string;
  type: TransactionType;
  amount: Money;
  concept: string;
  balanceAfter: Money;
  createdAt: Date;
}

export interface CreateTransactionProps {
  groupId: string;
  userId: string;
  type: TransactionType;
  amount: Money;
  concept: string;
  balanceAfter: Money;
}

export class Transaction {
  private constructor(private readonly props: TransactionProps) {}

  static create(props: CreateTransactionProps & { id: string }): Transaction {
    return new Transaction({
      id: props.id,
      groupId: props.groupId,
      userId: props.userId,
      type: props.type,
      amount: props.amount,
      concept: props.concept,
      balanceAfter: props.balanceAfter,
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: TransactionProps): Transaction {
    return new Transaction(props);
  }

  get id(): string {
    return this.props.id;
  }

  get groupId(): string {
    return this.props.groupId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get type(): TransactionType {
    return this.props.type;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get concept(): string {
    return this.props.concept;
  }

  get balanceAfter(): Money {
    return this.props.balanceAfter;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isIncome(): boolean {
    return this.props.type === TransactionType.INCOME;
  }

  isExpense(): boolean {
    return this.props.type === TransactionType.EXPENSE;
  }

  toJSON(): TransactionProps {
    return { ...this.props };
  }
}
