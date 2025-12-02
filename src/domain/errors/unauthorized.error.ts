import { DomainError } from './domain.error.js';

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized action') {
    super(message, 'UNAUTHORIZED');
  }
}
