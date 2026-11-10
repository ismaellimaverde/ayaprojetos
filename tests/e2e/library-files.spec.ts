import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("Library file manager stores private files, groups and HTTPS links without changing documents", async ({
  page,
}, info) => {
  page.setDefaultTimeout(20000);
  const f = JSON.parse(await readFile(".data/e2e.json", "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(f.email);
  await page.getByLabel("Senha", { exact: true }).fill(f.password);
  await page.getByRole("button", { name: "Entrar no BOSS" }).click();
  await expect(
    page.getByRole("button", { name: "Novo projeto" }),
  ).toBeVisible();
  const headers = {
    "x-organization-id": f.org,
    origin: "http://localhost:3100",
  };
  const r = await page.request.post("/api/boss/projects", {
    headers,
    data: { name: "Arquivos isolados" },
  });
  expect(r.ok()).toBe(true);
  const project = (await r.json()).id;
  await page.goto(`/?workspace=${f.org}&project=${project}&view=library`);
  const controlWarnings: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("controlled input"))
      controlWarnings.push(message.text());
  });
  const manager = page.getByRole("region", { name: "Gerenciador de arquivos" });
  await expect(manager).toBeVisible();
  await manager
    .getByRole("button", { name: "Nova pasta", exact: true })
    .click();
  let form = manager.getByRole("form", { name: "Nova pasta" });
  await form.getByLabel("Nome", { exact: true }).fill("Campanha");
  await expect(form.getByLabel("Área responsável pelo acesso")).toHaveCount(0);
  await form.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(form).toHaveCount(0);
  await manager
    .getByRole("button", {
      name: "Vídeos Link do Drive ou outro serviço",
      exact: true,
    })
    .click();
  await manager
    .getByRole("button", { name: "Adicionar arquivo ou link" })
    .click();
  form = manager.getByRole("form", { name: "Novo arquivo ou link" });
  await form.getByLabel("Nome", { exact: true }).fill("Vídeo do Drive");
  await expect(form.getByLabel("Como adicionar").locator("option")).toHaveCount(
    1,
  );
  await form
    .getByLabel("Link HTTPS", { exact: true })
    .fill("https://drive.google.com/file/d/fixture/view");
  await form.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(
    manager.getByRole("heading", { name: "Vídeo do Drive", exact: true }),
  ).toBeVisible();
  await manager
    .getByRole("button", {
      name: "Fotos PNG, JPEG, GIF, WebP ou link",
      exact: true,
    })
    .click();
  await manager
    .getByRole("button", { name: "Adicionar arquivo ou link" })
    .click();
  form = manager.getByRole("form", { name: "Novo arquivo ou link" });
  await form.getByLabel("Nome", { exact: true }).fill("Imagem privada");
  await form.getByLabel("Como adicionar").selectOption("upload");
  const image = Buffer.from(
    await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 16;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#EF9C83";
      context.fillRect(0, 0, 16, 16);
      return canvas.toDataURL("image/png").split(",")[1];
    }),
    "base64",
  );
  await form.getByLabel("Arquivo privado").setInputFiles({
    name: "fixture.png",
    mimeType: "image/png",
    buffer: image,
  });
  await form.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(form).toHaveCount(0);
  await page.reload();
  await expect(
    manager.getByRole("heading", { name: "Imagem privada", exact: true }),
  ).toBeVisible();
  const imageRow = manager.locator("article").filter({
    has: page.getByRole("heading", { name: "Imagem privada", exact: true }),
  });
  await imageRow.scrollIntoViewIfNeeded();
  await expect(imageRow.locator('[data-ready="true"]')).toBeVisible();
  await expect(imageRow).toContainText("PNG");
  await expect(imageRow).not.toContainText("Campanha");
  const thumbnailRoute = `**/api/boss/project-files/${project}/file/*`;
  await page.route(thumbnailRoute, (route) =>
    route.fulfill({ status: 403, body: "Forbidden" }),
  );
  await page.reload();
  await imageRow.scrollIntoViewIfNeeded();
  await expect(imageRow.locator(".file-thumbnail-fallback")).toBeVisible();
  await expect(imageRow.locator("canvas")).toBeHidden();
  await page.unroute(thumbnailRoute);
  await page.reload();
  await imageRow.scrollIntoViewIfNeeded();
  await expect(imageRow.locator('[data-ready="true"]')).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await manager.scrollIntoViewIfNeeded();
    await manager
      .getByRole("button", {
        name: "Fotos PNG, JPEG, GIF, WebP ou link",
        exact: true,
      })
      .click();
    await expect(
      manager.getByRole("heading", { name: "Vídeo do Drive", exact: true }),
    ).toHaveCount(0);
    await expect(
      manager.getByRole("heading", { name: "Imagem privada", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`file-manager-${width}.png`),
      fullPage: true,
    });
  }
  await expect(
    imageRow.getByRole("button", { name: "Baixar arquivo", exact: true }),
  ).toHaveAttribute("title", "Baixar arquivo");
  await imageRow
    .getByRole("button", { name: "Baixar arquivo", exact: true })
    .focus();
  await expect(
    imageRow.getByRole("button", { name: "Baixar arquivo", exact: true }),
  ).toBeFocused();
  const download = page.waitForEvent("download");
  await manager
    .getByRole("button", { name: "Baixar arquivo", exact: true })
    .click();
  const d = await download;
  expect(d.suggestedFilename()).toBe("fixture.png");
  const data = await (
    await page.request.get(`/api/boss/project-files/${project}`, { headers })
  ).json();
  expect(data.files).toHaveLength(2);
  const stored = await page.request.get(
    `/api/boss/project-files/${project}/file/${data.files.find((x: { name: string }) => x.name === "Imagem privada").id}`,
    { headers },
  );
  expect(await stored.body()).toEqual(image);
  expect(stored.headers()["cache-control"]).toContain("no-store");
  await expect(manager.getByRole("button", { name: /Organizar / })).toHaveCount(
    0,
  );
  await expect(
    manager.getByRole("button", { name: "Mostrar todas as categorias" }),
  ).toHaveCount(0);
  const photo = manager.locator("article").filter({
    has: page.getByRole("heading", { name: "Imagem privada", exact: true }),
  });
  page.once("dialog", (d) => d.dismiss());
  await photo.getByRole("button", { name: "Excluir arquivo" }).click();
  await expect(photo).toBeVisible();
  page.once("dialog", (d) => {
    expect(d.message()).toContain("Imagem privada");
    expect(d.message()).toContain("lixeira");
    return d.accept();
  });
  await photo.getByRole("button", { name: "Excluir arquivo" }).click();
  await expect(photo).toHaveCount(0);
  await page.reload();
  await manager.getByRole("button", { name: "Lixeira", exact: true }).click();
  await expect(photo).toBeVisible();
  await expect(
    photo.getByRole("button", { name: "Baixar arquivo" }),
  ).toHaveCount(0);
  page.once("dialog", (d) => d.accept());
  await photo.getByRole("button", { name: "Restaurar arquivo" }).click();
  await expect(photo).toHaveCount(0);
  await manager
    .getByRole("button", { name: "Voltar aos arquivos", exact: true })
    .click();
  await expect(photo).toBeVisible();
  await manager
    .getByRole("button", { name: "Adicionar arquivo ou link" })
    .click();
  form = manager.getByRole("form", { name: "Novo arquivo ou link" });
  await form.getByLabel("Nome", { exact: true }).fill("Não salvar");
  page.once("dialog", (d) => d.accept());
  await form.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    manager.getByRole("heading", { name: "Não salvar", exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await (
        await page.request.get(`/api/boss/project-library/${project}`, {
          headers,
        })
      ).json()
    ).documents,
  ).toEqual([]);
  expect(controlWarnings).toEqual([]);
});

for (const width of [1440, 390]) {
  test(`First upload is guided from category cards at ${width}px, with retry and validation`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const f = JSON.parse(await readFile(".data/e2e.json", "utf8"));
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(f.email);
    await page.getByLabel("Senha", { exact: true }).fill(f.password);
    await page.getByRole("button", { name: "Entrar no BOSS" }).click();
    await expect(
      page.getByRole("button", { name: "Novo projeto" }),
    ).toBeVisible();
    const headers = {
      "x-organization-id": f.org,
      origin: "http://localhost:3100",
    };
    const created = await page.request.post("/api/boss/projects", {
      headers,
      data: { name: `First upload ${width}` },
    });
    expect(created.ok()).toBe(true);
    const project = (await created.json()).id;
    const apiPath = `/api/boss/project-files/${project}`;
    await page.goto(`/?workspace=${f.org}&project=${project}&view=library`);
    const manager = page.getByRole("region", {
      name: "Gerenciador de arquivos",
    });
    await expect(
      manager.getByRole("button", { name: "Adicionar arquivo ou link" }),
    ).toBeEnabled();
    const docs = manager.getByRole("button", {
      name: "Documentos PDF ou link de documento",
      exact: true,
    });
    await docs.focus();
    await docs.press("Enter");
    await expect(docs).toHaveAttribute("aria-pressed", "true");
    await manager
      .getByRole("button", { name: "Adicionar arquivo ou link" })
      .click();
    let form = manager.getByRole("form", { name: "Nova pasta" });
    await expect(form.getByLabel("Nome", { exact: true })).toHaveValue(
      "Documentos",
    );
    page.once("dialog", (d) => d.dismiss());
    await form.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(form).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await form.getByRole("button", { name: "Cancelar", exact: true }).click();
    expect(
      (await (await page.request.get(apiPath, { headers })).json()).folders,
    ).toHaveLength(0);
    await manager
      .getByRole("button", { name: "Adicionar arquivo ou link" })
      .click();
    form = manager.getByRole("form", { name: "Nova pasta" });
    await expect(form.getByLabel("Área responsável pelo acesso")).toHaveCount(
      0,
    );
    await form.getByRole("button", { name: "Criar pasta e continuar" }).click();
    form = manager.getByRole("form", { name: "Novo arquivo ou link" });
    await expect(form.getByLabel("Como adicionar")).toHaveValue("upload");
    await expect(
      form.getByRole("combobox", { name: "Categoria", exact: true }),
    ).toHaveCount(0);
    const input = form.getByLabel("Arquivo privado");
    await input.setInputFiles({
      name: "empty.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(0),
    });
    await form.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(manager.getByRole("alert")).toContainText("vazio");
    await input.setInputFiles({
      name: "large.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
    });
    await form.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(manager.getByRole("alert")).toContainText("excede 2 MiB");
    await input.setInputFiles({
      name: "word.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: Buffer.from("not a PDF"),
    });
    await form.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(manager.getByRole("alert")).toContainText("Envie um PDF");
    await input.setInputFiles({
      name: "fake.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("not a PDF"),
    });
    await form.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(manager.getByRole("alert")).toContainText("Formato do anexo");
    // Exercise full-size JSON/base64 transport, not just a tiny image fixture.
    const pdf = Buffer.concat([
      Buffer.from("%PDF-1.4\n%"),
      Buffer.alloc(2 * 1024 * 1024 - 30, 32),
      Buffer.from("\ntrailer\n<<>>\n%%EOF\n"),
    ]);
    expect(pdf.length).toBeLessThanOrEqual(2 * 1024 * 1024);
    await input.setInputFiles([]);
    await expect(input).toHaveValue("");
    await input.setInputFiles({
      name: "fixture.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });
    await form.getByLabel("Nome", { exact: true }).fill("PDF privado");
    let attempts = 0;
    await page.route(`**${apiPath}/items`, async (route) => {
      attempts++;
      if (attempts === 1)
        await route.fulfill({
          status: 503,
          contentType: "text/html",
          body: "Service unavailable",
        });
      else {
        await new Promise((r) => setTimeout(r, 200));
        await route.continue();
      }
    });
    await form.getByRole("button", { name: "Salvar", exact: true }).click();
    await expect(manager.getByRole("alert")).toContainText("HTTP 503");
    await expect(form).toBeVisible();
    await form.getByRole("button", { name: "Salvar", exact: true }).click();
    await form.dispatchEvent("submit");
    await expect(form).toHaveCount(0);
    expect(attempts).toBe(2);
    await page.reload();
    await expect(
      manager.getByRole("heading", { name: "PDF privado", exact: true }),
    ).toBeVisible();
    const pdfRow = manager.locator("article").filter({
      has: page.getByRole("heading", { name: "PDF privado", exact: true }),
    });
    await expect(pdfRow).toContainText("PDF");
    await expect(pdfRow.locator("canvas")).toBeHidden();
    const listing = await (await page.request.get(apiPath, { headers })).json();
    expect(listing.folders).toHaveLength(1);
    expect(listing.files).toHaveLength(1);
    const downloaded = await page.request.get(
      `${apiPath}/file/${listing.files[0].id}`,
      { headers },
    );
    expect(downloaded.ok()).toBe(true);
    expect(await downloaded.body()).toEqual(pdf);
    expect(downloaded.headers()["cache-control"]).toContain("no-store");
    await manager
      .getByRole("button", {
        name: "Vídeos Link do Drive ou outro serviço",
        exact: true,
      })
      .click();
    await manager
      .getByRole("button", { name: "Adicionar arquivo ou link" })
      .click();
    form = manager.getByRole("form", { name: "Novo arquivo ou link" });
    await expect(form.locator('input[type="file"]')).toHaveCount(0);
    await expect(
      form.getByLabel("Como adicionar").locator("option"),
    ).toHaveCount(1);
    await form.getByRole("button", { name: "Cancelar", exact: true }).click();
    await manager
      .getByRole("button", {
        name: "Documentos PDF ou link de documento",
        exact: true,
      })
      .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await manager.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: info.outputPath(`category-cards-${width}.png`),
      fullPage: true,
    });
    expect(
      (
        await (
          await page.request.get(`/api/boss/project-library/${project}`, {
            headers,
          })
        ).json()
      ).documents,
    ).toEqual([]);
  });
}
