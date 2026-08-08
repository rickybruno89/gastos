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

El eje mensual no es una limitación accidental de V1: es parte del alcance del producto. Lo que debe confirmarse para V2 es si existen excepciones reales —por ejemplo pagos anuales—, no si GastApp debe transformarse en un tracker de gastos diarios.

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
- Google OAuth inicialmente.
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
- Prisma → actualizar y ubicar detrás de la capa de aplicación.
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
| Reparto informativo por mes/persona/moneda   | Parcial y calculado con relaciones actuales            |
| Snapshot histórico del reparto               | No existe                                              |
| Deuda manual independiente                   | No existe                                              |
| Pagos parciales de deuda manual              | No existe                                              |
| Separación estricta reparto vs. Deudas       | No existe como límite de dominio                       |
| Statement con líneas reales                  | No existe                                              |
| Match esperado vs. real                      | No existe                                              |
| Cargo desconocido                            | No existe                                              |
| Cargo esperado ausente                       | No existe                                              |
| Movimiento trasladado de cierre              | No está modelado                                       |
| Fecha de compra/posted/closing               | Solo mes esperado y mes de resumen                     |
| N créditos con descripción                   | Un agregado por moneda                                 |
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

# E. Decisiones confirmadas y preguntas pendientes

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

En consecuencia, las preguntas originales sobre nacimiento, exigibilidad, aceptación, disputa y liquidación de una deuda compartida dejan de aplicar. Las preguntas sobre pagos parciales quedan respondidas de manera distinta para cada módulo.

Trazabilidad respecto de la lista original:

| Pregunta original                      | Resultado de la aclaración                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1 — nacimiento de deuda compartida     | Respondida: no nace una entidad deuda; se proyecta el importe del período.                                        |
| 2 — porcentaje del creador             | Respondida: el total es 100%, el creador puede tener 0% y otra persona 100%.                                      |
| 3 — quién edita                        | Parcial: el propietario carga el reparto; falta decidir si existirán usuarios conectados.                         |
| 4 — visibilidad del invitado           | Sigue abierta solo si se implementan usuarios conectados.                                                         |
| 5 — aceptación del participante        | Deja de aplicar al reparto informativo; una futura conexión de usuarios puede tener aceptación propia.            |
| 6 — pagos/cobros parciales             | Respondida: solo aplican al módulo Deudas.                                                                        |
| 7 y 8 — intereses/cancelación de deuda | Siguen abiertas para Deudas y se reformulan abajo.                                                                |
| 9 — significado del pago anual         | Respondida: conserva la serie mensual y cubre un rango de meses, que siguen visibles como pagados.                |
| 19 — cuándo está pagada una tarjeta    | Parcialmente respondida: el estado pertenece al statement, no al reparto; falta confirmar su granularidad exacta. |
| 20 — cambio posterior de porcentajes   | Sigue abierta y se reformula abajo.                                                                               |

## E.2. Preguntas nuevas para cerrar el diseño

Cada pregunta incluye una recomendación inicial. Ninguna invalida las decisiones confirmadas de E.1.
Si no hay una respuesta para cada pregunta, usar la Recomendacion que aparece ahi

1. **Para una serie bimestral, el usuario debe elegir explícitamente el primer mes del ciclo?**  
   Recomendación: sí; guardar un `anchorPeriod` evita ambigüedad entre ciclos enero/marzo y febrero/abril.

2. **¿Cuándo debe materializarse la ocurrencia mensual: al abrir el mes, anticipadamente o mediante un proceso programado?**  
   Recomendación: al consultar el mes, mediante upsert idempotente; opcionalmente pre-generar para notificaciones.
   Respuesta: elegiría materialización on-demand al consultar el mes, con upsert idempotente. Si después necesitás recordatorios antes de abrir ese mes, el cron puede pre-materializar únicamente lo necesario. No haría depender el funcionamiento normal de un cron.

3. **Cuando cambia el importe de luz o internet, editar el mes debe cambiar también el valor sugerido para meses futuros?**  
   Recomendación: ofrecer dos acciones explícitas: “solo este mes” y “este mes y futuros”.

4. **¿El vencimiento puede cambiar solo para una ocurrencia mensual?**  
   Recomendación: sí; la serie guarda la regla y la ocurrencia conserva la fecha efectiva.
   Respuesta: Si, usar la recomendacion, pero si modifico una fecha mensual, los meses siguientes deberia acutalizar su fecha de vencimiento porque posiblemente tambien hayan cambiado por esta nueva fecha

5. **¿Marcar pagado requiere fecha y medio de pago, o alcanza una acción rápida con la fecha actual?**  
   Recomendación: acción rápida con fecha actual y canal predeterminado, permitiendo editar ambos.

6. **En Tarjetas, “Marcar pagado” debe operar siempre sobre el statement completo o también sobre consumos/cuotas individuales?**  
    Recomendación: operar sobre el statement; las cuotas incluidas heredan ese resultado y no se pagan individualmente fuera del resumen.
   Respuesta: pagaría únicamente el statement completo. Una cuota individual no debería tener un lifecycle de pago separado: queda pagada porque pertenece al resumen que fue pagado.

7. **En una compra en cuotas, el porcentaje se aplica al total y se replica en todas las cuotas?**  
   Recomendación: sí; cada cuota hereda un snapshot proporcional, evitando redondear nuevamente el total en cada pantalla.

8. **¿Cuándo debe mostrarse “Juan: $X” para tarjeta: en el mes de compra o en cada mes en que una cuota entra al statement?**  
   Recomendación: en el período del statement/cuota que efectivamente debe pagar el propietario.
   mostraría la parte de Juan cada mes en que la cuota aparece en el resumen, no todo en el mes de compra. Si compro algo de $120.000 en 12 cuotas y Juan tiene 50%, conceptualmente Juan representa $5.000 por cada statement, no $60.000 inmediatamente.

9. **¿El porcentaje se aplica solo al consumo o también a impuestos, intereses, descuentos y ajustes del resumen?**  
   Recomendación: aplicar por defecto solo al consumo; distribuir cargos del statement únicamente mediante una regla explícita.
   El reparto debería aplicarse al consumo concreto. Impuestos generales, percepciones, intereses financieros, descuentos globales, saldo a favor, etc., son conceptos del statement y no necesariamente pertenecen a una compra.

10. **Si una línea real del statement difiere del importe esperado, el reparto se recalcula sobre el importe real?**  
    No deberia diferir, en caso por ejemplo que un gasto lo haya cargado como $10.000 pero vengan $10.000,50, yo antes marcar como pagado ese gasto, o el resumen de la tarjeta con ese gasto dentro, lo tengo que poder ajustar al nuevo valor, y recien ahi marcar como pagado.

11. **En una compra 100% ajena, quién absorbe impuestos o costos financieros vinculados a esa compra?**  
    Todo lo que sea impuestos al sello, o compras en dolares con (que tienen el 30% de percepcion de ganancias en argentina), no forman parte de los caluclos de la app, la app solo contabiliza los gastos con sus montos cargados, y para las tarjetas de credito igual, todo lo que tenga que cobrar extra al deudor lo calculo yo por aparte en papel y lapiz;

12. **¿Un gasto regular —no solo una compra de tarjeta— puede asignarse 100% a otra persona?**  
    Recomendación: permitirlo; la obligación sigue perteneciendo al usuario que la administra.

13. **¿Cambiar personas o porcentajes afecta solo meses futuros o también una ocurrencia todavía no pagada?**  
    Recomendación: cambios en la serie afectan solo futuras ocurrencias; el mes actual se edita de forma explícita y nunca se reescribe historia pagada. Amplio: si ya marque el gasto como pagado para el mes corriente, no puedo editar nada, asi que si edito algo, se reflejara para los meses siguientes, y en caso de que quiera modificar para el corriente mes, pero ya lo marque como pagado, tengo que deshacer el pago, editar lo necesario, y luego aceptar los cambios, entonces ahi los cambios seran para el mes actual y futuros; (y luego marcar como pagado nuevamente para el mes actual)

14. **¿Las personas compartidas son siempre contactos privados o también habrá usuarios conectados que puedan ver datos?**  
    Ambas opciones deben existir.

Un gasto puede compartirse con una persona creada manualmente, identificada únicamente mediante un nickname. En ese caso, esa persona funciona como un contacto privado dentro de la cuenta del usuario y no necesita tener una cuenta de GastApp.

Opcionalmente, el usuario puede asociar un email a esa persona para conectarla con otra cuenta de GastApp. El usuario podrá seguir asignándole un nickname propio para identificarla rápidamente.

Cuando dos usuarios estén conectados, todos los gastos compartidos entre ellos deberán reflejarse en ambas cuentas.

Por ejemplo, si Ricky crea un gasto de $100.000 compartido 50/50 con Juan, en la cuenta de Ricky ese gasto contribuirá al saldo compartido de Juan por $50.000. En la cuenta de Juan, el mismo reparto aparecerá dentro de su sección de gastos compartidos indicando que debe $50.000 a Ricky.

Cada usuario debe poder ver una vista consolidada de sus saldos compartidos por persona: cuánto le deben otras personas y cuánto debe él a cada una, considerando todos los gastos compartidos entre usuarios conectados.

Estos saldos compartidos siguen siendo distintos del módulo PersonalDebt. No deben crear automáticamente una deuda manual, ni compartir su lifecycle, pagos parciales o estados. Son una proyección derivada de los gastos compartidos registrados entre usuarios.

15. **Si existen usuarios conectados en el futuro, el destinatario puede editar o solamente ver su porcentaje?**  
    Recomendación: solo lectura; el propietario del gasto conserva la edición.

16. **¿Qué estados exactos necesita una deuda manual?**  
Los estados serán OPEN, PARTIALLY_PAID, PAID y CANCELLED.

El estado se calcula automáticamente según los pagos registrados. Por ejemplo, una deuda sin pagos está OPEN, con pagos parciales está PARTIALLY_PAID y cuando se paga completamente queda PAID. CANCELLED se utiliza cuando el usuario decide perdonar el saldo restante.

17. **¿Una deuda manual admite intereses, actualizaciones o aumentos de capital después de creada?**  
    Recomendación: principal fijo y ajustes explícitos con motivo; excluir cálculo automático de intereses inicialmente.

18. **¿Un pago parcial debe usar siempre la moneda de la deuda?**  
    Recomendación: sí en V2 inicial. pero puedo tener un campo descripcion o Notas, para yo ahi poner notas para recordar cosas como por ejemplo, la deduda que era en ARS, me la pago en USD a un cambio de tanto; simplemente para yo recoradr despues que paso con ese pago, pero la app no deberia gestionar esa diferencia de moneda;

19. **¿Puede cancelarse o perdonarse el saldo de una deuda?**  
    Recomendación: sí, con motivo, fecha y auditoría, sin fingir un pago.

20. **¿La conciliación de tarjeta inicial será manual, por CSV o por PDF?**  
La conciliación manual se mantiene como flujo principal. El usuario seguirá revisando el resumen de la tarjeta e irá marcando en GastApp, uno por uno, los consumos que efectivamente aparecen, para poder detectar diferencias entre lo esperado y lo informado por el banco.

Además, se agregará opcionalmente una acción “Subir PDF”. El usuario podrá cargar el resumen emitido por el banco y un módulo basado en IA analizará el documento, extraerá sus líneas y devolverá una representación estructurada de los cargos reales.

GastApp utilizará ese resultado para comparar automáticamente las líneas del resumen contra los consumos esperados y sugerir matches, diferencias, cargos desconocidos y consumos esperados ausentes.

El resultado del análisis automático no debe modificar ni conciliar datos de forma definitiva sin revisión del usuario. La UI mostrará la comparación propuesta para que el usuario pueda confirmarla o corregirla manualmente.

CSV no es una prioridad inicial.

21. **¿Un cargo real puede corresponder a varias compras esperadas o viceversa?**  
    Recomendación: match 1:1 inicialmente y acción manual de dividir/combinar como excepción.

22. **¿Cómo se manejan consumos y pagos de tarjeta en USD?**  
    Recomendación: conservar ARS y USD separados y no convertir automáticamente.

23. **¿Debe conservarse todo el histórico actual aunque no puedan reconstruirse líneas reales de statements?**  
    Recomendación: sí, marcándolo como legacy y sin inventar conciliaciones.

24. **¿La descripción debe seguir cifrada a nivel aplicación?**  
Eliminar encryption por campo de las descriptions en V2 y confiar en encryption at rest del proveedor + controles de acceso + correcta autorización.

25. **¿Qué ocurre con un vencimiento configurado para el día 29, 30 o 31 cuando el mes es más corto?**  
    Recomendación: usar el último día válido del mes sin desplazar la ocurrencia al mes siguiente.

26. **¿Qué canales de notificación se necesitan realmente?**  
    Recomendación: email primero y push cuando exista Expo; preferencias configurables por canal y tipo de vencimiento.

27. **¿Google seguirá siendo el único proveedor de identidad?**  
    Recomendación: Google solamente

28. **Si un gasto compartido mensual se paga anualmente, cuándo corresponde mostrar la parte de la otra persona: toda en el mes del pago anual o distribuida entre los meses cubiertos?**  
    Recomendación: registrarla en el mes del desembolso anual, porque es cuando el propietario efectivamente pagó; los meses cubiertos posteriores quedan visibles pero no generan nuevos importes compartidos.

---

# F. Sugerencias de producto

## F.1. Dashboard mensual

Orden recomendado:

1. Alertas: vencidos, vence hoy, cargos desconocidos y statements sin conciliar.
2. Resumen por moneda de gastos mensuales y statements pendientes, sin mezclar monedas.
3. Gastos mensuales a pagar.
4. Tarjetas y estado de conciliación.
5. “Corresponde a otras personas”, agrupado por persona, período y moneda; es informativo y no tiene estado de cobro.
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
- Conectar usuarios, solo si se confirma como requisito futuro.
- Reestructurar una deuda.
- Crear un gasto desde un flujo único que primero elige “mensual” o “tarjeta”.

## F.4. Automatizaciones

- Materializar ocurrencias al consultar un mes mediante upsert idempotente.
- Sugerir matches entre líneas reales y cargos esperados.
- Detectar duplicados por tarjeta, importe, moneda, comercio y fecha.
- Arrastrar cargos esperados ausentes al siguiente statement sin cambiar su fecha real.
- Materializar el snapshot de reparto de cada cuota cuando entra al período correspondiente, sin generar una deuda.
- Enviar recordatorios configurables.
- Mostrar “cubierto por pago anual” sin crear deudas cero ficticias.

## F.5. Features a agregar

- Creación unificada de gasto mensual o consumo de tarjeta.
- Pagos parciales dentro de Deudas.
- Timeline y auditoría.
- Conexiones e invitaciones, solo si se confirma colaboración entre cuentas.
- Conciliación y cargos desconocidos.
- Archivo de contactos.
- Exportación CSV.
- Estado offline/read-only en Expo.
- Retry seguro e idempotente de mutations.

## F.6. Features o conceptos a simplificar

- Reemplazar “generar resumen mensual” por ocurrencias automáticas.
- Reemplazar “omitir como pagado con cero” por un estado explícito.
- Separar “esperado”, “confirmado”, “conciliado” y “pagado”.
- Mostrar una sola cifra principal por moneda y contexto.
- Evitar que “gasto” represente a la vez plantilla, ocurrencia, pago y deuda.
- Evitar que “importe correspondiente a Juan” se presente como una deuda cobrable o conciliada.

## F.7. Realtime y background jobs

Realtime no aporta suficiente valor inicialmente. TanStack Query con invalidación y refetch es suficiente. Puede evaluarse si en el futuro los contactos pasan a ser usuarios conectados con visibilidad compartida.

Los background jobs iniciales deberían limitarse a:

- notificaciones mediante outbox;
- retries de email;
- mantenimiento de proyecciones si se demuestra necesario.

La generación de ocurrencias puede ser on-demand e idempotente, sin depender de un cron mensual.

---

# G. Stack options

## G.1. Comparación

|                      | Opción 1 — Recomendada                         | Opción 2                   | Opción 3                          |
| -------------------- | ---------------------------------------------- | -------------------------- | --------------------------------- |
| Web                  | Next.js Active LTS                             | React Router 7 + Vite      | Next.js o Expo Web                |
| API                  | REST `/api/v1` con Route Handlers              | Hono API independiente     | Supabase Data API/RPC             |
| Database             | Supabase PostgreSQL                            | Supabase/Neon PostgreSQL   | Supabase PostgreSQL               |
| ORM/data layer       | Prisma estable actualizado                     | Drizzle                    | SQL/RPC directo                   |
| Auth                 | Supabase Auth                                  | Supabase Auth              | Supabase Auth                     |
| State                | React local; Zustand solo si aparece necesidad | Igual                      | Igual                             |
| Cache/data fetching  | TanStack Query                                 | TanStack Query             | TanStack Query                    |
| Hosting              | Un proyecto Vercel                             | Dos servicios/proyectos    | Vercel + Supabase                 |
| Mobile               | Expo + mismo API client                        | Expo + mismo API client    | Expo + Supabase directo           |
| Complejidad          | Baja-media                                     | Media                      | Baja al inicio, alta en dominio   |
| Performance          | Muy buena si se agrupan queries                | Excelente y controlable    | Buena, dependiente de RLS/RPC     |
| Costo inicial        | $0 personal; producción baja                   | $0–bajo                    | $0–bajo                           |
| Principal desventaja | Next.js sigue presente como host/adaptador     | Más infraestructura y CORS | Lógica fragmentada en DB/clientes |

Supabase ofrece Postgres, OAuth y un free tier suficiente para una app personal, aunque los proyectos gratuitos pueden pausarse y no incluyen backups automáticos:

- [Supabase Pricing](https://supabase.com/pricing)

Vercel Hobby es gratuito, pero está destinado a uso personal/no comercial:

- [Vercel Pricing](https://vercel.com/pricing)

## G.2. Opción 1 — Next.js + Route Handlers + Prisma + Supabase

### Componentes

- Next.js en la versión Active LTS parcheada disponible al implementar.
- Web autenticada mayormente API-driven.
- Route Handlers como adaptador HTTP REST.
- PostgreSQL administrado por Supabase.
- Prisma actual con runtime serverless moderno y pool.
- Supabase Auth para identidad compartida web/Expo.
- TanStack Query para server state.
- Zod para contratos y validación.
- Estado local con React; Zustand solo si aparece estado transversal real.
- Vercel Cron + outbox para emails.
- Sin realtime inicialmente.

Route Handlers soportan los métodos HTTP necesarios para una API REST:

- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)

### Ventajas

- Un único deploy web/API inicialmente.
- Sin CORS entre web y API.
- Integración simple con Vercel.
- El dominio puede permanecer completamente fuera de Next.js.
- La API se puede extraer después sin cambiar contratos o casos de uso.
- Prisma estable ofrece migraciones, transacciones y buen DX para un equipo pequeño.

### Desventajas

- Hay que imponer disciplina para que la UI no vuelva a saltarse la API/aplicación.
- Next.js conserva cierta complejidad de framework.
- Un único deploy comparte blast radius entre web y API.

### Costo y performance

- Costo inicial potencialmente cero para uso personal.
- Producción básica: costo bajo, principalmente base administrada.
- Muy buena performance si se alinea la región, se usa pool y se evita el exceso de round trips.

### Recomendación

Es la opción elegida. No se elige porque Next.js ya esté en el repo, sino por costo operacional y compatibilidad con Vercel. Ninguna regla del dominio dependerá de RSC, SSR o Server Actions.

## G.3. Opción 2 — React Router/Vite + Hono + Drizzle

### Componentes

- React Router 7 Framework Mode o SPA con Vite.
- Hono como API independiente en Vercel.
- PostgreSQL en Supabase o Neon.
- Drizzle como query layer.
- Supabase Auth.
- TanStack Query.
- Expo con cliente API compartido.

### Ventajas

- Separación estricta frontend/backend.
- Frontend ligero y control explícito.
- API desplegable independientemente.
- Menos conceptos de RSC y caching de framework.
- Drizzle permite SQL más transparente.

### Desventajas

- Dos deploys o configuración monorepo más compleja.
- CORS, auth, observabilidad y variables duplicadas.
- Mayor carga operacional para una aplicación pequeña.
- Drizzle v1 figura todavía como RC en su documentación actual.

### Evaluación

Es una buena opción técnica, pero su separación adicional no compensa todavía la complejidad operativa.

## G.4. Opción 3 — Supabase directo

### Componentes

- Web y Expo consumen Supabase Data API/RPC.
- RLS para autorización.
- Postgres functions y triggers para lógica compleja.
- Supabase Auth y Realtime.

### Ventajas

- Muy poco backend propio.
- Auth móvil sencilla.
- Bajo costo.
- Realtime disponible.

### Desventajas

- Reglas repartidas entre RLS, triggers, RPC y clientes.
- Contratos y transacciones de conciliación más difíciles de versionar.
- Acoplamiento fuerte al proveedor.
- Mayor riesgo de duplicar reglas entre web y mobile.
- Debugging más difícil para workflows financieros largos.

### Evaluación

No se recomienda para el dominio principal. Supabase sí se recomienda como PostgreSQL administrado y proveedor de Auth, no como reemplazo completo de la capa de aplicación.

Supabase soporta oficialmente Auth en React Native y JWT verificables por una API propia:

- [Supabase Auth con React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Supabase JWT/JWKS](https://supabase.com/docs/guides/auth/jwts)

---

# H. Proposed V2

Esta propuesta incorpora las decisiones confirmadas en E.1. Los detalles señalados en E.2 siguen abiertos, pero no se volverán a mezclar repartos informativos con el módulo Deudas.

## H.1. Arquitectura

```text
Web / Expo
    ↓
Typed API client
    ↓
REST API / HTTP adapters
    ↓
Application use cases
    ↓
Domain rules + transactions
    ↓
Prisma data layer
    ↓
PostgreSQL
```

SSR puede utilizarse para shell o prefetch, pero ninguna regla dependerá de SSR, Server Components o React.

## H.2. Estructura del repositorio

```text
apps/
  web/
  mobile/          # se agrega cuando comience Expo

packages/
  domain/          # Money, recurrence, allocations, estados
  application/     # casos de uso y transacciones
  contracts/       # DTOs y schemas Zod
  db/              # schema Prisma, queries y migrations
  api-client/      # cliente compartido web/Expo
  testkit/          # builders, clocks y fixtures
```

Expo soporta workspaces y monorepos modernos, aunque su propia documentación advierte que agregan complejidad. En este producto se justifican cuando exista realmente la app mobile:

- [Expo: Work with monorepos](https://docs.expo.dev/guides/monorepos/)

No se crearán repositories ceremoniales por cada tabla. Los casos de uso financieros complejos usarán una unidad de trabajo transaccional; las queries de dashboard podrán usar proyecciones optimizadas directas.

## H.3. Módulos

```text
identity
contacts-and-connections
monthly-expenses
recurrence
payments
sharing-and-allocations
personal-debts
credit-cards
statements-and-reconciliation
notifications
monthly-dashboard
audit
```

### Decisión de persistencia y UI

V2 no debe usar una única tabla `Expense` con columnas opcionales para tarjeta, cuotas, statement, deuda y conciliación. Esos conceptos tienen ciclos de vida y restricciones diferentes; una tabla universal produciría muchos campos nulos y reglas condicionales difíciles de garantizar.

La unificación correcta ocurre en dos lugares:

- **UI:** un botón “Crear gasto” abre un flujo común y luego permite elegir “gasto mensual” o “tarjeta”.
- **Lectura:** el dashboard mensual combina ocurrencias y cargos de tarjeta mediante una query/proyección tipada.

La escritura y persistencia permanecen especializadas. Deudas también conserva tablas, endpoints y navegación propios.

```text
Crear gasto
├── Gasto mensual → MonthlyExpenseSeries / MonthlyExpenseOccurrence
└── Tarjeta       → CardPurchase / CardInstallment / CardStatement

Dashboard mensual ← MonthlyExpenseOccurrence + cargos/statement del período
Deudas            ← PersonalDebt + PersonalDebtPayment (sin enlaces automáticos)
```

## H.4. Gastos mensuales

Entidades:

```text
MonthlyExpenseSeries
RecurrenceRule
MonthlyExpenseOccurrence
OccurrenceAllocation
ExpensePayment
CoveragePeriod
```

Reglas:

- No es un ledger de gastos diarios: una serie representa algo pagadero por período mensual.
- La recurrencia base admite `intervalMonths = 1` para mensual y `intervalMonths = 2` para bimestral.
- Toda serie bimestral guarda `anchorPeriod`, que define qué meses pertenecen al ciclo.
- Fecha inicial, fecha final opcional y regla de vencimiento.
- Ocurrencias con snapshot de monto, moneda, participantes y porcentajes.
- Estados iniciales: `PLANNED`, `DUE`, `PAID`, `COVERED`, `SKIPPED`, `CANCELLED`.
- Marcar pagado crea un registro con fecha y canal, aunque la UI lo presente como una acción binaria. El pago parcial no se incorpora aquí salvo decisión posterior.
- Una serie bimestral materializa ocurrencias únicamente en meses programados. En los meses intermedios no hay ocurrencia, importe pendiente ni `OccurrenceAllocation`; por lo tanto, el gasto aporta cero al total y ninguna persona debe una parte.
- El pago anual no cambia la frecuencia de la serie mensual. Crea un `CoveragePeriod` con `fromPeriod`, `throughPeriod` y referencia al pago que produjo la cobertura.
- Cada mes alcanzado por el pago anual conserva una ocurrencia visible con estado `COVERED`, etiqueta “Pagado anual” y `payableAmountMinor = 0`. El importe nominal puede conservarse por separado para contexto, pero no se suma al total pendiente.
- Una ocurrencia cubierta no genera nuevamente un importe compartido. Si el pago anual es compartido, su reparto se registra una sola vez según la decisión pendiente E.2.28.
- Generación on-demand mediante upsert único `[seriesId, accountingPeriod]`.

## H.5. Compartidos y allocations

Cada allocation debe guardar:

- usuario propietario, usuario conectado futuro o contacto manual;
- `shareBps`, donde 10.000 = 100%;
- importe calculado en unidades menores;
- nombre snapshot;
- versión de la distribución.

Las allocations del propietario y de las demás personas suman 10.000 basis points. El propietario puede tener `shareBps = 0` y Juan `shareBps = 10_000`. Para evitar foreign keys polimórficas ambiguas, pueden persistirse allocations especializadas por agregado —ocurrencia mensual y cargo de tarjeta— reutilizando las mismas reglas de dominio.

La división automática igual debe repartir porcentajes y centavos residuales de forma determinista. Para tres participantes podría producir:

```text
33.33%
33.33%
33.34%
```

La suma se valida en tres niveles:

1. schema Zod del contrato;
2. caso de uso dentro de la transacción;
3. constraint trigger diferido en PostgreSQL.

Cambiar porcentajes crea una nueva versión para ocurrencias futuras. No modifica históricos.

Una allocation no tiene estado de deuda, aceptación, cobro ni pago. Es un snapshot que responde: “de este importe del período, ¿cuánto corresponde a cada persona?”. Los totales se proyectan por período, persona y moneda.

## H.6. Contactos y usuarios conectados

Entidades sugeridas:

```text
Contact
UserConnection
```

- `Contact` representa una persona manual y puede archivarse.
- Un contacto puede vincularse opcionalmente con un usuario real.
- `UserConnection` maneja `PENDING`, `ACCEPTED`, `REJECTED`, `BLOCKED`.
- Las allocations pueden referenciar un usuario o un contacto, nunca ambos.
- Las ocurrencias guardan un snapshot de nombre para preservar historia.
- Desconectar usuarios no elimina allocations históricos.

Las conexiones son opcionales y no forman parte del núcleo necesario: el producto puede operar únicamente con contactos privados. Si se agregan usuarios conectados, la aceptación corresponde a la conexión entre usuarios, no a cada reparto.

## H.7. Deudas manuales independientes

```text
PersonalDebt
PersonalDebtPayment
```

Una `PersonalDebt` representa una cuenta manual independiente, como prestar USD 1.000 en efectivo a una hermana y registrar devoluciones de importes variables.

- Principal, moneda, contraparte, fecha, nota y vencimiento opcional.
- Pagos parciales arbitrarios mediante `PersonalDebtPayment`.
- Estados sugeridos: `OPEN`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`.
- El usuario es acreedor y la contraparte es quien le debe; no se modelan inicialmente deudas del usuario hacia terceros.
- El saldo se deriva del principal y los pagos; no se guarda como una segunda fuente de verdad sin control.
- `PersonalDebtAdjustment` se agrega únicamente si se confirman aumentos de capital, intereses manuales o condonaciones; todo ajuste será explícito y auditable.

No existe `sourceType` hacia gastos, allocations, cuotas o statements. Crear o pagar un gasto compartido nunca crea, actualiza ni liquida una `PersonalDebt`. Si el usuario excepcionalmente quiere llevar también ese compromiso en Deudas, debe crearlo de manera manual y consciente; V2 no debe duplicarlo automáticamente.

## H.8. Tarjetas y conciliación

Entidades:

```text
CreditCard
CardPurchase
CardRecurringChargeSeries
CardExpectedCharge
CardInstallment
CardStatement
StatementLine
StatementMatch
StatementAdjustment
CardPayment
```

`CardPurchase` o su plan recurrente conserva la distribución elegida al crear el gasto. Cada cuota/cargo materializado conserva un snapshot del porcentaje aplicable a ese período. Una compra asignada 100% a Juan sigue perteneciendo a la tarjeta y al statement del propietario: el reparto no cambia la obligación frente al banco ni crea una `PersonalDebt`.

Fechas separadas:

- `occurredAt`: compra o consumo real conocido.
- `expectedPeriod`: expectativa de aparición.
- `postedOn`: fecha informada por el banco.
- `closingDate`: cierre real.
- `statementPeriod`: período contable del resumen.
- `dueDate`: vencimiento.

El statement real define el período contable. `expectedPeriod` solo ayuda a sugerir matches.

Ejemplo HBO:

```text
Cargo esperado en julio
→ no aparece en statement de julio
→ permanece unmatched
→ aparecen dos líneas en agosto
→ cada línea se concilia con su ocurrencia esperada
```

Un statement tendrá N ajustes con importe, moneda, descripción y tipo. No se guardará únicamente un saldo agregado.

Estados de conciliación:

```text
EXPECTED
MATCHED
RECONCILED
UNMATCHED_EXPECTED
UNMATCHED_ACTUAL
IGNORED_WITH_REASON
```

## H.9. Dinero y monedas

Representación recomendada:

```text
amountMinor BIGINT
currency CHAR(3)
```

La API serializará `amountMinor` como string para evitar problemas con `BigInt` y JSON.

No habrá conversión automática. Toda conversión futura deberá registrar:

- monto origen;
- moneda origen;
- monto destino;
- moneda destino;
- tipo de cambio;
- fecha;
- motivo.

Los totales siempre se agrupan por moneda.

## H.10. Fechas y períodos

- `DATE` para vencimientos, cierres y posted date.
- `TIMESTAMPTZ` para eventos.
- Período contable como primer día del mes, por ejemplo `2026-08-01`.
- Zona horaria por usuario.
- Regla explícita para último día válido del mes.
- Nunca se asignará statement mediante `purchase.month === statement.month`.

## H.11. API boundaries

API inicial:

```text
GET    /api/v1/months/:period

POST   /api/v1/monthly-expense-series
PATCH  /api/v1/monthly-expense-series/:id
POST   /api/v1/occurrences/:id/payments
POST   /api/v1/occurrences/:id/skip

POST   /api/v1/connections
POST   /api/v1/connections/:id/accept
GET    /api/v1/contacts

POST   /api/v1/personal-debts
PATCH  /api/v1/personal-debts/:id
POST   /api/v1/personal-debts/:id/payments

POST   /api/v1/cards
POST   /api/v1/cards/:id/purchases
POST   /api/v1/cards/:id/statements
POST   /api/v1/statements/:id/lines
POST   /api/v1/statements/:id/matches
POST   /api/v1/statements/:id/finalize
POST   /api/v1/statements/:id/payments
```

Toda mutation financiera debe incluir:

- `Idempotency-Key`;
- `version` para optimistic concurrency;
- transacción;
- tenant/owner derivado exclusivamente del token;
- audit log;
- error estructurado;
- validación de contrato y dominio.

Nunca se recibirán objetos Prisma completos desde el cliente.

## H.12. State management y cache

- TanStack Query para todo server state.
- Query keys por módulo y período.
- Optimistic UI únicamente en operaciones reversibles y con rollback.
- React local state para formularios y modales.
- Zustand solo si aparece estado transversal no derivable de URL o queries.
- No duplicar datos de API en un store global.
- Cache corto para dashboard y listas; invalidación dirigida tras mutations.
- Sin cache HTTP compartida para datos financieros privados salvo diseño explícito.

## H.13. Realtime

No se incluye en V2 inicial.

Se evaluará cuando existan usuarios conectados y sea necesario reflejar cambios visibles entre cuentas en segundos. Hasta entonces:

- invalidación de TanStack Query;
- refetch por foco/reconexión;
- polling puntual en pantallas colaborativas si fuera necesario.

## H.14. Background jobs

Inicialmente:

- outbox de notificaciones;
- worker/cron para envío y retry;
- limpieza segura de idempotency keys expiradas;
- recordatorios de vencimiento.

No se requiere una plataforma de jobs adicional mientras Vercel Cron y una tabla outbox cubran el volumen.

## H.15. Estrategia de migración

### Enfoque strangler

1. Corregir seguridad crítica de V1.
2. Crear schema y tablas V2 en paralelo.
3. Mantener V1 funcional.
4. Migrar usuarios, contactos y tarjetas.
5. Convertir gastos en series mensuales.
6. Convertir summaries en occurrences.
7. Convertir relaciones compartidas en allocations iguales con snapshots mensuales, preservando el comportamiento vigente y sin crear deudas.
8. Convertir consumos en purchases/installments.
9. Importar resúmenes antiguos como `LEGACY_ACCEPTED`.
10. Representar saldos agregados históricos como un ajuste legacy por moneda.
11. Comparar totales V1/V2 por mes y moneda.
12. Activar V2 por usuario mediante feature flag.
13. Mantener rollback de lectura durante un período.
14. Retirar V1 financiera; Invoice permanece separada.

### Limitaciones de migración

Los datos viejos no permiten reconstruir:

- líneas reales de statements;
- matches históricos;
- porcentajes diferentes de partes iguales;
- fechas reales de compra/posted;
- pagos parciales históricos de Deudas, porque ese módulo todavía no existe;
- descripciones individuales de saldos a favor agregados.

Estas limitaciones deben marcarse explícitamente. No debe inventarse historia.

## H.16. Roadmap

### Fase 0 — Seguridad

- Rotar secretos y credenciales.
- Diseñar recifrado de descripciones.
- Actualizar Next.js a una versión parcheada.
- Cerrar IDOR en todas las acciones.
- Reemplazar `prisma db push` en producción.
- Agregar audit y logging básico.

### Fase 1 — Characterization y métricas

- Tests sobre comportamiento útil de V1.
- Baseline de queries, p50/p95 y bundle.
- Export y backup de datos.
- Matriz de migración.
- Fixtures anonimizados representativos.

### Fase 2 — Fundación V2

- Monorepo.
- Auth compartida.
- Contratos API.
- Money, dates, idempotency y autorización.
- Nuevo schema.
- CI con unit, integration y migration tests.

### Fase 3 — Gastos mensuales

- Series mensuales y bimestrales con mes de anclaje.
- Ocurrencias automáticas.
- Marcación de pago con fecha, canal y reversión auditable.
- Pago anual y coberturas mensuales visibles.
- Nuevo dashboard mensual.

### Fase 4 — Compartidos informativos y Deudas independientes

- Contacts; connections solo si se confirman como requisito.
- Allocations versionadas.
- Proyecciones por persona, período y moneda sin estados de deuda.
- `PersonalDebt` y pagos parciales, sin integración automática con Gastos o Tarjetas; ajustes solo si se confirman como requisito.

### Fase 5 — Tarjetas

- Compras y cuotas.
- Cargos recurrentes esperados.
- Statements y líneas reales.
- Conciliación.
- Ajustes, cargos desconocidos y cargos trasladados.

### Fase 6 — Migración y cutover

- Backfill.
- Comparación V1/V2.
- Feature flag.
- Rollback.
- Retiro de V1 financiera.

### Fase 7 — Expo

- Aplicación móvil sobre el mismo API client.
- Secure storage para sesión.
- Cache offline.
- Retry idempotente.
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

Adoptar la **Opción 1**:

```text
Next.js Active LTS como web y host de API
REST /api/v1 con Route Handlers
Supabase PostgreSQL + Supabase Auth
Prisma estable actualizado
TanStack Query
Zod compartido
Expo futuro sobre el mismo API client
```

Construir V2 mediante migración strangler, comenzando por seguridad y caracterización de V1. El dominio queda dividido en gastos mensuales, tarjetas conciliables, repartos informativos y Deudas manuales independientes. La UI puede unificar la creación y la lectura mensual, pero la base de datos debe conservar agregados especializados. Las decisiones pendientes más importantes son cuándo proyectar cada cuota compartida, cómo distribuir ajustes del statement y cuál es el alcance exacto del módulo Deudas.
