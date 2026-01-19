# 📋 Plan de Migración - Opción B Completa

## 🎯 Objetivos

### Problemas a Resolver:
1. ❌ Doble pago de resúmenes incrementa cuotas incorrectamente
2. ❌ Número de cuota mostrado puede estar incorrecto
3. ❌ No hay forma de corregir manualmente el número de cuota
4. ❌ No hay soporte para múltiples monedas (ARS/USD)
5. ❌ No hay campo para saldo a favor en resúmenes
6. ❌ Expenses con pago anual requieren marcarse como "omitir" cada mes

### Soluciones:
1. ✅ Reestructurar DB para tener fuente de verdad única
2. ✅ Agregar validación de idempotencia en pagos
3. ✅ Permitir edición manual de cuotas
4. ✅ Soporte completo para ARS y USD
5. ✅ Campo de saldo a favor editable
6. ✅ Expenses con pago anual se marcan automáticamente como pagados

---

## 🚀 FASE 1: Preparación (Sin cambios visibles)

### Objetivo: Agregar nuevas estructuras sin romper nada

### 1.1 Cambios en Schema

```prisma
// Agregar enum de moneda
enum Currency {
  ARS
  USD
}

// Agregar campos opcionales a modelos existentes
model Expense {
  // ... campos existentes ...
  currency         Currency? @default(ARS)
  isAnnualPayment  Boolean?  @default(false)
  annualPaymentDate String?
}

model CreditCardExpenseItem {
  // ... campos existentes ...
  currency Currency? @default(ARS)
}

model ExpensePaymentSummary {
  // ... campos existentes ...
  currency Currency? @default(ARS)
}

model CreditCardPaymentSummary {
  // ... campos existentes ...
  summarySequence    Int?
  totalAmountARS     Float?
  totalAmountUSD     Float?
  creditBalanceARS   Float? @default(0)
  creditBalanceUSD   Float? @default(0)
  
  @@unique([creditCardId, date])
  @@unique([creditCardId, summarySequence])
}

// Nueva tabla
model InstallmentPayment {
  id                         String                   @id @default(cuid())
  creditCardExpenseItemId    String
  creditCardPaymentSummaryId String?
  installmentNumber          Int
  amount                     Float
  currency                   Currency                 @default(ARS)
  isPaid                     Boolean                  @default(false)
  paymentDate                String?
  
  @@unique([creditCardExpenseItemId, installmentNumber])
}
```

### 1.2 Migración SQL

```bash
npx prisma migrate dev --name add_multi_currency_and_installment_tracking
```

### 1.3 Resultado
- ✅ App sigue funcionando igual
- ✅ Nuevos campos tienen defaults seguros
- ✅ Datos existentes no se modifican

---

## 📊 FASE 2: Migración de Datos

### Objetivo: Poblar nuevas tablas con datos históricos

### 2.1 Ejecutar Script de Migración

```bash
npx tsx prisma/migrations/data-migration-phase-2.ts
```

### 2.2 Qué hace el script:

1. **Asigna moneda ARS** a todos los registros existentes
2. **Crea InstallmentPayment** para cada item de tarjeta:
   - Items recurrentes: 1 cuota con número 0
   - Items con cuotas: N cuotas (1, 2, 3... N)
   - Marca como pagadas las cuotas según historial
3. **Calcula summarySequence** para cada resumen (1, 2, 3...)
4. **Calcula totales por moneda** en cada resumen

### 2.3 Validación Post-Migración

```sql
-- Verificar que todos los items tienen cuotas
SELECT 
  cci.id,
  cci.description,
  COUNT(ip.id) as cuotas_creadas,
  cci.installmentsQuantity as cuotas_esperadas
FROM "CreditCardExpenseItem" cci
LEFT JOIN "InstallmentPayment" ip ON ip."creditCardExpenseItemId" = cci.id
WHERE cci.deleted = false AND cci.recurrent = false
GROUP BY cci.id
HAVING COUNT(ip.id) != cci."installmentsQuantity";

-- Verificar secuencias de resúmenes
SELECT 
  cc.name,
  cps."summarySequence",
  cps.date
FROM "CreditCardPaymentSummary" cps
JOIN "CreditCard" cc ON cc.id = cps."creditCardId"
ORDER BY cc.name, cps."summarySequence";
```

### 2.4 Resultado
- ✅ Todos los datos históricos migrados
- ✅ InstallmentPayment poblado correctamente
- ✅ App sigue funcionando con código viejo

---

## 🔄 FASE 3: Actualización de Código

### Objetivo: Usar la nueva estructura en la aplicación

### 3.1 Servicios Actualizados

**Archivos a modificar:**
- `services/credit-card.ts` → Usar `InstallmentPayment`
- `services/summary.ts` → Lógica de resúmenes con multi-moneda
- `services/expense.ts` → Soporte para pago anual

### 3.2 Cambios en UI

**Formulario de Resumen de Tarjeta:**
```tsx
// Agregar campos:
- Saldo a favor ARS (input numérico)
- Saldo a favor USD (input numérico)
- Total ARS (editable)
- Total USD (editable)
- Impuestos ARS
- Impuestos USD
```

**Formulario de Expense:**
```tsx
// Agregar campos:
- Moneda (select: ARS/USD)
- Pago anual (checkbox)
- Fecha de pago anual (date picker)
```

**Formulario de Item de Tarjeta:**
```tsx
// Agregar campo:
- Moneda (select: ARS/USD)
```

### 3.3 Visualización

**Dashboard - Resumen Mensual:**
```tsx
// Mostrar totales separados:
Total ARS: $XX,XXX.XX
Total USD: $X,XXX.XX

Pagado ARS: $XX,XXX.XX
Pagado USD: $X,XXX.XX
```

**Detalle de Resumen de Tarjeta:**
```tsx
// Mostrar:
Subtotal ARS: $XX,XXX.XX
Subtotal USD: $X,XXX.XX
Impuestos ARS: $XXX.XX
Impuestos USD: $XXX.XX
Saldo a favor ARS: -$XXX.XX
Saldo a favor USD: -$XXX.XX
---
Total a pagar ARS: $XX,XXX.XX
Total a pagar USD: $X,XXX.XX
```

---

## ✅ VENTAJAS DE LA OPCIÓN B

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Doble pago** | ❌ Incrementa dos veces | ✅ Validación de idempotencia |
| **Cuotas incorrectas** | ❌ Difícil de corregir | ✅ Editable manualmente |
| **Eliminar resumen** | ⚠️ Decrementa ciegamente | ✅ Solo último + rollback correcto |
| **Monedas** | ❌ Solo ARS implícito | ✅ ARS y USD explícitos |
| **Saldo a favor** | ❌ No existe | ✅ Campo editable |
| **Pago anual** | ❌ Marcar "omitir" cada mes | ✅ Auto-pagado |
| **Fuente de verdad** | ❌ Duplicada | ✅ Única (InstallmentPayment) |
| **Auditoría** | ⚠️ Limitada | ✅ Completa (fecha de cada pago) |

---

## 🔒 Seguridad de la Migración

### Rollback Plan

Si algo sale mal en Fase 3:
1. Revertir código a versión anterior
2. Los datos nuevos (InstallmentPayment) no afectan la app vieja
3. Campos opcionales permiten compatibilidad hacia atrás

### Testing Pre-Deploy

```bash
# 1. Backup de DB
pg_dump $DATABASE_URL > backup_pre_migration.sql

# 2. Ejecutar migración en staging
DATABASE_URL=$STAGING_DB_URL npx prisma migrate deploy
DATABASE_URL=$STAGING_DB_URL npx tsx prisma/migrations/data-migration-phase-2.ts

# 3. Validar datos
DATABASE_URL=$STAGING_DB_URL npx tsx scripts/validate-migration.ts

# 4. Deploy a producción solo si staging OK
```

---

## 📅 Timeline Estimado

- **Fase 1**: 1 día (schema + migración SQL)
- **Fase 2**: 1 día (script de migración + validación)
- **Fase 3**: 3-5 días (servicios + UI)
- **Testing**: 2 días
- **Deploy**: 1 día

**Total: ~1-2 semanas**


