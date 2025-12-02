import { DomainError } from '../../../domain/errors/domain.error.js';
import { GroupNotFoundError } from '../../../domain/errors/group-not-found.error.js';
import { Money } from '../../../domain/value-objects/money.vo.js';

import type { Group } from '../../../domain/entities/group.entity.js';
import type { IGroupRepository } from '../../../domain/repositories/group.repository.interface.js';
import type { InitializeGroupDto } from '../../dtos/group.dto.js';
import type { ILogger } from '../../interfaces/index.js';

export class InitializeGroupUseCase {
  constructor(
    private readonly groupRepository: IGroupRepository,
    private readonly logger: ILogger
  ) {}

  async execute(input: InitializeGroupDto): Promise<Group> {
    this.logger.info(
      { groupId: input.groupId, initialBalance: input.initialBalance },
      'Initializing group'
    );

    const group = await this.groupRepository.findById(input.groupId);
    if (!group) {
      throw new GroupNotFoundError(input.groupId);
    }

    if (group.isInitialized) {
      throw new DomainError('Group is already initialized', 'GROUP_ALREADY_INITIALIZED');
    }

    const initialBalance = Money.create(input.initialBalance);
    const updatedGroup = await this.groupRepository.initialize(input.groupId, initialBalance);

    this.logger.info({ groupId: input.groupId }, 'Group initialized successfully');

    return updatedGroup;
  }
}
