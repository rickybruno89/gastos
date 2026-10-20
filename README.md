# GastApp V2

Base local en la rama `v2`: React Router + Node/Express + Prisma/PostgreSQL, con Better Auth y Google. Incluye acceso, sesiones, cuenta, preferencias y **Mi mes** y **Compartidos**: gastos mensuales y bimestrales reales (crear, cambiar importe o vencimiento, pagar y deshacer, omitir un mes, dar de baja, pago anual y renombrar; repartos con contactos sin cuenta, saldos por persona e invitaciones entre cuentas). El resto de los módulos sigue el roadmap del **[plan único de V2](docs/PLAN_V2.md)**.

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

El build no modifica la base. `db:migrate` solo admite `gastappv2` en localhost. Hasta el primer despliegue hay una única migración `init`: si cambia, `npm run db:reset` recrea la base local (borra sus datos); ver [comandos locales](docs/PLAN_V2.md#comandos-disponibles-para-la-fundación-local). Para staging/producción se prepararán recursos y migraciones controladas según el plan, sin conectar esos entornos durante las pruebas locales.

## Destinos

- **GastApp:** `gastapp.ingbruno.ar`.
- **Staging propuesto:** `staging.gastapp.ingbruno.ar`.
- **Landing futura:** `ingbruno.ar`, contenido y tecnología por definir.

La primera publicación usará una base vacía. El importador de V1 es independiente. El registro/delegación del dominio y los recursos de GastApp en Coolify siguen pendientes; [costos y delegación de NIC a Cloudflare](docs/PLAN_V2.md#73-registro-y-dns).

La propuesta visual V2 se puede explorar en [http://localhost:3000/vista-previa](http://localhost:3000/vista-previa), con datos ficticios y cambios temporales. El sistema visual y su alcance están en el [plan V2](docs/PLAN_V2.md#6-experiencia-de-uso).
