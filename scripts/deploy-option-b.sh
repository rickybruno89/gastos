#!/bin/bash

# Script de Deploy Completo - Opción B
# Este script ejecuta todas las migraciones y validaciones necesarias

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║         🚀 DEPLOY OPCIÓN B - MULTI-MONEDA + FIXES         ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: No se encontró package.json${NC}"
    echo -e "${RED}   Ejecuta este script desde la raíz del proyecto${NC}"
    exit 1
fi

# Verificar que existe DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL no está configurada${NC}"
    echo -e "${RED}   Configura la variable de entorno DATABASE_URL${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  ADVERTENCIA: Este script modificará la base de datos${NC}"
echo -e "${YELLOW}   Asegúrate de tener un backup antes de continuar${NC}"
echo ""
read -p "¿Deseas continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Deploy cancelado${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📦 PASO 1/6: Instalando dependencias...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
npm install

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🔧 PASO 2/6: Generando Prisma Client...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
npx prisma generate

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🗄️  PASO 3/6: Aplicando migraciones de schema...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
npx prisma migrate deploy

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📊 PASO 4/6: Migrando datos históricos...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ -f "prisma/migrations/data-migration-phase-2.ts" ]; then
    npx tsx prisma/migrations/data-migration-phase-2.ts
else
    echo -e "${YELLOW}⚠️  Script de migración de datos no encontrado, saltando...${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ PASO 5/6: Validando migración...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

if [ -f "scripts/validate-migration.ts" ]; then
    npx tsx scripts/validate-migration.ts
else
    echo -e "${YELLOW}⚠️  Script de validación no encontrado, saltando...${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🏗️  PASO 6/6: Building aplicación...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
npm run build

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOY COMPLETADO EXITOSAMENTE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}🎉 La aplicación está lista para usar${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "  1. Ejecuta ${BLUE}npm run dev${NC} para iniciar en desarrollo"
echo -e "  2. O ejecuta ${BLUE}npm start${NC} para iniciar en producción"
echo -e "  3. Verifica que todas las funcionalidades funcionan correctamente"
echo ""
echo -e "${YELLOW}En caso de problemas:${NC}"
echo -e "  - Revisa los logs arriba para ver errores"
echo -e "  - Restaura el backup de la base de datos si es necesario"
echo -e "  - Contacta al equipo de desarrollo"
echo ""

