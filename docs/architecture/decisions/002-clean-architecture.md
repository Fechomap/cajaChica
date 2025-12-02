# ADR 002: Clean Architecture

## Estado
Aceptado

## Contexto
El proyecto necesita una arquitectura que:
- Sea testeable de forma aislada
- Permita cambiar componentes sin afectar otros
- Sea escalable a múltiples plataformas (Telegram hoy, WhatsApp mañana)
- Separe claramente las responsabilidades

## Decisión
Implementamos Clean Architecture con 4 capas:

1. **Domain Layer**: Entidades, Value Objects, Interfaces de repositorio
2. **Application Layer**: Use Cases, DTOs, Services
3. **Infrastructure Layer**: Implementaciones de repositorios, Cache, DB
4. **Adapters Layer**: HTTP (Hono), Telegram (grammY)

## Consecuencias

### Positivas
- Alta testabilidad (mocking fácil de dependencias)
- Independencia de frameworks
- Código organizado y predecible
- Facilita agregar nuevas plataformas

### Negativas
- Más archivos y carpetas
- Overhead inicial de configuración
- Requiere disciplina del equipo

## Referencias
- Clean Architecture - Robert C. Martin
- Hexagonal Architecture - Alistair Cockburn
