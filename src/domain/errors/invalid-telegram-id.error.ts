import { DomainError } from './domain.error.js';

export class InvalidTelegramIdError extends DomainError {
  constructor(message: string) {
    super(message, 'INVALID_TELEGRAM_ID');
  }
}
