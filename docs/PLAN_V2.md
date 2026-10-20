# GastApp V2: plan de producto, arquitectura y producción

Actualizado: **20/10/2026**. Estado: **fundación V2, Fase 1 (primer recorrido de gasto mensual), Fase 2 (gastos periódicos) y Fase 3 (compartidos) implementadas y validadas en local**; resto de módulos financieros y despliegue en el VPS pendientes. El login Google completo con una cuenta real requiere configurar las credenciales del cliente OAuth local.

Este es el documento único de referencia de GastApp V2. Reúne el assessment funcional, las decisiones de arquitectura y el procedimiento de VPS/Coolify adaptado de Auguri. Sustituye las guías dispersas de V1, Opción B, Vercel y las copias de documentación de Auguri que había en este repositorio.

## 1. Decisiones y estado real

| Tema                   | Decisión o estado                                                                                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Producto               | Obligaciones por período, tarjetas, repartos informativos y Deudas manuales independientes.                                                                                  |
| Stack confirmado       | React Router + Node/Express + Prisma + PostgreSQL, con autenticación Google.                                                                                                 |
| Construcción           | V2 desde cero, con schema y contratos propios; primera producción con base vacía.                                                                                            |
| Forma de trabajo       | Implementar y probar primero todo el alcance de la primera publicación en local; después desplegar el mismo código y migraciones en Coolify.                                 |
| Alojamiento confirmado | App y PostgreSQL en el VPS existente con Coolify, siguiendo la operación de Auguri.                                                                                          |
| Dominio de GastApp     | **`gastapp.ingbruno.ar`**, confirmado por el usuario.                                                                                                                        |
| Dominio raíz           | **`ingbruno.ar`**, reservado para una futura landing; contenido y tecnología por definir.                                                                                    |
| Staging propuesto      | `staging.gastapp.ingbruno.ar`, separado de producción.                                                                                                                       |
| Registro/delegación    | Pendientes según lo informado por el usuario; disponibilidad y titularidad no verificadas.                                                                                   |
| DNS propuesto          | Cloudflare en la misma cuenta de Auguri, pendiente de configurar.                                                                                                            |
| Presupuesto            | Reutilizar el VPS y servicios gratuitos, sin nuevas suscripciones. Registrar/renovar `ingbruno.ar` tiene un arancel propio de NIC Argentina; ver sección 7.3.                |
| Login                  | Better Auth 1.7.12 + Google implementados con Prisma. Inicio OAuth, sesiones y permisos probados; login real pendiente de credenciales locales.                              |
| Importación de V1      | Script posterior e independiente desde Supabase; fuera del camino de lanzamiento.                                                                                            |
| Estado del código      | Rama `v2`: fundación, auth, preferencias y “Mi mes” y “Compartidos” reales (periódicos, pagos, reparto, contactos y conexiones) sobre Postgres.app; pruebas e imagen Docker. |

V2 tiene libertad para definir tablas, IDs, API, sesiones y pantallas nuevos. No requiere convivencia, sincronización ni retrocompatibilidad con V1. Los datos del futuro importador se adaptarán al modelo de V2.

El VPS y los servicios de Auguri se toman como infraestructura existente según sus guías verificadas al 15/10/2026. La capacidad disponible, la IP vigente y la configuración actual del proxy se revisarán antes del despliegue de GastApp. La implementación y las pruebas de esta entrega se ejecutaron en local: base y contenedores propios de GastApp. No se accedió al VPS ni se cambiaron DNS, bases remotas o infraestructura de producción.

### Alcance

- Gastos regulares mensuales y bimestrales, pagos anuales con cobertura y vista por período.
- Tarjetas, compras en cuotas, cargos recurrentes, statements y conciliación manual.
- Repartos con contactos manuales **sin cuenta**, y conexiones opcionales con usuarios reales.
- Deudas manuales con principal, pagos parciales y estados propios.
- Notificaciones por email; PDF/IA y Expo en fases posteriores.

Fuera de alcance: gastos diarios, caja, contabilidad bancaria general, conversión FX automática y el módulo Invoice. La landing del dominio raíz se resolverá como un trabajo separado.

## 2. Arquitectura confirmada

```text
Navegador: https://gastapp.ingbruno.ar
        │ HTTPS
        ▼
Traefik compartido, administrado por Coolify
        │
        ▼
Contenedor GastApp: Node/Express
        ├── /               React Router SPA compilada
        ├── /api/v2/*       API REST de producto
        ├── /api/auth/*     Google y sesiones (prefijo previsto)
        └── /healthz        comprobación de salud
                │ Prisma / transacciones
                ▼
        PostgreSQL privado de GastApp
                + autorización + RLS

PDF opcional → volumen privado persistente de GastApp
Trabajos durables → worker de la misma imagen + PostgreSQL
Expo futuro → misma API REST, UI React Native propia

https://ingbruno.ar → futura landing, recurso y contenido separados
```

Web y API comparten origen y despliegue inicialmente. Express sirve el frontend y su fallback SPA. Las rutas API, auth y healthcheck se resuelven antes del fallback: una API desconocida devuelve un error HTTP, no HTML. El almacenamiento privado no se publica como archivos estáticos.

La aplicación autenticada no requiere SSR en ejecución. React Router organiza las pantallas; las reglas financieras y permisos viven en casos de uso del backend. Prisma queda detrás de repositorios y sus tipos no atraviesan los contratos HTTP.

### Versiones y dependencias

Versiones fijadas en el lockfile de la fundación: Node 24, React Router 7.18.4, React 19.2.6, Express 5.3.0, Prisma 7.10.1, PostgreSQL 18, Vite 8.3.4 y Better Auth 1.7.12. Se verificaron tipos, lint, formato, pruebas y build; las dependencias se ajustaron para resolver los avisos de seguridad detectados. Las futuras actualizaciones se revisarán antes de adoptarlas.

Se conserva la propuesta de TypeScript, Vite, TanStack Query, React Hook Form y Zod. Hono, Drizzle y servicios Supabase quedan fuera del stack destino. La futura landing puede elegir su propia tecnología.

### Estructura conceptual del código

```text
app/                    # React Router, pantallas y componentes React
server/
  index.ts              # Express, API, estáticos y fallback SPA
  routes/
  middleware/
  auth/
  application/
  domain/
  persistence/          # Prisma y repositorios
  jobs/
shared/
  contracts/            # DTOs y schemas Zod serializables
  api-client/           # cliente HTTP sin dependencias DOM
prisma/
  schema.prisma
  migrations/           # SQL versionado, políticas y constraints
tests/
Dockerfile
```

No se necesitan workspaces para comenzar. Cuando Expo introduzca otro consumidor, contratos y utilidades podrán extraerse sin cambiar la API. Cada operación financiera autentica, autoriza, valida, ejecuta el caso de uso y persiste en una transacción cuando modifica varias entidades.

## 3. Reglas de producto confirmadas

Estas reglas se conservan del assessment. Los mecanismos técnicos se adaptan al stack confirmado. Las referencias a histórico legacy se aplican solo cuando se aborde la importación futura, sin convertirla en requisito de publicación.

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
33. **V2 elimina el cifrado por campo de descripciones.** La protección en reposo y de backups se define para el VPS, junto con autorización correcta, RLS y controles de acceso.
34. **Los vencimientos 29, 30 o 31 usan el último día válido del mes corto.** Nunca se desplazan accidentalmente al mes siguiente.
35. **Las notificaciones comienzan por email.** Push se agrega con Expo y las preferencias se configuran por canal y tipo de vencimiento.
36. **Google es el único proveedor de identidad previsto.** El backend de V2 resuelve autenticación y sesiones, con IDs internos estables propios de la nueva aplicación.
37. **El pago anual compartido se proyecta una sola vez.** La parte de la otra persona aparece en el mes del desembolso anual; los meses cubiertos posteriores siguen visibles, pero no generan nuevos importes compartidos.

### Las dos modalidades de compartidos

| Modalidad         | Qué requiere la contraparte                                | Qué ve el propietario                                  | Qué ve la contraparte                                            |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Contacto manual   | Solo un nickname; no necesita cuenta, email ni aceptación. | Cuánto corresponde a esa persona por período y moneda. | Nada: el contacto es privado del propietario.                    |
| Usuario conectado | Cuenta Google/GastApp y conexión aceptada.                 | Su perspectiva del reparto y los saldos derivados.     | El detalle compartido autorizado y su participación, en lectura. |

Un gasto de ARS 100.000 repartido al 50% permite al propietario ver “Juan me debe ARS 50.000” incluso si Juan nunca se registra. Una invitación pendiente o rechazada no bloquea ese registro privado. Con una conexión aceptada, Juan ve además “Debo ARS 50.000 a Ricky” desde su cuenta, consultando el mismo origen financiero.

Los repartos no se convierten en `PersonalDebt`, ni admiten pagos parciales propios. Marcar pagado al proveedor o al banco no registra un cobro de la parte de Juan.

## 4. Modelo de dominio y contratos

Las entidades siguientes son conceptuales; el schema físico se diseñará desde cero al implementar. Mantienen separados plantilla, ocurrencia, cuota, statement, pago, reparto y deuda.

### 4.1. Gastos mensuales y bimestrales

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
- Estados: PLANNED, DUE, PAID, COVERED, SKIPPED y CANCELLED. Se persisten `PLANNED`, `PAID`, `COVERED`, `SKIPPED` y `CANCELLED`; “vencido” y `DUE` se derivan de `dueDate` y la fecha del usuario, sin job. `SKIPPED` (omitir el mes) y `CANCELLED` (baja de la serie desde ese mes) exigen motivo y se revierten con “Restaurar” o “Reactivar”.
- Marcar pagado crea ExpensePayment con fecha y canal; no existe pago parcial de este agregado. Fase 1: fecha de hoy en la zona del usuario y canal opcional (sin canal predeterminado configurable todavía). Deshacer marca el pago como revertido y lo conserva para auditoría.
- Importe y día de vencimiento viven en versiones de condiciones (`MonthlyExpenseTerms`) con vigencia desde un período; “este mes y futuros” crea o actualiza la versión del período, ajusta las posteriores y las ocurrencias futuras no pagadas ya materializadas.
- Una ocurrencia pagada es inmutable. Para corregirla se deshace el pago, se edita y se vuelve a pagar.
- Un pago anual crea CoveragePeriod sin cambiar la recurrencia mensual subyacente.
- Los meses cubiertos continúan visibles como “Pagado anual”, con estado COVERED y payableAmountMinor igual a cero.
- El importe nominal puede conservarse para contexto, pero nunca se suma al total pendiente.
- Si el pago anual es compartido, la allocation se proyecta una sola vez en el mes del desembolso anual (pendiente de Fase 3).
- Implementado en Fase 2: el pago anual se registra sobre un mes pendiente indicando cuántos meses cubre (2 a 24) y el total pagado. Ese mes queda `PAID` con un ExpensePayment por el total y un CoveragePeriod; los meses siguientes del rango, materializados o no, quedan `COVERED`. Se rechaza si se superpone con otra cobertura, si hay meses del rango pagados/omitidos/de baja o si supera la baja de la serie. Deshacer el pago del mes anual revierte la cobertura y devuelve los meses cubiertos a pendiente.
- Dar de baja guarda `endPeriod` en la serie: ese mes queda `CANCELLED` y los posteriores dejan de generarse y mostrarse. Se rechaza si hay meses posteriores pagados o cubiertos. Reactivar limpia `endPeriod`.
- El total pagado del mes suma lo desembolsado (un pago anual cuenta completo en su mes); omitidos, de baja y cubiertos no suman al pendiente.

### 4.2. Compartidos, allocations y saldos derivados

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

SharedBalanceProjection agrupa por contraparte y moneda: un contacto manual permite al propietario consultar cuánto le corresponde a esa persona sin que tenga cuenta; una conexión aceptada permite además mostrar las perspectivas de ambos usuarios. Es una query/read model derivado de allocations, no un saldo editable ni una PersonalDebt persistida. Cada asignación se cuenta una sola vez. Los cambios no reescriben períodos pagados; un mes pagado se corrige únicamente deshaciendo primero su pago.

Los impuestos, percepciones, intereses, descuentos globales, saldo a favor y otros conceptos generales del statement no participan en allocations. GastApp distribuye exclusivamente los consumos cargados.

### 4.3. Contactos y usuarios conectados

Entidades conceptuales:

```text
Contact
ConnectionInvitation
UserConnection
```

- Contact pertenece a un usuario, requiere nickname y puede archivarse.
- El email es opcional y permite iniciar la vinculación con una cuenta GastApp.
- Compartir con un contacto manual funciona con solo su nickname: no requiere cuenta, email, invitación ni aceptación de la contraparte, y su importe se consulta privadamente desde la cuenta del propietario.
- Cada propietario conserva su nickname privado aunque el contacto quede vinculado.
- UserConnection usa PENDING, ACCEPTED, REJECTED y BLOCKED.
- Una allocation referencia un contacto manual o una conexión aceptada, nunca ambos.
- La aceptación es necesaria para habilitar acceso entre cuentas; una invitación pendiente o rechazada no bloquea el registro privado de repartos con el contacto manual.
- El creador del gasto es el único editor; el usuario conectado ve el gasto compartido y su porcentaje en modo lectura.
- La contraparte no obtiene acceso al mes financiero completo, tarjetas o gastos no compartidos del creador.
- Desconectar o bloquear no borra snapshots ni saldos históricos.

Las conexiones forman parte del alcance V2, no son una mejora opcional posterior.

**Implementado en Fase 3:**

- El reparto vive en la versión de condiciones (`MonthlyExpenseTermsShare` por `MonthlyExpenseTerms`), con la misma vigencia por período que importe y vencimiento. “Cambiar reparto” aplica a este mes y a los siguientes no pagados.
- Cada ocurrencia pendiente o pagada que reparte tiene su snapshot `OccurrenceAllocation`: fila del propietario (`contactId` nulo) y una por contacto, con porcentaje, importe calculado con `allocateMoney`, base, moneda, nombre del gasto y período. Un trigger por sentencia exige que sumen 10.000 bps; otro impide modificar el snapshot de un mes pagado. Omitidos, de baja y cubiertos no tienen snapshot; el pago anual lo calcula una sola vez sobre el total.
- La allocation siempre referencia al contacto del propietario (su apodo privado); si el contacto está vinculado, guarda además la conexión. Así una sola fila sirve al propietario y, en lectura, a la contraparte. Esto sustituye la regla conceptual “contacto o conexión, nunca ambos”.
- Invitación: el propietario agrega el email al contacto e invita. El destinatario ve la invitación al ingresar con ese email verificado por Google (sin envío de correo hasta la Fase 6 ni enlace con token todavía). Vence a los 30 días. Al aceptar, el destinatario obtiene su propio contacto con el nombre del invitador, y ambos pueden compartir en las dos direcciones.
- Desconectar (cualquiera de los dos) deja la conexión `BLOCKED`: la contraparte deja de ver; los snapshots y saldos propios se conservan. Se puede volver a invitar.
- RLS: la contraparte solo lee sus propias filas de allocation, con conexión aceptada y período desde la aceptación. No accede a ocurrencias, series, contactos ni a otros participantes. La invitación pendiente es visible para el email invitado mediante `gastapp.user_email`, fijado solo con email verificado.

La identidad Google se asocia a una cuenta `User` propia de GastApp mediante el identificador estable del proveedor; el email no es la clave de las relaciones financieras. Las invitaciones identifican al destinatario y requieren aceptación autenticada antes de conceder visibilidad compartida. Si todavía no tiene cuenta, puede registrarse con Google y luego aceptar; no se crean usuarios ficticios a partir de contactos.

Las dos cuentas consultan un mismo origen y sus asignaciones, con permisos específicos y sin duplicar el gasto como dos registros financieros independientes. La respuesta a la contraparte incluye solo el detalle autorizado, evitando exponer el statement, otras tarjetas o participantes privados. El alcance histórico al vincular un contacto manual se concretará antes de implementar esa transición. La propuesta de autenticación se detalla en [Identidad y acceso](#5-identidad-y-acceso).

### 4.4. Deudas manuales independientes

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

### 4.5. Tarjetas y conciliación manual

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

### 4.6. Statement PDF e IA opcional

La acción “Subir PDF” asiste al flujo manual, pero nunca lo reemplaza:

```text
Usuario sube PDF
        ↓
GastApp Express API
        ↓
volumen privado persistente en el VPS, accesible mediante la API
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
  parse(input: StatementDocument): Promise<ParsedStatement>;
}
```

La abstracción impide acoplar dominio o API a OpenAI, Anthropic, Gemini u otro proveedor. Las keys viven únicamente como secretos del backend en Coolify.

La salida no es confiable hasta superar:

- validación estructural;
- validación de moneda, totales y fechas;
- límites de cantidad e importes;
- detección de líneas duplicadas;
- asociación al statement y usuario correctos.

La IA puede proponer líneas, matches, diferencias, cargos desconocidos y cargos esperados ausentes. No puede crear CardPayment, finalizar conciliación ni modificar importes sin confirmación explícita.

El documento debe guardarse en almacenamiento privado persistente, con autorización de acceso y política de retención. La API registra hash, estado de análisis, proveedor/version, errores y auditoría sin tratar la salida del modelo como fuente de verdad.

### 4.7. Dinero, monedas, fechas y períodos

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

### 4.8. Límites de API

Endpoints conceptuales:

```text
GET    /api/v2/months/:period

GET    /api/v2/expenses
POST   /api/v2/expenses
PATCH  /api/v2/expenses/:id
POST   /api/v2/occurrences/:id/payments
POST   /api/v2/occurrences/:id/undo-payment
POST   /api/v2/occurrences/:id/annual-payments
POST   /api/v2/occurrences/:id/skip
POST   /api/v2/occurrences/:id/cancel
POST   /api/v2/occurrences/:id/restore

GET    /api/v2/cards
POST   /api/v2/cards
POST   /api/v2/cards/:id/purchases

GET    /api/v2/statements/:id
POST   /api/v2/statements/:id/reconcile
POST   /api/v2/statements/:id/payments
POST   /api/v2/statements/:id/pdf-analysis

GET    /api/v2/shared-balances

GET    /api/v2/debts
POST   /api/v2/debts
POST   /api/v2/debts/:id/payments
POST   /api/v2/debts/:id/cancel

GET    /api/v2/contacts
POST   /api/v2/contacts
PATCH  /api/v2/contacts/:id
POST   /api/v2/contacts/:id/invitation
GET    /api/v2/invitations
POST   /api/v2/invitations/:id/accept
POST   /api/v2/invitations/:id/reject
POST   /api/v2/connections/:id/disconnect
GET    /api/v2/shared/:period          # implementado como saldos por período
PUT    /api/v2/occurrences/:id/shares
```

Los nombres pueden refinarse sin romper el límite: todas las operaciones de producto pasan por la GastApp API. El flujo de Google se integra mediante la librería de autenticación elegida; las tablas y el ORM no son contratos públicos.

Toda mutation financiera incluye:

- Idempotency-Key;
- versión para optimistic concurrency;
- transacción atómica mediante Prisma;
- usuario/tenant derivado exclusivamente de la identidad autenticada por el backend;
- autorización de recurso;
- audit log;
- error estructurado;
- validación de contrato y dominio.

Los DTO son contratos propios; ningún tipo de tabla o librería de persistencia atraviesa la API.

## 5. Identidad y acceso

Se implementó Better Auth para manejar Google y sesiones, con integración Express y adaptador Prisma. Corre dentro del contenedor de GastApp y usa PostgreSQL. La fundación separa los roles de autenticación y aplicación, y tiene una primera tabla de preferencias protegida con RLS. Contactos, conexiones y gastos compartidos se implementarán en sus fases según las reglas de este plan.

| Entidad                | Responsabilidad                                                             |
| ---------------------- | --------------------------------------------------------------------------- |
| `User`                 | Cuenta de GastApp con identificador interno estable.                        |
| `Account`              | Identidad Google vinculada mediante el identificador estable del proveedor. |
| `Session`              | Sesión persistida que permite resolver el usuario autenticado.              |
| `Contact`              | Nickname privado y email opcional para repartir sin cuenta real.            |
| `ConnectionInvitation` | Invitación al destinatario; no concede acceso por sí sola.                  |
| `UserConnection`       | Relación aceptada entre usuarios para visibilidad compartida.               |

El email se usa para contacto e invitaciones; la identidad no depende de que permanezca igual. Google valida quién ingresa y GastApp decide qué datos puede leer o modificar.

Para conectar cuentas, el destinatario inicia sesión y acepta. Si todavía no tiene cuenta, puede crearla con Google y aceptar después. Las invitaciones por enlace se validan en servidor, vencen y se consumen una sola vez. Al asignar una conexión a un gasto se comprueba que pertenece al propietario y está aceptada. El creador sigue siendo el único editor.

No se publica automáticamente el historial al vincular un contacto. **Decisión de Fase 3 (a confirmar por el usuario):** la contraparte ve los repartos desde el período en que acepta la invitación; los meses anteriores siguen privados, incluidos los pagados. Es configurable cambiando la condición de período en la política RLS.

### 5.1. Login, sesiones y permisos

- Google es el único proveedor inicial. Better Auth está integrado con Express y Prisma. El cliente OAuth real se configura por entorno; no se habilitan contraseñas ni proveedores alternativos.
- La web usa sesiones persistidas en PostgreSQL y una cookie opaca HttpOnly, SameSite=Lax y limitada al host. Secure se activa en producción. La sesión dura siete días, se renueva como máximo una vez al día y se valida sin cache de cookie para respetar la revocación en la siguiente solicitud. Producción exige HTTPS y Google configurado.
- Las mutaciones financieras requieren protección CSRF y validación de origen, además de los controles del módulo de auth.
- El middleware obtiene la identidad autenticada y deriva `currentUserId`. Ningún endpoint acepta un `userId` enviado por el cliente como prueba de ownership.
- Cada caso de uso aplica autorización explícita, incluidas las lecturas compartidas con contrapartes conectadas.
- RLS permanece como defensa adicional. Los roles de ejecución no son superusuarios, propietarios de tablas ni tienen `BYPASSRLS`.
- Prisma establece el contexto de usuario con SQL parametrizado de alcance transaccional; todas las consultas de esa operación usan el mismo cliente transaccional. Sin contexto válido se deniega acceso y no se hereda identidad al reutilizar conexiones.
- Las credenciales de migración y tareas administrativas se separan de los permisos ordinarios de la aplicación. Las tablas de autenticación tienen permisos específicos según la librería elegida.
- Secretos OAuth, claves de sesión y claves de IA nunca se incluyen en los bundles del cliente.
- La protección en reposo y de backups se define para el VPS. V2 no hereda automáticamente las garantías de un proveedor administrado.
- La integración de sesiones con Expo se diseñará antes de implementar ese cliente, sin suponer que reutiliza la cookie del navegador.

La relación entre autorización de aplicación y RLS se prueba mediante la matriz propietario, contraparte conectada, tercero autenticado y anónimo. RLS no sustituye la autorización ni protege frente a un backend comprometido capaz de cambiar el contexto de usuario.

### 5.2. Estado, cache y sincronización

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
- Realtime no es requisito inicial; se incorpora únicamente si la experiencia o las métricas muestran necesidad.

React Router loaders pueden precargar shell o datos, pero llaman al mismo typed API client y no contienen reglas financieras.

### 5.3. Notificaciones y trabajos durables

El backend deberá cubrir, cuando se habiliten los módulos correspondientes:

- outbox de notificaciones, email y reintentos;
- recordatorios y pre-materialización mínima para avisos;
- limpieza de claves de idempotencia expiradas;
- reintento controlado de análisis PDF;
- mantenimiento de proyecciones solo si una query derivada deja de ser suficiente.

La materialización normal sigue siendo on-demand. Se propone un worker Node con la misma imagen de código, trabajos persistidos en PostgreSQL, exclusión de ejecuciones, reintentos e idempotencia. Frecuencia, concurrencia y permisos del worker se concretarán al implementar el primer módulo que lo necesite.

PDF tendrá límites explícitos de tamaño, páginas, tiempo, concurrencia y costo. Se medirán con archivos representativos en el VPS compartido antes de fijar sus parámetros operativos.

## 6. Experiencia de uso

### Sistema visual V2 y prototipo navegable

La V2 estrena identidad e interfaz desde cero. No se reutilizan el diseño, los layouts, la navegación ni los componentes visuales de V1. Las reglas funcionales de este documento siguen siendo la referencia.

**Dirección visual aceptada por el usuario:** una aplicación clara, cuidada y tranquila: superficies blancas sobre gris azulado, azul profundo como acento principal, jerarquía tipográfica Inter y cifras legibles. Sin estética bancaria recargada, gráficos decorativos ni indicadores que no ayuden a decidir qué pagar.

| Elemento      | Decisión                                                                                                                                                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color         | Fondo `#f5f7fb`, superficie blanca, texto `#1c2536`, acción principal `#3458dd`. Verde para pagos, ámbar para revisión y rojo para vencidos/errores, siempre acompañados de texto.                                                 |
| Tipografía    | Inter variable servida desde la app, sin peticiones a Google Fonts. Cifras monetarias alineadas y monedas explícitas.                                                                                                              |
| Componentes   | Componentes propios compartidos: Button, Badge, Modal, AppShell, tarjetas, filtros, formularios, avisos y estados vacíos. Radix Dialog para foco, teclado y semántica de modales; Lucide para iconos consistentes.                 |
| Navegación    | Mi mes, Tarjetas, Compartidos y Deudas como destinos principales. Cuenta como destino secundario. Sidebar en escritorio y barra inferior en móvil; sin trasladar una tabla ancha al teléfono.                                      |
| Jerarquía     | Período y creación visibles; primero lo pendiente, después lo resuelto; importes ARS y USD separados. Cada cifra debe indicar si es importe completo, parte propia o saldo compartido.                                             |
| Interacción   | Acciones claras en cada fila, filtros de estado y búsqueda; confirmación tras guardar, pagar o deshacer. Las acciones con consecuencias reales usan los contratos y reglas transaccionales del backend.                            |
| Formularios   | Labels visibles, errores cerca del campo, moneda explícita, entrada decimal y preservación de lo escrito al fallar. Recurrencia y reparto se revelan según la elección, sin un formulario inicial interminable.                    |
| Accesibilidad | Foco visible, navegación por teclado, textos además de color, avisos anunciados, targets cómodos y movimiento reducido. Los diálogos cierran con Escape y devuelven el foco. Verificar contraste y zoom al implementar cada flujo. |
| Estados       | Skeleton sin esperas artificiales; error con reintento; vacío con siguiente paso concreto. Nunca mostrar métricas ficticias como si fueran datos reales de la cuenta.                                                              |

**Implementado para revisar el diseño:** `/acceso`, `/cuenta` y la bienvenida autenticada usan la nueva identidad. `/vista-previa` es un prototipo público y aislado con datos ficticios identificados: mes, tarjetas, contactos manuales/usuarios conectados y deudas independientes. Permite buscar, filtrar, cambiar entre tres meses de ejemplo, marcar/deshacer pagos y crear un gasto personal temporal. No consulta datos financieros ni escribe en la base; al recargar se reinicia. Se ofrece desde el acceso para revisar la propuesta sin necesitar credenciales de Google.

El prototipo no sustituye los módulos de producto: faltan los flujos completos de recurrencias, reparto, pago anual, creación unificada mensual/tarjeta, conciliación, invitaciones y deudas conectados a la API. La pantalla mensual final debe incorporar las alertas y reglas detalladas abajo. Las cifras del prototipo son importes completos de gastos; los saldos compartidos se presentan aparte.

Las bases de los componentes están documentadas en [Radix Dialog](https://www.radix-ui.com/primitives/docs/components/dialog), [Lucide React](https://lucide.dev/guide/react) y [Fontsource Inter](https://fontsource.org/fonts/inter/use).

### Mobile first: iPhone como dispositivo principal

El usuario confirmó que GastApp se usa principalmente desde un iPhone. **Todos los nuevos recorridos se diseñan y verifican primero en móvil; escritorio amplía esa base.** La propuesta visual está aceptada, con esta prioridad de uso.

- Navegación inferior persistente y acciones táctiles de al menos 44 × 44 píxeles CSS; ninguna acción depende de hover, gestos ocultos o iconos sin nombre accesible.
- “Crear gasto” queda al alcance del pulgar aunque se recorra una lista larga, sin tapar el último elemento. Pagar ofrece deshacer en el aviso de confirmación.
- El mes abre en pendientes; pagados sigue disponible como filtro explícito. Resumen compacto con ARS y USD separados para llegar antes a los gastos, evitando una sucesión de tarjetas de escritorio apiladas.
- En móvil los gastos se leen como filas con nombre, importe, vencimiento y acción propia. La búsqueda se abre bajo demanda y conserva una entrada cómoda.
- Los formularios se abren desde abajo, con cierre explícito, scroll propio y botón de envío accesible. VisualViewport ajusta el panel al área visible cuando aparece el teclado; se preserva el zoom del usuario.
- Inputs y selects de 16 px o más, teclado decimal/numérico según el campo, labels visibles y errores legibles. No se bloquea el zoom de Safari.
- `viewport-fit=cover` y safe areas en cabecera, laterales y pie; se consideran indicador Home, barras del navegador y orientación horizontal.
- Revisar como mínimo 375 × 667, 390 × 844 y 430 × 932, horizontal y tamaños de texto aumentados. Probar interacción con WebKit y Chromium; la comprobación final del teclado y safe areas reales requiere Safari en un iPhone físico.

Referencias técnicas: [safe areas en WebKit](https://webkit.org/blog/7929/designing-websites-for-iphone-x/) y [VisualViewport](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).

### 6.1. Dashboard mensual

Orden recomendado:

1. Alertas: vencidos, vence hoy, cargos desconocidos y statements sin conciliar.
2. Resumen por moneda de gastos mensuales y statements pendientes, sin mezclar monedas.
3. Gastos mensuales a pagar.
4. Tarjetas y estado de conciliación.
5. Saldos compartidos por persona y moneda: cuánto le deben al usuario y cuánto debe él, reflejados en ambas cuentas cuando existe conexión.
6. Gastos cubiertos por pago anual, visibles como pagados y excluidos del pendiente.
7. Completados, colapsados por defecto.

El módulo **Deudas** debe tener navegación y resumen propios. Su saldo no se mezcla con el dashboard mensual ni con el importe compartido de Gastos/Tarjetas.

### 6.2. Acciones inline

- Marcar pagado un gasto mensual o statement.
- Registrar pago parcial únicamente dentro de Deudas.
- Ajustar importe de una ocurrencia.
- Cambiar vencimiento del mes.
- Omitir o cancelar con motivo.
- Deshacer mediante reversión temporal.

### 6.3. Acciones con pantalla o modal

- Crear o editar una recurrencia.
- Cambiar porcentajes.
- Conciliar un statement.
- Resolver diferencias.
- Editar una compra con cuotas ya materializadas.
- Conectar un contacto manual con otra cuenta GastApp mediante email.
- Cancelar o registrar un ajuste explícito de una deuda con motivo.
- Crear un gasto desde un flujo único que primero elige “mensual” o “tarjeta”.

### 6.4. Automatizaciones

- Materializar ocurrencias al consultar un mes mediante upsert idempotente.
- Sugerir matches entre líneas reales y cargos esperados.
- Analizar opcionalmente un statement PDF, validar su salida estructurada y presentar sugerencias para confirmación humana.
- Detectar duplicados por tarjeta, importe, moneda, comercio y fecha.
- Arrastrar cargos esperados ausentes al siguiente statement sin cambiar su fecha real.
- Materializar el snapshot de reparto de cada cuota cuando entra al período correspondiente, sin generar una deuda.
- Enviar recordatorios configurables.
- Mostrar “cubierto por pago anual” sin crear deudas cero ficticias.

### 6.5. Features a agregar

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

### 6.6. Features o conceptos a simplificar

- Reemplazar “generar resumen mensual” por ocurrencias automáticas.
- Reemplazar “omitir como pagado con cero” por un estado explícito.
- Separar “esperado”, “confirmado”, “conciliado” y “pagado”.
- Mostrar una sola cifra principal por moneda y contexto.
- Evitar que “gasto” represente a la vez plantilla, ocurrencia, pago y deuda.
- Presentar “importe correspondiente a Juan” como saldo compartido derivado, nunca como `PersonalDebt` ni como cuenta con pagos parciales.

### 6.7. Realtime y background jobs

Realtime no aporta suficiente valor inicialmente aunque existan usuarios conectados. TanStack Query con invalidación, refetch por foco y polling puntual es suficiente para el primer release; Realtime se evaluará si las mediciones muestran una necesidad de actualización inmediata entre cuentas.

Los background jobs iniciales deberían limitarse a:

- notificaciones mediante outbox;
- retries de email;
- mantenimiento de proyecciones si se demuestra necesario.

La generación de ocurrencias puede ser on-demand e idempotente, sin depender de un cron mensual.

## 7. VPS y Coolify: guía adaptada de Auguri para GastApp

Esta guía reutiliza la plataforma y el procedimiento de Auguri, con recursos específicos de GastApp. Las verificaciones y scripts ejecutados en Auguri no se consideran ejecutados o disponibles en este repositorio.

### Flujo de trabajo: local primero, después Coolify

**La primera versión publicable se desarrolla y se prueba funcionalmente en el equipo local antes de desplegarla en el VPS.** El proyecto se preparará desde su fundación para pasar entre entornos mediante configuración, manteniendo el mismo código de aplicación, contratos, schema y migraciones.

1. **Entorno local completo.** PostgreSQL local en Docker, con la misma versión mayor prevista para el VPS y roles que permitan probar los permisos reales. La aplicación se ejecuta con Node y recarga de desarrollo. Archivos y datos de prueba permanecen en almacenamiento local persistente.
2. **Google y correo de desarrollo.** Cliente OAuth con callback `localhost`, secretos locales y sesiones del entorno local. Los correos se capturan o inspeccionan en desarrollo para verificar invitaciones y recordatorios. El dominio público y el VPS no son necesarios para este recorrido; el login real de Google sí usa el proveedor externo.
3. **Validación funcional local.** El usuario prueba los módulos de la primera publicación: gastos, pagos/reversión, contactos manuales sin cuenta, conexiones entre usuarios de prueba, repartos, deudas y tarjetas/conciliación. Las pruebas automatizadas cubren las reglas y permisos descritos en la sección 8. PDF/IA y Expo conservan sus fases posteriores.
4. **Ensayo de producción en local.** Construir y ejecutar la imagen con el Dockerfile que se usará en Coolify, instalar el schema con las migraciones sobre una base local vacía y comprobar login, API, rutas SPA, healthcheck y persistencia tras reiniciar contenedores. Usar una base y variables de ensayo separadas de las de trabajo cotidiano.
5. **Configuración inicial del VPS.** Una vez validado localmente, completar dominio/DNS, HTTPS, GitHub App, proyecto GastApp, bases privadas, secretos, callbacks públicos y volúmenes según esta guía. Son preparativos por entorno; no un rediseño del código.
6. **Despliegue del commit validado.** Coolify construye desde ese código usando el mismo Dockerfile; se aplican las migraciones del mismo commit con el paso controlado de la sección 7.7. Verificar primero staging propuesto y después producción, con bases vacías e independientes de los datos locales.
7. **Comprobación en el entorno real.** Confirmar HTTPS, Google, cookies detrás de Traefik, permisos, email, backups y persistencia en el VPS. La validación local reduce riesgos, pero estas integraciones requieren también su comprobación en destino.

Las diferencias entre entornos serán URLs, conexiones de base, secretos, clientes OAuth, destinos de correo y rutas/volúmenes. Los datos locales de prueba no se copian automáticamente a producción. La primera publicación mantiene la decisión de iniciar con base vacía.

La fundación incluye comandos para levantar desarrollo, ejecutar verificaciones, construir/probar Docker y aplicar migraciones. Sus instrucciones de uso están en la siguiente sección.

Después de la configuración inicial, el flujo habitual será: **probar local → commit/push → despliegue en Coolify → comprobación en destino**. Los cambios de schema siguen incluyendo su migración y respaldo controlados, según la sección 7.8.

### Comandos disponibles para la fundación local

La rama `v2` ya implementa este recorrido. La base local es **Postgres.app**, servidor “Gastapp v2” (PostgreSQL 18) en `127.0.0.1:5555`, base `gastappv2`; está separada de los demás servidores locales y de la base de V1. Docker/OrbStack solo se necesita para el ensayo de la imagen.

```bash
npm ci
npm run setup:local
npm run db:setup
npm run db:migrate
npm run dev
```

Abrir `http://localhost:3000`. Vite atiende la web en 3000 y reenvía API/healthcheck a Express en 3001 durante desarrollo. La imagen compilada atiende todo con Express en un único puerto. `.env.local` es privada e ignorada por Git; la `.env` de V1 se conserva y no se carga. Vite también tiene deshabilitada su carga automática de archivos env.

`setup:local` crea secretos nuevos una sola vez y respeta una configuración local existente. `db:setup` se conecta con el superusuario de Postgres.app (el usuario de macOS) y crea o actualiza los roles `gastapp_owner` (migraciones, con `CREATEDB` para las bases de prueba), `gastapp_auth` y `gastapp_app` con las contraseñas de `.env.local`, y la base `gastappv2`; puede repetirse. `db:migrate` valida que el destino sea `gastappv2` en localhost y aplica las migraciones versionadas. Para un VPS nuevo deberán prepararse esos roles con sus propios secretos antes de aplicar la migración.

**Migración única mientras no haya despliegue.** Hasta la primera publicación, el schema completo vive en una sola migración `202610200001_init` que se regenera al cambiar el modelo (`prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`, más el SQL manual de constraints, triggers, grants y RLS al final del archivo). Para aplicarla de nuevo en local, `npm run db:reset` elimina y recrea `gastappv2` y aplica la migración (borra los datos locales). A partir del primer despliegue, cada cambio de schema tendrá su propia migración incremental.

```bash
npm run check
npm run test:integration
npm run build
npm run test:docker
```

`check` ejecuta tipos, lint, formato y pruebas unitarias. Integración instala el schema en una base local temporal `gastapp_test_*` y la elimina al terminar; no cambia los datos de trabajo. `test:docker` construye `gastapp:v2-local`, lanza un contenedor temporal que llega a Postgres.app mediante `host.docker.internal:5555`, comprueba rutas/API/base/assets/reinicio y lo elimina al terminar. Usa `NODE_ENV=test` para probar el build compilado sobre HTTP localhost sin credenciales Google reales; la imagen usa producción por defecto y mantiene sus requisitos de HTTPS/Google para el despliegue público. No se entregan las credenciales del propietario/migrador al contenedor de ensayo.

El ensayo no despliega a Coolify ni accede a bases remotas. Si se cambian passwords de `.env.local`, volver a ejecutar `db:setup` actualiza los roles existentes.

### 7.1. Qué se reutiliza y qué se crea

| Recurso                              | Tratamiento                                                                        |
| ------------------------------------ | ---------------------------------------------------------------------------------- |
| Ubuntu, Docker, acceso SSH y Coolify | Reutilizar el VPS existente.                                                       |
| Traefik y certificados               | Reutilizar el proxy, preparando permisos/resolver para la zona `ingbruno.ar`.      |
| GitHub App/source                    | Autorizar también el repositorio de GastApp en la instalación existente.           |
| Uptime Kuma                          | Agregar monitores de GastApp en el servicio existente.                             |
| Notificaciones operativas de Coolify | Reutilizar la configuración del equipo y comprobar eventos de los recursos nuevos. |
| Proyecto y recursos de GastApp       | Crear aplicaciones, bases, secretos y volúmenes propios por entorno.               |
| Backups                              | Configurar respaldos de GastApp; los scripts de Auguri no los incluyen.            |
| Landing `ingbruno.ar`                | Recurso futuro separado, con contenido y stack por definir.                        |

La separación por proyectos no aísla CPU, RAM, disco ni necesariamente redes Docker. Medir capacidad y picos de build de ambos proyectos antes de asignar recursos definitivos. Mantener las bases privadas y credenciales restringidas por aplicación/entorno.

### 7.2. Mapa propuesto de recursos

| Recurso                         | Producción                    | Staging                                           |
| ------------------------------- | ----------------------------- | ------------------------------------------------- |
| Proyecto Coolify                | GastApp                       | GastApp                                           |
| Entorno                         | `production`                  | `staging`                                         |
| Rama                            | `main`                        | `develop`                                         |
| Aplicación                      | `gastapp`                     | `gastapp-staging`                                 |
| PostgreSQL                      | `gastapp-db`                  | `gastapp-db-staging`                              |
| URL                             | `https://gastapp.ingbruno.ar` | `https://staging.gastapp.ingbruno.ar` (propuesta) |
| Base y usuarios SQL             | Propios de producción         | Propios de staging                                |
| Volumen PDF, cuando corresponda | `gastapp-private-files`       | `gastapp-staging-private-files`                   |
| Secretos Google y sesión        | Propios de producción         | Propios de staging                                |

El panel mantiene su dirección documentada `coolify.auguri.ar`. Mudanzas a `coolify.ingbruno.ar` o del panel de Kuma son tareas de plataforma independientes. El dominio raíz queda reservado a la futura landing; el despliegue de GastApp se configura únicamente con sus hosts.

### 7.3. Registro y DNS

Estado informado: registro o delegación de `ingbruno.ar` pendientes; disponibilidad no comprobada. Se propone usar la misma cuenta de Cloudflare de Auguri y elegir **Free** para la zona nueva `ingbruno.ar`.

#### Costos y objetivo de presupuesto

Verificado con fuentes oficiales el **20/10/2026**:

| Concepto                                  | Costo previsto                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| DNS de `ingbruno.ar` en Cloudflare Free   | Sin cargo; puede coexistir con Auguri en la misma cuenta.                           |
| Subdominios `gastapp` y `staging.gastapp` | Sin cargo separado por dominio o subdominio en Cloudflare Free.                     |
| Delegación en NIC Argentina               | Sin cargo.                                                                          |
| Certificados Let's Encrypt en Traefik     | Sin cargo.                                                                          |
| Hosting de app, base y futura landing     | Se reutiliza el VPS contratado; capacidad a verificar antes de asignar recursos.    |
| Registro de un `.ar` en NIC Argentina     | **ARS 25.500** para el alta, según el arancel publicado.                            |
| Renovación anual del `.ar`                | **ARS 25.500** según el arancel publicado; confirmar el importe vigente al renovar. |

Cloudflare gestiona la zona DNS; el registro y la renovación del nombre son conceptos distintos. Para conservar `ingbruno.ar` hay que contemplar ese costo adicional al VPS. Una vez registrado, no se paga a NIC por crear sus subdominios. La delegación no transfiere el registro a Cloudflare ni exige contratar Cloudflare Registrar o un plan pago.

El objetivo operativo es **cero suscripciones adicionales de infraestructura**. La primera publicación usa DNS Free, el proxy/Coolify existentes y PostgreSQL/archivos en el VPS. PDF/IA de pago, almacenamiento externo pago o servicios de correo pagos requieren una decisión posterior de presupuesto; no se habilitan como requisito de lanzamiento. El correo y los respaldos se prepararán con los recursos disponibles y límites verificados. Si el VPS no tiene capacidad suficiente, se revisará el diseño y el costo antes de ampliar recursos.

Fuentes: [Cloudflare Free](https://www.cloudflare.com/plans/free/), [facturación por dominio y subdominios](https://developers.cloudflare.com/billing/understand/billing-policy/), [aranceles NIC](https://nic.ar/dominios/aranceles), [delegación gratuita](https://nic.ar/es/node/1087) y [Let's Encrypt](https://letsencrypt.org/about/).

#### Paso a paso: delegar `ingbruno.ar` a Cloudflare

1. **Registrar el nombre.** Verificar su disponibilidad y estado en NIC Argentina. Si falta, completar el alta y esperar a que quede registrado a nombre del titular correspondiente. El importe se confirma en el trámite.
2. **Agregar una zona en la cuenta existente.** Entrar a Cloudflare con la misma cuenta de Auguri, elegir agregar/incorporar un dominio e ingresar **`ingbruno.ar`**. La zona es el dominio raíz; GastApp se configura después como registro dentro de ella.
3. **Elegir Free.** Seleccionar el plan gratuito para `ingbruno.ar`. Cada dominio tiene su propia selección de plan; agregar esta zona no requiere cambiar el plan de Auguri.
4. **Revisar registros.** Cloudflare puede importar registros existentes; revisar la lista y conservar los servicios que correspondan. Crear los registros A de GastApp de la tabla siguiente con la IP vigente del VPS, inicialmente en **DNS only / nube gris**. El registro raíz de la landing puede esperar a su implementación.
5. **Copiar los nameservers asignados a esta zona.** Cloudflare muestra sus nombres completos, por ejemplo con terminación `.ns.cloudflare.com`. Usar exactamente los asignados a `ingbruno.ar`; pueden ser distintos de los de Auguri.
6. **Delegar desde NIC Argentina.** Ingresar a NIC/TAD con la cuenta del titular, ubicar `ingbruno.ar` en la lista de dominios y seleccionar **Delegar**. Usar **Agregar una nueva delegación** para cargar cada nameserver de Cloudflare como host de servidor externo. Confirmar con **Ejecutar Cambios**. La IP del VPS se configura en los registros A de Cloudflare, no como servidor de delegación.
7. **Comprobar la activación.** Volver a Cloudflare y consultar la comprobación de nameservers hasta que la zona figure **Active**. La propagación puede demorar; no se copian ni modifican las delegaciones de `auguri.ar`.
8. **Comprobar DNS público y preparar HTTPS.** Verificar los nombres con los comandos siguientes. Cuando las aplicaciones estén listas, continuar con la sección 7.4 para la emisión de certificados y validar primero staging, luego producción.

Comprobaciones de solo lectura desde el Mac:

```bash
dig +short NS ingbruno.ar
dig +short A gastapp.ingbruno.ar
dig +short A staging.gastapp.ingbruno.ar
```

Los NS deben coincidir con los asignados a la zona por Cloudflare; los A deben devolver la IP verificada del VPS. Que DNS resuelva no prueba todavía que la app o HTTPS estén funcionando. Las delegaciones de Auguri y de `ingbruno.ar` son independientes aunque compartan cuenta Cloudflare y servidor.

Procedimientos oficiales: [Cloudflare: alta de zona y nameservers](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) y [NIC: delegación](https://nic.ar/es/ayuda/instructivos/delegacion-de-dominios).

| Tipo | Nombre en la zona `ingbruno.ar` | Destino y uso                                                                   |
| ---- | ------------------------------- | ------------------------------------------------------------------------------- |
| A    | `gastapp`                       | `IP_DEL_VPS`: GastApp producción.                                               |
| A    | `staging.gastapp`               | Misma IP: staging propuesto.                                                    |
| A    | `@`                             | Reservado para la futura landing; configurarlo cuando su hosting esté definido. |

Los nombres DNS se muestran completos en la tabla de entornos. Para la preparación inicial se propone DNS only, terminando HTTPS en Traefik. GastApp usa hosts fijos y no necesita copiar los routers wildcard de Auguri. No se requiere un subdominio adicional para la API.

El dominio activo es necesario para verificar HTTPS y el login público. Diseño, desarrollo local y pruebas con el callback local pueden avanzar antes del registro.

### 7.4. HTTPS con el proxy compartido

Las guías de Auguri documentaban al 15/10/2026 un resolver `letsencrypt` con DNS challenge de Cloudflare y credenciales limitadas a `auguri.ar`. Verificar su estado real antes de modificarlo.

- Si `ingbruno.ar` está en la misma cuenta de Cloudflare, evaluar el cambio mínimo: autorizar esa zona además de Auguri en las credenciales DNS restringidas y verificar emisión y renovación para ambos proyectos.
- Si no puede reutilizarse ese acceso, preparar un resolver compatible o HTTP-01 dedicado para los hosts fijos de GastApp, referenciado por sus rutas. HTTP-01 requiere puerto público 80 accesible durante la validación.
- Los wildcard existentes de Auguri deben conservar emisión y renovación mediante DNS. No cambiar el resolver compartido de DNS a HTTP sin resolver antes esas dependencias.
- Preparar backup de la configuración del proxy y almacenamiento ACME. Los cambios persistentes se realizan desde Coolify; sus reinicios pueden sobrescribir ediciones hechas solo en disco.
- Verificar certificados, logs y rutas de GastApp, Auguri, dashboard y Kuma después de un cambio compartido.

No se incluyen labels listos para pegar: dependen de la versión real de Coolify, nombres de servicio y configuración vigente. La aplicación nueva tendrá routers y nombres propios.

### 7.5. Imagen y runtime de GastApp

El Dockerfile V2 seguirá el patrón multietapa de Auguri: dependencias, compilación y runtime con usuario sin privilegios, archivos compilados y Prisma generado. La imagen debe permitir ejecutar las migraciones del commit elegido o producir una imagen específica para esa tarea.

- Express escucha en `0.0.0.0` y puerto interno `3000` como propuesta. El proxy accede a ese puerto; la base no publica puertos al host.
- Configurar la confianza en el proxy según los saltos reales de Traefik, con origen público conocido y sin confiar indiscriminadamente en headers de cualquier cliente.
- `NODE_ENV=production` se fija para el runtime; el build instala también las dependencias necesarias para compilar.
- Build sin acceso a la base productiva, sin `db push` y sin aplicación automática de migraciones al arrancar el servidor.
- El volumen privado, cuando se implemente PDF, sobrevive al redeploy y permite escritura al usuario del contenedor. No se mezcla con fotos o archivos de Auguri.
- El healthcheck `/healthz` comprueba acceso a PostgreSQL y al schema requerido mediante una consulta mínima, sin exponer datos personales ni secretos; responde 503 si falla.

Variables conceptuales por entorno:

| Variable o grupo       | Valor previsto                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| URL pública            | `https://gastapp.ingbruno.ar` o la URL de staging; nombre de variable a fijar con auth.      |
| Conexiones PostgreSQL  | URLs internas con roles de ejecución, autenticación y migración según permisos.              |
| Google OAuth           | Client ID y secreto específicos del entorno.                                                 |
| Secreto de sesión/auth | Nuevo y distinto por entorno, con nombre según la librería elegida.                          |
| `PORT`                 | `3000` como propuesta.                                                                       |
| Archivos privados      | Ruta interna propuesta `/data/private-files`, cuando se implemente PDF.                      |
| SMTP                   | Configuración de email de producto y recordatorios, independiente de las alertas de Coolify. |
| IA opcional            | Clave solo del backend cuando se habilite PDF/IA.                                            |

Guardar secretos en Coolify y sus copias privadas en un gestor. Los futuros `.env.staging` y `.env.production`, dumps y backups deberán quedar ignorados por Git antes de crearlos. No se reutilizan credenciales de Auguri ni las antiguas de V1.

### 7.6. Google por entorno

La librería implementada es Better Auth y el prefijo es `/api/auth`. El inicio OAuth se probó automáticamente con su callback local. Los callbacks por entorno son:

| Entorno    | Callback previsto                                              |
| ---------- | -------------------------------------------------------------- |
| Local      | `http://localhost:3000/api/auth/callback/google`               |
| Staging    | `https://staging.gastapp.ingbruno.ar/api/auth/callback/google` |
| Producción | `https://gastapp.ingbruno.ar/api/auth/callback/google`         |

Las URLs públicas definitivas se verificarán al preparar cada entorno de Google Cloud. Los orígenes confiables y cookies corresponden al host de cada entorno. No se comparten cookies mediante `Domain=ingbruno.ar` o `Domain=gastapp.ingbruno.ar`; producción, staging y la futura landing mantienen su aislamiento de sesión.

#### Configurar el ingreso real con Google en local

1. En Google Cloud, usar un proyecto propio y preparar su configuración de OAuth/consentimiento si todavía falta. Crear un cliente OAuth de tipo aplicación web para desarrollo.
2. Registrar `http://localhost:3000` como origen y `http://localhost:3000/api/auth/callback/google` como URI de redirección autorizado.
3. Si el proyecto está en modo de pruebas, agregar las cuentas Google que se usarán para revisar el login y los compartidos como usuarios de prueba.
4. Completar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env.local`, conservando los secretos nuevos ya generados para PostgreSQL y sesiones.
5. Reiniciar `npm run dev`, abrir `http://localhost:3000` y elegir Continuar con Google. Comprobar acceso, preferencias, recarga de página y cerrar sesión.

Sin ambas credenciales el entorno local arranca y muestra claramente que Google no está habilitado; no existe un acceso ficticio ni un bypass de autenticación en la aplicación. Los usuarios sintéticos de las pruebas se crean por herramientas internas de test y se eliminan al finalizar.

### 7.7. Migraciones y primer despliegue

Hasta el primer despliegue se mantiene una única migración `init` (ver comandos locales). Después, para la línea Prisma 7 de referencia, las migraciones se crean en desarrollo con `prisma migrate dev`, se revisa su SQL y se aplican con `prisma migrate deploy` en staging/producción. Políticas RLS, constraints y triggers pueden requerir SQL adicional versionado.

Primer despliegue desde cero:

1. Crear PostgreSQL privado y roles de GastApp para el entorno.
2. Construir la imagen del commit elegido y preparar variables runtime.
3. Aplicar las migraciones de ese mismo commit sobre la base vacía, usando red privada y credenciales de migración.
4. Si falla la migración, investigar antes de habilitar tráfico de la app.
5. Levantar la aplicación con healthcheck y, si corresponde, volumen persistente.
6. Verificar HTTPS, login, permisos, caso funcional y persistencia tras redeploy.
7. Configurar monitores, backup propio y restauración ensayada antes de considerar producción lista.

La ejecución de migraciones puede hacerse con una tarea/imagen aislada o desde un túnel SSH controlado, usando los archivos del commit elegido. La red, la ruta privada de variables y el nombre de imagen se concretarán al preparar el primer despliegue; no se publica PostgreSQL para operar desde el Mac.

Un hook `pre-deployment` de Coolify corre en el contenedor existente y se omite si no existe; no garantiza que tenga las migraciones del commit nuevo. Un hook `post-deployment` corre después del despliegue. Ninguno sustituye por sí solo el paso controlado anterior.

### 7.8. Operación y actualizaciones

Patrón de Auguri a implementar para GastApp: push a `develop` despliega staging; push a `main` despliega producción mediante la GitHub App autorizada. Este auto-deploy no está configurado todavía para GastApp.

- Cambios de código: validar local, commit/push a staging, comprobar despliegue y promover el cambio a producción.
- Con cambios SQL compatibles: commit elegido, backup verificable, migración de ese commit y después push que publica la app. Verificar staging antes de repetir en producción.
- Cambios incompatibles de V2: planificar etapas o mantenimiento. La independencia respecto de V1 no elimina la necesidad de proteger los datos futuros de V2.
- Revertir una imagen no revierte SQL ni las escrituras realizadas. Elegir recuperación según el cambio, evitando restaurar a ciegas sobre datos nuevos.

Adaptar las herramientas de Auguri para túneles, migraciones, backups, restauración y verificación de variables. Los nombres `db:migrate:staging`, `db:backup:prod`, `backup:prod` y similares son tareas propuestas para la implementación, no comandos disponibles hoy en GastApp.

Los scripts antiguos de V1 se retiraron de la rama `v2`. El build actual genera Prisma, compila React Router y empaqueta Express sin conectarse a la base ni modificarla. La imagen puede ejecutar las migraciones de Prisma como paso separado.

### 7.9. Backups, restauración y monitoreo

Propuesta inicial heredada de la operación de Auguri: backup diario local de cada base con retención 14, más copia periódica fuera del VPS y copia antes de cambios relevantes. Frecuencia externa, retención definitiva y pérdida/tiempo de recuperación tolerables se concretarán antes de producción.

El respaldo de GastApp cubrirá base y archivos privados cuando existan, con manifiesto y checksums. Conservar una copia externa cifrada; secretos de auth/Google/SMTP y configuración de plataforma se respaldan por separado. Si base y archivos se copian secuencialmente, coordinar escrituras para que la copia sea consistente.

Prueba de restauración:

1. Verificar integridad y legibilidad del dump y del archivo de datos.
2. Restaurar en una base y volumen aislados, sin sobrescribir producción.
3. Levantar una app de prueba contra esos recursos, con envíos externos deshabilitados.
4. Comprobar importes por moneda, usuarios, permisos, relaciones y lectura de archivos.
5. Registrar el resultado y el procedimiento concreto para repetirlo.

Coolify/configuración del proxy y Kuma tienen respaldos propios de plataforma; no están incluidos en un dump de GastApp. Los respaldos de Auguri tampoco incluyen esta aplicación.

Agregar a Kuma los healthchecks de producción y staging, y activar las alertas existentes para sus recursos. Verificar avisos de despliegue, backup y tareas fallidas en Coolify. Monitoreo y aplicaciones comparten el VPS; un fallo total de éste también afecta a Kuma.

## 8. Roadmap y criterios de salida

| Fase                          | Entrega                                                                                                                                  | Criterio para continuar                                                                                                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Fundación                  | **Implementada en local:** React Router/Express, Prisma, schema inicial, roles/RLS, auth, preferencias, Money/fechas, comandos y Docker. | Checks, 18 resultados de pruebas automatizadas, build y ensayo Docker aprobados. Login real Google pendiente de credenciales locales. |
| 1. Primer recorrido completo  | **Implementada en local:** crear gasto mensual, consultar período, cambiar importe/vencimiento, pagar y deshacer, en API y “Mi mes”.     | Flujo UI/API/base completo, idempotente y transaccional; 22 pruebas automatizadas, recorrido en navegador y ensayo Docker aprobados.  |
| 2. Gastos periódicos          | **Implementada en local:** bimestrales con anclaje, vencimientos cortos, omitir/restaurar, baja/reactivar, pago anual y renombrar.       | Períodos correctos; historial pagado protegido; cobertura anual y reparto sin duplicación.                                            |
| 3. Compartidos                | **Implementada en local:** contactos sin cuenta, reparto con snapshots, saldos por persona y moneda, invitaciones y conexiones.          | Reparto manual completo sin registro de contraparte; vista conectada solo de lectura y sin filtraciones.                              |
| 4. Deudas                     | Principal, pagos parciales, cancelación y ajustes auditables.                                                                            | Estados y saldos exactos, separados del reparto de gastos y tarjetas.                                                                 |
| 5. Tarjetas                   | Compras, cuotas, recurrentes, statements y conciliación manual.                                                                          | Una fuente de verdad para cuotas; pago/reversión del statement consistente; cargos desconocidos y ausentes resueltos.                 |
| 6. Notificaciones y operación | Preferencias, outbox, reintentos, herramientas de DB y backups.                                                                          | Envíos idempotentes; configuración de recursos y restauración verificadas.                                                            |
| 7. Publicación inicial        | Alcance completo probado en local, imagen Docker ensayada localmente y despliegue del commit validado con base nueva.                    | Comprobación en staging/producción de HTTPS, auth, permisos, backup/restauración y monitoreo; producción aprobada operativamente.     |
| 8. PDF/IA opcional            | Archivos privados, parser agnóstico, validaciones y sugerencias.                                                                         | Límites/costos medidos y confirmación humana; no bloquea el primer lanzamiento manual.                                                |
| 9. Expo                       | UI React Native, misma API, sesión segura, lectura offline y push.                                                                       | Web/API estabilizadas; contratos reutilizados y reintentos seguros.                                                                   |

La landing `ingbruno.ar` y el importador desde V1 son trabajos independientes. La continuidad de Invoice tampoco condiciona la publicación.

### Pruebas necesarias para V2

- Precisión monetaria y separación de ARS/USD; distribución y redondeo deterministas.
- Series mensuales/bimestrales, anclajes y vencimientos 29/30/31.
- Pago anual compartido una sola vez y meses cubiertos sin pendiente nuevo.
- Pago/undo, snapshot pagado y concurrencia: doble click, reintentos y versiones obsoletas.
- Contacto manual sin cuenta, conexión aceptada, invitación pendiente/rechazada y privacidad de contraparte.
- Cuotas, recurrentes y conciliación; pago y reversión consistentes del statement.
- Principal y pagos parciales de Deudas en su moneda, sin crear deudas desde repartos.
- Roles y RLS con conexiones del pool reutilizadas entre usuarios distintos.
- Instalación limpia, persistencia tras redeploy, salud y restauración aislada.

La Fase 3 agrega 3 pruebas unitarias y 11 resultados de integración: contactos privados y versionados, validación de porcentajes y contactos ajenos/archivados, parte exacta al centavo con contacto sin cuenta y 0%/100%, pago que no salda y congela el snapshot (trigger de inmutabilidad y de suma 100%), recálculo por importe y por reparto desde un mes, omitido sin reparto y pago anual repartido una sola vez, invitación con email obligatorio y sin auto-invitación, aceptación con visibilidad solo desde ese mes y solo de la propia parte (RLS verificado directamente), compartido bidireccional, desconexión que conserva saldos propios, rechazo y vencimiento. El recorrido de navegador cubre crear compartido con persona nueva, partes iguales, cambio de reparto, invitación y aceptación desde el iPhone de la contraparte.

La Fase 2 agrega 7 resultados de integración: bimestral anclado y sin importe en meses intermedios, omitir con motivo y restaurar, baja que oculta meses posteriores y se rechaza ante meses resueltos, pago anual con meses ya materializados y futuros cubiertos, doble envío concurrente, superposición, conflicto con meses pagados, límite por baja, undo completo, inmutabilidad de meses cubiertos en la base y renombrar con versión y aislamiento. El recorrido de navegador cubre crear mensual/USD/bimestral, omitir/restaurar, pago anual y navegación al mes de pago, editar con alcance y renombrar, baja/reactivar y móvil 375/390/430.

La Fase 1 agrega 4 pruebas unitarias y 11 resultados de integración: validación de contratos, Idempotency-Key obligatoria y replay, origen, materialización única con GET concurrentes, meses cortos, “solo este mes” frente a “este mes y futuros”, nuevo vencimiento, pago bloqueando la edición, pagos futuros protegidos, deshacer y corregir, doble click concurrente con un solo pago, aislamiento entre cuentas, RLS, trigger de ocurrencia pagada y audit log solo de alta. El recorrido “Mi mes” se verificó en navegador (escritorio y emulación iPhone 375/390/430) con un usuario sintético temporal: crear, validar importe, pagar, deshacer desde el aviso, editar con alcance, mes pagado bloqueado y persistencia tras recargar. WebKit no está instalado en este equipo; la revisión en Safari real sigue pendiente.

La fundación tiene 7 pruebas unitarias y 11 resultados de integración aprobados (incluyendo el caso principal y sus 10 subcasos). Cubren dinero, porcentajes, fechas, configuración, migración limpia, sesiones, errores, CSRF, permisos, RLS, concurrencia del pool, inicio OAuth y revocación. También se verificó la imagen Docker y la interfaz con usuarios sintéticos temporales. El rediseño V2 se revisó en escritorio y móvil (360, 390 y 768 px), incluyendo filtros, búsqueda, creación temporal, pagar/deshacer y navegación de modales con teclado. La revisión automática WCAG A/AA de las cinco pantallas públicas del prototipo no detectó infracciones; no sustituye la revisión con usuarios y tecnologías de asistencia. Los criterios de los módulos financieros completos siguen como objetivos de sus próximas fases. El intercambio real con Google requiere credenciales del cliente local y una cuenta de prueba.

## 9. Hallazgos de V1 que orientan el diseño

El assessment original detectó autorización por propietario incompleta, credenciales en el historial Git, dinero en Float, fechas String, sumas ARS/USD, pago anual basado en flags y varias fuentes de verdad para cuotas. También identificó undo incompleto de tarjeta, materialización mensual no atómica, snapshots insuficientes, esperas artificiales en UI y un build que modifica la base.

En V2 esos hallazgos se convierten en criterios de diseño y pruebas: dinero exacto, fechas/períodos tipados, snapshots, transacciones, idempotencia, auditoría, permisos por recurso, secretos nuevos y build independiente de la DB. Reparar V1 o compatibilizar sus contratos no es una fase previa.

Las instrucciones y ejemplos de Opción B/Vercel describían el sistema anterior y contenían decisiones reemplazadas, como incluir ajustes generales del statement en los cálculos de gastos. Este plan conserva las reglas funcionales actuales y los procedimientos útiles del VPS, adaptados a GastApp.

## 10. Pendientes concretos y siguiente entrega

La fundación técnica y las Fases 1 a 3 ya están implementadas. Quedan tareas de configuración, módulos e infraestructura:

- Completar las credenciales del cliente OAuth local y validar el ingreso real con Google; la integración y las versiones ya están fijadas y probadas automáticamente.
- Completar registro/delegación del dominio y DNS; cerrar staging y certificados según el proxy real.
- Medir recursos y preparar el proyecto GastApp con sus credenciales, bases y volúmenes.
- Confirmar la visibilidad al conectar (implementada: desde el mes de aceptación).
- Envío de invitaciones por correo y enlace de un solo uso (Fase 6, con el outbox de notificaciones).
- Fijar parámetros operativos de sesiones, backups, recuperación, correo y jobs en sus fases.

**Siguiente entrega:** Fase 4, Deudas: préstamos manuales con principal fijo, pagos parciales en la moneda de la deuda, cancelación y ajustes explícitos auditables, con estados derivados (`OPEN`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`) y navegación propia, separados de los repartos. Decisión de Fase 2: el pago rápido sigue usando la fecha de hoy y un canal opcional, sin canal predeterminado configurable. No se migran datos de V1 ni se despliega al VPS durante esa entrega local.

## 11. Referencias técnicas

Los procedimientos de Auguri se consolidaron en la sección de VPS, con nombres y recursos propios de GastApp. Los respaldos documentales anteriores se conservaron fuera del repositorio durante esta reorganización.

- [React Router: SPA Mode](https://reactrouter.com/how-to/spa).
- [Express: routing](https://expressjs.com/en/guide/routing/).
- [Node: releases y soporte](https://nodejs.org/en/about/previous-releases).
- [Prisma 7: migraciones](https://docs.prisma.io/docs/cli/v7/migrate).
- [Prisma 7: transacciones](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions).
- [PostgreSQL 18: RLS](https://www.postgresql.org/docs/18/ddl-rowsecurity.html).
- [PostgreSQL 18: configuración transaccional](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADMIN-SET).
- [Better Auth: Express](https://better-auth.com/docs/integrations/express), [Prisma](https://better-auth.com/docs/adapters/prisma), [Google](https://better-auth.com/docs/authentication/google) y [sesiones](https://better-auth.com/docs/concepts/session-management).
- [Google: validación de identidad e identificador estable](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
- [NIC Argentina: registro](https://nic.ar/ayuda/instructivos/registro-de-dominio) y [delegación](https://nic.ar/es/ayuda/instructivos/delegacion-de-dominios).
- [Cloudflare: alta de zona y nameservers](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/).
- [Coolify: Dockerfile y comandos de despliegue](https://coolify.io/docs/applications/builds/dockerfile).
- [Coolify: proxy Traefik](https://coolify.io/docs/core/networking/proxy/traefik/overview), [DNS challenge](https://coolify.io/docs/core/networking/proxy/traefik/dns-challenge) y [backup de instancia](https://coolify.io/docs/core/backup-and-recovery/instance-backup).
- [Traefik: resolvers de certificados](https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/overview/).
