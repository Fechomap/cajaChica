import { DomainError } from './domain.error.js';

export class InsufficientBalanceError extends DomainError {
  constructor(message: string = 'Insufficient balance for this operation') {
    super(message, 'INSUFFICIENT_BALANCE');
  }
}
