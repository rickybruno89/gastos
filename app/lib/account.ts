import { useQuery } from "@tanstack/react-query";
import { createAuthClient } from "better-auth/react";
import { currentUserSchema } from "../../shared/contracts/account";
import { ApiError, request } from "../../shared/api-client";
import { deviceTimeZone } from "./time-zone";
export const authClient = createAuthClient();
export function useCurrentUser() {
  return useQuery({
    queryKey: ["account"],
    queryFn: async () => {
      try {
        const user = await request("/me", currentUserSchema);
        const timeZone = deviceTimeZone();
        if (user.preferences.timeZone === timeZone) return user;
        const preferences = await request(
          "/me/preferences",
          currentUserSchema.shape.preferences,
          { method: "PATCH", body: JSON.stringify({ timeZone }) },
        );
        return { ...user, preferences };
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
  });
}
