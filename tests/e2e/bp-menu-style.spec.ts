import { test, expect } from "@playwright/test";
import { modules } from "../../src/lib/catalog";

test("BP menu uses local Montserrat and semantic icons without changing accessible names or visible permissions", async ({
  page,
}, testInfo) => {
  let allowed = modules.map((m) => m.id);
  await page.route("**/api/boss/**", (route) =>
    route.fulfill({
      json: route.request().url().endsWith("/me")
        ? {
            user: { name: "Teste" },
            organizations: [{ id: "org", name: "Workspace de teste" }],
          }
        : {
            admin: false,
            companies: [],
            projects: [
              {
                id: "bp-style",
                name: "Projeto de teste",
                status: "active",
                modules: allowed,
                template_version: 1,
              },
            ],
          },
    }),
  );
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?workspace=org&project=bp-style");
    await expect(
      page.getByRole("heading", { name: "Projeto de teste", exact: true }),
    ).toBeVisible();
    if (width === 390)
      await page
        .getByRole("button", { name: "Expandir menu de áreas", exact: true })
        .click();
    const nav = page.getByRole("navigation", { name: "Menu do projeto" });
    await page.evaluate(() => document.fonts.ready);
    const frequent = nav.getByRole("group", { name: "Acessos frequentes" });
    await expect(frequent.getByRole("button")).toHaveText([
      "Biblioteca",
      "Áreas do projeto",
      "Resumo executivo",
    ]);
    expect(
      await frequent.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).not.toBe("rgba(0, 0, 0, 0)");
    for (const m of modules) {
      const heading = page.getByRole("heading", { name: m.name, exact: true });
      await expect(heading).toHaveCount(1);
      await expect(
        heading.locator(`svg[data-area-icon="${m.id}"]`),
      ).toHaveAttribute("aria-hidden", "true");
      await expect(
        page.getByRole("button", { name: `Acessar ${m.name}`, exact: true }),
      ).toHaveCount(1);
      const button = nav.getByRole("button", { name: m.name, exact: true });
      await expect(button).toHaveCount(1);
      await expect(
        button.locator(`svg[data-area-icon="${m.id}"]`),
      ).toHaveAttribute("aria-hidden", "true");
      expect(
        await button.evaluate((el) => getComputedStyle(el).fontFamily),
      ).toContain("Montserrat");
      expect(
        await button.evaluate((el) => getComputedStyle(el).fontWeight),
      ).toBe("700");
    }
    await expect(nav.locator("svg[data-area-icon]")).toHaveCount(19);
    const paths = await nav
      .locator("svg[data-area-icon]")
      .evaluateAll((nodes) => nodes.map((el) => el.innerHTML));
    expect(new Set(paths).size).toBe(19);
    await page.keyboard.press("Tab");
    await nav
      .getByRole("button", { name: "Resumo executivo", exact: true })
      .focus();
    expect(
      await nav
        .getByRole("button", { name: "Resumo executivo", exact: true })
        .evaluate((el) => getComputedStyle(el).outlineStyle),
    ).toBe("solid");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator(".module").first().scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath(`bp-menu-${width}.png`),
    });
  }
  allowed = ["executive"];
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?workspace=org&project=bp-style");
  const nav = page.getByRole("navigation", { name: "Menu do projeto" });
  await expect(
    nav.getByRole("button", { name: "Resumo executivo", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("button", {
      name: "Financeiro e controladoria",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(nav.locator("svg[data-area-icon]")).toHaveCount(3);
  await expect(page.locator(".module-title svg[data-area-icon]")).toHaveCount(
    1,
  );
  await expect(
    page.getByRole("heading", {
      name: "Financeiro e controladoria",
      exact: true,
    }),
  ).toHaveCount(0);
  allowed = ["finance"];
  await page.goto("/?workspace=org&project=bp-style");
  await expect(
    nav.getByRole("group", { name: "Acessos frequentes" }).getByRole("button"),
  ).toHaveText(["Biblioteca", "Áreas do projeto"]);
  await expect(
    nav.getByRole("button", { name: "Resumo executivo", exact: true }),
  ).toHaveCount(0);
});
