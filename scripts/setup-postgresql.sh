#!/bin/bash

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐘 Configurando PostgreSQL para Caja Chica${NC}"

# Verificar si Docker está disponible
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado. Por favor instálalo primero.${NC}"
    echo -e "${YELLOW}💡 Visita: https://www.docker.com/products/docker-desktop${NC}"
    exit 1
fi

# Configuración
CONTAINER_NAME="postgres-caja"
DB_NAME="caja_chica"
DB_USER="caja_user"
DB_PASSWORD="caja_password_123"
DB_PORT="5432"

echo -e "${YELLOW}📋 Configuración:${NC}"
echo -e "  • Container: ${CONTAINER_NAME}"
echo -e "  • Base de datos: ${DB_NAME}"
echo -e "  • Usuario: ${DB_USER}"
echo -e "  • Puerto: ${DB_PORT}"

# Parar y remover container existente si existe
if docker ps -a --format 'table {{.Names}}' | grep -q "${CONTAINER_NAME}"; then
    echo -e "${YELLOW}🔄 Removiendo container existente...${NC}"
    docker stop ${CONTAINER_NAME} 2>/dev/null
    docker rm ${CONTAINER_NAME} 2>/dev/null
fi

# Crear y ejecutar container PostgreSQL
echo -e "${BLUE}🚀 Creando container PostgreSQL...${NC}"
docker run --name ${CONTAINER_NAME} \
    -e POSTGRES_DB=${DB_NAME} \
    -e POSTGRES_USER=${DB_USER} \
    -e POSTGRES_PASSWORD=${DB_PASSWORD} \
    -p ${DB_PORT}:5432 \
    -d postgres:15

# Verificar que el container esté corriendo
sleep 5
if docker ps --format 'table {{.Names}}' | grep -q "${CONTAINER_NAME}"; then
    echo -e "${GREEN}✅ PostgreSQL container creado exitosamente${NC}"
else
    echo -e "${RED}❌ Error creando el container${NC}"
    exit 1
fi

# Generar DATABASE_URL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:${DB_PORT}/${DB_NAME}?schema=public"

echo -e "${GREEN}🎉 PostgreSQL configurado exitosamente!${NC}"
echo -e "${YELLOW}📝 Agrega esta línea a tu .env:${NC}"
echo -e "${BLUE}DATABASE_URL=\"${DATABASE_URL}\"${NC}"

# Verificar conexión
echo -e "${BLUE}🔍 Verificando conexión...${NC}"
sleep 3

# Crear archivo temporal para verificar conexión
cat > /tmp/test_connection.js << EOF
const { Client } = require('pg');
const client = new Client({
  connectionString: '${DATABASE_URL}'
});

client.connect()
  .then(() => {
    console.log('✅ Conexión exitosa a PostgreSQL');
    return client.end();
  })
  .catch(err => {
    console.error('❌ Error de conexión:', err.message);
    process.exit(1);
  });
EOF

# Verificar si pg module está disponible
if node -e "require('pg')" 2>/dev/null; then
    node /tmp/test_connection.js
else
    echo -e "${YELLOW}⚠️  Instala pg para verificar conexión: npm install pg${NC}"
fi

rm /tmp/test_connection.js 2>/dev/null

echo -e "${GREEN}🎯 Próximos pasos:${NC}"
echo -e "1. Actualizar .env con DATABASE_URL"
echo -e "2. Ejecutar: npx prisma migrate dev"
echo -e "3. Ejecutar: node scripts/migrate-to-postgresql.js"

echo -e "${BLUE}🔧 Comandos útiles:${NC}"
echo -e "  • Ver logs: docker logs ${CONTAINER_NAME}"
echo -e "  • Parar: docker stop ${CONTAINER_NAME}"
echo -e "  • Iniciar: docker start ${CONTAINER_NAME}"
echo -e "  • Conectar: docker exec -it ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME}"