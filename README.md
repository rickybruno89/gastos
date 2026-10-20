# GastApp

Aplicación para organizar obligaciones mensuales, tarjetas, gastos compartidos y deudas manuales.

La documentación del proyecto está unificada en **[Plan de GastApp V2](docs/PLAN_V2.md)**: reglas funcionales, arquitectura, autenticación, modelo de datos, implementación y guía de producción con el VPS/Coolify existente.

- **Stack V2 confirmado:** React Router + Node/Express + Prisma + PostgreSQL, con Google.
- **GastApp:** `gastapp.ingbruno.ar`.
- **Staging propuesto:** `staging.gastapp.ingbruno.ar`.
- **Landing futura:** `ingbruno.ar`, con contenido y tecnología por definir.
- **Lanzamiento:** desde cero y con base nueva; importación posterior desde V1 independiente.
- **Flujo:** desarrollo y validación funcional primero en local, ensayo del Dockerfile local y después despliegue del mismo código en Coolify, con configuración propia por entorno.

El repositorio todavía contiene el código de V1. La arquitectura V2 está planificada y su implementación es el siguiente paso. El dominio tiene registro/delegación pendientes según lo informado por el usuario.

La guía unificada incluye [costos y delegación de NIC a Cloudflare](docs/PLAN_V2.md#73-registro-y-dns). El diseño reutiliza el VPS y Cloudflare Free; el registro y la renovación de `ingbruno.ar` tienen su arancel anual en NIC Argentina.

El build actual de V1 incluye `prisma db push`; no representa el build/deploy de V2. La primera entrega reemplazará esa configuración y preparará instalación limpia, login Google y API autenticada.
