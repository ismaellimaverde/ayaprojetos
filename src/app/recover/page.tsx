"use client";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/client";
function RecoverContent() {
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("");
  return (
    <main className="authform" style={{ minHeight: "100vh" }}>
      <div>
        <Link className="brand" href="/login">
          BOSS
        </Link>
        <h1>{token ? "Redefinir senha" : "Recuperar acesso"}</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            if (token) {
              const r = await authClient.resetPassword({
                token,
                newPassword: String(f.get("password")),
              });
              setMessage(
                r.error
                  ? "Link inválido ou expirado. Solicite outro."
                  : "Senha alterada. Entre novamente.",
              );
            } else {
              await authClient.requestPasswordReset({
                email: String(f.get("email")),
                redirectTo: "/recover",
              });
              setMessage(
                "Se houver uma conta elegível, as instruções de recuperação serão disponibilizadas por e-mail.",
              );
            }
          }}
        >
          {token ? (
            <label>
              Nova senha
              <input
                name="password"
                type="password"
                minLength={12}
                required
                autoComplete="new-password"
              />
            </label>
          ) : (
            <label>
              E-mail
              <input name="email" type="email" required />
            </label>
          )}
          <button className="btn">
            {token ? "Salvar nova senha" : "Solicitar recuperação"}
          </button>
        </form>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <p>
          <Link href="/login">Voltar ao login</Link>
        </p>
        <p className="muted subtle">
          Ambiente de desenvolvimento: mensagens na caixa local privada, sem
          envio externo.
        </p>
      </div>
    </main>
  );
}

export default function Recover() {
  return (
    <Suspense fallback={<p>Carregando…</p>}>
      <RecoverContent />
    </Suspense>
  );
}
