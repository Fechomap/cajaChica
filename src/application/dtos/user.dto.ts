import { z } from 'zod';

export const CreateUserDtoSchema = z.object({
  telegramId: z.union([z.bigint(), z.number(), z.string()]),
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  photoUrl: z.string().url().optional(),
  organizationId: z.string().optional(),
});

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;

export const UpdateUserDtoSchema = z.object({
  username: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  photoUrl: z.string().url().optional(),
  organizationId: z.string().optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;

export interface UserResponseDto {
  id: string;
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  displayName: string;
  organizationId?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}
