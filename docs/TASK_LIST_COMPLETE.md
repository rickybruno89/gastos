# ✅ Lista Completa de Tareas - Opción B

## 📋 FASE 1: Schema y Migración Base

### 1.1 Actualizar Schema de Prisma
- [ ] Agregar enum `Currency` (ARS, USD)
- [ ] Agregar campos de moneda a `Expense`, `ExpensePaymentSummary`, `CreditCardExpenseItem`
- [ ] Agregar campos de pago anual a `Expense` (`isAnnualPayment`, `annualPaymentDate`)
- [ ] Agregar campos a `CreditCardPaymentSummary`:
  - `summarySequence` (Int)
  - `totalAmountARS`, `totalAmountUSD`
  - `taxesARS`, `taxesUSD`
  - `creditBalanceARS`, `creditBalanceUSD`
- [ ] Crear modelo `InstallmentPayment`
- [ ] Agregar constraints únicos necesarios

### 1.2 Crear Migración SQL
- [ ] Ejecutar `npx prisma migrate dev --name add_multi_currency_and_installment_tracking`
- [ ] Verificar que la migración se crea correctamente

---

## 📊 FASE 2: Script de Migración de Datos

### 2.1 Crear Script de Migración
- [ ] Crear `prisma/migrations/migrate-data-to-option-b.ts`
- [ ] Implementar lógica para:
  - Asignar `currency: ARS` a todos los registros existentes
  - Crear `InstallmentPayment` para cada `CreditCardExpenseItem`
  - Calcular `summarySequence` para cada resumen
  - Calcular totales por moneda en resúmenes existentes
  - Migrar datos de `CreditCardSummaryExpenseItem` a `InstallmentPayment`

### 2.2 Crear Script de Validación
- [ ] Crear `scripts/validate-migration.ts`
- [ ] Validar que todos los items tienen cuotas creadas
- [ ] Validar que las secuencias de resúmenes son correctas
- [ ] Validar que los totales calculados coinciden

---

## 🔧 FASE 3: Servicios Backend

### 3.1 Servicios de Tarjeta de Crédito
- [ ] Actualizar `createCreditCardExpenseItem` para:
  - Aceptar campo `currency`
  - Crear `InstallmentPayment` al crear item
- [ ] Actualizar `updateCreditCardExpenseItem` para soportar moneda
- [ ] Crear función `getInstallmentsPaid` (calculado desde `InstallmentPayment`)
- [ ] Crear función `isItemFinished` (calculado desde `InstallmentPayment`)
- [ ] Crear función `getNextUnpaidInstallment`

### 3.2 Servicios de Resumen de Tarjeta
- [ ] Actualizar `createCreditCardPaymentSummary` para:
  - Calcular `summarySequence`
  - Separar totales por moneda (ARS/USD)
  - Aceptar `creditBalanceARS` y `creditBalanceUSD`
  - Asociar `InstallmentPayment` al resumen
- [ ] Crear `updateCreditCardSummaryTotals` (editar totales manualmente)
- [ ] Actualizar `payCreditCardSummary` con:
  - Validación de idempotencia
  - Marcar `InstallmentPayment` como pagados
- [ ] Actualizar `deleteCreditCardPaymentSummary` para:
  - Validar que sea el último resumen
  - Desasociar cuotas correctamente

### 3.3 Servicios de Expenses
- [ ] Actualizar `createExpense` para aceptar `currency`
- [ ] Actualizar `updateExpense` para:
  - Aceptar `currency`
  - Aceptar `isAnnualPayment` y `annualPaymentDate`
- [ ] Actualizar `generateExpenseSummaryForMonth` para:
  - Auto-marcar como pagados los expenses con pago anual
  - Incluir moneda en resúmenes
- [ ] Crear `setExpenseAsAnnualPayment`
- [ ] Crear `unsetExpenseAsAnnualPayment`

---

## 🎨 FASE 4: UI - Formularios

### 4.1 Formulario de Item de Tarjeta
- [ ] Agregar selector de moneda (ARS/USD)
- [ ] Actualizar validación del formulario
- [ ] Mostrar moneda en preview de la tarjeta

### 4.2 Formulario de Resumen de Tarjeta
- [ ] Separar campos por moneda:
  - Subtotal ARS (calculado automáticamente)
  - Subtotal USD (calculado automáticamente)
  - Impuestos/Cargos ARS (editable)
  - Impuestos/Cargos USD (editable)
  - Saldo a favor ARS (editable)
  - Saldo a favor USD (editable)
- [ ] Mostrar totales finales por moneda
- [ ] Permitir edición manual de totales

### 4.3 Formulario de Expense
- [ ] Agregar selector de moneda (ARS/USD)
- [ ] Agregar checkbox "Pago Anual"
- [ ] Agregar campo "Fecha de Pago Anual" (condicional)
- [ ] Actualizar validación

### 4.4 Edición Rápida de Monto en Dashboard
- [ ] En `/dashboard?date=YYYY-MM`, lista de gastos:
  - Agregar input inline para editar monto
  - Guardar automáticamente al cambiar (debounce)
  - Mostrar indicador de guardado
  - Actualizar `ExpensePaymentSummary` correspondiente
- [ ] Mantener opción de editar completo (deslizar a la izquierda)

---

## 📱 FASE 5: UI - Visualización

### 5.1 Dashboard Principal
- [ ] Mostrar totales separados por moneda:
  - Total ARS / Total USD
  - Pagado ARS / Pagado USD
  - Pendiente ARS / Pendiente USD
- [ ] Actualizar tarjetas de resumen con íconos de moneda
- [ ] Mostrar moneda en cada item de la lista

### 5.2 Detalle de Resumen de Tarjeta
- [ ] Mostrar desglose por moneda:
  - Subtotal ARS / USD
  - Impuestos ARS / USD
  - Saldo a favor ARS / USD
  - Total a pagar ARS / USD
- [ ] Mostrar moneda en cada cuota
- [ ] Permitir editar número de cuota manualmente

### 5.3 Lista de Tarjetas
- [ ] Mostrar moneda por defecto de cada tarjeta
- [ ] Mostrar totales por moneda en cada tarjeta

### 5.4 Lista de Expenses
- [ ] Mostrar ícono/badge de moneda
- [ ] Mostrar badge "Pago Anual" si aplica
- [ ] Edición inline de monto (ver 4.4)

---

## 🧪 FASE 6: Testing y Validación

### 6.1 Testing Local
- [ ] Crear datos de prueba con ambas monedas
- [ ] Probar crear item de tarjeta en ARS
- [ ] Probar crear item de tarjeta en USD
- [ ] Probar crear resumen con items mixtos (ARS + USD)
- [ ] Probar editar totales manualmente
- [ ] Probar agregar saldo a favor
- [ ] Probar pagar resumen (validar idempotencia)
- [ ] Probar eliminar último resumen
- [ ] Probar eliminar resumen no-último (debe fallar)
- [ ] Probar crear expense con pago anual
- [ ] Probar generar resumen mensual con expenses anuales
- [ ] Probar edición rápida de monto en dashboard

### 6.2 Validación de Migración
- [ ] Ejecutar script de validación
- [ ] Verificar que no hay cuotas faltantes
- [ ] Verificar que secuencias son correctas
- [ ] Verificar que totales coinciden

---

## 🚀 FASE 7: Deploy

### 7.1 Preparación
- [ ] Crear backup de base de datos
- [ ] Documentar proceso de rollback
- [ ] Preparar script de deploy único

### 7.2 Script de Deploy Único
Crear `scripts/deploy-option-b.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Iniciando deploy de Opción B..."

# 1. Generar Prisma Client
echo "📦 Generando Prisma Client..."
npx prisma generate

# 2. Aplicar migraciones
echo "🗄️  Aplicando migraciones..."
npx prisma migrate deploy

# 3. Ejecutar migración de datos
echo "📊 Migrando datos históricos..."
npx tsx prisma/migrations/migrate-data-to-option-b.ts

# 4. Validar migración
echo "✅ Validando migración..."
npx tsx scripts/validate-migration.ts

# 5. Build de Next.js
echo "🏗️  Building aplicación..."
npm run build

echo "✅ Deploy completado!"
```

### 7.3 Ejecución en Local (Simulación)
- [ ] Ejecutar `./scripts/deploy-option-b.sh` en local
- [ ] Verificar que todo funciona
- [ ] Probar todas las funcionalidades

### 7.4 Ejecución en Producción
- [ ] Hacer backup de DB de producción
- [ ] Ejecutar script de deploy en producción
- [ ] Validar que la app funciona correctamente
- [ ] Monitorear errores en las primeras horas

---

## 📝 Notas Importantes

### Orden de Ejecución
1. ✅ Primero: Cambios en schema + migración SQL
2. ✅ Segundo: Script de migración de datos
3. ✅ Tercero: Actualizar código (servicios + UI)
4. ✅ Cuarto: Testing exhaustivo
5. ✅ Quinto: Deploy a producción

### Compatibilidad hacia atrás
- Todos los campos nuevos son opcionales con defaults
- La app vieja puede seguir funcionando durante la migración
- Los datos históricos se preservan

### Rollback
Si algo falla:
1. Revertir código a versión anterior
2. Restaurar backup de DB (solo si es crítico)
3. Los campos opcionales permiten que la app vieja funcione

---

## 🎯 Resumen de Funcionalidades Nuevas

1. ✅ **Multi-moneda**: ARS y USD en todos los gastos
2. ✅ **Saldo a favor**: Campo editable en resúmenes de tarjeta
3. ✅ **Totales editables**: Modificar totales manualmente
4. ✅ **Pago anual**: Expenses que se marcan automáticamente como pagados
5. ✅ **Edición rápida**: Cambiar monto de expense desde dashboard
6. ✅ **Validación de idempotencia**: No más doble pago
7. ✅ **Eliminación segura**: Solo el último resumen
8. ✅ **Cuotas corregibles**: Editar número de cuota manualmente
9. ✅ **Fuente de verdad única**: InstallmentPayment como única fuente
10. ✅ **Auditoría completa**: Fecha de pago de cada cuota


