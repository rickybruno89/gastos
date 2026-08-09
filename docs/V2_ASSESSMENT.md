# Assessment de GastApp V2

- **Fecha:** 8 de agosto de 2026
- **Estado:** Assessment — sin implementación
- **Alcance:** gastos periódicos reflejados en resúmenes mensuales, tarjetas de crédito, repartos informativos y módulo independiente de Deudas
- **Fuera de alcance:** **Invoice**. No debe rediseñarse, migrarse ni incorporarse al dominio financiero de V2. Solo se mencionan dependencias técnicas compartidas cuando afectan al resto de la aplicación.
- **No es parte del producto:** registro de gastos diarios, caja diaria, presupuesto por transacciones o contabilidad bancaria general.

> Este documento describe el sistema actual, sus riesgos y una propuesta de evolución. No autoriza ni incluye cambios de código, dependencias, schema, datos o infraestructura.

## Diagnóstico ejecutivo

La aplicación actual resuelve una necesidad real y valiosa: organizar obligaciones mensuales y resúmenes de tarjeta. La vista mensual, la separación entre definición de gasto y ocurrencia mensual, y el registro de cuotas son buenas bases conceptuales.

GastApp no pretende registrar cada consumo cotidiano. Su unidad funcional es el **mes**: gastos regulares que se pagan una vez por período —por ejemplo alquiler, luz, internet, patente o impuestos— y consumos de tarjeta que deben aparecer en un resumen y conciliarse. La fecha exacta de una compra puede conservarse para conciliación, pero no convierte al producto en un diario de gastos.

Existen dos conceptos deliberadamente separados:

1. Un gasto mensual o de tarjeta puede repartirse entre personas. Ese reparto indica cuánto corresponde a cada una en un período; no crea una deuda con estados ni registra cobros de esas personas.
2. **Deudas** es un módulo independiente para préstamos manuales —por ejemplo USD 1.000 entregados en efectivo— y sí registra saldo, estado y pagos parciales arbitrarios.

V2 no debería construirse ampliando indefinidamente el schema actual. Existen problemas estructurales:

- Falta autorización por propietario en varias operaciones.
- El historial de Git contiene archivos `.env` con credenciales.
- El modelo no representa porcentajes, snapshots históricos del reparto, un libro independiente de deudas manuales ni conciliación real de tarjeta.
- Dinero está almacenado como `Float` y las fechas como `String`.
- ARS y USD se suman en algunos “totales mixtos”.
- Las recurrencias y pagos anuales dependen de mutaciones del gasto maestro.
- El modelo de cuotas tiene varias fuentes de verdad inconsistentes.
- Gran parte de la lentitud percibida es artificial: la UI introduce esperas de hasta 2,5 segundos.
- La lógica está acoplada a Server Actions, React, Prisma y la navegación de Next.js.

La recomendación es una migración **strangler**: mantener V1 operativa, corregir primero seguridad, construir nuevas tablas y una API V2 en paralelo y migrar comportamiento por módulos. No conviene reescribir todo de una vez, pero tampoco seguir extendiendo el modelo actual.

La plataforma V2 será web-first: React Router 8 en Framework Mode como SPA sobre React 19 y Vite, consumiendo una API REST explícita implementada con Hono dentro de una Supabase Edge Function. Supabase concentrará inicialmente PostgreSQL, Auth, Storage, Edge Functions y migraciones SQL. Next.js, Server Actions, Route Handlers, Prisma y Vercel describen V1, pero no forman parte de la arquitectura objetivo de V2.

---

# A. Current System

## A.1. Stack actual

- Next.js 14.0.0 con App Router.
- React 18.
- Server Components para páginas.
- Client Components grandes para formularios y dashboard.
- Server Actions dentro de `services/`.
- Prisma 5.5.2 con PostgreSQL.
- NextAuth 4 con Google y sesiones JWT.
- Tailwind CSS, Headless UI, Radix y Lottie.
- Vercel con un cron diario.
- Zod para validación parcial.

El flujo arquitectónico real es:

```text
Server/Client Component
    ↓
Server Action en services/*
    ↓
getServerSession + Prisma
    ↓
PostgreSQL
    ↓
revalidatePath / redirect
```

No existe una API consumible por Expo ni una capa de aplicación independiente de Next.js.

## A.2. Páginas y funcionalidades

- `/`: autenticación con Google.
- `/dashboard?date=YYYY-MM`: resumen mensual.
- `/expenses`: catálogo de gastos recurrentes.
- `/expenses/create` y `/expenses/:id/edit`: alta y edición de gastos.
- `/credit-cards`: listado de tarjetas.
- `/credit-cards/:id`: consumos y resúmenes de una tarjeta.
- Creación y edición de consumos recurrentes o en cuotas.
- Creación manual de resúmenes seleccionando consumos.
- Detalle, pago y borrado condicionado de resúmenes.
- `/settings`: personas manuales y prueba de email.
- `/api/cron`: recordatorios diarios de vencimientos.
- `/invoice`: herramienta independiente, fuera del alcance de V2.

No existe ni se propone una pantalla de movimientos diarios. “Crear gasto” significa crear una definición mensual o registrar un consumo de tarjeta, no cargar cada compra cotidiana realizada en efectivo o débito.

## A.3. Modelo de datos actual

El núcleo está definido en [`prisma/schema.prisma`](../prisma/schema.prisma):

- `Expense`: definición maestra de un gasto.
- `ExpensePaymentSummary`: ocurrencia mensual generada manualmente.
- `Person`: persona manual para compartir.
- `CreditCard`: tarjeta del usuario.
- `CreditCardExpenseItem`: consumo recurrente o compra en cuotas.
- `InstallmentPayment`: cuota individual.
- `CreditCardPaymentSummary`: resumen mensual.
- `CreditCardSummaryExpenseItem`: snapshot parcial del consumo incluido.
- Modelos de identidad y sesiones de NextAuth.
- `Invoice`, fuera de scope.

## A.4. Gastos recurrentes

El comportamiento actual está principalmente en [`services/expense.ts`](../services/expense.ts) y [`services/summary.ts`](../services/summary.ts):

- Todos los `Expense` activos se consideran mensuales.
- No existe frecuencia bimestral, trimestral o configurable.
- El usuario debe generar manualmente el resumen de un mes.
- La generación crea un `ExpensePaymentSummary` por gasto.
- La fecha de vencimiento del gasto maestro se mueve al mes generado.
- Pagar una ocurrencia actualiza también el monto y canal por defecto del gasto maestro.
- “Omitir pago” equivale a guardar importe cero y `paid=true`.

La separación entre gasto maestro y ocurrencia mensual es una base útil, pero las responsabilidades de ambas entidades están mezcladas.

El eje mensual no es una limitación accidental de V1: es parte del alcance del producto. V2 incorpora series mensuales y bimestrales con mes de anclaje, además de cobertura de obligaciones mensuales mediante pago anual; no transforma GastApp en un tracker de gastos diarios.

## A.5. Pago anual

El pago anual es un workaround basado en:

```text
Expense.isAnnualPayment
Expense.annualPaymentDate
```

Los meses posteriores del mismo año se generan pagados y con importe cero. Al generar meses de otro año puede resetearse el flag anual. Esto no representa formalmente:

- el período cubierto;
- la recurrencia original;
- la diferencia entre un plan anual y un adelanto anual;
- pagos que cubren períodos arbitrarios;
- la historia de coberturas.

## A.6. Gastos compartidos

`Expense.sharedWith` y `CreditCardExpenseItem.sharedWith` son relaciones many-to-many con personas manuales.

La UI calcula:

```text
importe / (personas seleccionadas + propietario)
```

La lógica vive en [`shared-expenses.tsx`](<../app/(dashboard)/dashboard/_components/shared-expenses.tsx>).

No existen:

- porcentajes configurables;
- validación de 100%;
- snapshots históricos de participantes;
- usuarios conectados;
- una asignación explícita del 0% al propietario o del 100% a otra persona.

El “balance” compartido es una proyección visual calculada al renderizar, no una entidad financiera persistida.

Que no existan pagos, aceptación, disputa o estados de deuda para este reparto no es necesariamente una carencia: según la definición de producto confirmada para V2, el reparto debe seguir siendo **informativo**. Si Juan tiene el 100% de una compra hecha con la tarjeta del propietario, la compra continúa en Tarjetas porque el propietario debe conciliarla y pagarla al banco; el dashboard solo informa cuánto corresponde a Juan en ese mes. No debe crearse automáticamente un registro en Deudas.

## A.7. Tarjetas de crédito

El comportamiento está repartido entre [`services/credit-card.ts`](../services/credit-card.ts), [`services/summary.ts`](../services/summary.ts) y los formularios de tarjeta.

- Un consumo puede ser recurrente o tener hasta 24 cuotas.
- `paymentBeginning` representa el mes esperado de inicio.
- Al crear un resumen se seleccionan manualmente consumos.
- Se puede alterar el importe de la cuota y aplicar un descuento.
- Hay totales, impuestos y un saldo a favor agregado por moneda.
- Pagar el resumen marca cuotas asociadas como pagadas.
- Solo se permite borrar el último resumen.

No existen líneas reales de statement ni conciliación. El resumen actual es una agrupación manual de consumos esperados, no una representación item por item del documento del banco.

## A.8. Monedas

ARS y USD están presentes en gastos, compras, cuotas y totales de tarjeta. Sin embargo:

- `formatCurrency()` siempre utiliza ARS en [`lib/utils.ts`](../lib/utils.ts).
- Algunas pantallas muestran importes USD con formato o símbolo ARS.
- El dashboard calcula un total mixto sumando ARS y USD sin conversión.
- Los compartidos no conservan ni agrupan correctamente por moneda.
- `CreditCard.defaultCurrency` está prácticamente sin utilizar.

## A.9. Autenticación y acceso a datos

NextAuth utiliza Google y sesiones JWT en [`lib/auth.ts`](../lib/auth.ts). El callback de sesión consulta nuevamente `User` para obtener el ID interno.

Las páginas Server Component llaman servicios que:

1. resuelven la sesión;
2. ejecutan Prisma directamente;
3. llaman `revalidatePath`;
4. redirigen o devuelven estado al componente.

La autorización multiusuario no está centralizada y muchas operaciones por ID no agregan `userId` al filtro.

## A.10. Cron y notificaciones

[`app/api/cron/route.ts`](../app/api/cron/route.ts) ejecuta un cron diario protegido por `CRON_SECRET`:

- busca gastos y tarjetas que vencen hoy o mañana;
- agrupa por email;
- descifra descripciones;
- envía email mediante Nodemailer.

No hay preferencias por usuario, outbox, retry persistente ni trazabilidad del envío.

---

# B. Problems

## B.1. Resumen por categoría

| Categoría            | Severidad | Hallazgo principal                                                                                     |
| -------------------- | --------: | ------------------------------------------------------------------------------------------------------ |
| Architecture         |      High | Dominio, persistencia, auth, cache y navegación conviven en Server Actions.                            |
| Performance          |      High | Consultas secuenciales, auth repetida, `noStore` generalizado y esperas artificiales.                  |
| Domain model         |  Critical | Se mezclan plantilla y ocurrencia; faltan porcentajes, deuda manual independiente y conciliación real. |
| Database             |      High | `Float` para dinero, fechas `String`, pocos índices y snapshots incompletos.                           |
| Business logic       |  Critical | Pago anual, cuotas, undo y edición de consumos pueden quedar inconsistentes.                           |
| UI                   |    Medium | Pantallas monolíticas, montos ambiguos y acciones ocultas detrás de swipe.                             |
| UX                   |      High | Esperas artificiales, recargas completas, undo inconsistente y errores poco visibles.                  |
| Developer experience |      High | Sin tests, README genérico, documentación divergente y build peligroso.                                |
| Security             |  Critical | IDOR entre usuarios, secrets en Git y Next.js vulnerable/desactualizado.                               |
| Scalability          |    Medium | Consultas sin índices compuestos, N+1 de escritura y ausencia de idempotencia general.                 |
| Mobile readiness     |      High | No hay API, contratos ni auth móvil; el dominio depende de Next.js.                                    |

## B.2. Architecture — High

- Los archivos `services/*` funcionan simultáneamente como API, aplicación, dominio y persistencia.
- La lógica de negocio usa directamente `revalidatePath`, `redirect`, `FormData`, NextAuth y Prisma.
- Parte de las reglas vive en componentes cliente, especialmente compartidos y totales.
- No existen contratos API estables.
- Tipos Prisma atraviesan la UI y las Server Actions.
- Los errores de infraestructura se convierten mayormente en mensajes genéricos.
- No hay límites claros entre gastos mensuales, tarjetas y repartos; el módulo independiente de Deudas todavía no existe.

## B.3. Security — Critical

### Acceso cruzado entre usuarios

Varias acciones reciben un ID y ejecutan `findUnique`, `update` o `delete` sin filtrar por `userId`:

- lectura, actualización y borrado de gastos;
- edición y borrado de consumos de tarjeta;
- lectura y borrado de resúmenes;
- undo de pagos;
- actualización inline de importes.

Por ejemplo, `updateExpenseAmount` en [`services/expense.ts`](../services/expense.ts) actualiza un resumen únicamente por ID. Un usuario autenticado que obtuviera un ID ajeno podría modificarlo.

Debe tratarse como Critical aunque los CUID sean difíciles de adivinar: la dificultad de enumeración no sustituye autorización.

### Credenciales en el historial de Git

El análisis de Git confirmó que `.env` estuvo versionado en al menos dos períodos. El historial incluye nombres de variables correspondientes a:

- PostgreSQL;
- Google OAuth;
- NextAuth;
- mailer;
- cron;
- cifrado de descripciones.

El archivo actual está ignorado, pero borrarlo no elimina los blobs históricos. Las credenciales deben considerarse expuestas y rotarse.

`CRYPTO_SECRET` requiere una rotación especial: debe mantenerse temporalmente la clave vieja, descifrar y volver a cifrar con una clave nueva identificada por versión. Cambiarla directamente haría ilegibles las descripciones existentes.

### Dependencias desactualizadas

El repo usa `next@14.0.0`. Next.js exige actualizar versiones antiguas por vulnerabilidades del protocolo RSC, y los advisories recalcan que una Server Action debe autenticar dentro de su propio boundary:

- [Next.js Security Update: December 11, 2025](https://nextjs.org/blog/security-update-2025-12-11)
- [Advisory sobre exposición de Server Actions](https://github.com/vercel/next.js/security/advisories/GHSA-955p-x3mx-jcvp)

### Cifrado parcial e inconsistente

- Se cifra `description`, pero no `notes`, importes o participantes.
- Se usa una clave global sin versionado de claves.
- El cifrado por campo obliga a leer y descifrar todos los registros para buscar por descripción.
- No existe una estrategia documentada de rotación o recuperación.

## B.4. Business logic — Critical

### Undo de tarjeta incompleto

Pagar un resumen:

- marca cuotas como pagadas;
- incrementa `installmentsPaid`;
- puede marcar el consumo como terminado.

Sin embargo, `undoCCExpensePaymentSummaryPaid` en [`services/credit-card.ts`](../services/credit-card.ts) solo cambia `summary.paid=false`. No revierte cuotas, contador ni `finished`.

### Varias fuentes de verdad para cuotas

Coexisten:

```text
CreditCardExpenseItem.installmentsPaid
InstallmentPayment.isPaid
CreditCardSummaryExpenseItem.installmentsPaid
```

Editar la cantidad de cuotas no crea ni elimina `InstallmentPayment`. Crear una compra indicando cuotas ya pagadas crea igualmente todas las cuotas como no pagadas.

### Consumos recurrentes de tarjeta

Un consumo recurrente tiene un único `InstallmentPayment` con número `0`, protegido por una restricción única. Después de pagarse ya no queda una cuota pendiente para asociar a futuros resúmenes.

La migración histórica intenta crear múltiples registros con número `0` y luego ignora errores de unicidad. Esto confirma que el nuevo modelo de cuotas no representa correctamente consumos recurrentes.

### Generación mensual no idempotente

`generateExpenseSummaryForMonth`:

- actualiza individualmente cada gasto maestro;
- después ejecuta `createMany`;
- no envuelve todo en una transacción;
- puede fallar por la unicidad `[expenseId, date]` si se repite;
- captura el error de forma genérica;
- puede dejar actualizados los maestros sin haber creado las ocurrencias.

### Histórico mutable

- Cambiar monto, moneda o personas puede alterar ocurrencias pendientes.
- Los participantes actuales se usan para calcular compartidos históricos.
- Los snapshots de tarjeta conservan algunos importes, pero no allocations ni todos los atributos relevantes.
- Pagar una ocurrencia modifica el gasto maestro y afecta futuros meses.

### Fecha de vencimiento inválida

La fecha se reconstruye cambiando año y mes. Un vencimiento día 31 puede desbordarse al mes siguiente en meses cortos.

## B.5. Domain model — Critical

- `Expense` mezcla plantilla recurrente, monto por defecto y obligación.
- `paid: boolean` no conserva fecha, canal, reverso ni auditoría del pago.
- “Omitido” se representa como pagado con monto cero.
- Pago anual no modela cobertura.
- Compartidos son etiquetas many-to-many, no allocations.
- Las allocations no soportan porcentajes, propietario con 0% ni snapshots mensuales.
- El módulo independiente de Deudas manuales y sus pagos parciales no existe.
- El importe que corresponde a cada persona no se proyecta de forma histórica y consistente por mes y moneda.
- Statement y consumos esperados están mezclados.
- No hay statement line real ni estado de conciliación.

## B.6. Database — High

- Importes financieros usan `DOUBLE PRECISION`/`Float`.
- Meses, vencimientos y fechas de pago usan `String`.
- No hay índices compuestos para las lecturas principales por `userId + date/status`.
- Faltan restricciones de ownership entre gastos, tarjetas, personas y usuarios.
- No hay constraint para que allocations sumen 100%.
- No hay idempotency keys.
- No hay versionado optimista.
- No hay audit log.
- Existen campos legacy duplicados.
- Las relaciones históricas no tienen snapshots completos.

## B.7. Performance — High

### Performance percibida comprobada

- El dashboard impone 700 ms de loading aunque los datos ya llegaron.
- El selector mensual espera 300 ms antes de navegar.
- Formularios y eliminaciones esperan aproximadamente 2,5 segundos antes de completar o navegar.
- Se muestran overlays Lottie bloqueantes para operaciones pequeñas.
- Acciones rápidas esperan redirect/revalidation para actualizar toda la vista.

### Performance real comprobada

- Las tres consultas del dashboard se esperan secuencialmente en [`app/(dashboard)/dashboard/page.tsx`](<../app/(dashboard)/dashboard/page.tsx>).
- Cada servicio vuelve a resolver sesión y el callback consulta `User`.
- `noStore()` desactiva cache en los reads principales.
- Existen actualizaciones secuenciales por consumo al generar o pagar resúmenes.
- Navbar usa `<a>` en lugar de `Link`, provocando navegación documental completa.
- El dashboard serializa estructuras Prisma anidadas hacia un Client Component grande.
- `getTotals()` repite reducciones múltiples veces por render.

### Hipótesis todavía no demostradas

- Que Prisma sea por sí mismo el cuello de botella.
- Que SSR o Server Components sean inherentemente el problema.
- Que Supabase o el proveedor PostgreSQL actual tengan latencia excesiva.
- Que sea necesaria una migración de infraestructura.
- Que existan problemas de pool en producción.

Antes de cambiar infraestructura deben medirse:

- p50/p95 de lectura mensual, mutations y auth;
- RTT entre Function y PostgreSQL;
- cantidad y duración de queries;
- `pg_stat_statements`;
- Web Vitals;
- tamaño de chunks;
- tiempos reales comparados con delays artificiales.

Vercel recomienda ejecutar Functions cerca de la base. El repo no configura región y el default documentado para proyectos nuevos es `iad1`:

- [Configuring regions for Vercel Functions](https://vercel.com/docs/functions/configuring-functions/region)

## B.8. UI — Medium

- El dashboard es una sola columna extensa sin jerarquía clara.
- “Total”, “pagado” y “pendiente” mezclan conceptos y monedas.
- Las acciones esenciales dependen de swipe, poco descubrible en desktop y accesibilidad.
- Formularios muestran todos los campos con poca progressive disclosure.
- Las pantallas de tarjeta mezclan catálogo de consumos, statements y configuración.
- Los colores comunican estado, pero no siempre hay etiquetas o jerarquía suficiente.
- Estados vacíos contienen instrucciones largas en vez de una acción primaria clara.

## B.9. UX — High

- Existen demoras intencionales que hacen parecer lentas operaciones completadas.
- Pagar, omitir o deshacer bloquea el item hasta un redirect.
- La mayoría de los errores de mutations no se muestran claramente.
- No hay retry guiado ni preservación robusta del formulario.
- El undo de tarjeta es funcionalmente incorrecto.
- La eliminación se describe como irreversible aunque usa soft delete en algunos casos.
- Crear una persona obliga a abandonar el formulario actual.
- Generar el mes y generar statements son tareas manuales repetitivas.
- No se diferencia “esperado”, “confirmado”, “pagado” y “conciliado”.

## B.10. Developer experience — High

- TypeScript compila correctamente.
- Lint pasa con tres warnings de dependencias de hooks.
- No existen tests unitarios, de integración ni E2E.
- El README sigue siendo el starter de un curso.
- La documentación y el comportamiento real de deploy divergen.
- [`package.json`](../package.json) ejecuta `prisma db push` durante el build.
- No se ejecutó el build durante este assessment porque podría modificar la base configurada.
- `services/summary.ts` supera 750 líneas y mezcla múltiples dominios.
- No hay entorno de test o fixtures de dominio.
- No hay OpenAPI ni contrato de API.

## B.11. Scalability — Medium

- La escala actual es pequeña, por lo que no se justifican microservicios.
- Los principales riesgos de crecimiento son índices, round trips y consistencia, no capacidad bruta.
- Los bucles de actualización por item crecerán mal con statements grandes.
- La ausencia de idempotencia complica retries móviles.
- La ausencia de versionado permite lost updates.
- El cifrado actual impide búsquedas eficientes por descripción.

## B.12. Mobile readiness — High

- No existe API HTTP del producto.
- Expo no puede invocar Server Actions.
- Los tipos públicos son tipos Prisma.
- Auth está integrada a cookies/sesión de NextAuth.
- Las reglas dependen de `redirect`, `revalidatePath` y `FormData`.
- No hay estrategia offline, retry o idempotencia.
- No hay cliente compartido ni contratos serializables.

---

# C. Things worth keeping

## C.1. Mantener conceptualmente

- El mes como eje principal.
- PostgreSQL.
- La separación entre definición recurrente y ocurrencia mensual.
- Tarjeta, compra, cuota y statement como conceptos distintos.
- Totales separados por moneda.
- Google como único proveedor de identidad, migrado a Supabase Auth en V2.
- Validación compartida con Zod.
- Soft delete o archivo para entidades con historial.
- Recordatorios de vencimiento.
- Edición rápida de monto mensual.
- Protección contra doble click al pagar tarjeta.
- Transacciones para operaciones financieras.

## C.2. Mantener, pero refactorizar

- `Expense` + `ExpensePaymentSummary` → series + occurrences.
- `InstallmentPayment` → cuota esperada con una sola fuente de verdad.
- `CreditCardPaymentSummary` → statement real.
- Personas manuales → contactos vinculables opcionalmente a usuarios.
- Compartidos → allocations con porcentajes y snapshots; sin convertirlos en deudas persistidas.
- Cron → outbox de notificaciones.
- Prisma en V1 → reemplazar en V2 por módulos explícitos de persistencia sobre Supabase/PostgreSQL, migraciones SQL y RPC cuando aporte atomicidad. La API y el dominio no deben depender de una librería concreta para permitir introducir otra más adelante.
- UI mensual → nueva jerarquía y progressive disclosure.
- Edición inline → mutation optimista, error visible y undo.

## C.3. Eliminar

- “Total mixto” ARS+USD.
- Generación manual como requisito normal para ver un mes.
- `paid: boolean` como única representación de pago.
- Importe cero como significado de “omitido”.
- Delays artificiales y pantallas Lottie bloqueantes.
- Server Actions como API pública del dominio.
- Campos legacy duplicados de cuotas y totales.
- Mutación del vencimiento maestro al generar otro mes.
- Cálculo histórico de compartidos usando participantes actuales.

## C.4. Invoice

Invoice debe permanecer fuera del rediseño funcional. Solo corresponde aislar sus estilos globales o dependencias pesadas si se demuestra que afectan bundles o configuración compartida.

---

# D. Product/domain gaps

| Necesidad                                    | Estado actual                                          |
| -------------------------------------------- | ------------------------------------------------------ |
| Gastos pagaderos por período mensual         | Existe, con generación manual y mutaciones del maestro |
| Gastos bimestrales anclados a un mes inicial | No existe                                              |
| Excepciones anuales o de cobertura           | Flag anual especial                                    |
| Gastos diarios/transacciones de caja         | Fuera de alcance por definición                        |
| Porcentajes personalizados                   | Solo división igual en UI                              |
| Validación total 100%                        | No existe                                              |
| Propietario con 0% / tercero con 100%        | No existe explícitamente                               |
| Personas manuales                            | Parcial                                                |
| Usuarios conectados                          | No existe                                              |
| Gasto visible para participante              | No existe                                              |
| Saldos compartidos bidireccionales entre usuarios conectados | No existe                                  |
| Reparto informativo por mes/persona/moneda   | Parcial y calculado con relaciones actuales            |
| Snapshot histórico del reparto               | No existe                                              |
| Deuda manual independiente                   | No existe                                              |
| Pagos parciales de deuda manual              | No existe                                              |
| Separación estricta reparto vs. Deudas       | No existe como límite de dominio                       |
| Statement con líneas reales                  | No existe                                              |
| Match esperado vs. real                      | No existe                                              |
| Análisis opcional de statement PDF con revisión humana | No existe                                       |
| Cargo desconocido                            | No existe                                              |
| Cargo esperado ausente                       | No existe                                              |
| Movimiento trasladado de cierre              | No está modelado                                       |
| Fecha de compra/posted/closing               | Solo mes esperado y mes de resumen                     |
| ARS/USD sin conversión                       | Parcial; hay sumas incorrectas                         |
| Idempotencia general                         | Solo parcial al pagar tarjeta                          |
| Concurrencia/versionado                      | No existe                                              |
| Audit trail                                  | No existe                                              |
| Undo consistente                             | Parcial e incorrecto                                   |
| Pagos adelantados/coberturas                 | Workaround anual                                       |
| Personas archivadas sin romper historia      | Incompleto                                             |
| Desconexión de usuarios                      | No existe                                              |
| Cancelación/reversión de cuotas              | No existe de forma consistente                         |

---

# E. Decisiones de producto confirmadas

## E.1. Decisiones confirmadas por la definición del producto

La aclaración funcional posterior al assessment responde o reemplaza varias preguntas originales:

1. **No nace una “deuda derivada” de un gasto compartido.** El importe de Juan es una proyección del reparto de una ocurrencia mensual o de un cargo de tarjeta. No tiene `OPEN`, `PAID`, `SETTLED` ni pagos propios.
2. **El reparto se define al crear el gasto.** Junto con descripción e importe se elige si es compartido, con quién y en qué porcentaje.
3. **El reparto económico siempre puede expresarse como 100%.** El propietario participa con el porcentaje residual y puede quedar en 0%; otra persona puede tener el 100%.
4. **La responsabilidad ante el proveedor o banco no cambia por el reparto.** Una compra 100% de Juan sigue dentro de la tarjeta del propietario, aparece en su statement y debe conciliarse allí.
5. **Pagar un gasto no paga la parte de Juan.** El estado de pago pertenece a la ocurrencia mensual o al statement, no a cada allocation.
6. **Los pagos parciales pertenecen solamente a Deudas.** Un préstamo manual tiene saldo y cobros parciales; un reparto mensual no.
7. **Deudas no recibe registros automáticos desde Gastos o Tarjetas.** Los dos contextos no comparten lifecycle ni tabla de estados.
8. **No se registran gastos diarios.** La aplicación organiza pagos mensuales y resúmenes de tarjeta.
9. **Los gastos mensuales y los statements se marcan pagados como unidades del producto.** Ese estado no se propaga como cobro de las personas incluidas en el reparto.
10. **Deudas registra dinero que otras personas le deben al usuario.** Es una cuenta a cobrar manual; no un ledger bidireccional ni una obligación mensual.
11. **La creación se unifica solo en UI/UX.** Un botón “Crear gasto” permite elegir mensual o tarjeta, mientras la persistencia conserva modelos especializados.
12. **Un gasto regular puede vencer cada dos meses.** La serie bimestral solo genera importe y reparto en los períodos que corresponden; en el mes intermedio no suma al total y ninguna persona debe una parte de ese gasto.
13. **Un gasto mensual puede saldarse mediante un pago anual.** La serie continúa siendo mensual, pero cada mes cubierto debe aparecer como “Pagado anual” o `COVERED`, sin generar un nuevo importe pendiente.
14. **La materialización normal es on-demand.** Al consultar un mes se generan sus ocurrencias mediante upsert idempotente; un proceso programado puede anticipar solo lo necesario para notificaciones.
15. **Los cambios de importe distinguen alcance.** La UI ofrece “solo este mes” y “este mes y futuros”.
16. **Un nuevo vencimiento mensual actualiza el mes corriente y la regla futura.** Una ocurrencia pagada queda bloqueada; para corregirla primero se deshace el pago, luego se edita y finalmente puede volver a marcarse pagada.
17. **Marcar pagado es una acción rápida auditable.** Usa fecha actual y canal predeterminado, permitiendo editarlos.
18. **La tarjeta se paga por statement completo.** Una cuota no tiene lifecycle de pago independiente; queda pagada al pertenecer a un statement pagado.
19. **Una compra en cuotas reparte cada cuota.** El porcentaje se aplica al total y cada cuota hereda su snapshot; el saldo de otra persona aparece en cada mes donde la cuota entra al statement.
20. **El reparto aplica al consumo concreto.** Impuestos, percepciones, intereses, descuentos globales, saldos a favor y otros ajustes del statement quedan fuera de los cálculos de GastApp.
21. **Una diferencia real se corrige antes del pago.** Si el banco informa un importe distinto, el usuario ajusta el gasto esperado y recién después confirma la conciliación y marca el statement pagado.
22. **Un gasto regular o de tarjeta puede asignarse 100% a otra persona.** La obligación frente al proveedor o banco continúa perteneciendo al usuario que la administra.
23. **Los repartos pagados son inmutables.** Los cambios normales afectan mes corriente no pagado y meses futuros; para editar un mes pagado se debe deshacer su pago.
24. **Existen contactos privados y usuarios conectados.** Un contacto manual requiere solo nickname; opcionalmente puede incluir email y vincularse a otra cuenta de GastApp sin perder el nickname local.
25. **Los gastos entre usuarios conectados se reflejan en ambas cuentas.** El creador conserva la edición y la contraparte tiene vista de solo lectura sobre el gasto y su porcentaje.
26. **Los saldos compartidos son bidireccionales y derivados.** Cada usuario ve por persona cuánto le deben y cuánto debe, por moneda, sin convertir esos saldos en `PersonalDebt` ni darles pagos parciales o lifecycle propio.
27. **`PersonalDebt` tiene lifecycle propio.** Sus estados son `OPEN`, `PARTIALLY_PAID`, `PAID` y `CANCELLED`, derivados del principal, pagos y cancelación.
28. **La deuda manual usa principal fijo.** Los intereses automáticos quedan fuera; cualquier aumento o condonación futura se registra como ajuste explícito, fechado, motivado y auditable.
29. **Los pagos de `PersonalDebt` se contabilizan en la moneda de la deuda.** Una nota libre puede recordar que el pago real se entregó en otra moneda y a qué cambio, pero GastApp no gestiona esa conversión.
30. **La conciliación manual sigue siendo principal.** Subir un PDF y analizarlo con IA es opcional, produce sugerencias validadas y nunca confirma cambios sin revisión humana.
31. **ARS y USD permanecen separados.** No existe conversión FX implícita ni compensación automática entre monedas.
32. **El histórico se conserva sin inventar datos.** Los statements legacy pueden marcarse como aceptados aunque no sea posible reconstruir líneas o matches.
33. **V2 elimina el cifrado por campo de descripciones.** Se confía en cifrado at rest del proveedor, autorización correcta, RLS y controles de acceso.
34. **Los vencimientos 29, 30 o 31 usan el último día válido del mes corto.** Nunca se desplazan accidentalmente al mes siguiente.
35. **Las notificaciones comienzan por email.** Push se agrega con Expo y las preferencias se configuran por canal y tipo de vencimiento.
36. **Google es el único proveedor de identidad previsto.** Supabase Auth debe preservar IDs internos estables aunque la identidad externa sea Google.
37. **El pago anual compartido se proyecta una sola vez.** La parte de la otra persona aparece en el mes del desembolso anual; los meses cubiertos posteriores siguen visibles, pero no generan nuevos importes compartidos.

En consecuencia, las preguntas originales sobre nacimiento, exigibilidad, aceptación, disputa y liquidación de una deuda compartida dejan de aplicar. Las preguntas sobre pagos parciales quedan respondidas de manera distinta para cada módulo.

## E.2. Preguntas de producto abiertas

No quedan preguntas de producto abiertas para definir la arquitectura base de V2. Las recomendaciones sin respuesta explícita fueron aceptadas como decisiones por instrucción del producto y se incorporaron en E.1.

Las incógnitas restantes son de implementación o validación operativa —por ejemplo límites reales del procesamiento de PDF en Edge Functions y elección del hosting estático del frontend— y deben resolverse con pruebas o mediciones, no como decisiones de dominio.

---

# F. Sugerencias de producto

## F.1. Dashboard mensual

Orden recomendado:

1. Alertas: vencidos, vence hoy, cargos desconocidos y statements sin conciliar.
2. Resumen por moneda de gastos mensuales y statements pendientes, sin mezclar monedas.
3. Gastos mensuales a pagar.
4. Tarjetas y estado de conciliación.
5. Saldos compartidos por persona y moneda: cuánto le deben al usuario y cuánto debe él, reflejados en ambas cuentas cuando existe conexión.
6. Gastos cubiertos por pago anual, visibles como pagados y excluidos del pendiente.
7. Completados, colapsados por defecto.

El módulo **Deudas** debe tener navegación y resumen propios. Su saldo no se mezcla con el dashboard mensual ni con el importe compartido de Gastos/Tarjetas.

## F.2. Acciones inline

- Marcar pagado un gasto mensual o statement.
- Registrar pago parcial únicamente dentro de Deudas.
- Ajustar importe de una ocurrencia.
- Cambiar vencimiento del mes.
- Omitir o cancelar con motivo.
- Deshacer mediante reversión temporal.

## F.3. Acciones con pantalla o modal

- Crear o editar una recurrencia.
- Cambiar porcentajes.
- Conciliar un statement.
- Resolver diferencias.
- Editar una compra con cuotas ya materializadas.
- Conectar un contacto manual con otra cuenta GastApp mediante email.
- Cancelar o registrar un ajuste explícito de una deuda con motivo.
- Crear un gasto desde un flujo único que primero elige “mensual” o “tarjeta”.

## F.4. Automatizaciones

- Materializar ocurrencias al consultar un mes mediante upsert idempotente.
- Sugerir matches entre líneas reales y cargos esperados.
- Analizar opcionalmente un statement PDF, validar su salida estructurada y presentar sugerencias para confirmación humana.
- Detectar duplicados por tarjeta, importe, moneda, comercio y fecha.
- Arrastrar cargos esperados ausentes al siguiente statement sin cambiar su fecha real.
- Materializar el snapshot de reparto de cada cuota cuando entra al período correspondiente, sin generar una deuda.
- Enviar recordatorios configurables.
- Mostrar “cubierto por pago anual” sin crear deudas cero ficticias.

## F.5. Features a agregar

- Creación unificada de gasto mensual o consumo de tarjeta.
- Pagos parciales dentro de Deudas.
- Timeline y auditoría.
- Conexiones e invitaciones entre cuentas con nickname local.
- Vista consolidada de saldos compartidos en ambas direcciones.
- Carga opcional de PDF y conciliación asistida por IA.
- Conciliación y cargos desconocidos.
- Archivo de contactos.
- Exportación de datos; la importación CSV de statements no es prioridad inicial.
- Estado offline/read-only en Expo.
- Retry seguro e idempotente de mutations.

## F.6. Features o conceptos a simplificar

- Reemplazar “generar resumen mensual” por ocurrencias automáticas.
- Reemplazar “omitir como pagado con cero” por un estado explícito.
- Separar “esperado”, “confirmado”, “conciliado” y “pagado”.
- Mostrar una sola cifra principal por moneda y contexto.
- Evitar que “gasto” represente a la vez plantilla, ocurrencia, pago y deuda.
- Presentar “importe correspondiente a Juan” como saldo compartido derivado, nunca como `PersonalDebt` ni como cuenta con pagos parciales.

## F.7. Realtime y background jobs

Realtime no aporta suficiente valor inicialmente aunque existan usuarios conectados. TanStack Query con invalidación, refetch por foco y polling puntual es suficiente para el primer release; Realtime se evaluará si las mediciones muestran una necesidad de actualización inmediata entre cuentas.

Los background jobs iniciales deberían limitarse a:

- notificaciones mediante outbox;
- retries de email;
- mantenimiento de proyecciones si se demuestra necesario.

La generación de ocurrencias puede ser on-demand e idempotente, sin depender de un cron mensual.

---

# G. Stack y plataforma seleccionados

La arquitectura dejó de ser una comparación abierta. La selección final para V2 es:

| Capa | Decisión |
|---|---|
| Web | React Router 8 en Framework Mode, principalmente SPA |
| UI runtime | React 19 |
| Build | Vite + TypeScript |
| Server state | TanStack Query |
| Formularios | React Hook Form + Zod cuando corresponda |
| API | REST explícita con Hono |
| Runtime backend | Una Supabase Edge Function principal |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth con Google |
| Files | Supabase Storage |
| Defensa DB | Row Level Security habilitado |
| Evolución DB | Migraciones Supabase/SQL versionadas |
| Persistencia | Módulos explícitos de queries y RPC PostgreSQL para atomicidad |
| Mobile futuro | Expo/React Native como segundo cliente de la misma API |

## G.1. Web V2

GastApp autenticada no necesita SEO ni runtime SSR. React Router 8 Framework Mode se configura principalmente como SPA, manteniendo routing tipado, route modules y code splitting sin convertir loaders o actions del frontend en la fuente de verdad financiera.

El hosting estático debe redirigir las rutas de aplicación a `index.html`, tal como requiere SPA Mode; esta es configuración de hosting frontend y no agrega un servidor de aplicación.

- [React Router: Framework Mode](https://reactrouter.com/start/modes)
- [React Router: SPA Mode](https://reactrouter.com/how-to/spa)
- [React Router 8 changelog](https://reactrouter.com/changelog)
- [React 19](https://react.dev/blog/2024/12/05/react-19)
- [TanStack Query](https://tanstack.com/query/latest/docs/framework/react/overview)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)

Al implementar se elegirán releases estables compatibles. React Router 8 requiere respetar sus mínimos publicados de React, Vite y runtime de desarrollo; no se copiarán versiones de V1.

## G.2. Backend Supabase con Hono

Una única Edge Function llamada conceptualmente **api** aloja la Hono REST API y despacha múltiples rutas. No se crea una Function por endpoint y tampoco un servidor Node independiente.

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Hono sobre Supabase Functions](https://hono.dev/docs/getting-started/supabase-functions)
- [Supabase: Hono quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/hono)

Hono es el adaptador HTTP, no el dominio. Las routes autentican, validan y llaman casos de uso; no son proxies CRUD hacia tablas de Supabase.

## G.3. Supabase como plataforma inicial

Supabase concentra PostgreSQL, Auth, Storage, Edge Functions y evolución SQL. RLS permanece habilitado como defensa en profundidad y el cliente nunca recibe secretos de backend.

- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase JWT](https://supabase.com/docs/guides/auth/jwts)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage desde Edge Functions](https://supabase.com/docs/guides/functions/storage-caching)
- [Supabase migrations](https://supabase.com/docs/guides/local-development/overview)
- [Supabase Pricing](https://supabase.com/pricing)

Prisma no es obligatorio en V2. La capa de persistencia queda aislada detrás de módulos explícitos y puede usar el cliente de Supabase, SQL o funciones PostgreSQL/RPC. Una librería adicional podrá incorporarse después sin cambiar contratos HTTP o reglas de dominio.

## G.4. Web primero y Expo después

La web V2 se estabiliza antes de iniciar mobile para reducir el riesgo de migración. Expo será un segundo cliente del mismo backend:

- comparte contratos HTTP;
- comparte schemas Zod serializables;
- comparte typed API client;
- comparte tipos y utilidades de dominio no visuales;
- implementa su UI con componentes React Native propios.

Los componentes DOM, estilos y route modules de React Router no se consideran reutilizables directamente en Expo.

## G.5. Alternativas descartadas para el inicio

- **Next.js + Route Handlers:** no se recomienda para V2. SSR y SEO no aportan valor suficiente en la aplicación financiera autenticada y el backend ya tiene un runtime explícito en Supabase.
- **Server Actions:** permanecen como detalle de V1; no son el contrato de V2 ni pueden ser consumidas por Expo.
- **Supabase Data API directa desde clientes:** no es el contrato principal. Fragmentaría autorización y reglas financieras entre web, mobile, RLS y RPC.
- **Prisma obligatorio:** se descarta como restricción arquitectónica. Puede reevaluarse como detalle de persistencia si demuestra valor y compatibilidad con el runtime.
- **Servidor Node en Vercel, Railway, Render, VPS o AWS:** no se introduce inicialmente. Solo se reconsidera frente a una limitación medida de Edge Functions.
- **Expo simultáneo con la migración web:** se posterga hasta estabilizar API, contratos y dominio.

## G.6. Hosting y costo

Objetivo personal inicial:

```text
Frontend web
→ build estático/client-side de React Router
→ hosting estático con free tier a seleccionar

Backend
→ Supabase Edge Functions + Hono

Database / Auth / Files
→ Supabase PostgreSQL + Auth + Storage

PDF/IA
→ proveedor externo opcional con costo por uso
```

No existe una dependencia arquitectónica de Vercel. Tampoco se agrega otro proveedor de backend mientras Supabase cubra el volumen y los límites observados. El procesamiento de PDF debe diseñarse con límites de tamaño, timeout, retry y costo; si las mediciones demuestran que una Edge Function no alcanza, esa evidencia habilitará revisar solamente ese componente.

---

# H. Proposed V2

La arquitectura V2 queda definida por las decisiones de E y G. V1 continúa operativa durante la migración; V2 nace como web SPA con backend explícito en Supabase y Expo se agrega después como segundo cliente.

## H.1. Arquitectura

```text
React Router 8 Web (SPA)
        │
        │ HTTPS / typed API client / Supabase JWT
        ▼
Supabase Edge Function: api
        │
        └── Hono REST API
                │
                ├── routes y middleware
                ├── application use cases
                ├── domain rules
                └── persistence
                        │
                        ▼
                Supabase PostgreSQL
                   + RLS + SQL/RPC

Archivos privados
GastApp API ───────────► Supabase Storage

Futuro
Expo / React Native
        └──────────────► mismo typed API client
                                  │
                                  ▼
                            misma Hono API
```

No hay SSR de aplicación, Route Handlers de Next.js, Server Actions ni acceso directo de los clientes a tablas como contrato del producto.

Cada operación de negocio sigue este flujo:

```text
Route Hono delgada
  ↓
Verificación JWT + autorización + validación Zod
  ↓
Application use case
  ↓
Reglas de dominio
  ↓
Persistencia transaccional / SQL / RPC
  ↓
PostgreSQL + RLS
```

Recurrencias, anclaje bimestral, coberturas anuales, allocations, proyecciones compartidas, pago de statements, conciliación, deudas, idempotencia y auditoría pertenecen al backend.

## H.2. Estructura del repositorio

```text
apps/
  web/                  # React Router 8 + React 19 + Vite
  mobile/               # se agrega después con Expo / React Native

packages/
  contracts/            # DTOs y schemas Zod serializables
  api-client/           # cliente HTTP compartido web/Expo
  domain/               # tipos, Money y utilidades no visuales
  shared/               # utilidades agnósticas de UI/runtime
  testkit/               # fixtures, builders y clocks

supabase/
  migrations/           # SQL versionado
  functions/
    api/                 # una Edge Function Hono con múltiples rutas
```

No se crea un monorepo ceremonial: cada package debe tener consumidores reales. Expo reutiliza contratos, cliente API y código no visual; sus pantallas se construyen con componentes React Native, sin intentar reutilizar componentes DOM de la web.

## H.3. Organización de la Edge Function

Estructura conceptual, no implementada por este assessment:

```text
supabase/
├── migrations/
│
└── functions/
    └── api/
        ├── index.ts
        ├── routes/
        │   ├── months.ts
        │   ├── expenses.ts
        │   ├── cards.ts
        │   ├── statements.ts
        │   ├── shared-expenses.ts
        │   ├── debts.ts
        │   ├── contacts.ts
        │   └── statement-pdf.ts
        │
        ├── middleware/
        ├── application/
        ├── domain/
        ├── persistence/
        └── schemas/
```

Una Function principal reduce deploys y mantiene routing, CORS, auth, errores y observabilidad centralizados. Los módulos internos preservan límites de dominio y evitan convertirla en un archivo monolítico.

## H.4. Módulos

```text
identity
contacts-and-connections
monthly-expenses
recurrence-and-coverage
payments
sharing-and-allocations
shared-balance-projections
personal-debts
credit-cards
statements-and-reconciliation
statement-pdf-analysis
notifications
monthly-dashboard
audit
```

Deudas, saldos compartidos y responsabilidad frente a una tarjeta son contextos diferentes aunque todos muestren importes relacionados con personas.

## H.5. Gastos mensuales y bimestrales

Entidades conceptuales:

```text
MonthlyExpenseSeries
RecurrenceRule
MonthlyExpenseOccurrence
OccurrenceAllocation
ExpensePayment
CoveragePeriod
```

Reglas:

- Una serie representa un gasto periódico, no un movimiento diario.
- intervalMonths es 1 para mensual y 2 para bimestral.
- Toda serie bimestral guarda anchorPeriod para distinguir sus ciclos.
- La materialización ocurre on-demand al consultar un período mediante upsert único por seriesId + accountingPeriod.
- Un job puede pre-materializar solo ocurrencias necesarias para recordatorios; el flujo normal no depende del cron.
- Una serie bimestral no genera ocurrencia, importe ni allocation durante su mes intermedio.
- La serie guarda la regla de vencimiento y cada ocurrencia conserva su fecha efectiva.
- Cambiar el vencimiento de una ocurrencia no pagada actualiza el mes actual y la regla de meses futuros.
- Cambiar un importe ofrece “solo este mes” o “este mes y futuros”.
- Estados: PLANNED, DUE, PAID, COVERED, SKIPPED y CANCELLED.
- Marcar pagado crea ExpensePayment con fecha y canal; no existe pago parcial de este agregado.
- Una ocurrencia pagada es inmutable. Para corregirla se deshace el pago, se edita y se vuelve a pagar.
- Un pago anual crea CoveragePeriod sin cambiar la recurrencia mensual subyacente.
- Los meses cubiertos continúan visibles como “Pagado anual”, con estado COVERED y payableAmountMinor igual a cero.
- El importe nominal puede conservarse para contexto, pero nunca se suma al total pendiente.
- Si el pago anual es compartido, la allocation se proyecta una sola vez en el mes del desembolso anual.

## H.6. Compartidos, allocations y saldos derivados

El reparto se define al crear un gasto regular o de tarjeta. Todas las allocations, incluido el propietario, suman 10.000 basis points. El propietario puede tener 0% y otra persona 100%.

Cada snapshot guarda:

- referencia al propietario, contacto manual o usuario conectado;
- shareBps;
- amountMinor calculado;
- moneda;
- nickname/nombre visible en ese momento;
- versión de distribución;
- período y origen inmutable.

La división igual reparte porcentajes y unidades menores residuales de forma determinista. La suma se valida en contrato Zod, caso de uso transaccional y constraint o trigger diferido de PostgreSQL.

Una allocation no tiene estado OPEN/PAID, settlement ni pagos parciales. Sin embargo, cuando refiere a usuarios conectados, se proyecta desde ambas perspectivas:

```text
Ricky crea $100.000 al 50% con Juan

Cuenta de Ricky
→ Juan me debe $50.000

Cuenta de Juan
→ debo $50.000 a Ricky
```

SharedBalanceProjection agrupa por conexión y moneda cuánto debe cada lado. Es una query/read model derivado de allocations, no un saldo editable ni una PersonalDebt persistida. Los cambios no reescriben períodos pagados; un mes pagado se corrige únicamente deshaciendo primero su pago.

Los impuestos, percepciones, intereses, descuentos globales, saldo a favor y otros conceptos generales del statement no participan en allocations. GastApp distribuye exclusivamente los consumos cargados.

## H.7. Contactos y usuarios conectados

Entidades conceptuales:

```text
Contact
UserConnection
```

- Contact pertenece a un usuario, requiere nickname y puede archivarse.
- El email es opcional y permite iniciar la vinculación con una cuenta GastApp.
- Cada propietario conserva su nickname privado aunque el contacto quede vinculado.
- UserConnection usa PENDING, ACCEPTED, REJECTED y BLOCKED.
- Una allocation referencia un contacto manual o una conexión aceptada, nunca ambos.
- El creador del gasto es el único editor; el usuario conectado ve el gasto compartido y su porcentaje en modo lectura.
- La contraparte no obtiene acceso al mes financiero completo, tarjetas o gastos no compartidos del creador.
- Desconectar o bloquear no borra snapshots ni saldos históricos.

Las conexiones forman parte del alcance V2, no son una mejora opcional posterior.

## H.8. Deudas manuales independientes

```text
PersonalDebt
PersonalDebtPayment
PersonalDebtAdjustment   # solo para ajustes explícitos
```

PersonalDebt registra dinero que otra persona debe al usuario, como un préstamo de USD 1.000 en efectivo.

- Guarda principal, moneda, contraparte, fecha, descripción/notas y vencimiento opcional.
- Estados derivados: OPEN sin pagos, PARTIALLY_PAID con pagos parciales, PAID al cubrir el principal y CANCELLED al perdonar saldo.
- Cada pago tiene importe, fecha y nota.
- El pago se contabiliza en la moneda de la deuda.
- La nota puede documentar que físicamente se recibió otra moneda y a qué cambio, pero GastApp no calcula ni registra FX.
- No hay interés automático.
- Un aumento de principal o condonación es un ajuste explícito, fechado, motivado y auditable.
- Cancelar no inventa un pago.
- No existe sourceType ni automatización desde gastos, allocations, cuotas, statements o saldos compartidos.

## H.9. Tarjetas y conciliación manual

Entidades conceptuales:

```text
CreditCard
CardPurchase
CardRecurringChargeSeries
CardExpectedCharge
CardInstallment
CardStatement
StatementLine
StatementMatch
CardPayment
```

Una compra o cargo recurrente conserva su distribución. Cada cuota materializada guarda el snapshot aplicable al período del statement; una compra de $120.000 en 12 cuotas compartida 50% proyecta $5.000 para la otra persona en cada uno de los 12 statements.

Fechas separadas:

- occurredAt: compra conocida;
- expectedPeriod: mes esperado;
- postedOn: fecha informada por el banco;
- closingDate: cierre real;
- statementPeriod: período contable;
- dueDate: vencimiento.

El flujo principal sigue siendo manual:

1. el usuario abre el statement real;
2. revisa y marca uno a uno los consumos esperados que aparecen;
3. ajusta antes de pagar cualquier diferencia, por ejemplo $10.000 esperados frente a $10.000,50 reales;
4. resuelve cargos desconocidos o esperados ausentes;
5. confirma la conciliación;
6. marca pagado el statement completo.

Las líneas de impuestos, percepciones, intereses, descuentos globales o saldo a favor pueden conservarse como evidencia del PDF/statement y marcarse `IGNORED_WITH_REASON`, pero no forman parte de los totales de gastos ni de los repartos de GastApp. El total bancario informado puede guardarse como metadata de conciliación sin convertirse en un gasto del producto.

Una cuota individual no se paga por separado. CardPayment aplica al statement y las cuotas incluidas heredan ese resultado. El matching inicial es 1:1; dividir o combinar es una excepción manual. CSV no es prioridad inicial.

Estados de conciliación:

```text
EXPECTED
MATCHED
RECONCILED
UNMATCHED_EXPECTED
UNMATCHED_ACTUAL
IGNORED_WITH_REASON
```

## H.10. Statement PDF e IA opcional

La acción “Subir PDF” asiste al flujo manual, pero nunca lo reemplaza:

```text
Usuario sube PDF
        ↓
GastApp Hono API
        ↓
bucket privado en Supabase Storage
        ↓
StatementParser
        ↓
proveedor externo IA/LLM
        ↓
JSON estructurado validado con Zod
        ↓
motor determinista de conciliación
        ↓
sugerencias
        ↓
revisión/corrección y confirmación humana
```

Contrato conceptual:

```ts
interface StatementParser {
  parse(input: StatementDocument): Promise<ParsedStatement>
}
```

La abstracción impide acoplar dominio o API a OpenAI, Anthropic, Gemini u otro proveedor. Las keys viven únicamente como secretos de Edge Functions.

La salida no es confiable hasta superar:

- validación estructural;
- validación de moneda, totales y fechas;
- límites de cantidad e importes;
- detección de líneas duplicadas;
- asociación al statement y usuario correctos.

La IA puede proponer líneas, matches, diferencias, cargos desconocidos y cargos esperados ausentes. No puede crear CardPayment, finalizar conciliación ni modificar importes sin confirmación explícita.

El documento debe guardarse en un bucket privado con ownership, acceso temporal y política de retención. La API registra hash, estado de análisis, proveedor/version, errores y auditoría sin tratar la salida del modelo como fuente de verdad.

## H.11. Dinero, monedas, fechas y períodos

```text
amountMinor BIGINT
currency CHAR(3)
```

- amountMinor se serializa como string en JSON para no perder precisión.
- ARS y USD se almacenan, muestran y totalizan por separado.
- No existe conversión FX implícita.
- DATE se usa para vencimientos, cierres y posted date.
- TIMESTAMPTZ se usa para eventos y auditoría.
- El período contable se representa por su primer día, por ejemplo 2026-08-01.
- El usuario tiene zona horaria.
- Un vencimiento 29, 30 o 31 cae en el último día válido de un mes corto.
- Nunca se asigna un statement comparando solamente el número de mes de una compra.

## H.12. Límites de API

Endpoints conceptuales:

```text
GET    /api/v1/months/:period

GET    /api/v1/expenses
POST   /api/v1/expenses
PATCH  /api/v1/expenses/:id
POST   /api/v1/occurrences/:id/payments
POST   /api/v1/occurrences/:id/undo-payment
POST   /api/v1/occurrences/:id/skip

GET    /api/v1/cards
POST   /api/v1/cards
POST   /api/v1/cards/:id/purchases

GET    /api/v1/statements/:id
POST   /api/v1/statements/:id/reconcile
POST   /api/v1/statements/:id/payments
POST   /api/v1/statements/:id/pdf-analysis

GET    /api/v1/shared-balances

GET    /api/v1/debts
POST   /api/v1/debts
POST   /api/v1/debts/:id/payments
POST   /api/v1/debts/:id/cancel

GET    /api/v1/contacts
POST   /api/v1/contacts
POST   /api/v1/connections
POST   /api/v1/connections/:id/accept
```

Los nombres pueden refinarse sin romper el límite: todas las operaciones de producto pasan por la GastApp API. Los clientes usan Supabase directamente solo para el flujo de Auth; no tratan tablas, Data API o RPC como contratos públicos.

Toda mutation financiera incluye:

- Idempotency-Key;
- versión para optimistic concurrency;
- transacción o RPC atómica;
- usuario/tenant derivado exclusivamente del JWT;
- autorización de recurso;
- audit log;
- error estructurado;
- validación de contrato y dominio.

Los DTO son contratos propios; ningún tipo de tabla o librería de persistencia atraviesa la API.

## H.13. Autenticación, autorización y RLS

- Supabase Auth con Google es el único proveedor inicial.
- Web y Expo obtienen un JWT y lo envían como Authorization Bearer a la Hono API.
- Middleware verifica firma, issuer, audience y expiración mediante mecanismos soportados por Supabase.
- El backend deriva currentUserId del subject autenticado.
- Ningún endpoint acepta userId del cliente para decidir ownership.
- Cada query y mutation aplica autorización explícita del caso de uso.
- RLS permanece habilitado en las tablas como defensa en profundidad.
- Para operaciones RLS-sensitive, persistencia propaga el JWT del usuario o usa una RPC con políticas verificables.
- Una service-role key omite RLS: se reserva para operaciones administrativas estrechas, con autorización explícita y auditoría.
- Publishable keys pueden existir en los clientes; service-role, secretos de IA y cualquier secreto backend nunca se incluyen en bundles Vite o Expo.
- V2 elimina cifrado application-level de descriptions y se apoya en encryption at rest, RLS, autorización y mínimo privilegio.

La relación entre autorización de aplicación y políticas RLS se prueba mediante una matriz owner, contraparte conectada, tercero autenticado y anónimo.

## H.14. Estado, cache y sincronización

- TanStack Query administra todo server state.
- Query keys se separan por módulo, usuario y período.
- Mutations invalidan únicamente queries afectadas.
- Optimistic UI se limita a operaciones reversibles y siempre tiene rollback.
- React Hook Form + Zod manejan formularios y errores de validación.
- React local state maneja modales y estado efímero.
- No se duplica data de API en un store global.
- Zustand se agrega solo frente a estado transversal real no derivable de URL, formulario o query.
- Cache de datos financieros privados es corto y scoped por usuario.
- Refetch por foco/reconexión y polling puntual cubren el primer release con usuarios conectados.
- Supabase Realtime no es requisito inicial; se incorpora únicamente si la experiencia o las métricas muestran necesidad.

React Router loaders pueden precargar shell o datos, pero llaman al mismo typed API client y no contienen reglas financieras.

## H.15. Background jobs y procesos asíncronos

Inicialmente, Supabase debe cubrir:

- outbox de notificaciones;
- email y retries;
- recordatorios;
- pre-materialización mínima para avisos;
- limpieza de idempotency keys expiradas;
- reintento controlado de análisis PDF;
- mantenimiento de proyecciones solo si una query derivada deja de ser suficiente.

La materialización normal sigue siendo on-demand. Los jobs pueden ejecutarse mediante capacidades programadas de Supabase y Edge Functions; no se introduce otro runtime.

Edge Functions admiten tareas server-side y orquestación de llamadas externas, pero tienen límites y cold starts. El PDF debe limitar tamaño, páginas, tiempo, concurrencia y costo. Si pruebas representativas demuestran que el parser o proveedor excede esos límites, se documenta la evidencia antes de separar ese workload.

- [Supabase Background Tasks](https://supabase.com/docs/guides/functions/background-tasks)
- [Supabase Cron](https://supabase.com/docs/guides/cron)

## H.16. Estrategia de migración

### Enfoque strangler

1. Mantener V1 Next.js/NextAuth/Prisma operativa.
2. Corregir primero IDOR, secretos y riesgos de build en V1.
3. Crear V2 en paralelo con React Router Web, Supabase Auth, PostgreSQL y una Hono Edge API.
4. Versionar todo cambio nuevo mediante migraciones Supabase/SQL.
5. Definir contratos y casos de uso antes de migrar pantallas.
6. Migrar usuarios Google conservando un mapeo estable entre identidad V1 y Supabase Auth.
7. Migrar contactos, tarjetas y datos maestros.
8. Convertir gastos en MonthlyExpenseSeries y summaries en occurrences.
9. Inferir únicamente recurrencias demostrables; las series bimestrales nuevas requieren anchorPeriod explícito.
10. Convertir el flag anual existente en CoveragePeriod solo cuando sus fechas permitan establecer cobertura.
11. Convertir relaciones compartidas históricas en allocations iguales y snapshots por período sin inventar porcentajes.
12. No crear conexiones entre cuentas a partir de un nickname; requieren email/identidad confirmada.
13. Construir saldos bidireccionales únicamente para conexiones reales y allocations migradas confiables.
14. Convertir consumos en purchases/installments.
15. Importar statements antiguos como LEGACY_ACCEPTED y conservar totales agregados únicamente como metadata legacy por moneda, fuera de allocations y cálculos de gastos.
16. Comparar V1/V2 por usuario, período y moneda.
17. Activar V2 por cohortes/feature flag y mantener rollback de lectura.
18. Retirar V1 financiera solo después de la reconciliación; Invoice permanece separada.
19. Agregar Expo después de estabilizar web, API y contratos.

### Limitaciones históricas

V1 no permite reconstruir con certeza:

- líneas reales de statements;
- matches históricos;
- porcentajes distintos de partes iguales;
- fechas reales de compra/posted;
- conexiones entre usuarios a partir de personas manuales;
- saldos bidireccionales previos si la contraparte no estaba identificada;
- historial de PersonalDebt, porque el módulo no existía;
- descripciones individuales de créditos agregados;
- PDFs bancarios que nunca fueron almacenados.

Estos vacíos se etiquetan como legacy. Nunca se inventan datos para completar una migración.

## H.17. Roadmap

### Fase 0 — Seguridad y continuidad V1

- Rotar secretos y credenciales.
- Recifrar datos existentes antes de retirar el cifrado por campo en V2.
- Actualizar Next.js V1 a una versión parcheada.
- Cerrar IDOR.
- Eliminar db push del build productivo.
- Backup y plan de rollback.

### Fase 1 — Characterization

- Tests sobre comportamiento útil de V1.
- Fixtures anonimizados.
- Baseline de queries, p50/p95 y bundle.
- Matriz de migración y comparación mensual.

### Fase 2 — Fundación V2 web/backend

- React Router 8 Framework Mode SPA, React 19, Vite y TypeScript.
- Supabase project, Auth Google, PostgreSQL, Storage y RLS.
- Migraciones SQL.
- Edge Function api con Hono.
- Contratos Zod, typed API client, errores, Money, fechas e idempotencia.
- Tests unitarios, de integración, RLS, migración y contratos.
- Deploy estático web y CI dentro de free tiers razonables.

### Fase 3 — Gastos periódicos

- Series mensuales/bimestrales y anchorPeriod.
- Ocurrencias on-demand.
- Edición current/future.
- Pago, undo y auditoría.
- Pago anual y CoveragePeriod.
- Dashboard mensual.

### Fase 4 — Contactos, conexiones y compartidos

- Contactos manuales con nickname/email opcional.
- Invitaciones y conexiones.
- Allocations versionadas.
- Visibilidad read-only en cuenta contraparte.
- Saldos bidireccionales por persona y moneda.

### Fase 5 — PersonalDebt

- Principal y pagos parciales.
- Estados derivados.
- Cancelación/condonación.
- Notas y ajustes explícitos.
- Separación verificada respecto de saldos compartidos.

### Fase 6 — Tarjetas y conciliación manual

- Compras, cuotas y cargos recurrentes.
- Statements y líneas reales.
- Matching manual 1:1.
- Corrección de importes antes de pago.
- Pago exclusivo del statement.
- Cargos desconocidos y esperados ausentes.

### Fase 7 — PDF/IA opcional

- Bucket privado y políticas.
- StatementParser agnóstico de proveedor.
- Extracción estructurada y validación Zod.
- Sugerencias de matching.
- Revisión humana obligatoria.
- Límites, costo, retry, retención y auditoría.

### Fase 8 — Migración y cutover

- Backfill idempotente.
- Comparación V1/V2.
- Activación por cohortes.
- Rollback.
- Retiro de V1 financiera.

### Fase 9 — Expo

- Aplicación React Native separada.
- Mismo typed API client y contratos.
- Sesión Supabase Auth en secure storage.
- Cache offline y retries idempotentes.
- Push notifications.

---

# Validaciones realizadas durante el assessment

- Inventario completo de archivos relevantes.
- Lectura de schema y migraciones.
- Revisión de páginas, componentes y Server Actions.
- Revisión de autenticación, cron y configuración de deploy.
- `npx tsc --noEmit --incremental false`: exitoso.
- `npx next lint --no-cache`: exitoso con tres warnings de hooks.
- Verificación de ausencia de suite automatizada.
- Verificación del historial de `.env` sin exponer valores.
- No se ejecutó `npm run build` porque el script actual incluye `prisma db push`.
- No se modificaron archivos, dependencias, schema ni base de datos durante el assessment.

---

# Decisión recomendada

Adoptar la arquitectura web-first definida:

```text
React Router 8 Framework Mode como SPA
React 19 + Vite + TypeScript
TanStack Query
React Hook Form + Zod
typed API client
        ↓
una Supabase Edge Function principal
        ↓
Hono REST API
        ↓
casos de uso + dominio + persistencia SQL/RPC
        ↓
Supabase PostgreSQL + Auth + Storage + RLS

Futuro: Expo / React Native sobre la misma API
```

Construir V2 mediante migración strangler, manteniendo V1 operativa hasta reconciliar cada cohorte. No recomendar Next.js, Route Handlers, Server Actions, Prisma obligatorio, Vercel backend ni un servidor Node independiente para V2.

El dominio queda dividido en gastos periódicos, tarjetas/conciliación, saldos compartidos derivados entre cuentas conectadas y `PersonalDebt` manual. La UI unifica la creación y la lectura mensual, mientras la base de datos conserva agregados especializados.

No quedan preguntas de producto abiertas para iniciar el diseño detallado. Permanecen dos validaciones operativas: comprobar con PDFs bancarios reales que el pipeline cabe dentro de límites y costos aceptables de Edge Functions, y seleccionar un hosting estático gratuito para la SPA. Ninguna exige cambiar el dominio ni el contrato API.
