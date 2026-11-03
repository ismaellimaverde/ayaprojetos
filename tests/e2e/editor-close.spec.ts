import { test, expect } from "@playwright/test";
test("editor close always offers save, discard and cancel and waits for successful writes", async ({
  page,
}) => {
  const project = {
    id: "close-test",
    name: "Teste de fechamento",
    company_id: null,
    currency: "BRL",
    timezone: "UTC",
    modules: ["executive"],
    status: "active",
    template_version: 1,
  };
  let stored = {
    revision: 1,
    fields: {
      summary_rich_v1: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Conteúdo salvo" }],
          },
        ],
      }),
    },
    items: [],
  };
  let posts = 0;
  let failure = false;
  let release: (() => void) | undefined;
  await page.route("**/api/boss/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("/module-content/")) {
      if (route.request().method() === "POST") {
        posts++;
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        if (failure) {
          await route.fulfill({
            status: 500,
            json: { message: "Falha simulada ao salvar" },
          });
          return;
        }
        stored = {
          ...route.request().postDataJSON(),
          revision: stored.revision + 1,
        };
        await route.fulfill({ json: { revision: stored.revision } });
        return;
      }
      await route.fulfill({
        json: {
          document: stored,
          permissions: ["view", "create", "edit", "export"],
          archived: false,
        },
      });
      return;
    }
    const result = path.endsWith("/me")
      ? {
          user: { name: "Teste" },
          organizations: [
            {
              id: "org",
              name: "Organização de teste",
              workspace_name: "AYA",
              role: "owner",
            },
          ],
        }
      : { admin: true, projects: [project], companies: [] };
    await route.fulfill({ json: result });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir Business Plan" }).click();
  const open = () =>
    page
      .getByRole("button", { name: "Acessar Resumo executivo", exact: true })
      .click();
  const editor = page.getByRole("textbox", {
    name: "Resumo executivo",
    exact: true,
  });
  const close = () =>
    page.getByRole("button", { name: "Fechar área", exact: true }).click();
  await open();
  await expect(editor).toBeVisible();
  await expect(
    page
      .locator(".module-page")
      .getByRole("button", { name: "Recarregar", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".module-page")
      .getByRole("button", { name: "Histórico", exact: true }),
  ).toHaveCount(0);
  await editor.fill("Rascunho descartável");
  await close();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(editor).toHaveText("Rascunho descartável");
  await close();
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  expect(posts).toBe(0);
  await open();
  await expect(editor).toHaveText("Conteúdo salvo");
  await editor.fill("Salvar antes de fechar");
  await close();
  await page
    .getByRole("button", { name: "Salvar e fechar", exact: true })
    .click();
  await expect.poll(() => posts).toBe(1);
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Não salvar", exact: true }),
  ).toBeDisabled();
  release!();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await open();
  await expect(editor).toHaveText("Salvar antes de fechar");
  await editor.fill("Não perder em falha");
  await close();
  failure = true;
  await page
    .getByRole("button", { name: "Salvar e fechar", exact: true })
    .click();
  await expect.poll(() => posts).toBe(2);
  release!();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Falha simulada ao salvar",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(editor).toHaveText("Não perder em falha");
  await close();
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  await open();
  await expect(editor).toHaveText("Salvar antes de fechar");
  await close();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Salvar e fechar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await open();
  await editor.fill("Rascunho cancelado sem tela intermediária");
  await page
    .getByRole("button", { name: "Cancelar edição", exact: true })
    .click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(editor).toHaveText("Rascunho cancelado sem tela intermediária");
  await page
    .getByRole("button", { name: "Cancelar edição", exact: true })
    .click();
  await page.getByRole("button", { name: "Não salvar", exact: true }).click();
  await expect(page.locator(".module-page")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Preencher informações", exact: true }),
  ).toHaveCount(0);
  await open();
  await expect(editor).toHaveText("Salvar antes de fechar");
  expect(posts).toBe(2);
});
