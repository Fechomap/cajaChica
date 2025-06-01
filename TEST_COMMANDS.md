# Comandos de Prueba para el Bot

## Estado Actual
- ✅ Bot funcionando con MongoDB (modo compatibilidad)
- ✅ Preparado para PostgreSQL cuando lo configures
- ✅ Arquitectura refactorizada con servicios separados

## Comandos para Probar

### 1. En un grupo de Telegram:

**Comando `/saldo`**
- Muestra el saldo actual de la caja
- Si no está iniciada, te pedirá que la inicies

**Comando `/cuenta`**
- Muestra información bancaria
- Botón para enviar a WhatsApp

**Comando `/sup`** (solo supervisores)
- Muestra menú de supervisor
- Opciones: Iniciar caja, agregar dinero, restar dinero, ver saldo

### 2. IDs de Supervisores Configurados:
- 7143094298
- 6330970125

### 3. Flujo de Prueba Recomendado:

1. **En un grupo, como supervisor:**
   - Escribe `/sup`
   - Selecciona "🏁 Iniciar Caja"
   - Ingresa monto inicial (ej: 1000)

2. **Verificar saldo:**
   - Escribe `/saldo`
   - Debería mostrar el saldo

3. **Agregar dinero:**
   - Escribe `/sup`
   - Selecciona "➕ Agregar Dinero"
   - Ingresa cantidad (ej: 500)
   - Confirma

4. **Restar dinero:**
   - Escribe `/sup`
   - Selecciona "➖ Restar Dinero"
   - Ingresa concepto (ej: "Compra de café")
   - Ingresa cantidad (ej: 50)
   - Confirma

## Troubleshooting

Si algo no funciona:

1. **Verifica que estés en un grupo** (no chat privado)
2. **Verifica que tu ID esté en SUPERVISORES_IDS**
3. **Revisa los logs del bot**

## Para Activar PostgreSQL

1. Instala PostgreSQL local o usa un servicio cloud
2. Actualiza DATABASE_URL en .env con credenciales reales
3. Ejecuta: `npx prisma migrate dev`
4. El bot detectará automáticamente PostgreSQL