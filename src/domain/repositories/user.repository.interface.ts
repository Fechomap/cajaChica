import type { User, CreateUserProps } from '../entities/user.entity.js';
import type { TelegramId } from '../value-objects/telegram-id.vo.js';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByTelegramId(telegramId: TelegramId): Promise<User | null>;
  findByOrganizationId(organizationId: string): Promise<User[]>;
  create(props: CreateUserProps): Promise<User>;
  update(id: string, props: Partial<CreateUserProps>): Promise<User>;
  delete(id: string): Promise<void>;
  updateLastActive(id: string): Promise<void>;
}
