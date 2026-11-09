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
  let data;
  try {
    data = await r.json();
  } catch {
    throw new Error(
      r.status === 413
        ? "O envio excedeu o limite do servidor. Escolha um arquivo de até 2 MiB ou use um link HTTPS."
        : `Não foi possível concluir a operação (HTTP ${r.status}). Confira sua conexão e tente novamente.`,
    );
  }
  if (!r.ok) throw new Error(data.message || "Operação indisponível");
  return data;
}
