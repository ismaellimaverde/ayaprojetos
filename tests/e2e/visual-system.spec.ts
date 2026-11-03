import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";

test("shared UI surfaces remain usable across routes and responsive internal screens", async ({
  page,
  browser,
}, testInfo) => {
  await page.route("**/api/auth/get-session", (r) => r.fulfill({ json: null }));
  const project = {
    id: "visual",
    name: "Projeto de revisão visual",
    description: "Conteúdo de teste",
    company_id: null,
    currency: "BRL",
    timezone: "America/Fortaleza",
    modules: ["executive", "dna"],
    status: "active",
    template_version: 1,
  };
  await page.route("**/api/boss/**", (r) => {
    const path = new URL(r.request().url()).pathname;
    const body = path.endsWith("/me")
      ? {
          user: { name: "Equipe de teste" },
          organizations: [
            {
              id: "org",
              name: "Organização de teste",
              workspace_name: "AYA",
              role: "owner",
            },
          ],
        }
      : path.endsWith("/overview")
        ? { admin: true, projects: [project], companies: [] }
        : path.endsWith("/users")
          ? { users: [], invitations: [], grants: [] }
          : path.includes("module-content")
            ? {
                document: {
                  revision: 1,
                  fields: {
                    summary_rich_v1: JSON.stringify({
                      type: "doc",
                      content: Array.from({ length: 100 }, (_, i) => ({
                        type: "paragraph",
                        content: [
                          {
                            type: "text",
                            text: `Parágrafo ${i + 1}: Estratégia e operação — conteúdo sintético para validar paginação.`,
                          },
                        ],
                      })),
                    }),
                  },
                  items: [],
                },
                permissions: ["view", "create", "edit", "export"],
                archived: false,
              }
            : [];
    return r.fulfill({ json: body });
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/login",
      "/recover",
      "/recover?token=synthetic-local-test",
      "/invite",
      "/security",
      "/",
    ]) {
      await page.goto(path);
      await expect(page.locator("body")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(() =>
          document.fonts.check('400 14px "Archivo Variable"'),
        ),
      ).toBe(true);
      expect(
        await page
          .locator("body")
          .evaluate((el) => getComputedStyle(el).fontFamily),
      ).toContain("Archivo Variable");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const input = page.locator("input:visible").first();
      if (await input.count()) {
        await input.focus();
        expect(
          await input.evaluate((el) => getComputedStyle(el).outlineStyle),
        ).not.toBe("none");
      }
      await page.screenshot({
        path: testInfo.outputPath(
          `${width}-${path.replace(/[^a-z]/g, "_") || "home"}.png`,
        ),
        fullPage: true,
      });
    }
    const menuItem = page.locator(".sidebar nav button").first();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(() => document.fonts.check('700 14px "Montserrat"')),
    ).toBe(true);
    expect(
      await menuItem.evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain("Montserrat");
    expect(
      await menuItem.evaluate((el) => getComputedStyle(el).fontWeight),
    ).toBe("700");
    for (const name of [
      "Projetos",
      "Empresas e unidades",
      "Usuários e acessos",
      "Histórico",
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.getByRole("button", { name: "Projetos", exact: true }).click();
    await page
      .getByRole("button", { name: "Novo projeto", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Empresa", exact: true }),
    ).toBeVisible();
    expect(
      await page
        .getByRole("dialog")
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`${width}-project-form.png`),
    });
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Abrir Business Plan", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Acessar Resumo executivo", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Exportar PDF", exact: true })
      .click();
    const frame = page.locator("iframe[data-boss-print]");
    const html = await frame.evaluate(
      (el) =>
        (el as HTMLIFrameElement).contentDocument!.documentElement.outerHTML,
    );
    const print = await browser.newPage();
    await print.setContent(html);
    const file = testInfo.outputPath(`summary-${width}.pdf`);
    await print.pdf({ path: file, preferCSSPageSize: true });
    expect(execFileSync("pdftotext", [file, "-"]).toString()).toContain(
      "Parágrafo 100",
    );
    const pages = Number(
      execFileSync("pdfinfo", [file])
        .toString()
        .match(/Pages:\s+(\d+)/)?.[1],
    );
    expect(pages).toBeGreaterThan(1);
    await print.close();
    await page
      .getByRole("button", { name: "Fechar área", exact: true })
      .click();
    await page.getByRole("button", { name: "Não salvar", exact: true }).click();
    await page
      .getByRole("button", { name: "Alternar tema", exact: true })
      .click();
    await expect(page.locator(".shell")).toHaveClass(/dark/);
    await page.screenshot({ path: testInfo.outputPath(`${width}-dark.png`) });
    await page
      .getByRole("button", { name: "Alternar tema", exact: true })
      .click();
  }
});
