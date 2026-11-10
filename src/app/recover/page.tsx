"use client";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/client";
function RecoverContent() {
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="authform" style={{ minHeight: "100vh" }}>
      <div>
        <Link className="identity-link" href="/login" aria-label="BOSS — login">
          <Brand showPlatform={false} />
        </Link>
        <h1>{token ? "Redefinir senha" : "Recuperar acesso"}</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const action = (
              e.nativeEvent as SubmitEvent
            ).submitter?.getAttribute("value");
            setBusy(true);
            setMessage("");
            try {
              const r = token
                ? await authClient.resetPassword({
                    token,
                    newPassword: String(f.get("password")),
                  })
                : action === "verify"
                  ? await authClient.sendVerificationEmail({
                      email: String(f.get("email")),
                      callbackURL: "/recover",
                    })
                  : await authClient.requestPasswordReset({
                      email: String(f.get("email")),
                      redirectTo: "/recover",
                    });
              if (r.error) {
                setMessage(
                  r.error.status === 429
                    ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
                    : token && r.error.status < 500
                      ? "Link inválido ou expirado, ou senha inválida. Confira os dados ou solicite outro link."
                      : "Não foi possível processar a solicitação agora. Tente novamente mais tarde.",
                );
              } else {
                setMessage(
                  token
                    ? "Senha alterada. Verifique seu e-mail antes de entrar, se ainda não o fez."
                    : action === "verify"
                      ? "Se houver uma conta elegível, as instruções de verificação serão enviadas por e-mail."
                      : "Se houver uma conta elegível, as instruções de recuperação serão enviadas por e-mail.",
                );
              }
            } catch {
              setMessage(
                "Não foi possível conectar ao serviço. Confira sua conexão e tente novamente.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {token ? (
            <label>
              Nova senha
              <input
                name="password"
                type="password"
                minLength={8}
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
          <button className="btn" disabled={busy} value="reset">
            {token ? "Salvar nova senha" : "Solicitar recuperação"}
          </button>

        </form>
        {message && (
          <p role="status" className="notice recovery-notice">
            {message}
          </p>
        )}
        <p>
          <Link href="/login" className="btn secondary back-to-login">
            Voltar ao login
          </Link>
        </p>
        <p className="muted subtle">
          No primeiro acesso, confirme seu e-mail pelo link de ativação recebido
          e defina sua senha. Confira também a pasta de spam.
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
