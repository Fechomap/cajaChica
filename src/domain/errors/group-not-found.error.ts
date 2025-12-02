import { DomainError } from './domain.error.js';

export class GroupNotFoundError extends DomainError {
  constructor(identifier: string) {
    super(`Group not found: ${identifier}`, 'GROUP_NOT_FOUND');
  }
}
