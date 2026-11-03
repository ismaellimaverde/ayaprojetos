import { test, expect } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { verifyPassword } from "better-auth/crypto";
import { Pool } from "pg";
import nextEnv from "@next/env";
import { isLocalDatabase } from "../../src/lib/runtime-config";
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
  test.setTimeout(180000);
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
  // Real planning editor: save, reload, history, and a competing writer.
  await page.getByRole("button", { name: "Abrir Business Plan" }).click();
  await page
    .getByRole("button", {
      name: "Abrir DNA, identidade e cultura",
      exact: true,
    })
    .click();
  const editorDialog = page.getByRole("dialog");
  await editorDialog
    .getByRole("button", { name: "Preencher informações" })
    .click();
  await editorDialog
    .getByRole("textbox", { name: /^Propósito/ })
    .fill("Planning persisted by E2E");
  await editorDialog.getByRole("button", { name: "Adicionar item" }).click();
  await editorDialog
    .getByLabel("Título do item", { exact: true })
    .fill("Research evidence");
  await editorDialog
    .getByLabel("Descrição do item", { exact: true })
    .fill("Documented customer interviews");
  await editorDialog
    .getByRole("button", { name: "Salvar informações" })
    .click();
  await expect(editorDialog.getByRole("status")).toContainText(
    "Informações salvas",
  );
  await editorDialog.getByRole("button", { name: "Fechar área" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Abrir Business Plan" }).click();
  await page
    .getByRole("button", {
      name: "Abrir DNA, identidade e cultura",
      exact: true,
    })
    .click();
  await expect(
    editorDialog.getByText("Planning persisted by E2E", { exact: true }),
  ).toBeVisible();
  await editorDialog
    .getByRole("button", { name: "Histórico", exact: true })
    .click();
  await editorDialog.getByRole("button", { name: /^Revisão 1/ }).click();
  await expect(
    editorDialog.getByText("Research evidence", { exact: true }),
  ).toBeVisible();
  await editorDialog
    .getByRole("button", { name: "Editar informações" })
    .click();
  await editorDialog
    .getByRole("textbox", { name: /^Propósito/ })
    .fill("Unsaved local draft");
  const planOverview = await (
    await page.request.get("/api/boss/overview", {
      headers: { "x-organization-id": f.org },
    })
  ).json();
  const planProject = planOverview.projects.find(
    (p: { name: string }) => p.name === "Projeto A",
  );
  const contentURL = `/api/boss/module-content/${planProject.id}/dna`;
  const saved = (
    await (
      await page.request.get(contentURL, {
        headers: { "x-organization-id": f.org },
      })
    ).json()
  ).document;
  const concurrentWrite = await page.request.post(contentURL, {
    headers: { origin: "http://localhost:3100", "x-organization-id": f.org },
    data: {
      revision: saved.revision,
      fields: { purpose: "Concurrent saved content" },
      items: saved.items,
    },
  });
  expect(concurrentWrite.status()).toBe(200);
  await editorDialog
    .getByRole("button", { name: "Salvar informações" })
    .click();
  await expect(editorDialog.getByRole("status")).toContainText(
    "Outra pessoa atualizou",
  );
  await expect(
    editorDialog.getByRole("textbox", { name: /^Propósito/ }),
  ).toHaveValue("Unsaved local draft");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await editorDialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  page.once("dialog", (dialog) => dialog.accept());
  await editorDialog.getByRole("button", { name: "Cancelar edição" }).click();
  await expect(
    editorDialog.getByText("Concurrent saved content", { exact: true }),
  ).toBeVisible();
  await editorDialog.getByRole("button", { name: "Fechar área" }).click();
  await page.setViewportSize({ width: 1280, height: 720 });
  // Single rich summary, literal legacy text, formatting, reload and browser PDF.
  const richURL = `/api/boss/module-content/${planProject.id}/executive`;
  expect(
    (
      await page.request.post(richURL, {
        headers: {
          origin: "http://localhost:3100",
          "x-organization-id": f.org,
        },
        data: {
          revision: 0,
          fields: {
            business: "Legado preservado <img src=x onerror=alert(1)>",
          },
          items: [],
        },
      })
    ).status(),
  ).toBe(200);
  await page
    .getByRole("button", { name: "Abrir Resumo executivo", exact: true })
    .click();
  await expect(
    editorDialog.getByText("Legado preservado <img src=x onerror=alert(1)>", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(editorDialog.locator(".summary-prose img")).toHaveCount(0);
  await editorDialog
    .getByRole("button", { name: "Editar informações" })
    .click();
  const richBox = editorDialog.getByRole("textbox", {
    name: "Resumo executivo",
    exact: true,
  });
  await expect(richBox).toBeVisible();
  await expect(editorDialog.getByRole("textbox")).toHaveCount(1);
  await richBox.fill("Resumo com acentuação: estratégia e operação.");
  await richBox.press("ControlOrMeta+a");
  await editorDialog
    .getByRole("button", { name: "Negrito", exact: true })
    .click();
  await editorDialog
    .getByRole("button", { name: "Itálico", exact: true })
    .click();
  await editorDialog
    .getByRole("button", { name: "Título H1", exact: true })
    .click();
  await editorDialog
    .getByRole("combobox", { name: "Fonte", exact: true })
    .selectOption("Georgia");
  page.once("dialog", (d) => d.accept("https://example.com/reference"));
  await editorDialog.getByRole("button", { name: "Link", exact: true }).click();
  await editorDialog
    .getByRole("button", { name: "Salvar informações" })
    .click();
  await expect(editorDialog.getByRole("status")).toContainText(
    "Informações salvas",
  );
  await editorDialog
    .getByRole("button", { name: "Recarregar", exact: true })
    .click();
  await expect(editorDialog.locator(".summary-prose h1 strong")).toContainText(
    "Resumo com acentuação",
  );
  await expect(editorDialog.locator(".summary-prose em")).toContainText(
    "estratégia",
  );
  await expect(editorDialog.locator(".summary-prose a")).toHaveAttribute(
    "href",
    "https://example.com/reference",
  );
  const richSaved = (
    await (
      await page.request.get(richURL, {
        headers: { "x-organization-id": f.org },
      })
    ).json()
  ).document;
  expect(richSaved.fields.business).toContain("Legado preservado");
  expect(richSaved.fields.summary_rich_v1).toContain("Georgia");
  await editorDialog
    .getByRole("button", { name: "Exportar PDF", exact: true })
    .click();
  const printFrame = page.locator("iframe[data-boss-print]");
  await expect(printFrame).toHaveCount(1);
  const printHTML = await printFrame.evaluate(
    (el) =>
      (el as HTMLIFrameElement).contentDocument!.documentElement.outerHTML,
  );
  const pdfPage = await browser.newPage();
  await pdfPage.setContent(printHTML);
  await pdfPage.pdf({
    path: "/tmp/boss-rich-summary-test.pdf",
    preferCSSPageSize: true,
  });
  expect(
    execFileSync("pdftotext", [
      "/tmp/boss-rich-summary-test.pdf",
      "-",
    ]).toString(),
  ).toContain("estratégia e operação");
  await pdfPage.close();
  await page.screenshot({ path: "/tmp/boss-summary-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await editorDialog
    .getByRole("button", { name: "Editar informações", exact: true })
    .click();
  expect(
    await editorDialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/boss-summary-mobile.png" });
  await editorDialog.getByRole("button", { name: "Fechar área" }).click();
  await page.setViewportSize({ width: 1280, height: 720 });

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
  const confirmationRequest = await guest.request.post(
    "/api/auth/send-verification-email",
    {
      headers: { origin: "http://localhost:3100" },
      data: { email: "e2e-guest@example.test", callbackURL: "/recover" },
    },
  );
  expect(confirmationRequest.status()).toBe(200);
  const verification = await mail("e2e-guest@example.test", "verification");
  // Follow only the isolated local fixture's real confirmation email.
  await guest.goto(verification.url);
  await guest.waitForURL("http://localhost:3100/recover");
  expect(new URL(guest.url()).searchParams.has("token")).toBe(false);
  await expect(
    guest.getByRole("heading", { name: "Recuperar acesso", exact: true }),
  ).toBeVisible();
  await expect(guest.getByLabel("Nova senha", { exact: true })).toHaveCount(0);
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
    data: {
      token: new URL(reset.url).searchParams.get("token"),
      newPassword: "Short7!",
    },
  });
  expect(tooShort.status()).toBe(400);
  await guest.getByLabel("Nova senha").fill("Eight8!x");
  await guest.getByRole("button", { name: "Salvar nova senha" }).click();
  await expect(guest.getByRole("status")).toContainText("Senha alterada");
  expect((await guest.request.get("/api/boss/me")).status()).toBe(401);
  // Diagnose the complete reset -> hash -> login -> session chain using test data only.
  nextEnv.loadEnvConfig(process.cwd());
  if (!isLocalDatabase(process.env.DATABASE_URL!))
    throw new Error("Local test database required");
  const databaseURL = new URL(process.env.DATABASE_URL!);
  databaseURL.pathname = "/boss_e2e";
  const diagnosticPool = new Pool({ connectionString: databaseURL.toString() });
  try {
    const { rows } = await diagnosticPool.query(
      `SELECT a.password, u.id, u."emailVerified" FROM boss_private.account a
       JOIN boss_private."user" u ON a."userId"=u.id
       WHERE u.email=$1 AND a."providerId"='credential'`,
      ["e2e-guest@example.test"],
    );
    expect(rows.length).toBe(1);
    expect(rows[0].emailVerified).toBe(true);
    // Assert booleans only: never include the hash in assertion output.
    expect(
      await verifyPassword({ hash: rows[0].password, password: "Eight8!x" }),
    ).toBe(true);
    expect(
      await verifyPassword({ hash: rows[0].password, password: f.password }),
    ).toBe(false);
    await guest.goto("/login");
    await guest
      .getByLabel("E-mail", { exact: true })
      .fill("e2e-guest@example.test");
    await guest.getByLabel("Senha", { exact: true }).fill(f.password);
    const oldResponse = guest.waitForResponse((r) =>
      r.url().endsWith("/api/auth/sign-in/email"),
    );
    await guest.getByRole("button", { name: "Entrar no BOSS" }).click();
    expect((await oldResponse).status()).toBe(401);
    await expect(guest.locator(".notice[role=alert]")).toContainText(
      "Não foi possível entrar",
    );
    await guest.getByLabel("Senha", { exact: true }).fill("Eight8!x");
    const newResponse = guest.waitForResponse((r) =>
      r.url().endsWith("/api/auth/sign-in/email"),
    );
    await guest.getByRole("button", { name: "Entrar no BOSS" }).click();
    expect((await newResponse).status()).toBe(200);
    await guest.waitForURL("http://localhost:3100/");
    expect((await guest.request.get("/api/boss/me")).status()).toBe(200);
    const sessions = await diagnosticPool.query(
      `SELECT count(*)::int AS count FROM boss_private.session WHERE "userId"=$1 AND "expiresAt">now()`,
      [rows[0].id],
    );
    expect(sessions.rows[0].count).toBe(1);
  } finally {
    await diagnosticPool.end();
  }
  // The added real login probes share localhost's IP. Let the production-rate
  // window expire rather than disabling rate limiting for the MFA check.
  await page.waitForTimeout(61000);
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
