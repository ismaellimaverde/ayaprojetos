import { test, expect } from "@playwright/test";

test("recovery reports server and connection failures honestly", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("link", { name: "Esqueceu sua senha?" })
    .click();
  await page.waitForURL("**/recover");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("access-test@example.test");
  await page.route("**/api/auth/request-password-reset", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "Internal error" }),
    }),
  );
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue(
    "access-test@example.test",
  );
  await page.getByRole("button", { name: "Solicitar recuperação" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Não foi possível processar",
  );
  await expect(page.getByRole("status")).not.toContainText("serão enviadas");
  await page.unroute("**/api/auth/request-password-reset");
  await page.route("**/api/auth/request-password-reset", (route) =>
    route.abort("failed"),
  );
  await page.getByRole("button", { name: "Solicitar recuperação" }).click();
  await expect(page.getByRole("status")).toContainText("Não foi possível");
  await expect(
    page.getByRole("button", { name: "Solicitar recuperação" }),
  ).toBeEnabled();
});

test("login password visibility can be toggled by keyboard without submitting", async ({ page }) => {
  await page.goto("/login");
  const password = page.locator('#login-password');
  await password.fill("Visibility-only-example");
  await expect(password).toHaveAttribute("type", "password");
  const show = page.getByRole("button", { name: "Mostrar senha", exact: true });
  await show.focus();
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("Visibility-only-example");
  await page.getByRole("button", { name: "Ocultar senha", exact: true }).press("Space");
  await expect(password).toHaveAttribute("type", "password");
  await expect(page).toHaveURL(/\/login$/);
});
