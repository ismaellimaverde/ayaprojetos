import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { textDocument } from "../../src/lib/rich-fields";
import type { ModuleDocument } from "../../src/lib/module-fields";

test("Library opens source editors, saves with real timestamps, preserves read-only access and scrolls complete documents internally", async ({
  page,
  browser,
}, info) => {
  const long = Array.from(
    { length: 100 },
    (_, i) => `Linha ${i + 1}: Conteúdo do documento de teste.`,
  ).join("\n");
  const docs: Record<string, ModuleDocument> = {
    executive: {
      revision: 1,
      fields: { summary_rich_v1: JSON.stringify(textDocument(long)) },
      items: [],
      updated_at: "2026-11-04T12:34:56Z",
    },
    dna: {
      revision: 1,
      fields: { purpose: "Propósito salvo" },
      items: [],
      updated_at: "2026-11-04T11:22:33Z",
    },
  };
  let editable = true,
    posts = 0;
  const project = {
    id: "library-test",
    name: "Projeto de teste",
    status: "active",
    modules: ["executive", "dna"],
  };
  await page.route("**/api/boss/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/module-content/")) {
      const area = path.split("/")[5];
      if (route.request().method() === "POST") {
        posts++;
        docs[area] = {
          ...route.request().postDataJSON(),
          revision: docs[area].revision + 1,
          updated_at: "2026-11-04T13:45:00Z",
        };
        return route.fulfill({ json: { revision: docs[area].revision } });
      }
      return route.fulfill({
        json: {
          document: docs[area],
          permissions: editable
            ? ["view", "edit", "create", "export"]
            : ["view"],
          archived: false,
        },
      });
    }
    if (path.includes("/project-library/"))
      return route.fulfill({
        json: {
          project_name: project.name,
          documents: Object.entries(docs).map(([area, document]) => ({
            area,
            revision: document.revision,
            updated_at: document.updated_at,
            author_name: "Teste",
            can_export: editable,
            ...(path.includes("complete") ? { document } : {}),
          })),
        },
      });
    return route.fulfill({
      json: path.endsWith("/me")
        ? {
            user: { name: "Teste" },
            organizations: [{ id: "org", name: "Organização" }],
          }
        : { admin: false, companies: [], projects: [project] },
    });
  });
  const openLibrary = () =>
    page.goto("/?workspace=org&project=library-test&view=library");
  await page.setViewportSize({ width: 1440, height: 900 });
  await openLibrary();
  await expect(page.locator(".library-complete")).toBeVisible();
  await expect(page.locator(".library-grid [data-area-icon]")).toHaveCount(2);
  await expect(
    page.getByRole("heading", { name: "Documentos por área" }),
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`library-index-${width}.png`),
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });

  await expect(page.getByText(/Revisão 1/)).toHaveCount(0);
  await expect(page.getByText(/Última atualização: 04\/11\/2026/)).toHaveCount(
    2,
  );
  await page
    .getByRole("button", {
      name: "Abrir documento Resumo executivo",
      exact: true,
    })
    .click();
  const editor = page.getByRole("textbox", {
    name: "Resumo executivo",
    exact: true,
  });
  await expect(editor).toContainText("Linha 100");
  await expect(
    page
      .locator(".document-topbar")
      .getByRole("button", { name: "Exportar PDF", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".document-heading .document-metadata"),
  ).toContainText("Última atualização:");
  await page.screenshot({ path: info.outputPath("area-document-desktop.png") });

  await expect(
    page.getByRole("heading", {
      name: "Projeto de teste — Resumo executivo",
      exact: true,
    }),
  ).toBeVisible();
  expect(await editor.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
  await editor.fill("Conteúdo atualizado na Biblioteca");
  await page
    .getByRole("button", { name: "Salvar informações", exact: true })
    .click();
  await expect(page.locator(".module-page > [role=status]")).toContainText(
    "Informações salvas",
  );
  await expect(page.locator(".module-page")).toContainText(
    "Última atualização:",
  );
  await page.getByRole("button", { name: "Fechar área", exact: true }).click();
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Biblioteca", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Abrir documento Resumo executivo",
      exact: true,
    })
    .click();
  await expect(editor).toHaveText("Conteúdo atualizado na Biblioteca");
  await page.getByRole("button", { name: "Fechar área", exact: true }).click();
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Abrir documento DNA, identidade e cultura",
      exact: true,
    })
    .click();
  const purpose = page.getByRole("textbox", { name: "Propósito", exact: true });
  await expect(purpose).toHaveText("Propósito salvo");
  await purpose.fill(long);
  await page
    .getByRole("button", { name: "Salvar informações", exact: true })
    .click();
  await expect(page.locator(".module-page > [role=status]")).toContainText(
    "Informações salvas",
  );
  await expect(purpose).toContainText("Linha 100");
  await page.getByRole("button", { name: "Fechar área", exact: true }).click();
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page
      .getByRole("button", { name: "Ler Business Plan", exact: true })
      .click();
    const frame = page.locator(".library-workspace .summary-prose");
    await expect(frame).toContainText("Linha 100");
    await expect(page.locator(".library-complete")).toHaveCount(0);
    expect(
      await frame.evaluate((el) => el.scrollHeight > el.clientHeight),
    ).toBe(true);
    expect(await frame.evaluate((el) => el.clientHeight)).toBeLessThanOrEqual(
      680,
    );
    const bounds = await frame.boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(900);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await frame.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await page.screenshot({
      path: info.outputPath(`library-document-${width}.png`),
    });
    await page
      .getByRole("button", { name: "Fechar documento", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "Exportar Business Plan em PDF", exact: true })
    .click();
  const html = await page
    .locator("iframe[data-boss-print]")
    .evaluate(
      (el) =>
        (el as HTMLIFrameElement).contentDocument!.documentElement.outerHTML,
    );
  expect(html).not.toMatch(/revisão 1/i);
  const print = await browser.newPage();
  await print.setContent(html);
  const pdf = await print.pdf({ format: "A4" });
  expect(
    execFileSync("pdftotext", ["-", "-"], { input: pdf }).toString(),
  ).toContain("Linha 100");
  await print.close();
  editable = false;
  docs.executive.updated_at = undefined;
  await openLibrary();
  await expect(
    page.getByText("Última atualização: não informada", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Abrir documento Resumo executivo",
      exact: true,
    })
    .click();
  await expect(editor).toHaveCount(0);
  await expect(page.locator(".module-page .summary-prose")).toHaveText(
    "Conteúdo atualizado na Biblioteca",
  );
  await expect(
    page.getByRole("button", { name: "Salvar informações", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Exportar PDF", exact: true }),
  ).toHaveCount(0);
  expect(posts).toBe(2);
});
