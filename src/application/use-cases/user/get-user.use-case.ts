import { UserNotFoundError } from '../../../domain/errors/user-not-found.error.js';
import { TelegramId } from '../../../domain/value-objects/telegram-id.vo.js';

import type { User } from '../../../domain/entities/user.entity.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';

export class GetUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async byId(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }

  async byTelegramId(telegramId: bigint | number | string): Promise<User> {
    const tid = TelegramId.create(telegramId);
    const user = await this.userRepository.findByTelegramId(tid);
    if (!user) {
      throw new UserNotFoundError(tid.toString());
    }
    return user;
  }

  async byTelegramIdOrNull(telegramId: bigint | number | string): Promise<User | null> {
    const tid = TelegramId.create(telegramId);
    return this.userRepository.findByTelegramId(tid);
  }
}
