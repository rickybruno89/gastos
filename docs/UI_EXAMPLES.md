# 🎨 Ejemplos de UI - Opción B

## 📝 Formulario de Resumen de Tarjeta (Nuevo)

```tsx
// app/(dashboard)/credit-cards/_components/create-summary-form.tsx

'use client'
import { useState } from 'react'
import { createCreditCardPaymentSummary } from '@/services/summary-new'

export default function CreateSummaryForm({ creditCardId, items }) {
  const [totals, setTotals] = useState({
    subtotalARS: 0,
    subtotalUSD: 0,
    taxesARS: 0,
    taxesUSD: 0,
    creditBalanceARS: 0,
    creditBalanceUSD: 0,
  })

  // Calcular subtotales automáticamente
  useEffect(() => {
    const arsItems = items.filter(i => i.currency === 'ARS')
    const usdItems = items.filter(i => i.currency === 'USD')
    
    setTotals(prev => ({
      ...prev,
      subtotalARS: arsItems.reduce((sum, i) => sum + i.amount, 0),
      subtotalUSD: usdItems.reduce((sum, i) => sum + i.amount, 0),
    }))
  }, [items])

  const finalTotalARS = totals.subtotalARS + totals.taxesARS - totals.creditBalanceARS
  const finalTotalUSD = totals.subtotalUSD + totals.taxesUSD - totals.creditBalanceUSD

  return (
    <form action={createCreditCardPaymentSummary.bind(null, creditCardId)}>
      {/* Fecha y vencimiento */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Fecha del Resumen</label>
          <input type="month" name="date" required />
        </div>
        <div>
          <label>Fecha de Vencimiento</label>
          <input type="date" name="dueDate" required />
        </div>
      </div>

      {/* Sección ARS */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-2">💵 Pesos Argentinos (ARS)</h3>
        
        <div className="bg-gray-50 p-3 rounded mb-2">
          <div className="flex justify-between">
            <span>Subtotal (calculado):</span>
            <span className="font-mono">${totals.subtotalARS.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Impuestos/Cargos ARS</label>
            <input
              type="number"
              name="taxesARS"
              step="0.01"
              min="0"
              value={totals.taxesARS}
              onChange={(e) => setTotals(prev => ({ ...prev, taxesARS: parseFloat(e.target.value) || 0 }))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label>Saldo a Favor ARS</label>
            <input
              type="number"
              name="creditBalanceARS"
              step="0.01"
              min="0"
              value={totals.creditBalanceARS}
              onChange={(e) => setTotals(prev => ({ ...prev, creditBalanceARS: parseFloat(e.target.value) || 0 }))}
              className="w-full border rounded px-3 py-2"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Si tenés saldo a favor, ingresalo acá
            </p>
          </div>
        </div>

        <div className="bg-green-50 p-3 rounded mt-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total a Pagar ARS:</span>
            <span className="text-2xl font-bold text-green-700">
              ${Math.max(0, finalTotalARS).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Sección USD */}
      <div className="border-t pt-4 mt-4">
        <h3 className="text-lg font-semibold mb-2">💵 Dólares (USD)</h3>
        
        <div className="bg-gray-50 p-3 rounded mb-2">
          <div className="flex justify-between">
            <span>Subtotal (calculado):</span>
            <span className="font-mono">US$ {totals.subtotalUSD.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Impuestos/Cargos USD</label>
            <input
              type="number"
              name="taxesUSD"
              step="0.01"
              min="0"
              value={totals.taxesUSD}
              onChange={(e) => setTotals(prev => ({ ...prev, taxesUSD: parseFloat(e.target.value) || 0 }))}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label>Saldo a Favor USD</label>
            <input
              type="number"
              name="creditBalanceUSD"
              step="0.01"
              min="0"
              value={totals.creditBalanceUSD}
              onChange={(e) => setTotals(prev => ({ ...prev, creditBalanceUSD: parseFloat(e.target.value) || 0 }))}
              className="w-full border rounded px-3 py-2"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded mt-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total a Pagar USD:</span>
            <span className="text-2xl font-bold text-blue-700">
              US$ {Math.max(0, finalTotalUSD).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-2 mt-6">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Generar Resumen
        </button>
        <button
          type="button"
          className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
```

---

## 💳 Formulario de Item de Tarjeta (Actualizado)

```tsx
// Agregar selector de moneda

<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Moneda
  </label>
  <select
    name="currency"
    className="w-full border rounded px-3 py-2"
    defaultValue="ARS"
  >
    <option value="ARS">🇦🇷 Pesos Argentinos (ARS)</option>
    <option value="USD">🇺🇸 Dólares (USD)</option>
  </select>
</div>
```

---

## 📊 Dashboard - Totales por Moneda

```tsx
// app/(dashboard)/dashboard/_components/totals-summary.tsx

export default function TotalsSummary({ summaries }) {
  const totals = {
    totalARS: 0,
    totalUSD: 0,
    paidARS: 0,
    paidUSD: 0,
  }

  summaries.forEach(summary => {
    if (summary.currency === 'ARS') {
      totals.totalARS += summary.amount
      if (summary.paid) totals.paidARS += summary.amount
    } else {
      totals.totalUSD += summary.amount
      if (summary.paid) totals.paidUSD += summary.amount
    }
  })

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* ARS */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6 rounded-xl">
        <h3 className="text-sm uppercase mb-2">Total Pesos (ARS)</h3>
        <p className="text-3xl font-bold">${totals.totalARS.toFixed(2)}</p>
        <div className="mt-4 text-sm">
          <div className="flex justify-between">
            <span>Pagado:</span>
            <span>${totals.paidARS.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pendiente:</span>
            <span>${(totals.totalARS - totals.paidARS).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* USD */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-xl">
        <h3 className="text-sm uppercase mb-2">Total Dólares (USD)</h3>
        <p className="text-3xl font-bold">US$ {totals.totalUSD.toFixed(2)}</p>
        <div className="mt-4 text-sm">
          <div className="flex justify-between">
            <span>Pagado:</span>
            <span>US$ {totals.paidUSD.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pendiente:</span>
            <span>US$ {(totals.totalUSD - totals.paidUSD).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
```


