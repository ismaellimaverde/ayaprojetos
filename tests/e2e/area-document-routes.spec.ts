import { test, expect } from "@playwright/test";
import { modules } from "../../src/lib/catalog";
import { moduleFields } from "../../src/lib/module-fields";

test("all direct area routes share document editing layout independent of Library origin", async ({
  page,
}, info) => {
  let editable = true;
  const project = {
    id: "area-layout",
    name: "Projeto de teste",
    status: "active",
    modules: modules.map((m) => m.id),
  };
  await page.route("**/api/boss/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/module-content/")) {
      const area = path.split("/")[5];
      return route.fulfill({
        json: {
          document: {
            revision: 1,
            fields: Object.fromEntries(
              moduleFields[area].map((f) => [
                f.id,
                `Conteúdo salvo de ${f.label}`,
              ]),
            ),
            items: [],
            updated_at: "2026-11-04T12:00:00Z",
          },
          permissions: editable ? ["view", "edit", "export"] : ["view"],
          archived: false,
        },
      });
    }
    return route.fulfill({
      json: path.endsWith("/me")
        ? {
            user: { name: "Teste" },
            organizations: [{ id: "org", name: "Organização" }],
          }
        : { admin: false, companies: [], projects: [project] },
    });
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const area of modules) {
      await page.goto(`/?workspace=org&project=area-layout&area=${area.id}`);
      const surface = page.locator(".module-page");
      await expect(surface.locator(".document-heading h2")).toHaveText(
        `Projeto de teste — ${area.name}`,
      );
      await expect(surface.locator(".document-heading")).toContainText(
        area.description,
      );
      await expect(surface.locator(".document-metadata")).toContainText(
        "Última atualização:",
      );
      await expect(
        surface.locator(".document-identity [data-area-icon]"),
      ).toHaveAttribute("data-area-icon", area.id);
      await expect(
        surface.getByRole("button", {
          name: "Preencher informações",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        surface.getByRole("button", {
          name: "Editar informações",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        surface.locator('[contenteditable="true"]').first(),
      ).toBeVisible();
      await expect(
        surface
          .locator(".document-topbar")
          .getByRole("button", { name: "Exportar PDF", exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (["executive", "dna"].includes(area.id)) {
        await page.screenshot({
          path: info.outputPath(`${area.id}-direct-${width}.png`),
        });
      }
    }
  }
  editable = false;
  await page.goto("/?workspace=org&project=area-layout&area=dna");
  await expect(page.locator(".document-surface")).toContainText(
    "Conteúdo salvo",
  );
  await expect(page.locator('[contenteditable="true"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Exportar PDF", exact: true }),
  ).toHaveCount(0);
});
