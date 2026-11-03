import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { isHosted, type Environment } from "./runtime-config";
export function mailConfiguration(env: Environment = process.env) {
  if (env.MAIL_MODE === "local") {
    if (isHosted(env))
      throw new Error(
        "Local mail capture is unavailable on hosted deployments",
      );
    return { mode: "local" as const };
  }
  if (env.MAIL_MODE !== "smtp" || env.EMAIL_DELIVERY_ENABLED !== "true")
    throw new Error("Authorized email delivery is not configured");
  for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "MAIL_FROM"])
    if (!env[key]) throw new Error(`${key} is required`);
  const port = Number(env.SMTP_PORT ?? "587");
  if (![465, 587].includes(port))
    throw new Error("SMTP must use TLS port 465 or STARTTLS port 587");
  if (/[\r\n]/.test(env.MAIL_FROM!)) throw new Error("Invalid sender");
  return {
    mode: "smtp" as const,
    from: env.MAIL_FROM!,
    transport: {
      host: env.SMTP_HOST!,
      port,
      secure: port === 465,
      requireTLS: true,
      auth: { user: env.SMTP_USER!, pass: env.SMTP_PASSWORD! },
      tls: { rejectUnauthorized: true },
      connectionTimeout: 5000,
      dnsTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
    },
  };
}
const subjects: Record<string, string> = {
  verification: "Confirme seu e-mail no BOSS",
  "password-reset": "Redefina sua senha no BOSS",
  invitation: "Convite para colaborar no BOSS",
};
export async function deliver(to: string, kind: string, url: string) {
  const config = mailConfiguration();
  const link = new URL(url);
  if (link.origin !== new URL(process.env.BETTER_AUTH_URL!).origin)
    throw new Error("Email link origin mismatch");
  if (config.mode === "local") {
    await mkdir(".data/mail", { recursive: true, mode: 0o700 });
    await writeFile(
      `.data/mail/${Date.now()}-${randomUUID()}.json`,
      JSON.stringify({ to, kind, url, delivery: "local-only" }, null, 2),
      { mode: 0o600 },
    );
    return;
  }
  // No background promise: serverless request awaits provider acceptance. No filesystem fallback.
  const transport = nodemailer.createTransport(config.transport);
  try {
    const result = await transport.sendMail({
      from: config.from,
      to,
      subject: subjects[kind] ?? "Notificação BOSS",
      text: `${subjects[kind] ?? "BOSS"}\n\nAcesse o link temporário:\n${url}\n\nSe você não solicitou esta ação, ignore a mensagem.`,
    });
    if (!result.accepted?.length) throw new Error("Mail was not accepted");
  } catch {
    throw new Error("Email delivery unavailable");
  } finally {
    transport.close();
  }
}
export function deliveryStatus() {
  return mailConfiguration().mode === "local" ? "local-only" : "smtp-accepted";
}
