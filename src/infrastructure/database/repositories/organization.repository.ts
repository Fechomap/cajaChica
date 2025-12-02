import { Organization as OrganizationEntity } from '../../../domain/entities/organization.entity.js';

import type {
  Organization,
  CreateOrganizationProps,
  OrgStatus,
  Plan,
  OrgSettings,
} from '../../../domain/entities/organization.entity.js';
import type { IOrganizationRepository } from '../../../domain/repositories/organization.repository.interface.js';
import type { PrismaClient, Prisma } from '@prisma/client';

export class OrganizationRepository implements IOrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Organization | null> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    return org ? this.toDomain(org) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const org = await this.prisma.organization.findUnique({ where: { slug } });
    return org ? this.toDomain(org) : null;
  }

  async create(props: CreateOrganizationProps): Promise<Organization> {
    const org = await this.prisma.organization.create({
      data: {
        name: props.name,
        slug: props.slug,
        email: props.email,
        phone: props.phone,
        timezone: props.timezone ?? 'America/Mexico_City',
        currency: props.currency ?? 'MXN',
        locale: props.locale ?? 'es-MX',
      },
    });
    return this.toDomain(org);
  }

  async update(id: string, props: Partial<CreateOrganizationProps>): Promise<Organization> {
    const org = await this.prisma.organization.update({
      where: { id },
      data: {
        name: props.name,
        email: props.email,
        phone: props.phone,
        timezone: props.timezone,
        currency: props.currency,
        locale: props.locale,
      },
    });
    return this.toDomain(org);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.organization.delete({ where: { id } });
  }

  private toDomain(data: {
    id: string;
    name: string;
    slug: string;
    email: string;
    phone: string | null;
    settings: Prisma.JsonValue;
    timezone: string;
    currency: string;
    locale: string;
    status: string;
    plan: string;
    trialEndsAt: Date | null;
    billingCycleStart: Date;
    maxGroups: number;
    maxUsers: number;
    maxTransactions: number;
    createdAt: Date;
    updatedAt: Date;
  }): Organization {
    return OrganizationEntity.fromPersistence({
      id: data.id,
      name: data.name,
      slug: data.slug,
      email: data.email,
      phone: data.phone ?? undefined,
      settings: (data.settings as OrgSettings) ?? {},
      timezone: data.timezone,
      currency: data.currency,
      locale: data.locale,
      status: data.status as OrgStatus,
      plan: data.plan as Plan,
      trialEndsAt: data.trialEndsAt ?? undefined,
      billingCycleStart: data.billingCycleStart,
      maxGroups: data.maxGroups,
      maxUsers: data.maxUsers,
      maxTransactions: data.maxTransactions,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
