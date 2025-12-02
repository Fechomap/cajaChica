# ADR 001: ESM-First Architecture

## Estado
Aceptado

## Contexto
El proyecto necesita una base moderna que permita:
- Compatibilidad con las últimas versiones de Node.js
- Tree-shaking y optimización de builds
- Mejor soporte para TypeScript
- Compatibilidad con librerías modernas (Hono, grammY, etc.)

## Decisión
Adoptamos ESM (ECMAScript Modules) como estándar único:
- `"type": "module"` en package.json
- Extensiones `.js` explícitas en imports
- `tsconfig.json` con `module: "NodeNext"`
- Eliminación total de CommonJS (`require`/`module.exports`)

## Consecuencias

### Positivas
- Código más moderno y mantenible
- Mejor tree-shaking en builds
- Compatibilidad con librerías ESM-native
- Soporte nativo de top-level await

### Negativas
- Algunas librerías legacy pueden no funcionar
- Curva de aprendizaje para desarrolladores acostumbrados a CommonJS
- Extensiones `.js` obligatorias en imports (aún para `.ts`)

## Referencias
- [Node.js ESM](https://nodejs.org/api/esm.html)
- [TypeScript ESM](https://www.typescriptlang.org/docs/handbook/esm-node.html)
