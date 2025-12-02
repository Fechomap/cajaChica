import {
  createContainer as createAwilixContainer,
  asClass,
  asFunction,
  asValue,
  InjectionMode,
} from 'awilix';

import {
  CreateTransactionUseCase,
  GetGroupUseCase,
  GetTransactionsUseCase,
  GetUserUseCase,
  InitializeGroupUseCase,
  RegisterUserUseCase,
} from '../application/use-cases/index.js';
import { env } from '../config/index.js';
import { CacheService } from '../infrastructure/cache/cache.service.js';
import { createRedisClient } from '../infrastructure/cache/redis.client.js';
import { SessionStore } from '../infrastructure/cache/session.store.js';
import { createPrismaClient } from '../infrastructure/database/prisma.client.js';
import {
  GroupRepository,
  OrganizationRepository,
  TransactionRepository,
  UserRepository,
} from '../infrastructure/database/repositories/index.js';
import { logger } from '../infrastructure/logging/logger.js';

import type { AppContainer, AppDependencies } from './types.js';

export async function createContainer(): Promise<AppContainer> {
  const container = createAwilixContainer<AppDependencies>({
    injectionMode: InjectionMode.CLASSIC,
    strict: true,
  });

  // Config & Logger
  container.register({
    env: asValue(env),
    logger: asValue(logger),
  });

  // Infrastructure - Singletons
  container.register({
    prisma: asFunction(createPrismaClient).singleton(),
    redis: asFunction(createRedisClient).singleton(),
  });

  // Cache & Session
  container.register({
    sessionStore: asClass(SessionStore).singleton(),
    cacheService: asClass(CacheService).singleton(),
  });

  // Repositories
  container.register({
    userRepository: asClass(UserRepository).scoped(),
    groupRepository: asClass(GroupRepository).scoped(),
    transactionRepository: asClass(TransactionRepository).scoped(),
    organizationRepository: asClass(OrganizationRepository).scoped(),
  });

  // Use Cases
  container.register({
    registerUserUseCase: asClass(RegisterUserUseCase).scoped(),
    getUserUseCase: asClass(GetUserUseCase).scoped(),
    createTransactionUseCase: asClass(CreateTransactionUseCase).scoped(),
    getTransactionsUseCase: asClass(GetTransactionsUseCase).scoped(),
    getGroupUseCase: asClass(GetGroupUseCase).scoped(),
    initializeGroupUseCase: asClass(InitializeGroupUseCase).scoped(),
  });

  logger.info('DI Container initialized with strict mode');

  return container;
}
