import { Group as GroupEntity } from '../../../domain/entities/group.entity.js';
import { Money } from '../../../domain/value-objects/money.vo.js';
import { TelegramId } from '../../../domain/value-objects/telegram-id.vo.js';

import type {
  Group,
  CreateGroupProps,
  ChatType,
  GroupSettings,
} from '../../../domain/entities/group.entity.js';
import type { IGroupRepository } from '../../../domain/repositories/group.repository.interface.js';
import type { PrismaClient, Prisma } from '@prisma/client';

export class GroupRepository implements IGroupRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Group | null> {
    const group = await this.prisma.group.findUnique({ where: { id } });
    return group ? this.toDomain(group) : null;
  }

  async findByTelegramId(telegramId: TelegramId): Promise<Group | null> {
    const group = await this.prisma.group.findUnique({
      where: { telegramId: telegramId.value },
    });
    return group ? this.toDomain(group) : null;
  }

  async findByOrganizationId(organizationId: string): Promise<Group[]> {
    const groups = await this.prisma.group.findMany({
      where: { organizationId },
    });
    return groups.map((g) => this.toDomain(g));
  }

  async create(props: CreateGroupProps): Promise<Group> {
    const group = await this.prisma.group.create({
      data: {
        telegramId: props.telegramId.value,
        organizationId: props.organizationId,
        title: props.title,
        type: props.type,
        username: props.username,
        description: props.description,
      },
    });
    return this.toDomain(group);
  }

  async update(id: string, props: Partial<CreateGroupProps>): Promise<Group> {
    const group = await this.prisma.group.update({
      where: { id },
      data: {
        title: props.title,
        type: props.type,
        username: props.username,
        description: props.description,
      },
    });
    return this.toDomain(group);
  }

  async updateBalance(id: string, balance: Money): Promise<Group> {
    const group = await this.prisma.group.update({
      where: { id },
      data: { balance: balance.amount },
    });
    return this.toDomain(group);
  }

  async initialize(id: string, initialBalance: Money): Promise<Group> {
    const group = await this.prisma.group.update({
      where: { id },
      data: {
        isInitialized: true,
        initialBalance: initialBalance.amount,
        balance: initialBalance.amount,
      },
    });
    return this.toDomain(group);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.group.delete({ where: { id } });
  }

  async countByOrganizationId(organizationId: string): Promise<number> {
    return this.prisma.group.count({ where: { organizationId } });
  }

  private toDomain(data: {
    id: string;
    telegramId: bigint;
    organizationId: string;
    title: string;
    type: string;
    username: string | null;
    description: string | null;
    balance: Prisma.Decimal;
    isInitialized: boolean;
    initialBalance: Prisma.Decimal | null;
    settings: Prisma.JsonValue;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): Group {
    return GroupEntity.fromPersistence({
      id: data.id,
      telegramId: TelegramId.create(data.telegramId),
      organizationId: data.organizationId,
      title: data.title,
      type: data.type as ChatType,
      username: data.username ?? undefined,
      description: data.description ?? undefined,
      balance: Number(data.balance) === 0 ? Money.zero() : Money.create(Number(data.balance)),
      isInitialized: data.isInitialized,
      initialBalance:
        data.initialBalance && Number(data.initialBalance) > 0
          ? Money.create(Number(data.initialBalance))
          : undefined,
      settings: (data.settings as GroupSettings) ?? {},
      isActive: data.isActive,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
