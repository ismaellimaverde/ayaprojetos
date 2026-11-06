import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("private sources persist independently, link selections, reuse across areas and stay out of export", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(180000);
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
    data: { name: "Fontes — teste isolado" },
  });
  expect(created.ok()).toBe(true);
  const project = (await created.json()).id;
  const address = (area: string) =>
    `/?workspace=${fixture.org}&project=${project}&area=${area}`;
  await page.goto(address("executive"));
  await page.getByRole("button", { name: "Fontes", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Fontes da área" });
  await expect(panel).toBeVisible();
  await panel
    .getByRole("button", { name: "Adicionar fonte", exact: true })
    .click();
  await panel.getByLabel("Nome da fonte").fill("Livro interno");
  await panel.getByLabel("Tipo de fonte").selectOption("book");
  await panel.getByLabel("Origem (opcional)").fill("Autor de teste, página 42");
  await panel.getByLabel("Observação (opcional)").fill("PRIVATE_INTERNAL_NOTE");
  await panel
    .getByRole("button", { name: "Salvar fonte", exact: true })
    .click();
  await expect(
    panel.getByRole("heading", { name: "Fontes disponíveis no projeto" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Fechar fontes" }).click();
  // Cancel a source form without touching the editor or already persisted source.
  await page.getByRole("button", { name: "Fontes", exact: true }).click();
  await panel
    .getByRole("button", { name: "Adicionar fonte", exact: true })
    .click();
  await panel.getByLabel("Nome da fonte").fill("Não salvar");
  page.once("dialog", (d) => d.accept());
  await panel.getByRole("button", { name: "Cancelar cadastro" }).click();
  await expect(panel.getByText("Não salvar", { exact: true })).toHaveCount(0);
  await panel.getByRole("button", { name: "Fechar fontes" }).click();
  const editor = page.getByRole("textbox", {
    name: "Resumo executivo",
    exact: true,
  });
  await editor.fill("Frase vinculada à pesquisa");
  await editor.press("ControlOrMeta+a");
  await page
    .getByRole("button", { name: "Vincular fonte", exact: true })
    .click();
  await expect(panel).toContainText("Frase vinculada à pesquisa");
  await panel
    .getByRole("button", { name: "Vincular seleção", exact: true })
    .click();
  await expect(
    panel.getByRole("heading", { name: "Fontes disponíveis no projeto" }),
  ).toBeVisible();
  await panel.getByRole("button", { name: "Fechar fontes" }).click();
  await expect(page.locator(".source-annotation")).toHaveText(
    "Frase vinculada à pesquisa",
  );
  await page
    .getByRole("button", { name: "Salvar informações", exact: true })
    .click();
  await expect(page.locator(".module-page > [role=status]")).toContainText(
    "Informações salvas",
  );
  await page.reload();
  await expect(editor).toContainText("Frase vinculada");
  await expect(page.locator(".source-annotation")).toHaveText(
    "Frase vinculada à pesquisa",
  );
  await page.locator(".source-annotation").click();
  await expect(
    panel.getByRole("heading", { name: "Usos acessíveis" }),
  ).toBeVisible();
  await expect(panel).toContainText("Trecho localizado");
  await panel.getByRole("button", { name: "Fechar fontes" }).click();
  await editor.fill("Frase modificada");
  await expect(page.locator(".source-field-links")).toContainText(
    "alterado, removido",
  );
  await editor.fill("");
  await expect(page.locator(".source-annotation")).toHaveCount(0);
  await expect(page.locator(".source-field-links")).toContainText(
    "alterado, removido",
  );
  await page.getByRole("button", { name: "Fechar área", exact: true }).click();
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  await page.goto(address("executive"));
  await expect(editor).toContainText("Frase vinculada");
  // Real private attachment request, never a public object URL.
  await page.getByRole("button", { name: "Fontes", exact: true }).click();
  await panel
    .getByRole("button", { name: "Adicionar fonte", exact: true })
    .click();
  await panel.getByLabel("Nome da fonte").fill("Print privado");
  await panel.getByLabel("Tipo de fonte").selectOption("image");
  await panel.getByLabel("Anexo privado (até 2 MB)").setInputFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await panel
    .getByRole("button", { name: "Salvar fonte", exact: true })
    .click();
  await expect(
    panel.getByRole("button", { name: "Consultar Print privado", exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("button", { name: "Consultar Print privado", exact: true })
    .click();
  await expect(panel.getByRole("img", { name: "Print privado" })).toBeVisible();
  await panel.getByRole("button", { name: "Fechar fontes" }).click();
  await page.goto(address("dna"));
  await page.getByRole("button", { name: "Fontes", exact: true }).click();
  const book = panel.locator("article").filter({
    has: page.getByRole("heading", { name: "Livro interno", exact: true }),
  });
  await book
    .getByRole("button", { name: "Referência geral", exact: true })
    .dblclick();
  await expect(book).toContainText("Usada nesta área");
  const list = await page.request.get(`/api/boss/sources/${project}/dna`, {
    headers,
  });
  const payload = await list.json();
  expect(payload.sources).toHaveLength(2);
  const saved = payload.sources.find(
    (s: { name: string }) => s.name === "Livro interno",
  );
  expect(
    saved.links.filter((l: { area: string }) => l.area === "dna"),
  ).toHaveLength(1);
  await book
    .getByRole("button", { name: "Consultar Livro interno", exact: true })
    .click();
  await expect(panel).toContainText("DNA, identidade e cultura");
  await expect(panel).toContainText("Resumo executivo");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`sources-${width}.png`) });
  }
  await panel.getByRole("button", { name: "Fechar fontes" }).click();
  const purpose = page.locator('[contenteditable="true"]');
  await purpose.fill("Seleção móvel no propósito");
  await purpose.press("ControlOrMeta+a");
  await page
    .getByRole("button", { name: "Vincular fonte", exact: true })
    .click();
  await panel
    .locator("article")
    .filter({
      has: page.getByRole("heading", { name: "Livro interno", exact: true }),
    })
    .getByRole("button", { name: "Vincular seleção", exact: true })
    .click();
  await expect(panel).not.toContainText("Vincular trecho selecionado");
  await panel.getByRole("button", { name: "Fechar fontes" }).click();
  await page
    .getByRole("button", { name: "Salvar informações", exact: true })
    .click();
  await expect(page.locator(".module-page > [role=status]")).toContainText(
    "Informações salvas",
  );
  await page.reload();
  await expect(purpose).toHaveText("Seleção móvel no propósito");
  await expect(page.locator(".source-annotation")).toHaveText(
    "Seleção móvel no propósito",
  );
  await page.goto(address("executive"));
  await page.getByRole("button", { name: "Exportar PDF", exact: true }).click();
  const html = await page
    .locator("iframe[data-boss-print]")
    .evaluate(
      (el) =>
        (el as HTMLIFrameElement).contentDocument!.documentElement.outerHTML,
    );
  expect(html).toContain("Frase vinculada");
  expect(html).not.toContain("PRIVATE_INTERNAL_NOTE");
  expect(html).not.toContain("Livro interno");
  expect(html).not.toContain("source-annotation");
  const privateId = payload.sources.find(
    (s: { name: string }) => s.name === "Print privado",
  ).id;
  const file = await page.request.get(
    `/api/boss/sources/${project}/executive/file/${privateId}`,
    { headers },
  );
  expect(file.status()).toBe(200);
  expect(file.headers()["cache-control"]).toBe("private, no-store");
  expect(file.headers()["content-disposition"]).toBe("attachment");
  // Additional private media types use the same authenticated binary transport.
  const wav = Buffer.alloc(46);
  wav.write("RIFF");
  wav.writeUInt32LE(38, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(2, 40);
  for (const material of [
    { kind: "audio", mime: "audio/wav", name: "Áudio privado", bytes: wav },
    {
      kind: "pdf",
      mime: "application/pdf",
      name: "PDF privado",
      bytes: Buffer.from("%PDF-1.4\n% isolated test document\n%%EOF"),
    },
  ]) {
    const id = crypto.randomUUID();
    const upload = await page.request.post(
      `/api/boss/sources/${project}/executive`,
      {
        headers,
        data: {
          id,
          name: material.name,
          kind: material.kind,
          mime: material.mime,
          data: material.bytes.toString("base64"),
        },
      },
    );
    expect(upload.status()).toBe(200);
    const fetched = await page.request.get(
      `/api/boss/sources/${project}/executive/file/${id}`,
      { headers },
    );
    expect(await fetched.body()).toEqual(material.bytes);
  }
  await page.getByRole("button", { name: "Fontes", exact: true }).click();
  await panel
    .getByRole("button", { name: "Consultar Áudio privado", exact: true })
    .click();
  await expect(panel.locator("audio[controls]")).toBeVisible();
  await panel
    .getByRole("button", { name: "Consultar PDF privado", exact: true })
    .click();
  await expect(
    panel.getByRole("link", { name: "Baixar anexo privado", exact: true }),
  ).toBeVisible();
  await expect(panel.locator("iframe")).toHaveCount(0);
  await panel.getByRole("button", { name: "Fechar fontes" }).click();
  const outsider = await browser.newContext();
  const denied = await outsider.request.get(
    `http://localhost:3100/api/boss/sources/${project}/executive/file/${privateId}`,
    { headers },
  );
  expect(denied.status()).toBe(401);
  await outsider.close();
});
