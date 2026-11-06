import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { modules } from "../../src/lib/catalog";

test("dual menus collapse without losing drafts and long text scrolls internally with complete PDF", async ({
  page,
  browser,
}, testInfo) => {
  const project = {
    id: "frame-project",
    name: "Projeto de escrita",
    modules: modules.map((m) => m.id),
    status: "active",
    template_version: 1,
  };
  const longText = Array.from(
    { length: 120 },
    (_, i) =>
      `Parágrafo ${i + 1}: planejamento estratégico, revisão e conteúdo completo.`,
  ).join("\n\n");
  let saved = {
    revision: 1,
    fields: {
      summary_rich_v1: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Texto inicial" }],
          },
        ],
      }),
    },
    items: [],
  };
  await page.route("**/api/boss/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me"))
      return route.fulfill({
        json: {
          user: { name: "Teste" },
          organizations: [{ id: "org", name: "Workspace de teste" }],
        },
      });
    if (path.includes("module-content")) {
      if (route.request().method() === "POST") {
        saved = {
          ...route.request().postDataJSON(),
          revision: saved.revision + 1,
        };
        return route.fulfill({ json: { ok: true } });
      }
      return route.fulfill({
        json: {
          document: saved,
          permissions: ["view", "edit", "create", "export"],
          archived: false,
        },
      });
    }
    return route.fulfill({
      json: { admin: true, projects: [project], companies: [] },
    });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/?workspace=org&project=frame-project&area=executive");
  const editor = page.getByRole("textbox", {
    name: "Resumo executivo",
    exact: true,
  });
  await expect(editor).toBeVisible();
  await page
    .getByRole("button", { name: "Expandir menu principal", exact: true })
    .click();
  const areaNav = page.getByRole("navigation", { name: "Menu do projeto" });
  expect(
    (await areaNav.getByRole("button").allTextContents()).slice(3),
  ).toEqual(
    modules
      .filter((m) => m.id !== "executive")
      .map((m) => m.name)
      .sort((a, b) => a.localeCompare(b, "pt-BR")),
  );
  const first = await areaNav.getByRole("button").nth(2).boundingBox();
  const second = await areaNav.getByRole("button").nth(3).boundingBox();
  expect(second!.y).toBeGreaterThan(first!.y);
  await page.locator(".area-sidebar").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect(
    (await page
      .getByRole("button", { name: "Recolher menu de áreas", exact: true })
      .boundingBox())!.y,
  ).toBeGreaterThanOrEqual(0);
  await editor.fill("Rascunho curto");
  const shortHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  await editor.fill(longText);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight),
  ).toBeLessThanOrEqual(shortHeight + 3);
  const dimensions = await editor.evaluate((el) => ({
    scroll: el.scrollHeight,
    client: el.clientHeight,
    overflow: getComputedStyle(el).overflowY,
  }));
  expect(dimensions.scroll).toBeGreaterThan(dimensions.client * 3);
  expect(dimensions.overflow).toBe("auto");
  await editor.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect(await editor.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Recolher menu principal", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Recolher menu de áreas", exact: true })
    .click();
  await expect(page.locator("#area-navigation")).toBeHidden();
  await expect(editor).toContainText("Parágrafo 120");
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Expandir menu de áreas", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(areaNav).toBeVisible();
  await expect(editor).toContainText("Parágrafo 120");
  await page
    .getByRole("button", { name: "Expandir menu principal", exact: true })
    .click();
  await page.screenshot({ path: testInfo.outputPath("dual-desktop.png") });
  await page
    .getByRole("button", { name: "Salvar informações", exact: true })
    .click();
  await expect(page.locator(".module-page [role=status]")).toContainText(
    "Informações salvas",
  );
  await expect(editor).toContainText("Parágrafo 120");
  await expect(
    page.getByRole("button", { name: "Editar informações", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Exportar PDF", exact: true }).click();
  const html = await page
    .locator("iframe[data-boss-print]")
    .evaluate(
      (el) =>
        (el as HTMLIFrameElement).contentDocument!.documentElement.outerHTML,
    );
  expect(html).toContain("Parágrafo 120");
  const printPage = await browser.newPage();
  await printPage.setContent(html);
  const pdf = await printPage.pdf({ format: "A4", preferCSSPageSize: true });
  expect(
    execFileSync("pdftotext", ["-", "-"], { input: pdf }).toString(),
  ).toContain("Parágrafo 120");
  const info = execFileSync("pdfinfo", ["-"], { input: pdf }).toString();
  expect(Number(info.match(/Pages:\s+(\d+)/)![1])).toBeGreaterThan(1);
  await printPage.close();
  await page.setViewportSize({ width: 390, height: 844 });
  // A fresh page uses compact defaults rather than overriding a user's desktop choice.
  await page.goto("/");
  await page.goto("/?workspace=org&project=frame-project&area=executive");
  await expect(editor).toContainText("Parágrafo 120");
  await expect(
    page.getByRole("button", { name: "Expandir menu principal", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Expandir menu de áreas", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await editor.evaluate((el) => el.clientHeight)).toBeGreaterThanOrEqual(
    240,
  );
  expect(await editor.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
  await page
    .getByRole("button", { name: "Expandir menu de áreas", exact: true })
    .click();
  await expect(areaNav).toBeVisible();
  await page
    .getByRole("button", { name: "Recolher menu de áreas", exact: true })
    .click();
  await page.screenshot({ path: testInfo.outputPath("dual-mobile.png") });
  await editor.fill("Rascunho móvel");
  await page.getByRole("button", { name: "Fechar área", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(editor).toHaveText("Rascunho móvel");
});
