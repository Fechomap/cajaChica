import type { Organization, CreateOrganizationProps } from '../entities/organization.entity.js';

export interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  create(props: CreateOrganizationProps): Promise<Organization>;
  update(id: string, props: Partial<CreateOrganizationProps>): Promise<Organization>;
  delete(id: string): Promise<void>;
}
