import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
// Local mailbox is private developer infrastructure, never a public web route.
export async function deliver(to: string, kind: string, url: string) {
  if (process.env.MAIL_MODE !== "local")
    throw new Error("Email delivery is not configured");
  await mkdir(".data/mail", { recursive: true, mode: 0o700 });
  await writeFile(
    `.data/mail/${Date.now()}-${randomUUID()}.json`,
    JSON.stringify({ to, kind, url, delivery: "local-only" }, null, 2),
    { mode: 0o600 },
  );
}
