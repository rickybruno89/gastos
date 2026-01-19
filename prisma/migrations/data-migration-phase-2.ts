/**
 * FASE 2: Script de Migración de Datos
 *
 * Este script migra los datos existentes al nuevo formato:
 * 1. Crea InstallmentPayment para cada CreditCardExpenseItem
 * 2. Calcula summarySequence para cada resumen
 * 3. Popula totalAmountARS/USD en resúmenes
 */

import { PrismaClient, Currency } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando migración de datos - Fase 2...')
  console.log('   Este proceso puede tardar varios minutos...\n')

  // ============================================
  // PASO 1: Crear InstallmentPayment para items existentes
  // ============================================
  console.log('📝 Paso 1/3: Creando registros de cuotas (InstallmentPayment)...')

  const creditCardItems = await prisma.creditCardExpenseItem.findMany({
    where: { deleted: false },
    include: {
      paymentHistory: {
        include: {
          creditCardPaymentSummary: true
        },
        orderBy: {
          creditCardPaymentSummary: {
            createdAt: 'asc'
          }
        }
      }
    }
  })

  console.log(`   Procesando ${creditCardItems.length} items de tarjeta...`)
  let installmentsCreated = 0

  for (const item of creditCardItems) {
    if (item.recurrent) {
      // Items recurrentes: crear una cuota por cada resumen en el historial
      for (const historyItem of item.paymentHistory) {
        try {
          await prisma.installmentPayment.create({
            data: {
              creditCardExpenseItemId: item.id,
              creditCardPaymentSummaryId: historyItem.creditCardPaymentSummaryId,
              installmentNumber: 0, // 0 para recurrentes
              amount: historyItem.installmentsAmount,
              currency: item.currency || Currency.ARS,
              isPaid: historyItem.creditCardPaymentSummary.paid,
              paymentDate: historyItem.creditCardPaymentSummary.paid
                ? historyItem.creditCardPaymentSummary.date
                : null
            }
          })
          installmentsCreated++
        } catch (error: any) {
          // Ignorar duplicados (por si se ejecuta el script dos veces)
          if (!error.message?.includes('Unique constraint')) {
            throw error
          }
        }
      }
    } else {
      // Items con cuotas: crear todas las cuotas
      const totalInstallments = item.installmentsQuantity

      for (let i = 1; i <= totalInstallments; i++) {
        // Buscar si esta cuota fue pagada en algún resumen
        const historyForThisInstallment = item.paymentHistory.find(
          h => h.installmentsPaid === i
        )

        try {
          await prisma.installmentPayment.create({
            data: {
              creditCardExpenseItemId: item.id,
              creditCardPaymentSummaryId: historyForThisInstallment?.creditCardPaymentSummaryId || null,
              installmentNumber: i,
              amount: item.installmentsAmount,
              currency: item.currency || Currency.ARS,
              isPaid: historyForThisInstallment?.creditCardPaymentSummary.paid || false,
              paymentDate: historyForThisInstallment?.creditCardPaymentSummary.paid
                ? historyForThisInstallment.creditCardPaymentSummary.date
                : null
            }
          })
          installmentsCreated++
        } catch (error: any) {
          // Ignorar duplicados
          if (!error.message?.includes('Unique constraint')) {
            throw error
          }
        }
      }
    }
  }

  console.log(`✅ ${installmentsCreated} cuotas creadas`)

  // ============================================
  // PASO 2: Calcular summarySequence
  // ============================================
  console.log('\n📝 Paso 2/3: Calculando secuencia de resúmenes...')

  const creditCards = await prisma.creditCard.findMany({
    where: { deleted: false },
    include: {
      paymentSummaries: {
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  console.log(`   Procesando ${creditCards.length} tarjetas...`)
  let summariesUpdated = 0

  for (const card of creditCards) {
    let sequence = 1
    for (const summary of card.paymentSummaries) {
      await prisma.creditCardPaymentSummary.update({
        where: { id: summary.id },
        data: { summarySequence: sequence }
      })
      sequence++
      summariesUpdated++
    }
  }

  console.log(`✅ ${summariesUpdated} resúmenes actualizados con secuencia`)

  // ============================================
  // PASO 3: Calcular totales por moneda
  // ============================================
  console.log('\n📝 Paso 3/3: Calculando totales por moneda en resúmenes...')

  const summaries = await prisma.creditCardPaymentSummary.findMany({
    include: {
      installmentPayments: true
    }
  })

  console.log(`   Procesando ${summaries.length} resúmenes...`)
  let totalsCalculated = 0

  for (const summary of summaries) {
    const totalARS = summary.installmentPayments
      .filter(p => p.currency === Currency.ARS)
      .reduce((sum, p) => sum + p.amount, 0)

    const totalUSD = summary.installmentPayments
      .filter(p => p.currency === Currency.USD)
      .reduce((sum, p) => sum + p.amount, 0)

    await prisma.creditCardPaymentSummary.update({
      where: { id: summary.id },
      data: {
        totalAmountARS: totalARS > 0 ? totalARS + summary.taxesARS : null,
        totalAmountUSD: totalUSD > 0 ? totalUSD + summary.taxesUSD : null
      }
    })
    totalsCalculated++
  }

  console.log(`✅ ${totalsCalculated} resúmenes actualizados con totales por moneda`)

  console.log('\n🎉 Migración de datos completada exitosamente!')
}

main()
  .catch((e) => {
    console.error('❌ Error en migración:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

