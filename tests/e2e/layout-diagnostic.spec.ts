import { test, expect } from "@playwright/test";
import { modules } from "../../src/lib/catalog";

test("project layout has three independent desktop columns and compact mobile states", async ({
  page,
}, testInfo) => {
  const project = {
    id: "layout-proof",
    name: "Projeto de diagnóstico local",
    modules: modules.map((m) => m.id),
    status: "active",
    template_version: 1,
  };
  await page.route("**/api/boss/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("/me")
      ? {
          user: { name: "Teste local" },
          organizations: [{ id: "org", name: "Workspace de teste" }],
        }
      : path.includes("module-content")
        ? {
            document: {
              revision: 1,
              fields: {
                summary_rich_v1: JSON.stringify({
                  type: "doc",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Evidência local com dados sintéticos",
                        },
                      ],
                    },
                  ],
                }),
              },
              items: [],
            },
            permissions: ["view", "edit", "export"],
            archived: false,
          }
        : { admin: true, projects: [project], companies: [] };
    return route.fulfill({ json: data });
  });
  for (const width of [1440, 1024, 901, 900, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/?workspace=org&project=layout-proof&area=executive");
    await expect(
      page.getByRole("textbox", { name: "Resumo executivo", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".project-menu")).toHaveCount(0);
    const primary = page.locator(".primary-sidebar"),
      areas = page.locator(".area-sidebar"),
      work = page.locator(".main");
    if (width > 900) {
      expect((await primary.boundingBox())!.width).toBe(68);
      expect((await areas.boundingBox())!.width).toBe(230);
      const workspace = await work.boundingBox();
      expect(workspace!.width).toBe(width - 298);
      await page.screenshot({
        path: testInfo.outputPath(`default-compact-${width}.png`),
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Expandir menu principal", exact: true })
        .click();
    }
    const p = await primary.boundingBox(),
      a = await areas.boundingBox(),
      w = await work.boundingBox();
    if (width > 900) {
      expect(p!.x + p!.width).toBeLessThanOrEqual(a!.x + 1);
      expect(a!.x + a!.width).toBeLessThanOrEqual(w!.x + 1);
      await expect(
        page.getByRole("button", {
          name: "Recolher menu principal",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Recolher menu de áreas",
          exact: true,
        }),
      ).toBeVisible();
      const names = await page
        .locator("#area-navigation")
        .getByRole("button")
        .allTextContents();
      expect(names.slice(2)).toEqual(
        modules.map((m) => m.name).sort((x, y) => x.localeCompare(y, "pt-BR")),
      );
      await page
        .getByRole("button", { name: "Recolher menu principal", exact: true })
        .click();
      expect((await primary.boundingBox())!.width).toBe(68);
      expect((await areas.boundingBox())!.width).toBe(230);
      await page
        .getByRole("button", { name: "Recolher menu de áreas", exact: true })
        .click();
      expect((await areas.boundingBox())!.width).toBe(60);
      expect((await primary.boundingBox())!.width).toBe(68);
      await page
        .getByRole("button", { name: "Expandir menu principal", exact: true })
        .click();
      expect((await primary.boundingBox())!.width).toBe(246);
      expect((await areas.boundingBox())!.width).toBe(60);
      await page
        .getByRole("button", { name: "Expandir menu de áreas", exact: true })
        .click();
    } else {
      await expect(
        page.getByRole("button", {
          name: "Expandir menu principal",
          exact: true,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Expandir menu de áreas",
          exact: true,
        }),
      ).toBeVisible();
      expect(w!.y).toBeGreaterThan(a!.y);
      await page
        .getByRole("button", { name: "Expandir menu de áreas", exact: true })
        .click();
      await expect(page.locator("#area-navigation")).toBeVisible();
      await expect(
        page.getByRole("button", {
          name: "Expandir menu principal",
          exact: true,
        }),
      ).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`layout-${width}.png`),
      fullPage: true,
    });
  }
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Seu portfólio, em perspectiva.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".area-sidebar")).toHaveCount(0);
});
