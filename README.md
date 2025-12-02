# Caja Chica Bot v2.0

Bot de Telegram para gestión de caja chica con **Clean Architecture** y **ESM-First**.

## Stack Tecnológico

| Categoría | Tecnología |
|-----------|------------|
| Runtime | Node.js 22+ (ESM) |
| Lenguaje | TypeScript 5.6+ |
| HTTP | Hono |
| Bot | grammY |
| DI | Awilix |
| Base de Datos | PostgreSQL + Prisma |
| Cache | Redis (ioredis) |
| Validación | Zod |
| Testing | Vitest |

## Quick Start

```bash
# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env
# Editar .env con tus valores

# Levantar servicios (PostgreSQL + Redis)
docker-compose -f docker-compose.dev.yml up -d

# Configurar base de datos
npm run db:generate
npm run db:push

# Ejecutar en desarrollo
npm run dev
```

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Desarrollo con hot-reload |
| `npm run build` | Compilar TypeScript |
| `npm start` | Producción |
| `npm test` | Ejecutar tests |
| `npm run test:coverage` | Tests con cobertura |
| `npm run type-check` | Verificar tipos |
| `npm run lint` | ESLint |
| `npm run db:studio` | Prisma Studio |

## Arquitectura

```
src/
├── adapters/           # Telegram (grammY) + HTTP (Hono)
│   ├── telegram/       # Bot handlers y middlewares
│   └── http/           # Hono routes
├── application/        # Casos de uso y lógica
│   ├── use-cases/      # RegisterUser, CreateTransaction, etc.
│   ├── services/       # Servicios de aplicación
│   └── dtos/           # Data Transfer Objects
├── domain/             # Núcleo del negocio
│   ├── entities/       # User, Group, Transaction, Organization
│   ├── value-objects/  # Money, TelegramId
│   ├── repositories/   # Interfaces de repositorio
│   └── errors/         # Errores de dominio
├── infrastructure/     # Implementaciones técnicas
│   ├── database/       # Prisma + Repositorios
│   ├── cache/          # Redis (session, cache)
│   └── logging/        # Pino logger
├── container/          # Awilix DI Container
└── config/             # Configuración con Zod
```

## Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | URL PostgreSQL |
| `TELEGRAM_BOT_TOKEN` | Sí | Token del bot |
| `REDIS_HOST` | No | Host Redis (default: localhost) |
| `REDIS_PORT` | No | Puerto Redis (default: 6379) |
| `NODE_ENV` | No | Entorno (development/production) |

## Comandos del Bot

### Usuarios
- `/start` - Iniciar el bot
- `/help` - Ver ayuda
- `/saldo` - Consultar saldo actual

### Supervisores
- `/ingreso` - Registrar ingreso
- `/gasto` - Registrar gasto
- `/reporte` - Generar reporte

## Despliegue

### Railway

```bash
# El proyecto incluye railway.toml para auto-configuración
git push origin main
```

### Docker

```bash
docker-compose up --build
```

## Documentación

- [Arquitectura](docs/architecture/README.md)
- [Setup](docs/working/setup.md)
- [ADRs](docs/architecture/decisions/)

## Desarrollo

### Estructura de Tests

```
tests/
├── unit/
│   ├── domain/         # Value objects, entities
│   └── use-cases/      # Use cases
├── integration/        # Database, Redis
└── e2e/               # Flows completos
```

### Ejecutar Tests

```bash
npm test                 # Todos los tests
npm run test:coverage    # Con cobertura
```

## Licencia

ISC
