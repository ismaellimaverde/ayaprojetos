import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import type { ModuleDocument } from "../../src/lib/module-fields";

test("shared toolbar targets separate fields, preserves legacy data, reopens formatting and exports full documents", async ({
  page,
  browser,
}, info) => {
  let stored: ModuleDocument = {
    revision: 1,
    fields: {
      purpose: "Propósito original",
      mission: "Missão original",
      vision: "Visão original",
    },
    items: [],
  };
  const project = {
    id: "rich",
    name: "Projeto de teste",
    description: "Descrição única",
    status: "active",
    modules: ["dna"],
    template_version: 1,
  };
  await page.route("**/api/boss/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/module-content/")) {
      if (route.request().method() === "POST") {
        stored = {
          ...route.request().postDataJSON(),
          revision: stored.revision + 1,
        };
        return route.fulfill({ json: { revision: stored.revision } });
      }
      return route.fulfill({
        json: {
          document: stored,
          permissions: ["view", "create", "edit", "delete", "export"],
          archived: false,
        },
      });
    }
    if (path.includes("/project-library/"))
      return route.fulfill({
        json: {
          project_name: project.name,
          documents: [
            {
              area: "dna",
              revision: stored.revision,
              updated_at: "2026-11-04",
              author_name: "Teste",
              can_export: true,
              document: stored,
            },
          ],
        },
      });
    return route.fulfill({
      json: path.endsWith("/me")
        ? {
            user: { name: "Teste" },
            organizations: [{ id: "org", name: "Organização" }],
          }
        : { admin: true, companies: [], projects: [project] },
    });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?workspace=org&project=rich");
  await expect(
    page.getByRole("heading", { name: "Business Plan", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Descrição única", { exact: true })).toHaveCount(
    1,
  );
  const editProject = page.getByRole("button", {
    name: "Editar projeto",
    exact: true,
  });
  await expect(editProject).toBeVisible();
  await page.screenshot({ path: info.outputPath("project-heading.png") });
  expect((await editProject.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await page
    .getByRole("button", { name: "Acessar DNA, identidade e cultura" })
    .click();
  const purpose = page.getByRole("textbox", { name: "Propósito", exact: true });
  const mission = page.getByRole("textbox", { name: "Missão", exact: true });
  await expect(purpose).toHaveText("Propósito original");
  await purpose.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Negrito", exact: true }).click();
  await expect(purpose.locator("strong")).toHaveText("Propósito original");
  await mission.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Itálico", exact: true }).click();
  await expect(mission.locator("em")).toHaveText("Missão original");
  await expect(purpose.locator("em")).toHaveCount(0);
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(mission.locator("em")).toHaveCount(0);
  await expect(purpose.locator("strong")).toHaveCount(1);
  await page.getByRole("button", { name: "Refazer", exact: true }).click();
  await expect(mission.locator("em")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Fonte", exact: true })
    .selectOption("Georgia");
  await expect(mission.locator('[style*="Georgia"]')).toHaveCount(1);
  await expect(
    page.getByRole("group", { name: "Formatação dos campos", exact: true }),
  ).toHaveCount(1);
  // Invalid content in one field cannot be cleared by a valid update in another.
  await purpose.fill("x".repeat(10001));
  await mission.fill("Missão temporária");
  await expect(
    page.getByRole("button", { name: "Salvar informações", exact: true }),
  ).toBeDisabled();
  await purpose.click();
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(purpose.locator("strong")).toHaveText("Propósito original");
  await mission.click();
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(mission.locator("em")).toHaveText("Missão original");
  await expect(
    page.getByRole("button", { name: "Salvar informações", exact: true }),
  ).toBeEnabled();
  await mission.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("rich-fields-desktop.png") });
  await page
    .getByRole("button", { name: "Adicionar item", exact: true })
    .click();
  await page.getByLabel("Título do item", { exact: true }).fill("Evidência");
  await expect(
    page.getByRole("group", { name: "Formatação dos campos", exact: true }),
  ).toHaveCount(0);
  const item = page.getByRole("textbox", {
    name: "Descrição do item 1",
    exact: true,
  });
  await item.fill("Detalhe final");
  await page.keyboard.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Sublinhado", exact: true }).click();
  await page.getByLabel("Período ou data de referência").fill("2026");
  await page
    .getByRole("button", { name: "Salvar informações", exact: true })
    .click();
  await expect(page.locator(".module-page > [role=status]")).toContainText(
    "Informações salvas",
  );
  expect(stored.fields.vision).toBe("Visão original");
  expect(stored.items[0].period).toBe("2026");
  expect(stored.items[0].rich_text_v1).toContain("underline");
  await page.reload();
  await expect(purpose.locator("strong")).toHaveText("Propósito original");
  await expect(mission.locator("em")).toHaveText("Missão original");
  await expect(item.locator("u")).toHaveText("Detalhe final");
  await page.setViewportSize({ width: 390, height: 844 });
  await mission.click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Tachado", exact: true }).click();
  await expect(mission.locator("s")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await mission.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("rich-fields-mobile.png") });
  await page
    .getByRole("button", { name: "Editar projeto", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(mission.locator("s")).toHaveCount(1);
  await page.setViewportSize({ width: 1440, height: 900 });
  const long = Array.from(
    { length: 90 },
    (_, i) => `Linha ${i + 1}: Conteúdo preservado do planejamento.`,
  ).join("\n");
  await item.fill(long);
  await page
    .getByRole("button", { name: "Salvar informações", exact: true })
    .click();
  await expect(page.locator(".module-page > [role=status]")).toContainText(
    "Informações salvas",
  );
  await page.getByRole("button", { name: "Exportar PDF", exact: true }).click();
  const html = await page
    .locator("iframe[data-boss-print]")
    .evaluate(
      (el) =>
        (el as HTMLIFrameElement).contentDocument!.documentElement.outerHTML,
    );
  expect(html).toContain("Linha 90");
  expect(html).toContain("<strong>Propósito original</strong>");
  const print = await browser.newPage();
  await print.setContent(html);
  const pdf = await print.pdf({ format: "A4" });
  expect(
    execFileSync("pdftotext", ["-", "-"], { input: pdf }).toString(),
  ).toContain("Linha 90");
  await print.close();
  await page.getByRole("button", { name: "Fechar área", exact: true }).click();
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Menu do projeto" })
    .getByRole("button", { name: "Biblioteca", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ler Business Plan", exact: true })
    .click();
  await expect(
    page
      .locator(".summary-prose strong")
      .filter({ hasText: "Propósito original" }),
  ).toHaveCount(1);
  await expect(
    page.getByText("Linha 90: Conteúdo preservado do planejamento.", {
      exact: true,
    }),
  ).toHaveCount(1);
});
