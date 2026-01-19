# 🚀 Deploy Simplificado - Ejecutar Migración Localmente

## 🎯 Estrategia Simplificada

Como ya tienes el `DATABASE_URL` de producción en tu `.env`, vamos a:

1. **Ejecutar la migración desde tu máquina local** apuntando a producción
2. **Cambiar el build command en Vercel** a uno más simple (sin el script de migración)
3. **Push a main** y dejar que Vercel solo haga el build

**Ventajas**:
- ✅ Más control sobre la migración
- ✅ Ves los logs en tiempo real
- ✅ Puedes detener si algo sale mal
- ✅ Build de Vercel más rápido y simple
- ✅ Menos cosas que pueden fallar en Vercel

---

## 📋 Pasos Simplificados

### PASO 1: Backup de Base de Datos (CRÍTICO)

**Opción A - Desde Vercel Dashboard:**
1. Ve a tu proyecto en Vercel
2. Storage → Tu base de datos → Backups
3. Crea un snapshot manual

**Opción B - Desde tu máquina (si tienes `pg_dump`):**
```bash
# Asegúrate de que DATABASE_URL apunta a producción
pg_dump $DATABASE_URL > backup-pre-deploy-$(date +%Y%m%d-%H%M%S).sql
```

---

### PASO 2: Verificar que apuntas a Producción

```bash
# Ver a qué DB estás apuntando
cat .env | grep DATABASE_URL

# Debería mostrar la URL de producción (Vercel Postgres)
# Ejemplo: postgresql://user:pass@ep-xxx.us-east-1.postgres.vercel-storage.com/verceldb
```

⚠️ **IMPORTANTE**: Asegúrate de que es la DB de producción, no la local.

---

### PASO 3: Ejecutar Migración de Schema

```bash
# Aplicar la migración SQL
npx prisma migrate deploy
```

**Deberías ver**:
```
Applying migration `20260119131206_add_multi_currency_and_installment_tracking`
The following migration(s) have been applied:
migrations/
  └─ 20260119131206_add_multi_currency_and_installment_tracking/
    └─ migration.sql
```

---

### PASO 4: Ejecutar Migración de Datos

```bash
# Ejecutar el script de migración de datos
npx tsx prisma/migrations/data-migration-phase-2.ts
```

**Deberías ver**:
```
🚀 Iniciando migración de datos - FASE 2
📊 Migrando InstallmentPayments...
✅ Migrados X installment payments
✅ Calculando summarySequence...
✅ Actualizados X summaries
✅ Migración completada exitosamente
```

---

### PASO 5: Validar Migración

```bash
# Ejecutar script de validación
npx tsx scripts/validate-migration.ts
```

**Deberías ver**:
```
✅ Validación completada: 0 errores encontrados
```

---

### PASO 6: Cambiar Build Command en Vercel

Ahora que la migración ya está aplicada en producción, el build command de Vercel puede ser más simple:

1. Ve a: https://vercel.com/tu-proyecto/settings/general
2. Scroll hasta "Build & Development Settings"
3. Click en "Override" en "Build Command"
4. Pegar:
   ```
   prisma generate && prisma migrate deploy && next build
   ```
5. Click en "Save"

**Nota**: Dejamos `prisma migrate deploy` para que en futuros deploys se apliquen nuevas migraciones automáticamente, pero ya no necesitamos el script de migración de datos porque ya lo ejecutamos manualmente.

---

### PASO 7: Push a Main

```bash
# Verificar estado
git status

# Agregar todos los cambios
git add .

# Commit
git commit -m "feat: add multi-currency support, annual payments, and UI improvements

- Add multi-currency support (ARS/USD) for expenses and credit cards
- Add InstallmentPayment model for better installment tracking
- Add annual payment support for expenses
- Add credit balance field in credit card summaries
- Add inline amount editing in dashboard
- Add currency-separated totals in UI
- Add last four digits field for credit cards
- Improve UI with currency badges and better visualization"

# Push
git push origin main
```

---

### PASO 8: Monitorear Deploy en Vercel

1. Ve a: https://vercel.com/tu-proyecto/deployments
2. Click en el deployment más reciente
3. Verifica que:
   - ✅ `prisma generate` se ejecuta
   - ✅ `prisma migrate deploy` se ejecuta (debería decir "No pending migrations")
   - ✅ `next build` completa sin errores

---

### PASO 9: Validar en Producción

1. **Verificar UI**:
   - Dashboard muestra totales separados por ARS y USD
   - Puedes crear gastos con moneda USD
   - Puedes marcar gastos como pago anual
   - Puedes generar resúmenes de tarjeta con multi-moneda
   - El saldo a favor se muestra correctamente

2. **Verificar Logs de Vercel**:
   - Ve a: https://vercel.com/tu-proyecto/logs
   - Busca errores relacionados con Prisma o base de datos

---

## ✅ Checklist Rápido

- [ ] **BACKUP DE DB REALIZADO** ← CRÍTICO
- [ ] Verificar que `.env` apunta a producción
- [ ] Ejecutar `npx prisma migrate deploy`
- [ ] Ejecutar `npx tsx prisma/migrations/data-migration-phase-2.ts`
- [ ] Ejecutar `npx tsx scripts/validate-migration.ts`
- [ ] Cambiar build command en Vercel
- [ ] Commit y push a main
- [ ] Monitorear deploy en Vercel
- [ ] Validar que todo funciona en producción

---

## 🆚 Comparación: Local vs Vercel

| Aspecto | Ejecutar Localmente | Ejecutar en Vercel |
|---------|---------------------|-------------------|
| Control | ✅ Total | ⚠️ Limitado |
| Logs en tiempo real | ✅ Sí | ⚠️ Solo después |
| Detener si falla | ✅ Fácil | ❌ Difícil |
| Validación inmediata | ✅ Sí | ⚠️ Manual |
| Complejidad | ✅ Simple | ⚠️ Más complejo |
| Build de Vercel | ✅ Más rápido | ⚠️ Más lento |

**Recomendación**: ✅ **Ejecutar localmente** (este documento)

---

## ⚠️ Importante

**Después de ejecutar la migración localmente**:

1. ✅ La migración ya está aplicada en producción
2. ✅ Los datos ya están migrados
3. ✅ Vercel solo necesita hacer el build
4. ✅ Futuros deploys aplicarán nuevas migraciones automáticamente

**NO necesitas**:
- ❌ Ejecutar el script de migración de datos en Vercel
- ❌ Preocuparte por que el script falle en Vercel
- ❌ Esperar a que Vercel ejecute la migración

---

## 🎉 ¡Listo!

Una vez que completes todos los pasos, tu aplicación estará desplegada en producción con todas las nuevas funcionalidades.

**Ventaja de este método**: Ya validaste que la migración funcionó ANTES de hacer el deploy, así que el deploy de Vercel es solo compilar y desplegar el código nuevo.

