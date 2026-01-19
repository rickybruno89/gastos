#!/bin/bash

# Script de Deploy a Producción - Ejecutar Migración Localmente
# Este script ejecuta la migración en la DB de producción desde tu máquina local

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║         🚀 DEPLOY A PRODUCCIÓN - MIGRACIÓN LOCAL          ║${NC}"
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
    echo -e "${RED}   Configura la variable de entorno DATABASE_URL en .env${NC}"
    exit 1
fi

# Mostrar a qué DB estamos apuntando
echo -e "${CYAN}📍 Base de datos detectada:${NC}"
echo -e "${YELLOW}   $DATABASE_URL${NC}"
echo ""

# Verificar que es producción
if [[ $DATABASE_URL == *"localhost"* ]] || [[ $DATABASE_URL == *"127.0.0.1"* ]]; then
    echo -e "${RED}⚠️  ADVERTENCIA: Parece que estás apuntando a una DB local${NC}"
    echo -e "${RED}   Este script está diseñado para ejecutarse contra producción${NC}"
    echo ""
    read -p "¿Estás seguro de que quieres continuar? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Deploy cancelado${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}⚠️  ADVERTENCIA CRÍTICA:${NC}"
echo -e "${YELLOW}   Este script modificará la base de datos de PRODUCCIÓN${NC}"
echo -e "${YELLOW}   Asegúrate de tener un BACKUP antes de continuar${NC}"
echo ""
echo -e "${CYAN}¿Ya hiciste un backup de la base de datos?${NC}"
read -p "Escribe 'SI' para continuar: " -r
echo
if [[ ! $REPLY == "SI" ]]; then
    echo -e "${RED}❌ Deploy cancelado${NC}"
    echo -e "${YELLOW}   Por favor, haz un backup primero:${NC}"
    echo -e "${YELLOW}   - Desde Vercel: Storage → Tu DB → Backups${NC}"
    echo -e "${YELLOW}   - O ejecuta: pg_dump \$DATABASE_URL > backup.sql${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📦 PASO 1/4: Generando Prisma Client...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
npx prisma generate

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🗄️  PASO 2/4: Aplicando migración de schema...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
npx prisma migrate deploy

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📊 PASO 3/4: Migrando datos históricos...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
npx tsx prisma/migrations/data-migration-phase-2.ts

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ PASO 4/4: Validando migración...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
npx tsx scripts/validate-migration.ts

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ MIGRACIÓN COMPLETADA EXITOSAMENTE${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}🎉 La base de datos de producción ha sido migrada${NC}"
echo ""
echo -e "${YELLOW}Próximos pasos:${NC}"
echo -e "  1. ${CYAN}Cambiar build command en Vercel${NC} a:"
echo -e "     ${BLUE}prisma generate && prisma migrate deploy && next build${NC}"
echo ""
echo -e "  2. ${CYAN}Commit y push a main:${NC}"
echo -e "     ${BLUE}git add .${NC}"
echo -e "     ${BLUE}git commit -m \"feat: multi-currency support and improvements\"${NC}"
echo -e "     ${BLUE}git push origin main${NC}"
echo ""
echo -e "  3. ${CYAN}Monitorear el deploy en Vercel${NC}"
echo ""
echo -e "  4. ${CYAN}Validar que todo funciona en producción${NC}"
echo ""
echo -e "${GREEN}✨ ¡Todo listo para hacer push a main!${NC}"
echo ""

