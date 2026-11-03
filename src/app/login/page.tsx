"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/client";
export default function Login() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [mfa, setMfa] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="auth">
      <section className="authstory">
        <div className="brand">
          BOSS<span>AYA PROJETOS</span>
        </div>
        <div>
          <div className="eyebrow">VISÃO CLARA. EXECUÇÃO CONECTADA.</div>
          <h1>
            Todos os seus negócios.
            <br />
            Uma direção.
          </h1>
          <p>
            Da estratégia ao resultado, um espaço para construir, organizar e
            evoluir seus projetos.
          </p>
        </div>
        <small>Business Operation Sales System · Fundação 01</small>
      </section>
      <section className="authform">
        <div>
          <div className="eyebrow">SEU ESPAÇO DE GESTÃO</div>
          <h1>{mfa ? "Verifique sua identidade" : "Bem-vindo ao BOSS"}</h1>
          <p className="muted">
            {mfa
              ? "Digite o código do aplicativo autenticador."
              : "Entre com sua conta para acessar os projetos autorizados."}
          </p>
          {message && (
            <p role="alert" className="notice error">
              {message}
            </p>
          )}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setMessage("");
              const f = new FormData(e.currentTarget);
              try {
                if (mfa) {
                  const r = await authClient.twoFactor.verifyTotp({
                    code: String(f.get("code")),
                    trustDevice: false,
                  });
                  if (r.error) throw new Error("Código inválido ou expirado");
                  router.push("/");
                  router.refresh();
                } else {
                  const r = await authClient.signIn.email({
                    email: String(f.get("email")),
                    password: String(f.get("password")),
                  });
                  if (r.error)
                    throw new Error(
                      "Não foi possível entrar. Confira os dados e a verificação de e-mail.",
                    );
                  if (r.data && "twoFactorRedirect" in r.data) {
                    setMfa(true);
                  } else router.push("/");
                  router.refresh();
                }
              } catch (err) {
                setMessage((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {mfa ? (
              <label>
                Código MFA
                <input
                  name="code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  required
                  pattern="[0-9]{6}"
                />
              </label>
            ) : (
              <>
                <label>
                  E-mail
                  <input
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                  />
                </label>
                <label>
                  Senha
                  <input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
              </>
            )}
            <button className="btn" disabled={busy}>
              {busy
                ? "Verificando…"
                : mfa
                  ? "Confirmar código"
                  : "Entrar no BOSS →"}
            </button>
          </form>
          <p>
            <Link href="/recover">Esqueceu sua senha?</Link>
          </p>
          <p>
            <Link href="/recover">Primeiro acesso ou reenviar verificação</Link>
          </p>
          <p className="muted subtle">
            O acesso é concedido por convite. Administradores utilizam
            autenticação multifator.
          </p>
        </div>
      </section>
    </div>
  );
}
