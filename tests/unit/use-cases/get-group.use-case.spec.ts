import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetGroupUseCase } from '../../../src/application/use-cases/group/get-group.use-case.js';
import { Group, ChatType } from '../../../src/domain/entities/group.entity.js';
import { GroupNotFoundError } from '../../../src/domain/errors/group-not-found.error.js';
import type { IGroupRepository } from '../../../src/domain/repositories/group.repository.interface.js';
import { Money } from '../../../src/domain/value-objects/money.vo.js';
import { TelegramId } from '../../../src/domain/value-objects/telegram-id.vo.js';

describe('GetGroupUseCase', () => {
  let useCase: GetGroupUseCase;
  let mockGroupRepository: IGroupRepository;

  const createMockGroup = (overrides: Partial<{ id: string; telegramId: number }> = {}) => {
    return Group.create({
      id: overrides.id ?? 'group-123',
      telegramId: TelegramId.create(overrides.telegramId ?? -1001234567890),
      organizationId: 'org-123',
      title: 'Test Group',
      type: ChatType.SUPERGROUP,
      balance: Money.create(1000),
    });
  };

  beforeEach(() => {
    mockGroupRepository = {
      findById: vi.fn(),
      findByTelegramId: vi.fn(),
      findByOrganizationId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateBalance: vi.fn(),
      initialize: vi.fn(),
      delete: vi.fn(),
      countByOrganizationId: vi.fn(),
    };

    useCase = new GetGroupUseCase(mockGroupRepository);
  });

  describe('byId', () => {
    it('should return group when found by id', async () => {
      const mockGroup = createMockGroup({ id: 'group-123' });
      vi.mocked(mockGroupRepository.findById).mockResolvedValue(mockGroup);

      const result = await useCase.byId('group-123');

      expect(mockGroupRepository.findById).toHaveBeenCalledWith('group-123');
      expect(result.id).toBe('group-123');
    });

    it('should throw GroupNotFoundError when group not found by id', async () => {
      vi.mocked(mockGroupRepository.findById).mockResolvedValue(null);

      await expect(useCase.byId('non-existent')).rejects.toThrow(GroupNotFoundError);
      expect(mockGroupRepository.findById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('byTelegramId', () => {
    it('should return group when found by telegram id', async () => {
      const mockGroup = createMockGroup({ telegramId: -1001234567890 });
      vi.mocked(mockGroupRepository.findByTelegramId).mockResolvedValue(mockGroup);

      const result = await useCase.byTelegramId(-1001234567890);

      expect(mockGroupRepository.findByTelegramId).toHaveBeenCalled();
      expect(result.telegramId.toNumber()).toBe(-1001234567890);
    });

    it('should throw GroupNotFoundError when group not found by telegram id', async () => {
      vi.mocked(mockGroupRepository.findByTelegramId).mockResolvedValue(null);

      await expect(useCase.byTelegramId(-9999999)).rejects.toThrow(GroupNotFoundError);
    });

    it('should accept string telegram id', async () => {
      const mockGroup = createMockGroup();
      vi.mocked(mockGroupRepository.findByTelegramId).mockResolvedValue(mockGroup);

      await useCase.byTelegramId('-1001234567890');

      expect(mockGroupRepository.findByTelegramId).toHaveBeenCalled();
    });
  });

  describe('byTelegramIdOrNull', () => {
    it('should return group when found', async () => {
      const mockGroup = createMockGroup();
      vi.mocked(mockGroupRepository.findByTelegramId).mockResolvedValue(mockGroup);

      const result = await useCase.byTelegramIdOrNull(-1001234567890);

      expect(result).not.toBeNull();
      expect(result?.id).toBe('group-123');
    });

    it('should return null when group not found', async () => {
      vi.mocked(mockGroupRepository.findByTelegramId).mockResolvedValue(null);

      const result = await useCase.byTelegramIdOrNull(-9999999);

      expect(result).toBeNull();
    });
  });

  describe('byOrganizationId', () => {
    it('should return array of groups for organization', async () => {
      const mockGroups = [createMockGroup({ id: 'group-1' }), createMockGroup({ id: 'group-2' })];
      vi.mocked(mockGroupRepository.findByOrganizationId).mockResolvedValue(mockGroups);

      const result = await useCase.byOrganizationId('org-123');

      expect(mockGroupRepository.findByOrganizationId).toHaveBeenCalledWith('org-123');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no groups found', async () => {
      vi.mocked(mockGroupRepository.findByOrganizationId).mockResolvedValue([]);

      const result = await useCase.byOrganizationId('org-empty');

      expect(result).toHaveLength(0);
    });
  });
});
