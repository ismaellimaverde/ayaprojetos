import { test, expect } from "@playwright/test";

test("project form hides technical settings and preserves nondefault values on edit", async ({
  page,
}) => {
  const project = {
    id: "existing-project",
    name: "Existing project",
    description: "",
    company_id: null,
    currency: "USD",
    timezone: "America/New_York",
    modules: ["finance"],
    status: "active",
    template_version: 1,
  };
  const writes: Array<{ currency: string; timezone: string }> = [];
  await page.route("**/api/boss/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (route.request().method() !== "GET") {
      writes.push(route.request().postDataJSON());
    } else if (path.endsWith("/me")) {
      body = {
        user: { name: "Layout test" },
        organizations: [
          {
            id: "org-test",
            name: "Test organization",
            workspace_name: "Test workspace",
            role: "owner",
          },
        ],
      };
    } else if (path.endsWith("/overview")) {
      body = { admin: true, projects: [project], companies: [] };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  await expect(page.getByLabel("Moeda", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Timezone", { exact: true })).toHaveCount(0);
  await page.getByLabel("Nome do projeto").fill("New project");
  await page.getByRole("button", { name: "Salvar projeto" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].currency).toBe("BRL");
  expect(writes[0].timezone).toBe("America/Fortaleza");
  await page.getByRole("button", { name: "Abrir Business Plan" }).click();
  await page.getByRole("button", { name: "Editar projeto" }).click();
  await expect(page.getByLabel("Moeda", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Timezone", { exact: true })).toHaveCount(0);
  await page.getByLabel("Nome do projeto").fill("Renamed project");
  await page.getByRole("button", { name: "Salvar projeto" }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1].currency).toBe("USD");
  expect(writes[1].timezone).toBe("America/New_York");
});

test("company selection scopes units, stores one link, and preserves a legacy brand", async ({
  page,
}) => {
  const companies = [
    { id: "c1", name: "Company One", kind: "company", status: "active" },
    { id: "c2", name: "Company Two", kind: "company", status: "active" },
    {
      id: "u1",
      name: "Unit One",
      kind: "unit",
      parent_id: "c1",
      status: "active",
    },
    {
      id: "u2",
      name: "Unit Two",
      kind: "unit",
      parent_id: "c2",
      status: "active",
    },
    { id: "brand", name: "Legacy brand", kind: "brand", status: "active" },
  ];
  const projects = [
    {
      id: "p1",
      name: "Unit project",
      company_id: "u1",
      company_name: "Unit One",
      company_kind: "unit",
      parent_company_id: "c1",
      parent_company_name: "Company One",
      currency: "BRL",
      timezone: "America/Fortaleza",
      modules: ["finance"],
      status: "active",
      template_version: 1,
    },
    {
      id: "p2",
      name: "Brand project",
      company_id: "brand",
      company_name: "Legacy brand",
      company_kind: "brand",
      currency: "USD",
      timezone: "UTC",
      modules: ["finance"],
      status: "active",
      template_version: 1,
    },
  ];
  const writes: Array<{ company_id: string | null }> = [];
  await page.route("**/api/boss/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body: unknown = {};
    if (route.request().method() !== "GET")
      writes.push(route.request().postDataJSON());
    else if (path.endsWith("/me"))
      body = {
        user: { name: "Test" },
        organizations: [{ id: "org", name: "Org", role: "owner" }],
      };
    else if (path.endsWith("/overview"))
      body = { admin: true, projects, companies };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.goto("/");
  await expect(
    page.getByText("Company One · Unit One", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Filtrar por empresa", exact: true })
    .selectOption("c1");
  await expect(
    page.getByRole("heading", { name: "Brand project", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Filtrar por unidade", exact: true })
    .selectOption("u1");
  await expect(
    page.getByRole("heading", { name: "Unit project", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Novo projeto", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Nome do projeto").fill("New unit project");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("combobox", { name: "Empresa", exact: true }).selectOption("c1");
  await expect(
    page.getByRole("combobox", { name: "Unidade (opcional)", exact: true }).locator("option"),
  ).toHaveText(["Sem unidade específica", "Unit One"]);
  await page.getByRole("combobox", { name: "Unidade (opcional)", exact: true }).selectOption("u1");
  await page.getByRole("combobox", { name: "Empresa", exact: true }).selectOption("c2");
  await expect(page.getByRole("combobox", { name: "Unidade (opcional)", exact: true })).toHaveValue("");
  await page.getByRole("combobox", { name: "Unidade (opcional)", exact: true }).selectOption("u2");
  await page.getByRole("button", { name: "Salvar projeto" }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].company_id).toBe("u2");
  await page
    .getByRole("combobox", { name: "Filtrar por empresa", exact: true })
    .selectOption("brand");
  await page.getByRole("button", { name: "Abrir Business Plan" }).click();
  await page.getByRole("button", { name: "Editar projeto" }).click();
  await expect(page.getByRole("combobox", { name: "Empresa", exact: true })).toHaveValue(
    "preserve-current",
  );
  await page.getByRole("button", { name: "Salvar projeto" }).click();
  await expect.poll(() => writes.length).toBe(2);
  expect(writes[1].company_id).toBe("brand");
});
