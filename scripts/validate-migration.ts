/**
 * Script de Validación de Migración
 * 
 * Verifica que la migración de datos se haya completado correctamente
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Validando migración de datos...\n')

  let errors = 0
  let warnings = 0

  // ============================================
  // VALIDACIÓN 1: Todos los items tienen InstallmentPayments
  // ============================================
  console.log('📝 Validación 1: Verificando InstallmentPayments...')
  
  const itemsWithoutInstallments = await prisma.creditCardExpenseItem.findMany({
    where: {
      deleted: false,
      installmentPayments: {
        none: {}
      }
    }
  })

  if (itemsWithoutInstallments.length > 0) {
    console.error(`❌ ERROR: ${itemsWithoutInstallments.length} items sin InstallmentPayments`)
    errors++
  } else {
    console.log('✅ Todos los items tienen InstallmentPayments')
  }

  // ============================================
  // VALIDACIÓN 2: Todos los resúmenes tienen summarySequence
  // ============================================
  console.log('\n📝 Validación 2: Verificando summarySequence...')
  
  const summariesWithoutSequence = await prisma.creditCardPaymentSummary.findMany({
    where: {
      summarySequence: null
    }
  })

  if (summariesWithoutSequence.length > 0) {
    console.warn(`⚠️  WARNING: ${summariesWithoutSequence.length} resúmenes sin summarySequence`)
    warnings++
  } else {
    console.log('✅ Todos los resúmenes tienen summarySequence')
  }

  // ============================================
  // VALIDACIÓN 3: Totales por moneda calculados
  // ============================================
  console.log('\n📝 Validación 3: Verificando totales por moneda...')
  
  const summariesWithoutTotals = await prisma.creditCardPaymentSummary.findMany({
    where: {
      AND: [
        { totalAmountARS: null },
        { totalAmountUSD: null }
      ]
    }
  })

  if (summariesWithoutTotals.length > 0) {
    console.warn(`⚠️  WARNING: ${summariesWithoutTotals.length} resúmenes sin totales calculados`)
    warnings++
  } else {
    console.log('✅ Todos los resúmenes tienen totales calculados')
  }

  // ============================================
  // VALIDACIÓN 4: Consistencia de cuotas
  // ============================================
  console.log('\n📝 Validación 4: Verificando consistencia de cuotas...')
  
  const items = await prisma.creditCardExpenseItem.findMany({
    where: { deleted: false, recurrent: false },
    include: {
      installmentPayments: true
    }
  })

  let inconsistentItems = 0
  for (const item of items) {
    if (item.installmentPayments.length !== item.installmentsQuantity) {
      console.error(`❌ Item ${item.id}: esperaba ${item.installmentsQuantity} cuotas, tiene ${item.installmentPayments.length}`)
      inconsistentItems++
    }
  }

  if (inconsistentItems > 0) {
    console.error(`❌ ERROR: ${inconsistentItems} items con cuotas inconsistentes`)
    errors++
  } else {
    console.log('✅ Todas las cuotas son consistentes')
  }

  // ============================================
  // RESUMEN
  // ============================================
  console.log('\n' + '='.repeat(50))
  console.log('📊 RESUMEN DE VALIDACIÓN')
  console.log('='.repeat(50))
  console.log(`Errores: ${errors}`)
  console.log(`Advertencias: ${warnings}`)
  
  if (errors === 0 && warnings === 0) {
    console.log('\n✅ ¡Migración validada exitosamente!')
    process.exit(0)
  } else if (errors === 0) {
    console.log('\n⚠️  Migración completada con advertencias')
    process.exit(0)
  } else {
    console.log('\n❌ Migración tiene errores críticos')
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error en validación:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

