import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

test("source linking is absent while private materials and historical uses remain intact", async ({
  page,
}) => {
  const fixture = JSON.parse(await readFile(".data/e2e.json", "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixture.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Entrar no BOSS" }).click();
  await expect(
    page.getByRole("button", { name: "Novo projeto" }),
  ).toBeVisible();
  const headers = {
    "x-organization-id": fixture.org,
    origin: "http://localhost:3100",
  };
  const created = await page.request.post("/api/boss/projects", {
    headers,
    data: { name: "Historical source fixture" },
  });
  expect(created.ok()).toBe(true);
  const project = (await created.json()).id;
  const path = `/api/boss/sources/${project}/dna`;
  const id = randomUUID();
  const attachment = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  );
  expect(
    (
      await page.request.post(path, {
        headers,
        data: {
          id,
          name: "Arquivo histórico",
          kind: "image",
          mime: "image/png",
          filename: "fixture.png",
          data: attachment.toString("base64"),
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post(`${path}/links`, {
        headers,
        data: {
          id: randomUUID(),
          source_id: id,
          field: "purpose",
          quote: "Trecho histórico",
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post(`/api/boss/module-content/${project}/dna`, {
        headers,
        data: {
          revision: 0,
          fields: { purpose: "Trecho histórico" },
          items: [],
        },
      })
    ).ok(),
  ).toBe(true);
  const before = (await (await page.request.get(path, { headers })).json())
    .sources[0];
  const linkRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/links") && r.method() !== "GET")
      linkRequests.push(r.method());
  });
  await page.goto(`/?workspace=${fixture.org}&project=${project}&area=dna`);
  const editor = page.locator('[contenteditable="true"]');
  await expect(editor).toContainText("Trecho histórico");
  await editor.click();
  await editor.press("ControlOrMeta+a");
  await expect(
    page.getByRole("button", {
      name: /Vincular|Referência geral|Remover vínculo/,
    }),
  ).toHaveCount(0);
  await expect(
    page.locator(
      ".source-annotation, .source-field-links, .source-field-actions",
    ),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Fontes", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Fontes da área" });
  await panel
    .getByRole("button", { name: "Consultar Arquivo histórico", exact: true })
    .click();
  await expect(
    panel.getByRole("link", { name: "Baixar anexo privado" }),
  ).toBeVisible();
  await expect(
    panel.getByText("Trecho histórico", { exact: true }),
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      panel.getByRole("button", {
        name: /Vincular|Referência geral|Remover vínculo/,
      }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await panel
    .getByRole("button", { name: "Adicionar fonte", exact: true })
    .click();
  await panel.getByLabel("Nome da fonte").fill("Livro independente");
  await panel.getByLabel("Tipo de fonte").selectOption("book");
  await panel
    .getByRole("button", { name: "Salvar fonte", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Consultar Livro independente" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Fechar fontes" }).click();
  await editor.fill("Documento atualizado sem vinculação");
  await page
    .getByRole("button", { name: "Salvar informações", exact: true })
    .click();
  await expect(page.locator(".module-page > [role=status]")).toContainText(
    "Informações salvas",
  );
  await page.reload();
  await expect(editor).toHaveText("Documento atualizado sem vinculação");
  const after = (await (await page.request.get(path, { headers })).json())
    .sources;
  expect(
    after
      .find((s: { id: string }) => s.id === id)
      .links.map((link: { status?: string }) => {
        const stored = { ...link };
        delete stored.status;
        return stored;
      }),
  ).toEqual(
    before.links.map((link: { status?: string }) => {
      const stored = { ...link };
      delete stored.status;
      return stored;
    }),
  );
  expect(
    after.find((s: { name: string }) => s.name === "Livro independente").links,
  ).toEqual([]);
  expect(linkRequests).toEqual([]);
  const file = await page.request.get(`${path}/file/${id}`, { headers });
  expect(await file.body()).toEqual(attachment);
  await page.getByRole("button", { name: "Exportar PDF", exact: true }).click();
  const html = await page
    .locator("iframe[data-boss-print]")
    .evaluate(
      (el) => (el as HTMLIFrameElement).contentDocument!.body.textContent,
    );
  expect(html).toContain("Documento atualizado sem vinculação");
  expect(html).not.toContain("Arquivo histórico");
  expect(html).not.toContain("Livro independente");
});
