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
  await form
    .getByLabel("Área responsável pelo acesso")
    .selectOption("marketing");
  await form.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(form).toHaveCount(0);
  await manager
    .getByRole("button", { name: "Adicionar arquivo ou link" })
    .click();
  form = manager.getByRole("form", { name: "Novo arquivo ou link" });
  await form.getByLabel("Nome", { exact: true }).fill("Vídeo do Drive");
  await form
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("video");
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
    .getByRole("button", { name: "Adicionar arquivo ou link" })
    .click();
  form = manager.getByRole("form", { name: "Novo arquivo ou link" });
  await form.getByLabel("Nome", { exact: true }).fill("Imagem privada");
  await form
    .getByRole("combobox", { name: "Categoria", exact: true })
    .selectOption("image");
  await form.getByLabel("Como adicionar").selectOption("upload");
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
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
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await manager.scrollIntoViewIfNeeded();
    await manager.getByLabel("Categoria exibida").selectOption("image");
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
  await manager
    .getByRole("button", { name: "Nova pasta", exact: true })
    .click();
  form = manager.getByRole("form", { name: "Nova pasta" });
  await form.getByLabel("Nome", { exact: true }).fill("Entrega");
  await form
    .getByLabel("Área responsável pelo acesso")
    .selectOption("marketing");
  await form.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(form).toHaveCount(0);
  await manager
    .getByRole("button", { name: "Organizar Imagem privada", exact: true })
    .click();
  form = manager.getByRole("form", { name: "Organizar arquivo" });
  await form.getByLabel("Nome", { exact: true }).fill("Imagem final");
  await form
    .getByRole("combobox", { name: "Pasta", exact: true })
    .selectOption({ label: "Entrega — Marketing e growth" });
  await form.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(form).toHaveCount(0);
  await page.reload();
  await expect(
    manager.getByRole("heading", { name: "Imagem final", exact: true }),
  ).toBeVisible();
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
