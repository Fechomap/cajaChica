# Guía de Setup

## Requisitos

- Node.js 22+ (LTS)
- PostgreSQL 16+
- Redis 7+
- Docker (opcional, recomendado)

## Instalación

### 1. Clonar y dependencias

```bash
git clone <repo>
cd caja-chica-bot
npm install
```

### 2. Configurar entorno

```bash
cp .env.example .env
# Editar .env con tus valores
```

### 3. Levantar servicios (Docker)

```bash
# Solo PostgreSQL y Redis
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Configurar base de datos

```bash
npm run db:generate
npm run db:push
```

### 5. Ejecutar en desarrollo

```bash
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
| `npm run lint` | Ejecutar ESLint |
| `npm run db:studio` | Prisma Studio (GUI) |

## Variables de Entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | Sí | URL PostgreSQL |
| `TELEGRAM_BOT_TOKEN` | Sí | Token del bot |
| `REDIS_HOST` | No | Host Redis (default: localhost) |
| `REDIS_PORT` | No | Puerto Redis (default: 6379) |
| `NODE_ENV` | No | Entorno (development/production) |

## Estructura del Proyecto

```
src/
├── adapters/        # Interfaces externas
├── application/     # Casos de uso
├── domain/          # Núcleo del negocio
├── infrastructure/  # Implementaciones
├── container/       # DI con Awilix
└── config/          # Configuración
```
