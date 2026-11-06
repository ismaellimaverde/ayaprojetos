import {
  assertRuntimeAvailable,
  RuntimeUnavailableError,
  unavailableResponse,
} from "@/lib/runtime-availability";
import { getAuth } from "@/lib/auth";
import {
  execute,
  listOrganizations,
  DomainError,
  acceptInvitation,
  digest,
} from "@/lib/domain";
import { getPool } from "@/lib/db";
import { z } from "zod";
import { mailConfiguration } from "@/lib/mail";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handler(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    assertRuntimeAvailable();
    const { path } = await ctx.params;
    if (
      req.method !== "GET" &&
      req.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin
    )
      throw new DomainError(403, "Origem não autorizada");
    if (
      path[0] === "sources" &&
      Number(req.headers.get("content-length")) > 3000000
    )
      throw new DomainError(413, "Arquivo excede o limite");
    const body =
      req.method === "GET" || req.method === "DELETE"
        ? {}
        : path[0] === "sources"
          ? await sourceBody(req)
          : await req.json();
    if (path[0] === "invite-register" && req.method === "POST") {
      const v = z
        .object({
          token: z.string().regex(/^[a-f0-9]{64}$/),
          name: z.string().min(2).max(120),
          password: z.string().min(8).max(128),
        })
        .parse(body);
      const inv = (
        await getPool().query(
          "UPDATE boss_private.invitations SET registration_attempts=registration_attempts+1 WHERE token_hash=$1 AND status='pending' AND expires_at>now() AND registration_attempts<3 RETURNING email",
          [digest(v.token)],
        )
      ).rows[0];
      if (!inv) throw new DomainError(400, "Convite inválido ou expirado");
      mailConfiguration();
      // Constant public result prevents account enumeration; signup cannot alter existing credentials.
      try {
        await getAuth().api.signUpEmail({
          body: { name: v.name, email: inv.email, password: v.password },
        });
      } catch (error) {
        const code = (error as { body?: { code?: string } })?.body?.code;
        if (code !== "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")
          throw new DomainError(
            503,
            "Não foi possível concluir o cadastro. Tente novamente mais tarde.",
          );
      }
      return Response.json({
        message:
          "Se necessário, confirme seu e-mail na mensagem de verificação. Depois entre para aceitar o convite.",
      });
    }
    const session = await getAuth().api.getSession({ headers: req.headers });
    if (!session) throw new DomainError(401, "Entre para continuar");
    if (path[0] === "me")
      return Response.json({
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          mfa: session.user.twoFactorEnabled,
        },
        organizations: await listOrganizations(session.user.id),
      });
    if (path[0] === "accept-invite" && req.method === "POST")
      return Response.json(
        await acceptInvitation(
          z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(body)
            .token,
          session.user.id,
        ),
      );
    const org = req.headers.get("x-organization-id");
    if (!org) throw new DomainError(400, "Selecione a organização");
    const result = await execute(
      {
        userId: session.user.id,
        mfa: !!session.user.twoFactorEnabled,
        sessionCreatedAt: new Date(session.session.createdAt),
        sessionId: session.session.id,
      },
      org,
      req.method,
      path,
      body,
    );
    if (
      result &&
      "privateFile" in result &&
      Buffer.isBuffer(result.privateFile)
    )
      return new Response(new Uint8Array(result.privateFile), {
        headers: {
          "Content-Type": result.mime,
          "Content-Disposition": "attachment",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "sandbox; default-src 'none'",
        },
      });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof RuntimeUnavailableError) return unavailableResponse();
    if (e instanceof DomainError)
      return Response.json({ message: e.message }, { status: e.status });
    if (e instanceof z.ZodError)
      return Response.json(
        { message: "Confira os campos informados", issues: e.issues },
        { status: 400 },
      );
    console.error(
      JSON.stringify({
        event: "request.failed",
        type: e instanceof Error ? e.name : "unknown",
      }),
    );
    return Response.json(
      { message: "Não foi possível concluir a operação" },
      { status: 500 },
    );
  }
}
export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };

async function sourceBody(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) throw new DomainError(400, "Corpo ausente");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 3000000) {
      await reader.cancel();
      throw new DomainError(413, "Arquivo excede o limite");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new DomainError(400, "Dados inválidos");
  }
}
