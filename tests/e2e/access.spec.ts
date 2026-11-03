import { test, expect } from "@playwright/test";

test("first access shows failures honestly and offers generic verification resend", async ({
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
  await page.route("**/api/auth/send-verification-email", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      email: "access-test@example.test",
      callbackURL: "/recover",
    });
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ message: "Rate limited" }),
    });
  });
  await page
    .getByRole("button", { name: "Reenviar verificação de e-mail" })
    .click();
  await expect(page.getByRole("status")).toContainText("Muitas tentativas");
  await page.unroute("**/api/auth/send-verification-email");
  await page.route("**/api/auth/send-verification-email", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: '{"status":true}',
    }),
  );
  await page
    .getByRole("button", { name: "Reenviar verificação de e-mail" })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Se houver uma conta elegível",
  );
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
