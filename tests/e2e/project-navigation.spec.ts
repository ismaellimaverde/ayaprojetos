import { test, expect } from "@playwright/test";

test("project pages expose authorized shortcuts and guard area, library and workspace navigation", async ({
  page,
}, testInfo) => {
  const projects = [
    {
      id: "project-one",
      name: "Projeto Um",
      modules: ["executive", "dna"],
      status: "active",
      description: "Conteúdo de teste",
      template_version: 1,
    },
    {
      id: "project-two",
      name: "Projeto Dois",
      modules: ["executive"],
      status: "archived",
      template_version: 1,
    },
  ];
  const stored = {
    revision: 1,
    fields: {
      summary_rich_v1: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Texto salvo" }],
          },
        ],
      }),
    },
    items: [],
  };
  let writes = 0;
  await page.route("**/api/boss/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me"))
      return route.fulfill({
        json: {
          user: { name: "Pessoa de teste" },
          organizations: [
            { id: "org", name: "Workspace Um" },
            { id: "other", name: "Workspace Dois" },
          ],
        },
      });
    if (path.includes("/module-content/")) {
      if (route.request().method() === "POST") {
        writes++;
        return route.fulfill({
          status: 500,
          json: { message: "Falha simulada" },
        });
      }
      return route.fulfill({
        json: {
          document: stored,
          permissions: path.includes("project-two")
            ? ["view"]
            : ["view", "edit", "create", "export"],
          archived: path.includes("project-two"),
        },
      });
    }
    if (path.includes("project-library"))
      return route.fulfill({
        json: { project_name: "Projeto Um", documents: [] },
      });
    return route.fulfill({
      json: {
        admin: false,
        projects:
          route.request().headers()["x-organization-id"] === "org"
            ? projects
            : [],
        companies: [],
      },
    });
  });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Projetos", exact: true });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page
    .locator("#project-shortcuts")
    .getByRole("button", { name: "Projeto Um", exact: true })
    .click();
  const nav = page.getByRole("navigation", { name: "Menu do projeto" });
  await expect(
    nav.getByRole("button", {
      name: "Financeiro e controladoria",
      exact: true,
    }),
  ).toHaveCount(0);
  await nav
    .getByRole("button", { name: "Resumo executivo", exact: true })
    .click();
  const editor = page.getByRole("textbox", {
    name: "Resumo executivo",
    exact: true,
  });
  await expect(editor).toHaveText("Texto salvo");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  await expect(page).toHaveURL(
    /workspace=org&project=project-one&area=executive/,
  );
  await page.reload();
  await expect(editor).toHaveText("Texto salvo");
  await editor.fill("Rascunho seguro");
  await nav
    .getByRole("button", { name: "DNA, identidade e cultura", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(editor).toHaveText("Rascunho seguro");
  await expect(page).toHaveURL(/area=executive/);
  await nav.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page
    .getByRole("button", { name: "Salvar e fechar", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toContainText("Falha simulada");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(editor).toHaveText("Rascunho seguro");
  await nav.getByRole("button", { name: "Biblioteca", exact: true }).click();
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Biblioteca do projeto" }),
  ).toBeVisible();
  await nav
    .getByRole("button", { name: "Resumo executivo", exact: true })
    .click();
  await expect(editor).toHaveText("Texto salvo");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.locator("dialog[open]")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const sizes = await page.locator(".module-page").evaluate((el) => ({
      editor: el.getBoundingClientRect().width,
      parent: el.parentElement!.getBoundingClientRect().width,
      maxHeight: getComputedStyle(el).maxHeight,
    }));
    expect(sizes.editor).toBeGreaterThan(sizes.parent * 0.85);
    expect(sizes.maxHeight).toBe("none");
    await page.screenshot({
      path: testInfo.outputPath(`workspace-${width}.png`),
      fullPage: true,
    });
  }
  await editor.fill("Não transferir rascunho");
  await page
    .getByRole("button", { name: "Expandir menu principal", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Expandir menu de áreas", exact: true })
    .click();
  await page
    .locator("#project-shortcuts")
    .getByRole("button", { name: "Projeto Dois · Arquivado", exact: true })
    .click();
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Projeto Dois", exact: true }),
  ).toBeVisible();
  await nav
    .getByRole("button", { name: "Resumo executivo", exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  await expect(page.locator(".module-page")).toContainText("Texto salvo");
  await page
    .getByRole("combobox", { name: "Organização", exact: true })
    .selectOption("other");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Organização", exact: true }),
  ).toHaveValue("org");
  await page
    .getByRole("combobox", { name: "Organização", exact: true })
    .selectOption("other");
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  await expect(page.locator("#project-shortcuts")).not.toContainText(
    "Projeto Um",
  );
  expect(writes).toBe(1);
  await page.goto("/?workspace=org&project=not-authorized&area=executive");
  await expect(page.getByRole("status")).toContainText(
    "Projeto indisponível para este acesso",
  );
  await expect(page.locator(".module-page")).toHaveCount(0);
});

test("revoked project disappearing during refresh does not trap platform navigation", async ({
  page,
}) => {
  let revoked = false;
  const project = {
    id: "revoked-project",
    name: "Projeto temporário",
    modules: ["executive"],
    status: "active",
    template_version: 1,
  };
  await page.route("**/api/boss/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me"))
      return route.fulfill({
        json: {
          user: { name: "Teste" },
          organizations: [{ id: "org", name: "Teste" }],
        },
      });
    if (path.includes("/module-content/")) {
      if (route.request().method() === "POST") {
        revoked = true;
        return route.fulfill({ json: { ok: true } });
      }
      if (revoked)
        return route.fulfill({
          status: 403,
          json: { message: "Acesso revogado" },
        });
      return route.fulfill({
        json: {
          document: { revision: 1, fields: {}, items: [] },
          permissions: ["view", "edit"],
          archived: false,
        },
      });
    }
    return route.fulfill({
      json: { projects: revoked ? [] : [project], companies: [], admin: true },
    });
  });
  await page.goto("/?workspace=org&project=revoked-project&area=executive");
  await page
    .getByRole("textbox", { name: "Resumo executivo", exact: true })
    .fill("Conteúdo isolado");
  await page
    .getByRole("button", { name: "Salvar informações", exact: true })
    .click();
  await expect(page.locator(".module-page")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Visão do portfólio", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seu portfólio, em perspectiva.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Abrir Business Plan", exact: true }),
  ).toHaveCount(0);
});

for (const width of [320, 390, 768, 1280]) {
  test(`restored menus and compact workspace controls preserve editing at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/api/boss/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith("/me"))
        return route.fulfill({
          json: {
            user: { name: "Pessoa de teste" },
            organizations: [{ id: "org", name: "Workspace de teste" }],
          },
        });
      if (path.includes("module-content"))
        return route.fulfill({
          json: {
            document: {
              revision: 1,
              fields: {
                summary_rich_v1: JSON.stringify({
                  type: "doc",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Texto salvo" }],
                    },
                  ],
                }),
              },
              items: [],
            },
            permissions: ["view", "edit", "export"],
            archived: false,
          },
        });
      if (path.includes("project-library"))
        return route.fulfill({ json: { documents: [] } });
      return route.fulfill({
        json: {
          admin: true,
          companies: [],
          projects: [
            {
              id: "project",
              name: "Projeto teste",
              status: "active",
              modules: ["executive", "dna"],
              template_version: 1,
            },
          ],
        },
      });
    });
    await page.goto("/?workspace=org&project=project&area=executive");
    const editor = page.getByRole("textbox", {
      name: "Resumo executivo",
      exact: true,
    });
    await expect(editor).toHaveText("Texto salvo");
    const topbar = page.locator("header.topbar");
    const controls = [
      topbar.getByRole("combobox"),
      topbar.getByRole("button", { name: "Novo workspace", exact: true }),
    ];
    const boxes = await Promise.all(
      controls.map((control) => control.boundingBox()),
    );
    for (const box of boxes) {
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(
        Math.abs(
          box!.y + box!.height / 2 - (boxes[0]!.y + boxes[0]!.height / 2),
        ),
      ).toBeLessThan(3);
    }
    const userbar = page.locator(".platform-userbar");
    const headerBoxes = await Promise.all(
      [
        userbar.locator("#main-menu-toggle"),
        userbar.getByRole("link"),
        userbar.getByRole("button", { name: "Sair", exact: true }),
      ].map((control) => control.boundingBox()),
    );
    for (const box of headerBoxes) {
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(
        Math.abs(
          box!.y +
            box!.height / 2 -
            (headerBoxes[0]!.y + headerBoxes[0]!.height / 2),
        ),
      ).toBeLessThan(3);
    }
    expect(headerBoxes[2]!.x + headerBoxes[2]!.width).toBeGreaterThan(
      width - 25,
    );
    await expect(
      topbar.getByRole("button", { name: "Sair", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Alternar tema" }),
    ).toHaveCount(0);
    await expect(page.locator(".workspace-shell")).toHaveClass(/dark/);
    await expect(page.locator(".platform-userbar a")).toHaveText(
      "Pessoa de teste",
    );
    await topbar
      .getByRole("button", { name: "Novo workspace", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Não salvar", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Fechar", exact: true })
      .click();
    await page.goto("/?workspace=org&project=project&area=executive");
    await expect(editor).toHaveText("Texto salvo");
    await editor.fill("Rascunho preservado");
    await userbar.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(editor).toHaveText("Rascunho preservado");
    const main = page.locator("#main-menu-toggle"),
      areas = page.locator("#area-menu-toggle");
    if (width > 900) {
      await expect(areas).toHaveAttribute("aria-expanded", "true");
      await areas.click();
    }
    await expect(main.locator("svg.lucide-panel-left-open")).toHaveCount(1);
    await expect(areas.locator("svg.lucide-panel-left-open")).toHaveCount(1);
    await expect(page.locator("#primary-navigation")).toBeVisible();
    await expect(page.locator("#area-navigation")).toBeHidden();
    for (const control of [main, areas]) {
      await expect(control).toHaveAttribute("aria-expanded", "false");
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await main.focus();
    await main.press("Enter");
    await expect(page.locator("#primary-navigation")).toBeVisible();
    await expect(page.locator("#area-navigation")).toBeHidden();
    await areas.click();
    await expect(page.locator("#primary-navigation")).toBeVisible();
    await expect(page.locator("#area-navigation")).toBeVisible();
    await page
      .locator("#area-navigation")
      .getByRole("button", { name: "Biblioteca", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(editor).toHaveText("Rascunho preservado");
    await areas.click();
    await expect(page.locator("#area-navigation")).toBeHidden();
    await main.click();
    await expect(main).toHaveAttribute("aria-expanded", "false");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`mobile-menus-${width}.png`),
      fullPage: true,
    });
  });
}
