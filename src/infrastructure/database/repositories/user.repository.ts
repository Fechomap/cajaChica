import { User as UserEntity } from '../../../domain/entities/user.entity.js';
import { TelegramId } from '../../../domain/value-objects/telegram-id.vo.js';

import type { User, CreateUserProps, UserRole } from '../../../domain/entities/user.entity.js';
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface.js';
import type { PrismaClient } from '@prisma/client';

export class UserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toDomain(user) : null;
  }

  async findByTelegramId(telegramId: TelegramId): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { telegramId: telegramId.value },
    });
    return user ? this.toDomain(user) : null;
  }

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { organizationId },
    });
    return users.map((u) => this.toDomain(u));
  }

  async create(props: CreateUserProps): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        telegramId: props.telegramId.value,
        username: props.username,
        firstName: props.firstName,
        lastName: props.lastName,
        photoUrl: props.photoUrl,
        organizationId: props.organizationId,
        role: props.role ?? 'MEMBER',
      },
    });
    return this.toDomain(user);
  }

  async update(id: string, props: Partial<CreateUserProps>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        username: props.username,
        firstName: props.firstName,
        lastName: props.lastName,
        photoUrl: props.photoUrl,
        organizationId: props.organizationId,
        role: props.role,
      },
    });
    return this.toDomain(user);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }

  async updateLastActive(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastActiveAt: new Date() },
    });
  }

  private toDomain(data: {
    id: string;
    telegramId: bigint;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    organizationId: string | null;
    role: string;
    permissions: string[];
    isActive: boolean;
    lastActiveAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return UserEntity.fromPersistence({
      id: data.id,
      telegramId: TelegramId.create(data.telegramId),
      username: data.username ?? undefined,
      firstName: data.firstName ?? undefined,
      lastName: data.lastName ?? undefined,
      photoUrl: data.photoUrl ?? undefined,
      organizationId: data.organizationId ?? undefined,
      role: data.role as UserRole,
      permissions: data.permissions,
      isActive: data.isActive,
      lastActiveAt: data.lastActiveAt ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
