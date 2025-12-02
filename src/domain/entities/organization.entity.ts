export enum OrgStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

export enum Plan {
  BASIC = 'BASIC',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export interface OrgSettings {
  [key: string]: unknown;
}

export interface OrganizationProps {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  settings: OrgSettings;
  timezone: string;
  currency: string;
  locale: string;
  status: OrgStatus;
  plan: Plan;
  trialEndsAt?: Date;
  billingCycleStart: Date;
  maxGroups: number;
  maxUsers: number;
  maxTransactions: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrganizationProps {
  name: string;
  slug: string;
  email: string;
  phone?: string;
  timezone?: string;
  currency?: string;
  locale?: string;
}

export class Organization {
  private constructor(private readonly props: OrganizationProps) {}

  static create(props: CreateOrganizationProps & { id: string }): Organization {
    return new Organization({
      id: props.id,
      name: props.name,
      slug: props.slug,
      email: props.email,
      phone: props.phone,
      settings: {},
      timezone: props.timezone ?? 'America/Mexico_City',
      currency: props.currency ?? 'MXN',
      locale: props.locale ?? 'es-MX',
      status: OrgStatus.TRIAL,
      plan: Plan.BASIC,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      billingCycleStart: new Date(),
      maxGroups: 5,
      maxUsers: 10,
      maxTransactions: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static fromPersistence(props: OrganizationProps): Organization {
    return new Organization(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get email(): string {
    return this.props.email;
  }

  get timezone(): string {
    return this.props.timezone;
  }

  get currency(): string {
    return this.props.currency;
  }

  get locale(): string {
    return this.props.locale;
  }

  get status(): OrgStatus {
    return this.props.status;
  }

  get plan(): Plan {
    return this.props.plan;
  }

  get maxGroups(): number {
    return this.props.maxGroups;
  }

  get maxUsers(): number {
    return this.props.maxUsers;
  }

  get maxTransactions(): number {
    return this.props.maxTransactions;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isActive(): boolean {
    return this.props.status === OrgStatus.ACTIVE || this.props.status === OrgStatus.TRIAL;
  }

  isTrial(): boolean {
    return this.props.status === OrgStatus.TRIAL;
  }

  isTrialExpired(): boolean {
    if (!this.props.trialEndsAt) return false;
    return this.props.status === OrgStatus.TRIAL && this.props.trialEndsAt < new Date();
  }

  canAddGroup(currentCount: number): boolean {
    return currentCount < this.props.maxGroups;
  }

  canAddUser(currentCount: number): boolean {
    return currentCount < this.props.maxUsers;
  }

  toJSON(): OrganizationProps {
    return { ...this.props };
  }
}
