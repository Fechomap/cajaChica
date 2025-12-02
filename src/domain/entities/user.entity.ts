import type { TelegramId } from '../value-objects/telegram-id.vo.js';

export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  MEMBER = 'MEMBER',
}

export interface UserProps {
  id: string;
  telegramId: TelegramId;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  organizationId?: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  telegramId: TelegramId;
  username?: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  organizationId?: string;
  role?: UserRole;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: CreateUserProps & { id: string }): User {
    return new User({
      id: props.id,
      telegramId: props.telegramId,
      username: props.username,
      firstName: props.firstName,
      lastName: props.lastName,
      photoUrl: props.photoUrl,
      organizationId: props.organizationId,
      role: props.role ?? UserRole.MEMBER,
      permissions: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get telegramId(): TelegramId {
    return this.props.telegramId;
  }

  get username(): string | undefined {
    return this.props.username;
  }

  get firstName(): string | undefined {
    return this.props.firstName;
  }

  get lastName(): string | undefined {
    return this.props.lastName;
  }

  get fullName(): string {
    const parts = [this.firstName, this.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : (this.username ?? 'Unknown');
  }

  get displayName(): string {
    return this.username ? `@${this.username}` : this.fullName;
  }

  get organizationId(): string | undefined {
    return this.props.organizationId;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get permissions(): string[] {
    return [...this.props.permissions];
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isOwner(): boolean {
    return this.props.role === UserRole.OWNER;
  }

  isAdmin(): boolean {
    return this.props.role === UserRole.ADMIN || this.props.role === UserRole.OWNER;
  }

  isSupervisor(): boolean {
    return (
      this.props.role === UserRole.SUPERVISOR ||
      this.props.role === UserRole.ADMIN ||
      this.props.role === UserRole.OWNER
    );
  }

  hasPermission(permission: string): boolean {
    return this.props.permissions.includes(permission);
  }

  belongsToOrganization(organizationId: string): boolean {
    return this.props.organizationId === organizationId;
  }

  toJSON(): UserProps {
    return { ...this.props };
  }
}
