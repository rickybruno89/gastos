import { useQuery } from "@tanstack/react-query";
import { createAuthClient } from "better-auth/react";
import { currentUserSchema } from "../../shared/contracts/account";
import { ApiError, request } from "../../shared/api-client";
export const authClient = createAuthClient();
export function useCurrentUser() {
  return useQuery({
    queryKey: ["account"],
    queryFn: async () => {
      try {
        return await request("/me", currentUserSchema);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
  });
}
