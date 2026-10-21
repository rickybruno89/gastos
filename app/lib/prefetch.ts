import { useEffect } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { addMonths } from "../../shared/domain/periods";

// Precarga el mes anterior y el siguiente para que cambiar de mes no muestre
// carga. No reemplaza los datos en pantalla: solo llena el caché.
export function usePrefetchNeighbors(
  period: string,
  enabled: boolean,
  query: (period: string) => {
    queryKey: QueryKey;
    queryFn: () => Promise<unknown>;
  },
) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    for (const offset of [-1, 1]) {
      const next = addMonths(period, offset);
      if (next < "2000-01" || next > "2100-12") continue;
      void client.prefetchQuery({ ...query(next), staleTime: 30_000 });
    }
    // `query` se reconstruye en cada render; alcanza con reaccionar al período.
  }, [client, period, enabled]);
}
