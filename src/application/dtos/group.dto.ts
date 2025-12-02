import { z } from 'zod';

export const CreateGroupDtoSchema = z.object({
  telegramId: z.union([z.bigint(), z.number(), z.string()]),
  organizationId: z.string(),
  title: z.string().min(1).max(256),
  type: z.enum(['PRIVATE', 'GROUP', 'SUPERGROUP', 'CHANNEL']),
  username: z.string().optional(),
  description: z.string().max(1000).optional(),
});

export type CreateGroupDto = z.infer<typeof CreateGroupDtoSchema>;

export const InitializeGroupDtoSchema = z.object({
  groupId: z.string(),
  initialBalance: z.number().nonnegative(),
});

export type InitializeGroupDto = z.infer<typeof InitializeGroupDtoSchema>;

export interface GroupResponseDto {
  id: string;
  telegramId: string;
  organizationId: string;
  title: string;
  type: string;
  balance: number;
  balanceFormatted: string;
  isInitialized: boolean;
  isActive: boolean;
  createdAt: string;
}
