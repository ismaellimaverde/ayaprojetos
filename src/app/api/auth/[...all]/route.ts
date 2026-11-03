import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handler(req: Request) {
  const p = new URL(req.url).pathname;
  // Registration is only callable internally after a valid invitation or CLI bootstrap.
  if (p.endsWith("/sign-up/email"))
    return Response.json(
      { message: "Cadastro disponível somente por convite" },
      { status: 403 },
    );
  if (p.endsWith("/two-factor/disable")) {
    const s = await auth.api.getSession({ headers: req.headers });
    if (
      s &&
      (
        await pool.query(
          "SELECT 1 FROM members WHERE user_id=$1 AND status='active' AND role IN ('owner','admin') UNION ALL SELECT 1 FROM grants WHERE user_id=$1 AND status='active' AND role IN ('company_admin','project_manager','area_manager')",
          [s.user.id],
        )
      ).rowCount
    )
      return Response.json(
        { message: "MFA é obrigatório para administradores" },
        { status: 403 },
      );
  }
  const response = await auth.handler(req);
  if (p.endsWith("/sign-in/email") && !response.ok && response.status !== 429)
    return Response.json(
      {
        message:
          "Não foi possível entrar. Confira os dados e a verificação de e-mail.",
      },
      { status: 401 },
    );
  return response;
}
export { handler as GET, handler as POST };
