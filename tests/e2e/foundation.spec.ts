import { test, expect } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { createHmac } from "node:crypto";
function totp(uri: string) {
  const secret = new URL(uri).searchParams.get("secret")!;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.toUpperCase())
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((x) => parseInt(x, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac("sha1", key).update(counter).digest();
  const offset = hash[19] & 15;
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
async function mail(to: string, kind: string) {
  const files = (await readdir(".data/mail")).sort().reverse();
  for (const f of files) {
    const m = JSON.parse(await readFile(`.data/mail/${f}`, "utf8"));
    if (m.to === to && m.kind === kind) return m;
  }
  throw new Error("Mensagem não encontrada");
}
test("real password-only admin access, optional MFA, project creation, invitation, isolation and session revocation", async ({
  page,
  browser,
}) => {
  const f = JSON.parse(await readFile(".data/e2e.json", "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(f.email);
  await page.getByLabel("Senha", { exact: true }).fill(f.password);
  await page.getByRole("button", { name: "Entrar no BOSS" }).click();
  await expect(
    page.getByRole("button", { name: "Novo projeto" }),
  ).toBeVisible();
  expect(
    (
      await page.request.get("/api/boss/overview", {
        headers: { "x-organization-id": f.org },
      })
    ).status(),
  ).toBe(200);
  const oldContext = await browser.newContext({
    baseURL: "http://localhost:3100",
  });
  expect(
    (
      await oldContext.request.post("/api/auth/sign-in/email", {
        headers: { origin: "http://localhost:3100" },
        data: { email: f.email, password: f.password },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.getByLabel("Nome do projeto").fill("Projeto A");
  await page.getByRole("button", { name: "Salvar projeto" }).click();
  await expect(
    page.getByRole("heading", { name: "Projeto A", exact: true }),
  ).toBeVisible();
  await page.goto("/security");
  await page.getByLabel("Confirme sua senha").fill(f.password);
  await page.getByRole("button", { name: "Configurar autenticador" }).click();
  const uri = await page.locator(".secret").first().innerText();
  await page.getByLabel("Código do autenticador").fill(totp(uri));
  await page.getByRole("button", { name: "Confirmar MFA" }).click();
  await expect(page.getByText("MFA ativo", { exact: false })).toBeVisible();
  expect((await oldContext.request.get("/api/boss/me")).status()).toBe(401);
  await oldContext.close();
  await page.goto("/");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.getByLabel("Nome do projeto").fill("Projeto B");
  await page.getByRole("button", { name: "Salvar projeto" }).click();
  await expect(
    page.getByRole("heading", { name: "Projeto B", exact: true }),
  ).toBeVisible();
  const overview = await (
    await page.request.get("/api/boss/overview", {
      headers: { "x-organization-id": f.org },
    })
  ).json();
  const a = overview.projects.find(
      (p: { name: string }) => p.name === "Projeto A",
    ),
    b = overview.projects.find((p: { name: string }) => p.name === "Projeto B");
  await page
    .getByRole("button", { name: "Usuários e acessos", exact: true })
    .click();
  await page.getByRole("button", { name: "Convidar pessoa" }).click();
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("e2e-guest@example.test");
  await page
    .getByRole("combobox", { name: "Projeto", exact: true })
    .selectOption(a.id);
  // Give only marketing read; no other project or area.
  const checked = page.locator("input[type=checkbox]:checked");
  while (await checked.count()) await checked.first().uncheck();
  await page
    .getByLabel("Marketing e growth: Visualizar", { exact: true })
    .check();
  await page.getByRole("button", { name: "Criar convite" }).click();
  await expect(page.getByRole("status")).toContainText("Nenhum e-mail externo");
  const invitation = await mail("e2e-guest@example.test", "invitation");
  const context = await browser.newContext();
  const guest = await context.newPage();
  await guest.goto(invitation.url);
  await guest.getByLabel("Seu nome").fill("Convidado de teste");
  await guest.getByLabel("Crie uma senha").fill(f.password);
  await guest.getByRole("button", { name: "Criar conta pelo convite" }).click();
  await expect(guest.getByRole("status")).toContainText("confirme seu e-mail");
  const verification = await mail("e2e-guest@example.test", "verification");
  await guest.goto(verification.url);
  await guest.goto("/login");
  await guest
    .getByLabel("E-mail", { exact: true })
    .fill("e2e-guest@example.test");
  await guest.getByLabel("Senha", { exact: true }).fill(f.password);
  await guest.getByRole("button", { name: "Entrar no BOSS" }).click();
  await expect(
    guest.getByRole("heading", { name: "Seu acesso ainda não foi vinculado" }),
  ).toBeVisible();
  await guest.goto(invitation.url);
  await guest.getByRole("button", { name: "Aceitar convite como" }).click();
  await expect(
    guest.getByRole("heading", { name: "Projeto A", exact: true }),
  ).toBeVisible();
  await expect(
    guest.getByRole("heading", { name: "Projeto B", exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await guest.request.get(`/api/boss/projects/${a.id}/finance`, {
        headers: { "x-organization-id": f.org },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await guest.request.get(`/api/boss/projects/${b.id}`, {
        headers: { "x-organization-id": f.org },
      })
    ).status(),
  ).toBe(403);
  const me = await (await guest.request.get("/api/boss/me")).json();
  const revoke = await page.request.post("/api/boss/grants", {
    headers: { "x-organization-id": f.org, origin: "http://localhost:3100" },
    data: {
      project_id: a.id,
      user_id: me.user.id,
      role: "viewer",
      permissions: { marketing: ["view"] },
      status: "revoked",
    },
  });
  expect(revoke.status()).toBe(200);
  expect(
    (
      await guest.request.get(`/api/boss/projects/${a.id}/marketing`, {
        headers: { "x-organization-id": f.org },
      })
    ).status(),
  ).toBe(403);
  const publicSignup = await guest.request.post("/api/auth/sign-up/email", {
    headers: { origin: "http://localhost:3100" },
    data: {
      name: "Unauthorized",
      email: "blocked@example.test",
      password: f.password,
    },
  });
  expect(publicSignup.status()).toBe(403);
  await page.screenshot({ path: ".data/e2e-admin.png", fullPage: true });
  // Exercise password recovery and invalidation of the already-active guest session.
  await guest.goto("/recover");
  await guest
    .getByLabel("E-mail", { exact: true })
    .fill("e2e-guest@example.test");
  await guest.getByRole("button", { name: "Solicitar recuperação" }).click();
  await expect(guest.getByRole("status")).toContainText("Se houver uma conta");
  const reset = await mail("e2e-guest@example.test", "password-reset");
  await guest.goto(reset.url);
  const tooShort = await guest.request.post("/api/auth/reset-password", {
    headers: { origin: "http://localhost:3100" },
    data: { token: new URL(reset.url).searchParams.get("token"), newPassword: "Short7!" },
  });
  expect(tooShort.status()).toBe(400);
  await guest.getByLabel("Nova senha").fill("Eight8!x");
  await guest.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(guest.getByRole("status")).toContainText("Senha alterada");
  expect((await guest.request.get("/api/boss/me")).status()).toBe(401);
  // A returning administrator must complete the second factor, not just the password.
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.getByLabel("E-mail", { exact: true }).fill(f.email);
  await page.getByLabel("Senha", { exact: true }).fill(f.password);
  await page.getByRole("button", { name: "Entrar no BOSS" }).click();
  await expect(
    page.getByRole("heading", { name: "Verifique sua identidade" }),
  ).toBeVisible();
  expect((await page.request.get("/api/boss/me")).status()).toBe(401);
  await page.getByLabel("Código MFA").fill(totp(uri));
  await page.getByRole("button", { name: "Confirmar código" }).click();
  await expect(
    page.getByRole("heading", { name: "Seu portfólio, em perspectiva." }),
  ).toBeVisible();
  await page.screenshot({ path: ".data/e2e-portfolio.png", fullPage: true });
  await context.close();
});
