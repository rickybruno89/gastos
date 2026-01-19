# 🚀 Plan de Deploy a Producción - GastApp

## 📋 Resumen de Cambios

Esta actualización incluye:
- ✅ Soporte multi-moneda (ARS/USD) para gastos y tarjetas de crédito
- ✅ Nuevo sistema de tracking de cuotas con `InstallmentPayment`
- ✅ Campo "últimos 4 dígitos" en tarjetas de crédito
- ✅ Soporte para pagos anuales en gastos
- ✅ Campo "saldo a favor" en resúmenes de tarjetas
- ✅ Edición inline de montos en dashboard
- ✅ Visualización separada por moneda en toda la UI

---

## ⚠️ IMPORTANTE: Build Command en Vercel

Tu build command actual en Vercel es:
```bash
prisma generate && prisma db push && next build
```

**PROBLEMA**: `prisma db push` NO ejecuta migraciones, solo sincroniza el schema. Esto significa que:
- ❌ No se ejecutará la migración SQL que agrega los nuevos campos
- ❌ No se ejecutará el script de migración de datos históricos
- ❌ La base de datos quedará inconsistente

**SOLUCIÓN**: Necesitas cambiar el build command en Vercel a:
```bash
prisma generate && prisma migrate deploy && npx tsx prisma/migrations/data-migration-phase-2.ts && next build
```

---

## 📝 Pasos para Deploy a Producción

### PASO 1: Backup de Base de Datos (CRÍTICO)

Antes de hacer CUALQUIER cosa, haz un backup completo de la base de datos de producción.

**Opción A - Desde Vercel Postgres Dashboard:**
1. Ve a tu proyecto en Vercel
2. Ve a Storage → Tu base de datos
3. Haz un snapshot/backup

**Opción B - Desde CLI:**
```bash
# Conectarte a la DB de producción y hacer dump
pg_dump $DATABASE_URL_PRODUCTION > backup-pre-deploy-$(date +%Y%m%d-%H%M%S).sql
```

---

### PASO 2: Actualizar Build Command en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → General → Build & Development Settings
3. Cambia el **Build Command** a:
   ```bash
   prisma generate && prisma migrate deploy && npx tsx prisma/migrations/data-migration-phase-2.ts && next build
   ```
4. Guarda los cambios

---

### PASO 3: Push a Main

```bash
git add .
git commit -m "feat: add multi-currency support, annual payments, and UI improvements"
git push origin main
```

Vercel detectará el push y comenzará el deploy automáticamente.

---

### PASO 4: Monitorear el Deploy

1. Ve a Vercel Dashboard → Deployments
2. Observa el log del build en tiempo real
3. Verifica que:
   - ✅ `prisma generate` se ejecuta correctamente
   - ✅ `prisma migrate deploy` aplica la migración `20260119131206_add_multi_currency_and_installment_tracking`
   - ✅ `data-migration-phase-2.ts` se ejecuta y migra los datos históricos
   - ✅ `next build` compila sin errores

---

### PASO 5: Validación Post-Deploy

Una vez que el deploy esté completo:

1. **Verifica la UI**:
   - Ve al dashboard y verifica que los totales se muestran por moneda
   - Crea un gasto nuevo y verifica que puedes seleccionar moneda
   - Edita un gasto y márcalo como pago anual
   - Genera un resumen de tarjeta con items en ARS y USD

2. **Verifica la Base de Datos**:
   - Ejecuta el script de validación localmente apuntando a producción:
   ```bash
   DATABASE_URL="tu_database_url_de_produccion" npx tsx scripts/validate-migration.ts
   ```

3. **Verifica Logs**:
   - Ve a Vercel → Functions → Logs
   - Busca errores relacionados con Prisma o base de datos

---

### PASO 6: Limpieza Post-Deploy (OPCIONAL)

**¿Necesitas limpiar algo del repo después del deploy?**

**NO**, el repo puede quedar como está. Los scripts de migración son **idempotentes**, lo que significa que:
- Si se ejecutan múltiples veces, no causan problemas
- Si los datos ya están migrados, el script los detecta y no hace nada

**Sin embargo**, si quieres optimizar el build command para futuros deploys (después de confirmar que todo funciona):

#### Opción A: Dejar el build command como está
```bash
prisma generate && prisma migrate deploy && npx tsx prisma/migrations/data-migration-phase-2.ts && next build
```

**Ventajas**:
- Siempre ejecuta migraciones en cada deploy
- Seguro para futuros cambios de schema
- El script de migración es idempotente (no hace nada si ya está migrado)

**Desventajas**:
- Builds ligeramente más lentos (unos segundos extra)

#### Opción B: Volver al build command original (SOLO después de confirmar que todo funciona)
```bash
prisma generate && prisma migrate deploy && next build
```

**Ventajas**:
- Builds más rápidos
- Sigue ejecutando migraciones de schema

**Desventajas**:
- No ejecuta el script de migración de datos
- Si en el futuro agregas nuevos datos históricos, tendrás que ejecutar el script manualmente

**RECOMENDACIÓN**: Usa la **Opción A** permanentemente. El overhead es mínimo y te aseguras de que siempre se ejecuten las migraciones.

---

## 🔧 Troubleshooting

### Error: "Migration failed to apply"

**Causa**: La migración ya fue aplicada o hay un conflicto.

**Solución**:
1. Verifica el estado de las migraciones:
   ```bash
   npx prisma migrate status
   ```
2. Si la migración ya está aplicada, está bien. Vercel continuará con el build.

### Error: "data-migration-phase-2.ts not found"

**Causa**: El archivo no está en el repositorio.

**Solución**:
1. Verifica que el archivo existe en `prisma/migrations/data-migration-phase-2.ts`
2. Asegúrate de que está commiteado:
   ```bash
   git add prisma/migrations/data-migration-phase-2.ts
   git commit -m "add data migration script"
   git push
   ```

### Error: "Cannot find module 'tsx'"

**Causa**: `tsx` no está instalado como dependencia.

**Solución**:
1. Instala `tsx` como dependencia de desarrollo:
   ```bash
   npm install -D tsx
   git add package.json package-lock.json
   git commit -m "add tsx as dev dependency"
   git push
   ```

### Los datos históricos no se migraron

**Causa**: El script de migración falló silenciosamente.

**Solución**:
1. Ejecuta el script manualmente desde Vercel CLI:
   ```bash
   vercel env pull .env.production
   npx tsx prisma/migrations/data-migration-phase-2.ts
   ```
2. O ejecuta desde tu máquina local apuntando a producción:
   ```bash
   DATABASE_URL="tu_url_de_produccion" npx tsx prisma/migrations/data-migration-phase-2.ts
   ```

---

## 📊 Checklist Final

Antes de hacer push a main:

- [ ] Backup de base de datos de producción realizado
- [ ] Build command actualizado en Vercel
- [ ] Todos los archivos commiteados (incluyendo `data-migration-phase-2.ts`)
- [ ] Build local exitoso (`npm run build`)
- [ ] `tsx` instalado como dev dependency

Durante el deploy:

- [ ] Monitorear logs de Vercel en tiempo real
- [ ] Verificar que `prisma migrate deploy` se ejecuta
- [ ] Verificar que `data-migration-phase-2.ts` se ejecuta
- [ ] Verificar que `next build` completa sin errores

Post-deploy:

- [ ] Dashboard muestra totales por moneda correctamente
- [ ] Puedes crear gastos con moneda USD
- [ ] Puedes marcar gastos como pago anual
- [ ] Puedes generar resúmenes de tarjeta con multi-moneda
- [ ] Script de validación ejecutado sin errores
- [ ] No hay errores en los logs de Vercel

---

## 🎯 Resumen Ejecutivo

1. **Haz backup de la DB de producción** ← CRÍTICO
2. **Cambia el build command en Vercel** a:
   ```
   prisma generate && prisma migrate deploy && npx tsx prisma/migrations/data-migration-phase-2.ts && next build
   ```
3. **Push a main**: `git push origin main`
4. **Monitorea el deploy** en Vercel Dashboard
5. **Valida** que todo funciona correctamente
6. **Deja el build command como está** para futuros deploys

---

## ❓ FAQ

**P: ¿Puedo hacer rollback si algo sale mal?**
R: Sí, en Vercel puedes hacer rollback a un deployment anterior desde el dashboard. Pero tendrás que restaurar el backup de la base de datos manualmente.

**P: ¿Cuánto tiempo tomará el deploy?**
R: Aproximadamente 3-5 minutos (dependiendo de cuántos datos históricos tengas).

**P: ¿Los usuarios perderán datos?**
R: No, la migración es aditiva. Solo agrega nuevos campos y migra datos existentes.

**P: ¿Puedo probar esto en un ambiente de staging primero?**
R: Sí, altamente recomendado. Crea un preview deployment en Vercel con una base de datos de staging.

**P: ¿Qué pasa si el script de migración falla?**
R: El build de Vercel fallará y no se desplegará la nueva versión. Tu app seguirá funcionando con la versión anterior.

---

**¿Listo para hacer el deploy?** 🚀


