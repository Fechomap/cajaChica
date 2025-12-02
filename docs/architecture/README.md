# Arquitectura del Proyecto

## Visión General

Este proyecto implementa una arquitectura **Clean Architecture** con enfoque **ESM-First** para un bot de Telegram de gestión de caja chica.

## Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| Runtime | Node.js | 22+ LTS |
| Lenguaje | TypeScript | 5.6+ |
| HTTP Framework | Hono | 4+ |
| Bot Framework | grammY | 1.30+ |
| DI Container | Awilix | 10+ |
| Base de Datos | PostgreSQL | 16+ |
| ORM | Prisma | 6+ |
| Cache | Redis (ioredis) | 5+ |
| Validación | Zod | 3+ |
| Logging | Pino | 9+ |
| Testing | Vitest | 2+ |

## Capas de la Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADAPTERS LAYER                              │
│  (Telegram Bot, HTTP Routes, External Services)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  (Use Cases, Services, DTOs)                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DOMAIN LAYER                                │
│  (Entities, Value Objects, Repository Interfaces, Errors)        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                           │
│  (Database, Cache, Queues, External APIs)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Estructura de Carpetas

```
src/
├── adapters/           # Interface con el mundo exterior
│   ├── telegram/       # Bot handlers y middlewares
│   └── http/           # Hono routes
├── application/        # Casos de uso y lógica de aplicación
│   ├── use-cases/      # Casos de uso específicos
│   ├── services/       # Servicios de aplicación
│   └── dtos/           # Data Transfer Objects
├── domain/             # Núcleo del negocio
│   ├── entities/       # Entidades de dominio
│   ├── value-objects/  # Objetos de valor
│   ├── repositories/   # Interfaces de repositorio
│   └── errors/         # Errores de dominio
├── infrastructure/     # Implementaciones técnicas
│   ├── database/       # Prisma y repositorios
│   ├── cache/          # Redis
│   └── logging/        # Pino logger
├── container/          # Inyección de dependencias (Awilix)
└── config/             # Configuración centralizada
```

## Principios de Diseño

1. **Dependency Inversion**: Las capas superiores no dependen de las inferiores
2. **Single Responsibility**: Cada módulo tiene una única responsabilidad
3. **Open/Closed**: Abierto para extensión, cerrado para modificación
4. **Interface Segregation**: Interfaces específicas en lugar de generales
5. **ESM-First**: Todo el código usa ES Modules
