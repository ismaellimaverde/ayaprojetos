import { auth } from "@/lib/auth";
import {
  execute,
  listOrganizations,
  DomainError,
  acceptInvitation,
  digest,
} from "@/lib/domain";
import { pool } from "@/lib/db";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handler(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await ctx.params;
    if (
      req.method !== "GET" &&
      req.headers.get("origin") !== new URL(process.env.BETTER_AUTH_URL!).origin
    )
      throw new DomainError(403, "Origem não autorizada");
    const body =
      req.method === "GET" || req.method === "DELETE" ? {} : await req.json();
    if (path[0] === "invite-register" && req.method === "POST") {
      const v = z
        .object({
          token: z.string().regex(/^[a-f0-9]{64}$/),
          name: z.string().min(2).max(120),
          password: z.string().min(12).max(128),
        })
        .parse(body);
      const inv = (
        await pool.query(
          "UPDATE invitations SET registration_attempts=registration_attempts+1 WHERE token_hash=$1 AND status='pending' AND expires_at>now() AND registration_attempts<3 RETURNING email",
          [digest(v.token)],
        )
      ).rows[0];
      if (!inv) throw new DomainError(400, "Convite inválido ou expirado");
      // Constant public result prevents account enumeration; signup cannot alter existing credentials.
      try {
        await auth.api.signUpEmail({
          body: { name: v.name, email: inv.email, password: v.password },
        });
      } catch {}
      return Response.json({
        message:
          "Se necessário, confirme seu e-mail na mensagem de verificação. Depois entre para aceitar o convite.",
      });
    }
    const session = await auth.api.getSession({ headers: req.headers });
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
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
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
