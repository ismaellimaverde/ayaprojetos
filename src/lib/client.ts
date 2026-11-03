import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";
export const authClient = createAuthClient({ plugins: [twoFactorClient()] });
export async function api(
  path: string,
  org?: string,
  method = "GET",
  body?: unknown,
) {
  const r = await fetch(`/api/boss/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(org ? { "x-organization-id": org } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.message || "Operação indisponível");
  return data;
}
