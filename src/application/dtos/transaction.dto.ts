import { z } from 'zod';

export const CreateTransactionDtoSchema = z.object({
  groupId: z.string(),
  userId: z.string(),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().positive(),
  concept: z.string().min(1).max(500),
});

export type CreateTransactionDto = z.infer<typeof CreateTransactionDtoSchema>;

export const TransactionFiltersDtoSchema = z.object({
  groupId: z.string().optional(),
  userId: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type TransactionFiltersDto = z.infer<typeof TransactionFiltersDtoSchema>;

export interface TransactionResponseDto {
  id: string;
  groupId: string;
  userId: string;
  type: string;
  amount: number;
  concept: string;
  balanceAfter: number;
  createdAt: string;
}
