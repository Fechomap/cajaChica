import type { BotContext } from '../adapters/telegram/context.js';
import type { ILogger } from '../application/interfaces/index.js';
import type {
  CreateTransactionUseCase,
  GetGroupUseCase,
  GetTransactionsUseCase,
  GetUserUseCase,
  InitializeGroupUseCase,
  RegisterUserUseCase,
} from '../application/use-cases/index.js';
import type { Env } from '../config/env.js';
import type {
  IGroupRepository,
  IOrganizationRepository,
  ITransactionRepository,
  IUserRepository,
} from '../domain/repositories/index.js';
import type { CacheService } from '../infrastructure/cache/cache.service.js';
import type { SessionStore } from '../infrastructure/cache/session.store.js';
import type { PrismaClient } from '@prisma/client';
import type { AwilixContainer } from 'awilix';
import type { Bot } from 'grammy';
import type { Redis } from 'ioredis';

export interface AppDependencies {
  // Config
  env: Env;
  logger: ILogger;

  // Infrastructure
  prisma: PrismaClient;
  redis: Redis;

  // Cache
  sessionStore: SessionStore;
  cacheService: CacheService;

  // Repositories
  userRepository: IUserRepository;
  groupRepository: IGroupRepository;
  transactionRepository: ITransactionRepository;
  organizationRepository: IOrganizationRepository;

  // Use Cases
  registerUserUseCase: RegisterUserUseCase;
  getUserUseCase: GetUserUseCase;
  createTransactionUseCase: CreateTransactionUseCase;
  getTransactionsUseCase: GetTransactionsUseCase;
  getGroupUseCase: GetGroupUseCase;
  initializeGroupUseCase: InitializeGroupUseCase;

  // Bot
  bot: Bot<BotContext>;
}

export type AppContainer = AwilixContainer<AppDependencies>;
