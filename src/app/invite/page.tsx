"use client";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, authClient } from "@/lib/client";
function InviteContent() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("");
  const { data: session } = authClient.useSession();
  return (
    <main className="authform" style={{ minHeight: "100vh" }}>
      <div>
        <Brand showPlatform={false} />
        <h1>Seu próximo projeto começa aqui.</h1>
        <p className="muted">
          O convite concede somente os acessos definidos pelo administrador.
        </p>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {session ? (
          <button
            className="btn"
            onClick={async () => {
              try {
                await api("accept-invite", undefined, "POST", { token });
                router.push("/");
                router.refresh();
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Aceitar convite como {session.user.email}
          </button>
        ) : (
          <>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const f = new FormData(e.currentTarget);
                  const r = await api("invite-register", undefined, "POST", {
                    token,
                    name: f.get("name"),
                    password: f.get("password"),
                  });
                  setMessage(r.message);
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              <label>
                Seu nome
                <input name="name" required minLength={2} />
              </label>
              <label>
                Crie uma senha
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  required
                  autoComplete="new-password"
                />
              </label>
              <button className="btn">Criar conta pelo convite</button>
            </form>
            <p>
              Já tem conta? <Link href="/login">Entrar</Link>. Depois volte a
              este link para aceitar.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function Invite() {
  return (
    <Suspense fallback={<p>Carregando…</p>}>
      <InviteContent />
    </Suspense>
  );
}
