import { test } from "node:test";
import assert from "node:assert/strict";
import { withUser } from "../../server/persistence/database";
import { startTestApp } from "./harness";

test("fundación V2: migración limpia, sesiones y aislamiento real en PostgreSQL", async (t) => {
  const {
    config,
    databases,
    userA,
    userB,
    loginA,
    cookieA,
    cookieB,
    call,
    close,
  } = await startTestApp();
  try {
    await t.test(
      "healthcheck verifica los schemas con los roles de ejecución",
      async () => {
        const response = await call("/healthz");
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
          status: "ok",
          version: "2.0.0",
        });
      },
    );
    await t.test(
      "API anónima denegada y rutas desconocidas devuelven JSON",
      async () => {
        assert.equal((await call("/api/v2/me")).status, 401);
        const missing = await call("/api/does-not-exist");
        assert.equal(missing.status, 404);
        assert.match(missing.headers.get("content-type")!, /application\/json/);
        const configResponse = await call("/api/v2/config");
        assert.deepEqual(await configResponse.json(), {
          data: { googleSignInEnabled: true },
        });
      },
    );
    await t.test(
      "JSON malformado y solicitudes demasiado grandes devuelven errores controlados",
      async () => {
        const invalid = await call("/api/v2/me/preferences", cookieA, {
          method: "PATCH",
          headers: { origin: config.origin },
          body: "{",
        });
        assert.equal(invalid.status, 400);
        assert.equal((await invalid.json()).error.code, "INVALID_JSON");
        const large = await call("/api/v2/me/preferences", cookieA, {
          method: "PATCH",
          headers: { origin: config.origin },
          body: JSON.stringify({ text: "x".repeat(20_000) }),
        });
        assert.equal(large.status, 413);
      },
    );
    await t.test(
      "sesiones reales resuelven cada cuenta sin exponer el token",
      async () => {
        const a = await call("/api/v2/me", cookieA);
        const b = await call("/api/v2/me", cookieB);
        assert.equal(a.status, 200);
        assert.equal(b.status, 200);
        const bodyA = await a.json(),
          bodyB = await b.json();
        assert.equal(bodyA.data.id, userA.id);
        assert.equal(bodyB.data.id, userB.id);
        assert.equal(
          bodyA.data.preferences.timeZone,
          "America/Argentina/Tucuman",
        );
        assert.equal(JSON.stringify(bodyA).includes(loginA.token), false);
        assert.match(a.headers.get("cache-control")!, /no-store/);
      },
    );
    await t.test(
      "preferencias, CSRF y validación no aceptan ownership del cliente",
      async () => {
        const change = {
          method: "PATCH",
          body: JSON.stringify({ timeZone: "UTC" }),
        };
        assert.equal(
          (await call("/api/v2/me/preferences", cookieA, change)).status,
          403,
        );
        assert.equal(
          (
            await call("/api/v2/me/preferences", cookieA, {
              ...change,
              headers: { origin: "https://untrusted.example" },
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await call("/api/v2/me/preferences", cookieA, {
              ...change,
              headers: { origin: config.origin },
              body: JSON.stringify({ timeZone: "UTC", userId: userB.id }),
            })
          ).status,
          400,
        );
        const valid = await call("/api/v2/me/preferences", cookieA, {
          ...change,
          headers: { origin: config.origin },
        });
        assert.equal(valid.status, 200);
        assert.equal(
          (await (await call("/api/v2/me", cookieB)).json()).data.preferences
            .timeZone,
          "America/Argentina/Tucuman",
        );
        assert.equal(
          (await (await call("/api/v2/me", cookieA)).json()).data.preferences
            .timeZone,
          "UTC",
        );
      },
    );
    await t.test(
      "RLS bloquea lectura/escritura cruzada y acceso sin identidad",
      async () => {
        const row = await withUser(databases.app, userA.id, (tx) =>
          tx.userPreferences.findUnique({ where: { userId: userB.id } }),
        );
        assert.equal(row, null);
        const changed = await withUser(databases.app, userA.id, (tx) =>
          tx.userPreferences.updateMany({
            where: { userId: userB.id },
            data: { timeZone: "UTC" },
          }),
        );
        assert.equal(changed.count, 0);
        assert.deepEqual(await databases.app.userPreferences.findMany(), []);
        await assert.rejects(() =>
          withUser(databases.app, userA.id, (tx) =>
            tx.userPreferences.create({ data: { userId: "someone-else" } }),
          ),
        );
      },
    );
    await t.test(
      "el pool no hereda identidad entre transacciones concurrentes",
      async () => {
        await Promise.all(
          Array.from({ length: 24 }, async (_, index) => {
            const id = index % 2 ? userA.id : userB.id;
            const rows = await withUser(databases.app, id, (tx) =>
              tx.userPreferences.findMany(),
            );
            assert.deepEqual(
              rows.map((row) => row.userId),
              [id],
            );
          }),
        );
        assert.deepEqual(await databases.app.userPreferences.findMany(), []);
      },
    );
    await t.test(
      "roles de auth y app no son superusuarios ni acceden al otro schema",
      async () => {
        await assert.rejects(() => databases.app.user.findMany());
        await assert.rejects(() => databases.auth.userPreferences.findMany());
        const roles = await databases.app.$queryRaw<
          { rolsuper: boolean; rolbypassrls: boolean }[]
        >`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
        assert.deepEqual(roles, [{ rolsuper: false, rolbypassrls: false }]);
      },
    );
    await t.test(
      "Google inicia OAuth con callback local y estado persistido",
      async () => {
        const response = await call("/api/auth/sign-in/social", undefined, {
          method: "POST",
          headers: { origin: config.origin },
          body: JSON.stringify({ provider: "google", callbackURL: "/" }),
        });
        assert.equal(response.status, 200);
        const body = await response.json();
        const authorization = new URL(body.url);
        assert.equal(authorization.hostname, "accounts.google.com");
        assert.equal(
          authorization.searchParams.get("redirect_uri"),
          `${config.origin}/api/auth/callback/google`,
        );
        assert.ok(authorization.searchParams.get("state"));
        assert.match(response.headers.get("set-cookie")!, /HttpOnly/i);
        // El retorno fallido debe recuperar el acceso de la app, no la página
        // genérica del proveedor de autenticación. No intercambia códigos reales.
        const failed = await call(
          "/api/auth/callback/google?error=access_denied",
          undefined,
          { redirect: "manual" },
        );
        assert.equal(failed.status, 302);
        const destination = new URL(failed.headers.get("location")!);
        assert.equal(destination.origin, config.origin);
        assert.equal(destination.pathname, "/acceso");
        assert.ok(destination.searchParams.has("error"));
        const unsafe = await call("/api/auth/sign-in/social", undefined, {
          method: "POST",
          headers: { origin: config.origin },
          body: JSON.stringify({
            provider: "google",
            callbackURL: "/",
            errorCallbackURL: "https://untrusted.example/acceso",
          }),
        });
        assert.equal(unsafe.status, 403);
      },
    );
    await t.test(
      "sesión alterada o revocada deja de permitir acceso",
      async () => {
        assert.equal(
          (await call("/api/v2/me", `${cookieB}invalid`)).status,
          401,
        );
        const logout = await call("/api/auth/sign-out", cookieA, {
          method: "POST",
          headers: { origin: config.origin },
          body: "{}",
        });
        assert.equal(logout.status, 200);
        assert.equal((await call("/api/v2/me", cookieA)).status, 401);
      },
    );
  } finally {
    await close();
  }
});
