import { isHosted, type Environment } from "./runtime-config";

export class RuntimeUnavailableError extends Error {
  constructor() {
    super("Serviço indisponível neste ambiente.");
    this.name = "RuntimeUnavailableError";
  }
}
// Previews are visual-only until a separate isolated backend is explicitly authorized.
// Never infer permission to use production credentials from their accidental presence.
export function assertRuntimeAvailable(env: Environment = process.env) {
  if (
    isHosted(env) &&
    ["deploy-preview", "branch-deploy"].includes(env.CONTEXT ?? "")
  )
    throw new RuntimeUnavailableError();
}
export function unavailableResponse() {
  return Response.json(
    { message: "Serviço indisponível neste ambiente." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
