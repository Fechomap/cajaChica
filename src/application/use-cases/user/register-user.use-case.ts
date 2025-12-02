import { TelegramId } from '../../../domain/value-objects/telegram-id.vo.js';

import type { User } from '../../../domain/entities/user.entity.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import type { CreateUserDto } from '../../dtos/user.dto.js';
import type { ILogger } from '../../interfaces/index.js';

export class RegisterUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly logger: ILogger
  ) {}

  async execute(input: CreateUserDto): Promise<User> {
    const telegramId = TelegramId.create(input.telegramId);

    this.logger.info({ telegramId: telegramId.toString() }, 'Registering user');

    // Check if user exists
    const existingUser = await this.userRepository.findByTelegramId(telegramId);
    if (existingUser) {
      this.logger.info({ userId: existingUser.id }, 'User already exists, returning existing');
      return existingUser;
    }

    // Create new user
    const user = await this.userRepository.create({
      telegramId,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      photoUrl: input.photoUrl,
      organizationId: input.organizationId,
    });

    this.logger.info({ userId: user.id }, 'User registered successfully');

    return user;
  }
}
