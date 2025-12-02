import { DomainError } from './domain.error.js';

export class InvalidAmountError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_AMOUNT');
  }
}
