import type { Money } from '../value-objects/money.vo.js';
import type { TelegramId } from '../value-objects/telegram-id.vo.js';

export enum ChatType {
  PRIVATE = 'PRIVATE',
  GROUP = 'GROUP',
  SUPERGROUP = 'SUPERGROUP',
  CHANNEL = 'CHANNEL',
}

export interface GroupSettings {
  notificationsEnabled?: boolean;
  dailyReportTime?: string;
  lowBalanceThreshold?: number;
  [key: string]: unknown;
}

export interface GroupProps {
  id: string;
  telegramId: TelegramId;
  organizationId: string;
  title: string;
  type: ChatType;
  username?: string;
  description?: string;
  balance: Money;
  isInitialized: boolean;
  initialBalance?: Money;
  settings: GroupSettings;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGroupProps {
  telegramId: TelegramId;
  organizationId: string;
  title: string;
  type: ChatType;
  username?: string;
  description?: string;
}

export class Group {
  private constructor(private readonly props: GroupProps) {}

  static create(props: CreateGroupProps & { id: string; balance: Money }): Group {
    return new Group({
      id: props.id,
      telegramId: props.telegramId,
      organizationId: props.organizationId,
      title: props.title,
      type: props.type,
      username: props.username,
      description: props.description,
      balance: props.balance,
      isInitialized: false,
      settings: {},
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: GroupProps): Group {
    return new Group(props);
  }

  get id(): string {
    return this.props.id;
  }

  get telegramId(): TelegramId {
    return this.props.telegramId;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get title(): string {
    return this.props.title;
  }

  get type(): ChatType {
    return this.props.type;
  }

  get username(): string | undefined {
    return this.props.username;
  }

  get balance(): Money {
    return this.props.balance;
  }

  get isInitialized(): boolean {
    return this.props.isInitialized;
  }

  get initialBalance(): Money | undefined {
    return this.props.initialBalance;
  }

  get settings(): GroupSettings {
    return { ...this.props.settings };
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

  isPrivate(): boolean {
    return this.props.type === ChatType.PRIVATE;
  }

  isGroup(): boolean {
    return this.props.type === ChatType.GROUP || this.props.type === ChatType.SUPERGROUP;
  }

  hasLowBalance(threshold: number): boolean {
    return this.props.balance.amount < threshold;
  }

  toJSON(): GroupProps {
    return { ...this.props };
  }
}
