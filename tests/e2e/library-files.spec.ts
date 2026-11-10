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
  await expect(
    page
      .getByRole("region", { name: "Biblioteca do projeto" })
      .locator("header .document-breadcrumb"),
  ).toHaveCount(0);
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
  const previewButton = imageRow.getByRole("button", {
    name: "Visualizar arquivo",
    exact: true,
  });
  await expect(previewButton.locator("svg.lucide-search")).toHaveCount(1);
  await previewButton.click();
  const previewDialog = page.getByRole("dialog", {
    name: "Visualizar arquivo: Imagem privada",
    exact: true,
  });
  await expect(previewDialog.locator("canvas")).toBeVisible();
  await previewDialog.press("Escape");
  await expect(previewDialog).toHaveCount(0);
  await expect(previewButton).toBeFocused();
  await previewButton.click();
  await expect(previewDialog.locator("canvas")).toBeVisible();
  await previewDialog
    .getByRole("button", { name: "Fechar visualização" })
    .click();
  const search = manager.getByLabel("Buscar arquivo", { exact: true });
  await search.fill("IMÁGEM");
  await expect(imageRow).toBeVisible();
  await expect(
    manager.getByRole("heading", { name: "Vídeo do Drive", exact: true }),
  ).toHaveCount(0);
  await search.fill("inexistente");
  await expect(imageRow).toHaveCount(0);
  await expect(manager.getByRole("status")).toHaveText(
    "Nenhum arquivo corresponde à busca nesta seleção.",
  );
  await search.fill("");
  await expect(imageRow).toBeVisible();
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
    const filterBox = await manager.locator(".file-filters").boundingBox();
    const listBox = await manager.locator(".file-list").boundingBox();
    expect(filterBox!.width / listBox!.width).toBeCloseTo(
      width > 650 ? 0.5 : 1,
      1,
    );
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
  const deleteButton = photo.getByRole("button", {
    name: "Excluir arquivo",
    exact: true,
  });
  await expect(deleteButton).toHaveText("");
  await expect(deleteButton).toHaveAttribute("title", "Excluir arquivo");
  await expect(deleteButton.locator("svg.lucide-trash-2")).toHaveCount(1);
  await deleteButton.focus();
  await expect(deleteButton).toBeFocused();
  page.once("dialog", (d) => d.dismiss());
  await deleteButton.press("Enter");
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
  await search.fill("IMÁGEM");
  await expect(photo).toBeVisible();
  await search.fill("vídeo");
  await expect(photo).toHaveCount(0);
  await expect(manager.getByRole("status")).toContainText(
    "corresponde à busca",
  );
  await search.fill("");
  await expect(photo).toBeVisible();
  const trashTitle = manager.getByRole("heading", {
    name: "Lixeira",
    exact: true,
  });
  await expect(trashTitle).toBeVisible();
  await expect(trashTitle.locator('svg[aria-hidden="true"]')).toHaveCount(1);
  await expect(
    manager.getByRole("heading", { name: / · Lixeira/ }),
  ).toHaveCount(0);
  await expect(manager.locator("p.notice")).toHaveText(
    "Arquivos na lixeira podem ser restaurados por quem tem permissão de exclusão.",
  );
  await expect(manager).not.toContainText("Continuam ocupando a quota.");
  await expect(manager).not.toContainText("Nenhum arquivo externo é apagado.");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await trashTitle.scrollIntoViewIfNeeded();
    await expect(trashTitle).toBeVisible();
    const back = manager.getByRole("button", {
      name: "Voltar aos arquivos",
      exact: true,
    });
    await expect(back.locator("svg.lucide-arrow-left")).toHaveCount(1);
    await expect(back.locator("svg.lucide-trash-2")).toHaveCount(0);
    await expect(trashTitle.locator("svg.lucide-trash-2")).toHaveCount(1);
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(
      (await back.locator("span").boundingBox())!.height,
    ).toBeLessThanOrEqual(36);
    const categoryBottom = await manager
      .locator(".file-categories")
      .boundingBox();
    const headerBox = await manager
      .locator(".file-trash-heading")
      .boundingBox();
    expect(
      headerBox!.y - categoryBottom!.y - categoryBottom!.height,
    ).toBeGreaterThanOrEqual(24);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`trash-heading-${width}.png`),
    });
  }
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
    await expect(
      manager
        .locator(".file-folder-section")
        .getByRole("heading", { name: "Documentos", exact: true }),
    ).toBeVisible();
    await manager
      .getByRole("button", { name: "Adicionar arquivo ou link" })
      .click();
    let form = manager.getByRole("form", { name: "Nova pasta" });
    await expect(form.getByLabel("Nome", { exact: true })).toHaveValue(
      "Documentos",
    );
    const widthRatio = await form.evaluate((el) => {
      const style = getComputedStyle(el);
      return (
        el.querySelector("label")!.getBoundingClientRect().width /
        (el.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight))
      );
    });
    expect(widthRatio).toBeCloseTo(width > 650 ? 0.5 : 1, 1);
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
    const fieldRatios = await form.evaluate((el) => {
      const style = getComputedStyle(el);
      const available =
        el.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight);
      return [...el.querySelectorAll(":scope > label")].map(
        (label) => label.getBoundingClientRect().width / available,
      );
    });
    for (const ratio of fieldRatios)
      expect(ratio).toBeCloseTo(width > 650 ? 0.5 : 1, 1);
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
    await expect(manager.getByRole("alert")).toContainText(
      "2,10 MB (2.097.152 bytes)",
    );
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

test("Private PDF preview renders a bounded canvas, handles denied reads and preserves downloads", async ({
  page,
}) => {
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
  const p = await page.request.post("/api/boss/projects", {
    headers,
    data: { name: "Prévia isolada" },
  });
  const project = (await p.json()).id;
  const folder = crypto.randomUUID();
  const id = crypto.randomUUID();
  const base = `/api/boss/project-files/${project}`;
  expect(
    (
      await page.request.post(`${base}/folders`, {
        headers,
        data: { id: folder, name: "Prévia" },
      })
    ).ok(),
  ).toBe(true);
  const stream = "0.9 0.6 0.5 rg 0 0 100 100 re f\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 5\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  expect(
    (
      await page.request.post(`${base}/items`, {
        headers,
        data: {
          id,
          folder_id: folder,
          name: "PDF seguro",
          category: "document",
          mime: "application/pdf",
          filename: "fixture.pdf",
          data: Buffer.from(pdf).toString("base64"),
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await page.request.post(`${base}/items`, {
        headers,
        data: {
          id: crypto.randomUUID(),
          folder_id: folder,
          name: "Link externo",
          category: "document",
          url: "https://example.org/document.pdf",
        },
      })
    ).ok(),
  ).toBe(true);
  await page.goto(`/?workspace=${f.org}&project=${project}&view=library`);
  const manager = page.getByRole("region", { name: "Gerenciador de arquivos" });
  const row = manager.locator("article").filter({
    has: page.getByRole("heading", { name: "PDF seguro", exact: true }),
  });
  await expect(
    manager
      .locator("article")
      .filter({
        has: page.getByRole("heading", { name: "Link externo", exact: true }),
      })
      .getByRole("button", { name: "Visualizar arquivo" }),
  ).toHaveCount(0);
  const button = row.getByRole("button", {
    name: "Visualizar arquivo",
    exact: true,
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await button.click();
    const dialog = page.getByRole("dialog", {
      name: "Visualizar arquivo: PDF seguro",
      exact: true,
    });
    await expect(dialog.locator("canvas")).toBeVisible();
    await expect(dialog).toHaveAccessibleDescription(
      "Visualização somente da primeira página do PDF.",
    );
    await expect(dialog.locator(".private-preview-controls p")).toHaveCount(0);
    await expect(
      dialog.getByText(
        "Prévia da primeira página, sem links ou ações do PDF.",
        { exact: false },
      ),
    ).toHaveCount(0);
    await expect(
      dialog.getByText("Baixe o arquivo para consultar todas as páginas.", {
        exact: false,
      }),
    ).toHaveCount(0);
    await expect(dialog.locator("iframe, a")).toHaveCount(0);
    expect(
      await dialog
        .locator("canvas")
        .evaluate((c: HTMLCanvasElement) => Math.max(c.width, c.height)),
    ).toBeLessThanOrEqual(1200);
    await dialog.press("Escape");
    await expect(button).toBeFocused();
  }
  await page.route(`**${base}/file/${id}`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.abort();
  });
  await button.click();
  const loadingDialog = page.getByRole("dialog", {
    name: "Visualizar arquivo: PDF seguro",
    exact: true,
  });
  await expect(loadingDialog.getByRole("status")).toContainText("Carregando");
  await loadingDialog.press("Escape");
  await expect(loadingDialog).toHaveCount(0);
  await page.unroute(`**${base}/file/${id}`);
  await page.route(`**${base}/file/${id}`, (route) =>
    route.fulfill({ status: 403, body: "Forbidden" }),
  );
  await button.click();
  const dialog = page.getByRole("dialog", {
    name: "Visualizar arquivo: PDF seguro",
    exact: true,
  });
  await expect(dialog.getByRole("status")).toContainText("indisponível");
  await expect(dialog.locator("canvas")).toBeHidden();
  await dialog.getByRole("button", { name: "Fechar visualização" }).click();
  await page.unroute(`**${base}/file/${id}`);
  const downloaded = await page.request.get(`${base}/file/${id}`, { headers });
  expect(await downloaded.body()).toEqual(Buffer.from(pdf));
});

test("Preview fits portrait, landscape and square images and multipage PDFs within each viewport", async ({
  page,
}, info) => {
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
  const project = (
    await (
      await page.request.post("/api/boss/projects", {
        headers,
        data: { name: "Preview dimensions" },
      })
    ).json()
  ).id;
  const folder = crypto.randomUUID();
  const base = `/api/boss/project-files/${project}`;
  expect(
    (
      await page.request.post(`${base}/folders`, {
        headers,
        data: { id: folder, name: "Geometria" },
      })
    ).ok(),
  ).toBe(true);
  const fixtures: { name: string; ratio: number }[] = [];
  for (const [w, h] of [
    [300, 1000],
    [1000, 300],
    [600, 600],
  ]) {
    for (const kind of ["image", "document"]) {
      const name = `${kind} ${w}x${h}`;
      let data: string;
      if (kind === "image")
        data = await page.evaluate(
          ([width, height]) => {
            const c = document.createElement("canvas");
            c.width = width;
            c.height = height;
            const ctx = c.getContext("2d")!;
            ctx.fillStyle = "#EF9C83";
            ctx.fillRect(0, 0, width, height);
            return c.toDataURL("image/png").split(",")[1];
          },
          [w, h],
        );
      else {
        const stream = "0.9 0.6 0.5 rg 0 0 100 100 re f\n";
        const objects = [
          "<< /Type /Catalog /Pages 2 0 R >>",
          "<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents 5 0 R >>`,
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents 5 0 R >>`,
          `<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
        ];
        let pdf = "%PDF-1.4\n";
        const offsets: number[] = [];
        objects.forEach((o, i) => {
          offsets.push(Buffer.byteLength(pdf));
          pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
        });
        const xref = Buffer.byteLength(pdf);
        pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
        data = Buffer.from(pdf).toString("base64");
      }
      expect(
        (
          await page.request.post(`${base}/items`, {
            headers,
            data: {
              id: crypto.randomUUID(),
              folder_id: folder,
              name,
              category: kind,
              mime: kind === "image" ? "image/png" : "application/pdf",
              filename: kind === "image" ? "fixture.png" : "fixture.pdf",
              data,
            },
          })
        ).ok(),
      ).toBe(true);
      fixtures.push({ name, ratio: w / h });
    }
  }
  await page.goto(`/?workspace=${f.org}&project=${project}&view=library`);
  const manager = page.getByRole("region", { name: "Gerenciador de arquivos" });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const fixture of fixtures) {
      const row = manager.locator("article").filter({
        has: page.getByRole("heading", { name: fixture.name, exact: true }),
      });
      const button = row.getByRole("button", {
        name: "Visualizar arquivo",
        exact: true,
      });
      await button.click();
      const modal = page.getByRole("dialog", {
        name: `Visualizar arquivo: ${fixture.name}`,
        exact: true,
      });
      const canvas = modal.locator("canvas");
      await expect(canvas).toBeVisible();
      await expect
        .poll(async () => {
          const b = await canvas.boundingBox();
          return b!.width / b!.height;
        })
        .toBeCloseTo(fixture.ratio, 1);
      const close = modal.getByRole("button", { name: "Fechar visualização" });
      const box = (await modal.boundingBox())!,
        control = (await close.boundingBox())!;
      const rendered = (await canvas.boundingBox())!;
      expect(box.width).toBeLessThanOrEqual(Math.max(208, rendered.width) + 34);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(control.x - box.x).toBeGreaterThanOrEqual(12);
      expect(
        box.x + box.width - control.x - control.width,
      ).toBeGreaterThanOrEqual(12);
      expect(control.y - box.y).toBeGreaterThanOrEqual(12);
      expect(control.height).toBeGreaterThanOrEqual(44);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (fixture.name.startsWith("image 300"))
        await page.screenshot({
          path: info.outputPath(`fitted-preview-${width}.png`),
        });
      await close.click();
      await expect(modal).toHaveCount(0);
      await expect(button).toBeFocused();
    }
  }
});
