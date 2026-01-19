# ✅ Checklist de Deploy a Producción

## 🎯 Resumen Ultra-Rápido

1. **Backup DB** ← CRÍTICO
2. **Cambiar build command en Vercel** a:
   ```
   prisma generate && prisma migrate deploy && npx tsx prisma/migrations/data-migration-phase-2.ts && next build
   ```
3. **Commit y push**:
   ```bash
   git add .
   git commit -m "feat: multi-currency support and UI improvements"
   git push origin main
   ```
4. **Monitorear deploy en Vercel**
5. **Validar que todo funciona**

---

## 📋 Checklist Detallado

### ANTES del Deploy

- [ ] **BACKUP DE BASE DE DATOS REALIZADO** ← CRÍTICO
- [ ] `tsx` instalado como dev dependency (✅ Ya instalado)
- [ ] Build local exitoso: `npm run build` (✅ Ya verificado)
- [ ] Todos los archivos commiteados:
  ```bash
  git status  # Verificar que no hay archivos sin commitear
  ```

### Cambiar Build Command en Vercel

- [ ] Ir a: https://vercel.com/tu-proyecto/settings/general
- [ ] Scroll hasta "Build & Development Settings"
- [ ] Click en "Override" en "Build Command"
- [ ] Pegar:
  ```
  prisma generate && prisma migrate deploy && npx tsx prisma/migrations/data-migration-phase-2.ts && next build
  ```
- [ ] Click en "Save"

### Push a Main

```bash
# 1. Verificar estado
git status

# 2. Agregar todos los cambios
git add .

# 3. Commit
git commit -m "feat: add multi-currency support, annual payments, and UI improvements

- Add multi-currency support (ARS/USD) for expenses and credit cards
- Add InstallmentPayment model for better installment tracking
- Add annual payment support for expenses
- Add credit balance field in credit card summaries
- Add inline amount editing in dashboard
- Add currency-separated totals in UI
- Add last four digits field for credit cards
- Improve UI with currency badges and better visualization"

# 4. Push
git push origin main
```

### Durante el Deploy (Monitorear en Vercel)

- [ ] Ir a: https://vercel.com/tu-proyecto/deployments
- [ ] Click en el deployment más reciente
- [ ] Click en "Building" para ver logs en tiempo real
- [ ] Verificar que aparece:
  - ✅ `✔ Generated Prisma Client`
  - ✅ `Running prisma migrate deploy...`
  - ✅ `Migration 20260119131206_add_multi_currency_and_installment_tracking applied`
  - ✅ `Ejecutando migración de datos...`
  - ✅ `✔ Compiled successfully`

### Después del Deploy

- [ ] **Verificar UI**:
  - [ ] Dashboard muestra totales separados por ARS y USD
  - [ ] Puedes crear un gasto nuevo con moneda USD
  - [ ] Puedes editar un gasto y marcarlo como pago anual
  - [ ] Puedes generar resumen de tarjeta con items en ARS y USD
  - [ ] El saldo a favor se muestra en el detalle del resumen
  - [ ] Los badges de moneda aparecen correctamente

- [ ] **Verificar Logs de Vercel**:
  - [ ] Ir a: https://vercel.com/tu-proyecto/logs
  - [ ] Buscar errores relacionados con Prisma o base de datos
  - [ ] Verificar que no hay errores 500

- [ ] **Ejecutar Script de Validación** (opcional):
  ```bash
  # Desde tu máquina local, apuntando a producción
  DATABASE_URL="tu_url_de_produccion" npx tsx scripts/validate-migration.ts
  ```

### Si Todo Funciona Correctamente

- [ ] ✅ Deploy exitoso
- [ ] ✅ Usuarios pueden usar la app normalmente
- [ ] ✅ Nuevas funcionalidades disponibles
- [ ] **Dejar el build command como está** para futuros deploys

### Si Algo Sale Mal

- [ ] **Rollback en Vercel**:
  1. Ir a: https://vercel.com/tu-proyecto/deployments
  2. Encontrar el deployment anterior (el que funcionaba)
  3. Click en "..." → "Promote to Production"

- [ ] **Restaurar Backup de DB**:
  ```bash
  # Si hiciste backup con pg_dump
  psql $DATABASE_URL_PRODUCTION < backup-pre-deploy-XXXXXX.sql
  ```

- [ ] **Revisar logs** para identificar el error
- [ ] **Contactar al equipo** si es necesario

---

## 🔍 Qué Esperar en los Logs de Vercel

### ✅ Logs Exitosos

```
Running "prisma generate"
✔ Generated Prisma Client (v5.5.2)

Running "prisma migrate deploy"
Applying migration `20260119131206_add_multi_currency_and_installment_tracking`
The following migration(s) have been applied:
migrations/
  └─ 20260119131206_add_multi_currency_and_installment_tracking/
    └─ migration.sql

Running "npx tsx prisma/migrations/data-migration-phase-2.ts"
🚀 Iniciando migración de datos - FASE 2
📊 Migrando InstallmentPayments...
✅ Migrados 23 installment payments
✅ Migración completada exitosamente

Running "next build"
✓ Creating an optimized production build
✓ Compiled successfully
```

### ❌ Logs con Errores

Si ves algo como:
```
Error: Migration failed to apply
```
O:
```
Error: Cannot find module 'tsx'
```

Consulta la sección de **Troubleshooting** en `DEPLOY_PRODUCTION.md`

---

## 📞 Contacto en Caso de Emergencia

Si algo sale mal y necesitas ayuda:

1. **NO ENTRES EN PÁNICO** - Tienes backup de la DB
2. **Haz rollback** en Vercel inmediatamente
3. **Revisa los logs** para identificar el error
4. **Restaura el backup** de la DB si es necesario

---

## 🎉 ¡Listo!

Una vez que completes todos los pasos del checklist, tu aplicación estará desplegada en producción con todas las nuevas funcionalidades.

**Recuerda**: El build command que configuraste ejecutará las migraciones automáticamente en cada deploy futuro, así que no necesitas hacer nada especial para futuros cambios.

