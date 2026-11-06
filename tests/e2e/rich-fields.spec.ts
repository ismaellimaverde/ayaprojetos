import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import type { ModuleDocument } from "../../src/lib/module-fields";

test("single area editor preserves semantic originals, formatting, cancellation and full exports", async ({
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
  const editor = page.locator('[contenteditable="true"]');
  await expect(editor).toHaveCount(1);
  await expect(editor).toContainText("Propósito original");
  await expect(editor).toContainText("Missão original");
  await editor.fill("Documento unificado");
  await editor.press("ControlOrMeta+a");
  await page
    .getByRole("button", { name: "Limpar formatação", exact: true })
    .click();
  await page.getByRole("button", { name: "Negrito", exact: true }).click();
  await expect(editor.locator("strong")).toHaveText("Documento unificado");
  await page.getByRole("button", { name: "Desfazer", exact: true }).click();
  await expect(editor.locator("strong")).toHaveCount(0);
  await page.getByRole("button", { name: "Refazer", exact: true }).click();
  await expect(editor.locator("strong")).toHaveText("Documento unificado");
  await page
    .getByRole("button", { name: "Salvar informações", exact: true })
    .click();
  await expect(page.locator(".module-page > [role=status]")).toContainText(
    "Informações salvas",
  );
  expect(stored.fields.purpose).toBe("Propósito original");
  expect(stored.fields.mission).toBe("Missão original");
  await page.reload();
  await expect(editor.locator("strong")).toHaveText("Documento unificado");
  await page.setViewportSize({ width: 390, height: 844 });
  await editor.fill("Rascunho descartável");
  await page
    .getByRole("button", { name: "Cancelar edição", exact: true })
    .click();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(editor).toHaveText("Rascunho descartável");
  await page
    .getByRole("button", { name: "Cancelar edição", exact: true })
    .click();
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  await page
    .getByRole("button", { name: "Acessar DNA, identidade e cultura" })
    .click();
  await expect(editor.locator("strong")).toHaveText("Documento unificado");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("unified-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
  const long = Array.from(
    { length: 90 },
    (_, i) => `Linha ${i + 1}: Conteúdo preservado do planejamento.`,
  ).join("\n");
  await editor.fill(long);
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
    page.getByText("Linha 90: Conteúdo preservado do planejamento.", {
      exact: true,
    }),
  ).toHaveCount(1);
});
