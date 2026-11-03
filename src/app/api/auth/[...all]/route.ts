import { auth } from "@/lib/auth";
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
