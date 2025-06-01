const organizationRepository = require('../repositories/organizationRepository');
const { generateSlug } = require('../utils/slugHelper');

class OrganizationService {
  async createOrganization(data) {
    // Generar slug único
    const baseSlug = generateSlug(data.name);
    let slug = baseSlug;
    let counter = 1;

    while (await organizationRepository.findBySlug(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const organization = await organizationRepository.create({
      ...data,
      slug,
    });

    return organization;
  }

  async getOrganization(idOrSlug) {
    // Intentar buscar por ID primero
    let organization = await organizationRepository.findById(idOrSlug);
    
    // Si no se encuentra, buscar por slug
    if (!organization) {
      organization = await organizationRepository.findBySlug(idOrSlug);
    }

    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    return organization;
  }

  async updateOrganization(id, data) {
    const organization = await organizationRepository.findById(id);
    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    return organizationRepository.update(id, data);
  }

  async updateBankInfo(organizationId, bankData) {
    const organization = await organizationRepository.findById(organizationId);
    if (!organization) {
      throw new Error('Organización no encontrada');
    }

    // TODO: Encriptar información sensible antes de guardar
    return organizationRepository.updateBankInfo(organizationId, bankData);
  }

  async checkResourceLimits(organizationId, resourceType) {
    const limits = await organizationRepository.checkLimits(organizationId);
    
    if (resourceType && limits[resourceType]) {
      const resource = limits[resourceType];
      if (resource.available <= 0) {
        throw new Error(`Límite alcanzado para ${resourceType}. Plan actual permite máximo ${resource.limit}.`);
      }
      return resource;
    }

    return limits;
  }

  async canCreateResource(organizationId, resourceType) {
    try {
      const resource = await this.checkResourceLimits(organizationId, resourceType);
      return resource.available > 0;
    } catch (error) {
      return false;
    }
  }

  async getDefaultOrganization() {
    const defaultSlug = process.env.DEFAULT_ORG_SLUG || 'default';
    let organization = await organizationRepository.findBySlug(defaultSlug);

    if (!organization) {
      // Crear organización por defecto si no existe
      organization = await this.createOrganization({
        name: 'Organización Principal',
        email: 'admin@cajachica.app',
        status: 'ACTIVE',
      });
    }

    return organization;
  }
}

module.exports = new OrganizationService();