# ADR 003: Awilix para Inyección de Dependencias

## Estado
Aceptado

## Contexto
Necesitamos un contenedor de DI que:
- Soporte ESM nativo
- No requiera decoradores experimentales
- Sea ligero y rápido
- Tenga modo estricto para detectar errores

## Decisión
Usamos Awilix 10+ como contenedor de DI:
- `InjectionMode.CLASSIC` para inyección por parámetros
- `strict: true` para validación en desarrollo
- Registros con `asClass`, `asFunction`, `asValue`

## Alternativas Consideradas

| Librería | Problema |
|----------|----------|
| TSyringe | Requiere reflect-metadata y decoradores |
| Inversify | Decoradores experimentales, pesado |
| TypeDI | Decoradores, problemas con ESM |

## Consecuencias

### Positivas
- Zero decoradores
- ESM nativo
- API simple y declarativa
- Strict mode detecta problemas temprano

### Negativas
- Menos "mágico" que alternativas con decoradores
- Requiere registro manual de dependencias
