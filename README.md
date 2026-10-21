# GastApp V2

Base local en la rama `v2`: React Router + Node/Express + Prisma/PostgreSQL, con Better Auth y Google. Incluye acceso, sesiones, cuenta, preferencias y **Mi mes**, **Tarjetas**, **Compartidos** y **Deudas**: gastos mensuales y bimestrales reales (crear, cambiar importe o vencimiento, pagar y deshacer, omitir un mes, dar de baja, pago anual y renombrar; repartos con contactos sin cuenta, saldos por persona e invitaciones entre cuentas; préstamos con pagos parciales, ajustes y cancelación; tarjetas con compras en cuotas, cargos recurrentes, conciliación manual, arrastre de ausentes y pago/reversión del resumen completo). Incluye además avisos por email configurables, invitaciones con enlace, worker con outbox/reintentos y backup/restauración local cifrada. El resto de los módulos sigue el roadmap del **[plan único de V2](docs/PLAN_V2.md)**.

La interfaz usa **Tailwind CSS 4** con su plugin oficial de Vite, componentes propios, Radix Dialog y Lucide. Los estilos y sus variantes responsive viven en `className`, junto al componente. `app/styles.css` es el único CSS manual y contiene el tema, reset, animaciones y reglas globales. `Button`, `Badge`, `Modal` y `FormField` centralizan los estilos compartidos; `cn` combina clases con `tailwind-merge`. La zona horaria se toma automáticamente del dispositivo, con Argentina como respaldo; no requiere configuración en Cuenta. Las decisiones y convenciones de UI están en el [plan V2](docs/PLAN_V2.md#sistema-visual-v2-y-prototipo-navegable).

## Estado real

**Todavía no está lista para producción; el ingreso con cuentas reales está pendiente de validación.** Las fases 0–6 tienen su implementación y pruebas locales, pero el login completo con Google y la entrega real de correo siguen sin validarse. Las pruebas con usuarios sintéticos no reemplazan esa validación.

Las credenciales Google locales se recuperaron de la `.env` de V1, copiando únicamente `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` a `.env.local`. Hay que verificar que el cliente autorice el callback de V2 y comprobar ingreso, retorno, sesión y cierre de sesión con cuentas reales. Para probar emails reales hay que configurar SMTP y ejecutar el worker. Antes de publicar también falta validar HTTPS/cookies, permisos entre dos cuentas reales, backups automáticos con restauración y monitoreo en staging. Estos son requisitos de salida de Fase 7, no detalles opcionales del despliegue.

La demo de diseño fue retirada del acceso, de la navegación y de las rutas de la aplicación. Las pantallas de producto usan la API y PostgreSQL.

## Empezar en local

Requisitos: Node 24 y [Postgres.app](https://postgresapp.com/) con un servidor PostgreSQL 18 en el puerto **5555** (“Gastapp v2”). Docker/OrbStack solo hace falta para `test:docker`.

```bash
npm ci
npm run setup:local
npm run db:setup
npm run db:migrate
npm run dev
```

Abrir **http://localhost:3000**. `setup:local` crea `.env.local` con secretos nuevos y la conserva si ya existe. `db:setup` crea los roles y la base `gastappv2` en Postgres.app. V2 no carga la `.env` antigua ni usa su base de datos.

Para ingresar con Google, completar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env.local` y registrar `http://localhost:3000/api/auth/callback/google` como redirect URI del cliente OAuth de desarrollo. El botón permanece deshabilitado hasta que estén configurados. Ver [configuración de Google](docs/PLAN_V2.md#76-google-por-entorno).

## Verificaciones

```bash
npm run check
npm run test:integration
npm run build
npm run test:docker
```

Integración crea y elimina una base temporal en Postgres.app. El ensayo Docker construye la imagen y comprueba, contra Postgres.app, arranque, base, rutas, assets, API y reinicio.

El build no modifica la base. `db:migrate` solo admite `gastappv2` en localhost. Las migraciones son incrementales: Fase 5 agrega Tarjetas sin borrar los datos existentes. `npm run db:reset` queda reservado para un reinicio local explícito (borra sus datos); ver [comandos locales](docs/PLAN_V2.md#comandos-disponibles-para-la-fundación-local). Para staging/producción se prepararán recursos y migraciones controladas según el plan, sin conectar esos entornos durante las pruebas locales.

## Correo, worker y backups locales

```bash
npm run setup:local        # completa claves nuevas sin reemplazar las existentes
npm run db:setup
npm run db:migrate
npm run build
npm run worker:once        # captura correos en .data/mail; no envía a Internet
npm run worker             # proceso continuo, separado de la web
npm run db:backup
npm run db:restore:verify -- .data/backups/backup-...
npm run db:restore:clean -- gastapp_restore_<id>
```

Los recordatorios se habilitan en **Cuenta → Avisos por correo**; inicialmente están apagados. Se configuran por tipo y anticipación; usan automáticamente el horario del dispositivo. Las invitaciones se encolan al invitar y requieren aceptar con el email destinatario verificado.

Desarrollo usa `MAIL_MODE=capture` por defecto. SMTP real requiere configuración explícita; ver `.env.example` y el [plan V2](docs/PLAN_V2.md#53-notificaciones-y-trabajos-durables). Producción mantiene el correo deshabilitado hasta configurarlo. No se habilitó ningún servicio de pago ni se enviaron correos reales durante las pruebas.

Los backups se cifran con `BACKUP_ENCRYPTION_KEY` y retienen 14 copias. Guardá esa clave fuera de las copias. Restauración siempre sobre una base local nueva; nunca reemplaza `gastappv2`. Se necesitan clientes PostgreSQL 18 y permisos administrativos locales. El worker tiene un rol restringido distinto del administrador; las herramientas locales no se conectan al VPS. Automatizar backups, copia externa y verificar SMTP/Google en destino corresponde a la Fase 7.

## Destinos

- **GastApp:** `gastapp.ingbruno.ar`.
- **Staging propuesto:** `staging.gastapp.ingbruno.ar`.
- **Landing futura:** `ingbruno.ar`, contenido y tecnología por definir.

La primera publicación usará una base vacía. El importador de V1 es independiente. El registro/delegación del dominio y los recursos de GastApp en Coolify siguen pendientes; [costos y delegación de NIC a Cloudflare](docs/PLAN_V2.md#73-registro-y-dns).

El sistema visual y los recorridos de producto están en el [plan V2](docs/PLAN_V2.md#6-experiencia-de-uso).
