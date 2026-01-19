# ❓ FAQ - Deploy a Producción

## Tus Preguntas Respondidas

### 1. ¿Cómo volcamos todo esto a producción?

**Respuesta**: Necesitas hacer 2 cosas:

1. **Cambiar el build command en Vercel** de:
   ```
   prisma generate && prisma db push && next build
   ```
   
   A:
   ```
   prisma generate && prisma migrate deploy && npx tsx prisma/migrations/data-migration-phase-2.ts && next build
   ```

2. **Hacer push a main**:
   ```bash
   git add .
   git commit -m "feat: multi-currency support and improvements"
   git push origin main
   ```

**¿Por qué este cambio?**
- `prisma db push` → Solo sincroniza el schema, NO ejecuta migraciones
- `prisma migrate deploy` → Ejecuta las migraciones SQL correctamente
- `npx tsx prisma/migrations/data-migration-phase-2.ts` → Migra los datos históricos

---

### 2. ¿Los scripts andarán bien en Vercel?

**Respuesta**: **SÍ**, pero con una condición:

✅ **Ya instalamos `tsx` como dev dependency**, así que Vercel podrá ejecutar el script de migración.

El script `data-migration-phase-2.ts` es **idempotente**, lo que significa:
- Si los datos ya están migrados, no hace nada
- Si se ejecuta múltiples veces, no causa problemas
- Detecta automáticamente qué datos necesitan migración

**Ejemplo de ejecución en Vercel**:
```
Running "npx tsx prisma/migrations/data-migration-phase-2.ts"
🚀 Iniciando migración de datos - FASE 2
📊 Migrando InstallmentPayments...
✅ Migrados 23 installment payments
✅ Migración completada exitosamente
```

---

### 3. ¿Qué pasa después del push a main?

**Respuesta**: Vercel hará automáticamente:

1. **Detectar el push** a main
2. **Iniciar el build** con el nuevo build command
3. **Ejecutar**:
   - `prisma generate` → Genera el Prisma Client
   - `prisma migrate deploy` → Aplica la migración SQL
   - `npx tsx prisma/migrations/data-migration-phase-2.ts` → Migra datos históricos
   - `next build` → Compila la aplicación
4. **Desplegar** la nueva versión si todo sale bien

**Tiempo estimado**: 3-5 minutos

---

### 4. ¿Tenemos que borrar algo después del deploy?

**Respuesta**: **NO**, no necesitas borrar nada.

El repo puede quedar exactamente como está porque:

✅ **Los scripts son idempotentes**:
- Si se ejecutan en un deploy futuro, detectan que ya se ejecutaron y no hacen nada
- No causan problemas si se ejecutan múltiples veces

✅ **Los archivos de migración son parte del historial**:
- Prisma los necesita para saber qué migraciones ya se aplicaron
- Son necesarios para futuros desarrolladores que clonen el repo

✅ **El build command puede quedarse así permanentemente**:
- Siempre ejecutará migraciones en cada deploy (seguro)
- El overhead es mínimo (unos segundos extra)

---

### 5. ¿Hay que sacar la ejecución de scripts del build command?

**Respuesta**: **NO, déjalo como está**.

**Razones**:

1. **Seguridad**: Si en el futuro agregas nuevas migraciones, se ejecutarán automáticamente
2. **Idempotencia**: El script detecta si ya se ejecutó y no hace nada
3. **Overhead mínimo**: Solo agrega 2-3 segundos al build
4. **Consistencia**: Todos los deploys ejecutan el mismo proceso

**Build command recomendado permanentemente**:
```bash
prisma generate && prisma migrate deploy && npx tsx prisma/migrations/data-migration-phase-2.ts && next build
```

---

### 6. ¿Hay que limpiar algo del repo?

**Respuesta**: **NO**, el repo queda como está.

**Archivos que quedan en el repo**:

✅ **Mantener**:
- `prisma/migrations/data-migration-phase-2.ts` → Script de migración
- `scripts/validate-migration.ts` → Script de validación
- `scripts/deploy-option-b.sh` → Script de deploy local
- `DEPLOY_PRODUCTION.md` → Documentación
- `DEPLOY_CHECKLIST.md` → Checklist
- `FAQ_DEPLOY.md` → Este archivo

**¿Por qué mantenerlos?**
- Documentación para futuros desarrolladores
- Útiles para debugging si algo sale mal
- Necesarios si alguien clona el repo y necesita configurar su DB local

❌ **NO borrar**:
- Ningún archivo de migración
- Ningún script
- Ninguna documentación

---

### 7. ¿Qué pasa si algo sale mal?

**Respuesta**: Tienes 2 opciones de rollback:

**Opción A - Rollback en Vercel (rápido)**:
1. Ve a Vercel → Deployments
2. Encuentra el deployment anterior (el que funcionaba)
3. Click en "..." → "Promote to Production"
4. **PERO**: Tendrás que restaurar el backup de la DB manualmente

**Opción B - Restaurar Backup de DB**:
```bash
psql $DATABASE_URL_PRODUCTION < backup-pre-deploy-XXXXXX.sql
```

**Por eso es CRÍTICO hacer backup antes del deploy**.

---

### 8. ¿Puedo probar esto en staging primero?

**Respuesta**: **SÍ, altamente recomendado**.

**Cómo hacerlo**:

1. **Crear un preview deployment en Vercel**:
   ```bash
   git checkout -b staging-test
   git push origin staging-test
   ```

2. **Vercel creará un preview deployment automáticamente**

3. **Configurar una DB de staging**:
   - Crea una nueva DB en Vercel Postgres (o donde tengas tu DB)
   - Configura la variable de entorno `DATABASE_URL` para el preview deployment
   - Copia los datos de producción a staging (opcional)

4. **Probar el deploy en staging**:
   - Vercel ejecutará el build command
   - Puedes probar todas las funcionalidades
   - Si algo sale mal, no afecta producción

5. **Si todo funciona, mergear a main**:
   ```bash
   git checkout main
   git merge staging-test
   git push origin main
   ```

---

## 🎯 Resumen de Respuestas

| Pregunta | Respuesta Corta |
|----------|----------------|
| ¿Cómo desplegar? | Cambiar build command + push a main |
| ¿Scripts funcionarán? | Sí, son idempotentes |
| ¿Qué pasa después del push? | Vercel hace build y deploy automático |
| ¿Borrar algo después? | No, dejar todo como está |
| ¿Sacar scripts del build? | No, dejarlos permanentemente |
| ¿Limpiar el repo? | No, mantener todo |
| ¿Qué hacer si falla? | Rollback en Vercel + restaurar backup DB |
| ¿Probar en staging? | Sí, recomendado |

---

## ✅ Próximos Pasos

1. **Hacer backup de la DB de producción** ← CRÍTICO
2. **Cambiar build command en Vercel**
3. **Push a main**
4. **Monitorear el deploy**
5. **Validar que todo funciona**
6. **¡Celebrar!** 🎉

