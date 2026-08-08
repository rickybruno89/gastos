# Assessment de GastApp V2

- **Fecha:** 8 de agosto de 2026
- **Estado:** Assessment — sin implementación
- **Alcance:** sistema financiero actual y propuesta conceptual para V2
- **Fuera de alcance:** **Invoice**. No debe rediseñarse, migrarse ni incorporarse al dominio financiero de V2. Solo se mencionan dependencias técnicas compartidas cuando afectan al resto de la aplicación.

> Este documento describe el sistema actual, sus riesgos y una propuesta de evolución. No autoriza ni incluye cambios de código, dependencias, schema, datos o infraestructura.

## Diagnóstico ejecutivo

La aplicación actual resuelve una necesidad real y valiosa: organizar obligaciones mensuales y resúmenes de tarjeta. La vista mensual, la separación entre definición de gasto y ocurrencia mensual, y el registro de cuotas son buenas bases conceptuales.

V2 no debería construirse ampliando indefinidamente el schema actual. Existen problemas estructurales:

- Falta autorización por propietario en varias operaciones.
- El historial de Git contiene archivos `.env` con credenciales.
- El modelo no representa cuentas a cobrar, porcentajes, conexiones entre usuarios, deudas ni conciliación real.
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
- pagos o cobros entre participantes;
- estado de deuda;
- acreedor y deudor explícitos;
- snapshots históricos de participantes;
- usuarios conectados;
- aceptación o disputa del gasto.

El “balance” compartido es una proyección visual calculada al renderizar, no una entidad financiera persistida.

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

| Categoría | Severidad | Hallazgo principal |
|---|---:|---|
| Architecture | High | Dominio, persistencia, auth, cache y navegación conviven en Server Actions. |
| Performance | High | Consultas secuenciales, auth repetida, `noStore` generalizado y esperas artificiales. |
| Domain model | Critical | No hay payable/receivable, claims, deudas, porcentajes ni conciliación real. |
| Database | High | `Float` para dinero, fechas `String`, pocos índices y snapshots incompletos. |
| Business logic | Critical | Pago anual, cuotas, undo y edición de consumos pueden quedar inconsistentes. |
| UI | Medium | Pantallas monolíticas, montos ambiguos y acciones ocultas detrás de swipe. |
| UX | High | Esperas artificiales, recargas completas, undo inconsistente y errores poco visibles. |
| Developer experience | High | Sin tests, README genérico, documentación divergente y build peligroso. |
| Security | Critical | IDOR entre usuarios, secrets en Git y Next.js vulnerable/desactualizado. |
| Scalability | Medium | Consultas sin índices compuestos, N+1 de escritura y ausencia de idempotencia general. |
| Mobile readiness | High | No hay API, contratos ni auth móvil; el dominio depende de Next.js. |

## B.2. Architecture — High

- Los archivos `services/*` funcionan simultáneamente como API, aplicación, dominio y persistencia.
- La lógica de negocio usa directamente `revalidatePath`, `redirect`, `FormData`, NextAuth y Prisma.
- Parte de las reglas vive en componentes cliente, especialmente compartidos y totales.
- No existen contratos API estables.
- Tipos Prisma atraviesan la UI y las Server Actions.
- Los errores de infraestructura se convierten mayormente en mensajes genéricos.
- No hay límites claros entre obligaciones, tarjetas, statements, compartidos y deudas.

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
- No existe `PAYABLE`/`RECEIVABLE`.
- No hay contraparte, acreedor ni deudor explícitos.
- `paid: boolean` no representa pagos parciales, adelantos, reversos o múltiples pagos.
- “Omitido” se representa como pagado con monto cero.
- Pago anual no modela cobertura.
- Compartidos son etiquetas many-to-many, no allocations.
- Deudas manuales no existen.
- Deudas derivadas no existen como entidad o proyección consistente.
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
- Compartidos → allocations con porcentajes y claims.
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

| Necesidad | Estado actual |
|---|---|
| Mensual, bimestral, trimestral, anual | Solo mensual + flag anual especial |
| PAYABLE / RECEIVABLE | Solo gastos/pagos |
| Porcentajes personalizados | Solo división igual en UI |
| Validación total 100% | No existe |
| Personas manuales | Parcial |
| Usuarios conectados | No existe |
| Gasto visible para participante | No existe |
| Creador, pagador y responsable | Solo propietario implícito |
| Balance y cobro de compartidos | No existe |
| Deuda manual | No existe |
| Deuda derivada sin duplicar | No existe |
| Pagos parciales | No existe |
| Statement con líneas reales | No existe |
| Match esperado vs. real | No existe |
| Cargo desconocido | No existe |
| Cargo esperado ausente | No existe |
| Movimiento trasladado de cierre | No está modelado |
| Fecha de compra/posted/closing | Solo mes esperado y mes de resumen |
| N créditos con descripción | Un agregado por moneda |
| ARS/USD sin conversión | Parcial; hay sumas incorrectas |
| Idempotencia general | Solo parcial al pagar tarjeta |
| Concurrencia/versionado | No existe |
| Audit trail | No existe |
| Undo consistente | Parcial e incorrecto |
| Pagos adelantados/coberturas | Workaround anual |
| Personas archivadas sin romper historia | Incompleto |
| Desconexión de usuarios | No existe |
| Cancelación/reversión de cuotas | No existe de forma consistente |

---

# E. Preguntas necesarias antes del diseño definitivo

Cada pregunta incluye una recomendación inicial y por qué afecta el diseño.

1. **¿Cuándo nace una deuda derivada de un gasto compartido?**  
   Recomendación: mostrarla como `PLANNED` al crear la ocurrencia y volverla `OPEN` cuando el propietario paga o el statement se confirma. Define cuándo entra al balance exigible.

2. **¿El porcentaje debe incluir siempre al creador?**  
   Recomendación: todas las allocations, incluido el propietario, deben sumar 10.000 basis points = 100%. Evita porcentajes implícitos.

3. **¿Quién puede editar un gasto compartido entre usuarios?**  
   Recomendación: solo el creador edita estructura y monto; participantes pueden aceptar, disputar y registrar su pago. Evita conflictos de propiedad.

4. **¿Qué ve el usuario invitado?**  
   Recomendación: únicamente el gasto compartido, su porcentaje y su deuda; nunca el mes financiero completo del creador. Define privacidad y autorización.

5. **¿Un participante debe aceptar antes de que el gasto afecte su balance?**  
   Recomendación: mostrar inmediatamente como “pendiente de aceptación”, sin sumarlo al balance confirmado hasta aceptar.

6. **¿Los pagos y cobros pueden ser parciales?**  
   Recomendación: sí, mediante múltiples movimientos con fecha, importe, moneda, canal y nota.

7. **¿Las deudas manuales necesitan intereses o actualización?**  
   Recomendación: no incluir intereses en V2 inicial; solo principal, vencimiento y pagos parciales.

8. **¿Puede cancelarse una deuda sin pagarla?**  
   Recomendación: estados `WAIVED` y `CANCELLED`, siempre con motivo y audit log.

9. **¿Pago anual significa cambiar definitivamente la recurrencia o cubrir temporalmente meses mensuales?**  
   Recomendación: soportar ambos: plan anual y pago con período de cobertura.

10. **¿Qué ocurre con un vencimiento día 31 en un mes corto?**  
    Recomendación: usar el último día válido del mes.

11. **¿La conciliación inicial será manual, CSV o PDF?**  
    Recomendación: entrada manual y CSV configurable en V2; PDF automático después, porque los formatos bancarios son inestables.

12. **¿Un cargo real puede dividirse entre dos compras esperadas o viceversa?**  
    Recomendación: match 1:1 inicialmente y una acción manual de “dividir/combinar” como excepción.

13. **¿Cómo se pagan consumos USD?**  
    Recomendación: conservar USD y ARS separados; cualquier conversión debe ser un movimiento explícito con tipo de cambio informado.

14. **¿Se pueden compensar deudas ARS contra USD?**  
    Recomendación: no automáticamente.

15. **¿Qué canales de notificación se requieren?**  
    Recomendación: modelar preferencias por canal, implementar email primero y dejar push preparado para Expo.

16. **¿Google seguirá siendo el único proveedor de identidad?**  
    Recomendación: Google inicialmente, usando una solución que permita agregar Apple para iOS sin cambiar IDs de usuario.

17. **¿Debe conservarse todo el histórico actual?**  
    Recomendación: migrarlo completo y marcar statements antiguos como `LEGACY_ACCEPTED`, porque no contienen líneas reales reconciliables.

18. **¿La descripción debe seguir cifrada a nivel aplicación?**  
    Recomendación: cifrado administrado del proveedor y controles estrictos, salvo que un threat model exija cifrado por campo. El esquema actual cifra solo una parte de los datos y dificulta búsqueda y rotación.

19. **¿Cuándo se considera “pagada” una tarjeta: pago total, parcial o pago mínimo?**  
    Recomendación: registrar pagos reales contra el statement y derivar `UNPAID`, `PARTIALLY_PAID` o `PAID` según los montos por moneda.

20. **¿Los participantes pueden modificar porcentajes después de existir pagos?**  
    Recomendación: cambios futuros crean una nueva versión de allocations; las ocurrencias históricas permanecen inmutables.

---

# F. Sugerencias de producto

## F.1. Dashboard mensual

Orden recomendado:

1. Alertas: vencidos, vence hoy, cargos desconocidos y statements sin conciliar.
2. Resumen por moneda: a pagar, a cobrar y saldo, sin mezclar monedas.
3. A pagar.
4. A cobrar.
5. Tarjetas y estado de conciliación.
6. Compartidos y deudas agrupados por persona y moneda.
7. Completados, colapsados por defecto.

## F.2. Acciones inline

- Marcar pagado o cobrado.
- Registrar pago parcial.
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
- Conectar usuarios.
- Reestructurar una deuda.

## F.4. Automatizaciones

- Materializar ocurrencias al consultar un mes mediante upsert idempotente.
- Sugerir matches entre líneas reales y cargos esperados.
- Detectar duplicados por tarjeta, importe, moneda, comercio y fecha.
- Arrastrar cargos esperados ausentes al siguiente statement sin cambiar su fecha real.
- Generar claims de cada cuota compartida.
- Enviar recordatorios configurables.
- Mostrar “cubierto por pago anual” sin crear deudas cero ficticias.

## F.5. Features a agregar

- Quick add/inbox.
- Pagos parciales.
- Timeline y auditoría.
- Conexiones e invitaciones.
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

## F.7. Realtime y background jobs

Realtime no aporta suficiente valor inicialmente. TanStack Query con invalidación y refetch es suficiente. Puede incorporarse cuando dos usuarios editen, acepten o paguen compartidos simultáneamente.

Los background jobs iniciales deberían limitarse a:

- notificaciones mediante outbox;
- retries de email;
- mantenimiento de proyecciones si se demuestra necesario.

La generación de ocurrencias puede ser on-demand e idempotente, sin depender de un cron mensual.

---

# G. Stack options

## G.1. Comparación

| | Opción 1 — Recomendada | Opción 2 | Opción 3 |
|---|---|---|---|
| Web | Next.js Active LTS | React Router 7 + Vite | Next.js o Expo Web |
| API | REST `/api/v1` con Route Handlers | Hono API independiente | Supabase Data API/RPC |
| Database | Supabase PostgreSQL | Supabase/Neon PostgreSQL | Supabase PostgreSQL |
| ORM/data layer | Prisma estable actualizado | Drizzle | SQL/RPC directo |
| Auth | Supabase Auth | Supabase Auth | Supabase Auth |
| State | React local; Zustand solo si aparece necesidad | Igual | Igual |
| Cache/data fetching | TanStack Query | TanStack Query | TanStack Query |
| Hosting | Un proyecto Vercel | Dos servicios/proyectos | Vercel + Supabase |
| Mobile | Expo + mismo API client | Expo + mismo API client | Expo + Supabase directo |
| Complejidad | Baja-media | Media | Baja al inicio, alta en dominio |
| Performance | Muy buena si se agrupan queries | Excelente y controlable | Buena, dependiente de RLS/RPC |
| Costo inicial | $0 personal; producción baja | $0–bajo | $0–bajo |
| Principal desventaja | Next.js sigue presente como host/adaptador | Más infraestructura y CORS | Lógica fragmentada en DB/clientes |

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

Esta propuesta es provisional hasta resolver las preguntas de producto de la sección E.

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
obligations
recurrence
payments
sharing-and-allocations
claims-and-debts
credit-cards
statements-and-reconciliation
notifications
monthly-dashboard
audit
```

## H.4. Obligaciones recurrentes

Entidades:

```text
ObligationSeries
RecurrenceRule
ObligationOccurrence
OccurrenceAllocation
ObligationPayment
CoveragePeriod
```

Reglas:

- `direction`: `PAYABLE` o `RECEIVABLE`.
- Recurrencia inicial mediante `intervalMonths`: 1, 2, 3, 12.
- Fecha inicial, fecha final opcional y regla de vencimiento.
- Ocurrencias con snapshot de monto, moneda, participantes y porcentajes.
- Estados: `PLANNED`, `DUE`, `PARTIALLY_PAID`, `PAID`, `COVERED`, `SKIPPED`, `CANCELLED`.
- Pagos como registros, no booleanos.
- Cobertura anual como rango explícito.
- Generación on-demand mediante upsert único `[seriesId, accountingPeriod]`.

## H.5. Compartidos y allocations

Cada allocation debe guardar:

- usuario conectado o contacto manual;
- `shareBps`, donde 10.000 = 100%;
- importe calculado en unidades menores;
- nombre snapshot;
- estado de aceptación;
- versión de la distribución.

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
- Desconectar usuarios no elimina claims o allocations históricos.

## H.7. Claims y deudas

```text
Claim
ClaimSettlement
```

Un `Claim` representa que una contraparte debe dinero a otra.

- `sourceType`: `MANUAL_DEBT`, `SHARED_OBLIGATION`, `CARD_INSTALLMENT`.
- `sourceId` único para impedir duplicación.
- Dirección desde la perspectiva del usuario.
- Importe, moneda, vencimiento y estado.
- Estados: `PLANNED`, `OPEN`, `PARTIALLY_SETTLED`, `SETTLED`, `WAIVED`, `CANCELLED`, `DISPUTED`.
- Pagos parciales mediante `ClaimSettlement`.

De esta manera una deuda manual y una derivada comparten comportamiento sin persistir balances duplicados.

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

POST   /api/v1/obligation-series
PATCH  /api/v1/obligation-series/:id
POST   /api/v1/occurrences/:id/payments
POST   /api/v1/occurrences/:id/skip

POST   /api/v1/connections
POST   /api/v1/connections/:id/accept
GET    /api/v1/contacts

POST   /api/v1/claims
POST   /api/v1/claims/:id/settlements

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

Se evaluará cuando existan usuarios conectados y sea necesario reflejar aceptación, disputa o pago en segundos. Hasta entonces:

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
7. Convertir relaciones compartidas en allocations iguales, preservando el comportamiento vigente.
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
- pagos parciales inexistentes;
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

### Fase 3 — Obligaciones mensuales

- Series y recurrencias.
- Payable/receivable.
- Ocurrencias automáticas.
- Pagos parciales.
- Coberturas.
- Nuevo dashboard mensual.

### Fase 4 — Compartidos y deudas

- Contacts y connections.
- Allocations versionadas.
- Claims y settlements.
- Invitaciones, aceptación y disputa.

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

Construir V2 mediante migración strangler, comenzando por seguridad y caracterización de V1. La decisión de dominio más importante todavía pendiente es cuándo nace y cuándo se vuelve exigible una deuda compartida; junto con aceptación y permisos entre usuarios, esa respuesta define el modelo final de allocations, claims y dashboard.
