import type { Group, CreateGroupProps } from '../entities/group.entity.js';
import type { Money } from '../value-objects/money.vo.js';
import type { TelegramId } from '../value-objects/telegram-id.vo.js';

export interface IGroupRepository {
  findById(id: string): Promise<Group | null>;
  findByTelegramId(telegramId: TelegramId): Promise<Group | null>;
  findByOrganizationId(organizationId: string): Promise<Group[]>;
  create(props: CreateGroupProps): Promise<Group>;
  update(id: string, props: Partial<CreateGroupProps>): Promise<Group>;
  updateBalance(id: string, balance: Money): Promise<Group>;
  initialize(id: string, initialBalance: Money): Promise<Group>;
  delete(id: string): Promise<void>;
  countByOrganizationId(organizationId: string): Promise<number>;
}
