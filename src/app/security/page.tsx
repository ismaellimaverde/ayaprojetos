"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { useState } from "react";
import { authClient } from "@/lib/client";
type SessionItem = {
  id: string;
  token: string;
  userAgent?: string | null;
  createdAt: Date;
  expiresAt: Date;
};
export default function Security() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [message, setMessage] = useState("");
  const [uri, setUri] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  return (
    <main className="content" style={{ maxWidth: 850 }}>
      <Link href="/" aria-label="BOSS — início">
        <Brand showPlatform={false} />
      </Link>
      <div className="heading">
        <div>
          <h1>Perfil e segurança</h1>
          <p className="muted">
            {session?.user.email} · MFA{" "}
            {session?.user.twoFactorEnabled ? "ativo" : "opcional, desativado"}
          </p>
        </div>
        <Link className="btn secondary" href="/">
          Voltar ao espaço
        </Link>
      </div>
      {message && (
        <div role="status" className="notice">
          {message}
        </div>
      )}
      <div className="stack">
        <section className="panel">
          <h2>Autenticação multifator</h2>
          <p>
            Opcional. Para proteção adicional, configure um aplicativo
            autenticador e guarde os códigos de recuperação em local seguro.
          </p>
          {!session?.user.twoFactorEnabled && !uri && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const r = await authClient.twoFactor.enable({
                  password: String(f.get("password")),
                });
                if (r.error)
                  setMessage(r.error.message ?? "Não foi possível ativar");
                else if (r.data && "totpURI" in r.data) {
                  setUri(r.data.totpURI);
                  setCodes(r.data.backupCodes);
                }
              }}
            >
              <label>
                Confirme sua senha
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </label>
              <button className="btn">Configurar autenticador</button>
            </form>
          )}
          {uri && (
            <>
              <p>
                Importe esta URI no autenticador (contém um segredo; não
                compartilhe):
              </p>
              <div className="secret">{uri}</div>
              <p>Códigos de recuperação — salve antes de confirmar:</p>
              <div className="secret">{codes.join(" · ")}</div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const r = await authClient.twoFactor.verifyTotp({
                    code: String(f.get("code")),
                  });
                  if (r.error) setMessage("Código inválido");
                  else {
                    setUri("");
                    setCodes([]);
                    setMessage("MFA ativado por sua escolha.");
                    window.location.reload();
                  }
                }}
              >
                <label>
                  Código do autenticador
                  <input
                    name="code"
                    required
                    pattern="[0-9]{6}"
                    inputMode="numeric"
                  />
                </label>
                <button className="btn">Confirmar MFA</button>
              </form>
            </>
          )}
        </section>
        <section className="panel">
          <h2>Sessões ativas</h2>
          <div className="row">
            <button
              className="btn secondary"
              onClick={async () => {
                const r = await authClient.listSessions();
                if (r.data) setSessions(r.data);
              }}
            >
              Consultar sessões
            </button>
            <button
              className="btn secondary"
              onClick={async () => {
                await authClient.revokeOtherSessions();
                setMessage("Outras sessões revogadas.");
                setSessions([]);
              }}
            >
              Revogar outras sessões
            </button>
            <button
              className="btn secondary"
              onClick={async () => {
                await authClient.signOut();
                router.push("/login");
                router.refresh();
              }}
            >
              Sair
            </button>
          </div>
          {sessions.map((s) => (
            <p key={s.id}>
              {s.userAgent || "Sessão"} ·{" "}
              {new Date(s.createdAt).toLocaleString("pt-BR")}{" "}
              <button
                className="btn secondary"
                onClick={async () => {
                  await authClient.revokeSession({ token: s.token });
                  setSessions(sessions.filter((x) => x.id !== s.id));
                }}
              >
                Revogar
              </button>
            </p>
          ))}
        </section>
        <section className="panel">
          <h2>Política da organização</h2>
          <p>
            Sessões de até 8 horas. Ações administrativas sensíveis exigem login
            nos últimos 10 minutos. Convites expiram em 48 horas. Sem cadastro
            público.
          </p>
          <p className="muted">
            A entrega de e-mail segue a configuração aprovada para este
            ambiente.
          </p>
        </section>
      </div>
    </main>
  );
}
