import { useCallback, useRef } from "react";
import {
  useMutation,
  type MutateOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

// Las operaciones mueven dinero: un segundo click (o Enter) mientras la primera
// sigue en curso no envía otra petición, devuelve la misma promesa. El bloqueo
// es síncrono, así que cubre también dos clicks dentro del mismo frame, antes
// de que el botón llegue a mostrarse deshabilitado. `lockKey` permite operar en
// paralelo sobre elementos distintos (p. ej. pagar dos gastos diferentes).
//
// `idempotent` recibe la clave de idempotencia. Si un intento falla (por ejemplo
// se corta la red y no sabemos si el servidor lo aplicó) y se reintenta con los
// mismos datos, se reusa la misma clave: el servidor devuelve el resultado ya
// guardado en vez de aplicarlo otra vez. Tras un éxito o con datos distintos,
// la clave es nueva.
export function useSafeMutation<T, V = void>(
  options: UseMutationOptions<T, Error, V, unknown> & {
    lockKey?: (variables: V) => string;
    idempotent?: (variables: V, idempotencyKey: string) => Promise<T>;
  },
) {
  const { lockKey, idempotent, ...rest } = options;
  const lastAttempt = useRef<{ payload: string; key: string } | null>(null);
  const mutation = useMutation({
    ...rest,
    ...(idempotent && {
      mutationFn: async (variables: V) => {
        const payload = serialize(variables);
        const key =
          payload !== null && lastAttempt.current?.payload === payload
            ? lastAttempt.current.key
            : crypto.randomUUID();
        lastAttempt.current = payload === null ? null : { payload, key };
        const result = await idempotent(variables, key);
        if (lastAttempt.current?.key === key) lastAttempt.current = null;
        return result;
      },
    }),
  });
  const inFlight = useRef(new Map<string, Promise<T>>());
  const { mutateAsync: run } = mutation;
  const keyOf = lockKey ?? (() => "");
  const keyRef = useRef(keyOf);
  keyRef.current = keyOf;
  const mutateAsync = useCallback(
    (variables: V, callbacks?: MutateOptions<T, Error, V, unknown>) => {
      const key = keyRef.current(variables);
      const running = inFlight.current.get(key);
      if (running) return running;
      const promise = run(variables, callbacks).finally(() =>
        inFlight.current.delete(key),
      );
      inFlight.current.set(key, promise);
      return promise;
    },
    [run],
  );
  const mutate = useCallback(
    (variables: V, callbacks?: MutateOptions<T, Error, V, unknown>) => {
      // El error ya llega por onError; acá solo se evita el rechazo sin manejar.
      mutateAsync(variables, callbacks).catch(() => undefined);
    },
    [mutateAsync],
  );
  const isLocked = useCallback(
    (variables: V) => inFlight.current.has(keyRef.current(variables)),
    [],
  );
  return { ...mutation, mutate, mutateAsync, isLocked };
}

function serialize(value: unknown) {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return null;
  }
}
