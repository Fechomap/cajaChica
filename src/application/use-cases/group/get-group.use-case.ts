import { GroupNotFoundError } from '../../../domain/errors/group-not-found.error.js';
import { TelegramId } from '../../../domain/value-objects/telegram-id.vo.js';

import type { Group } from '../../../domain/entities/group.entity.js';
import type { IGroupRepository } from '../../../domain/repositories/group.repository.interface.js';

export class GetGroupUseCase {
  constructor(private readonly groupRepository: IGroupRepository) {}

  async byId(id: string): Promise<Group> {
    const group = await this.groupRepository.findById(id);
    if (!group) {
      throw new GroupNotFoundError(id);
    }
    return group;
  }

  async byTelegramId(telegramId: bigint | number | string): Promise<Group> {
    const tid = TelegramId.create(telegramId);
    const group = await this.groupRepository.findByTelegramId(tid);
    if (!group) {
      throw new GroupNotFoundError(tid.toString());
    }
    return group;
  }

  async byTelegramIdOrNull(telegramId: bigint | number | string): Promise<Group | null> {
    const tid = TelegramId.create(telegramId);
    return this.groupRepository.findByTelegramId(tid);
  }

  async byOrganizationId(organizationId: string): Promise<Group[]> {
    return this.groupRepository.findByOrganizationId(organizationId);
  }
}
