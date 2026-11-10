import { test, expect } from "@playwright/test";
for (const width of [320, 390, 1280]) {
  test(`BOSS login offers editable email and inline password eye at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Bem-vindo ao BOSS" }),
    ).toBeVisible();
    const email = page.getByRole("textbox", { name: "E-mail", exact: true });
    await expect(email).toHaveValue("Ismael@ayaprojetos.com.br");
    await expect(email).toHaveAttribute("autocomplete", "username");
    await email.fill("isolated@example.test");
    const password = page.locator("#login-password");
    await expect(password).toHaveValue("");
    await expect(password).toHaveAttribute("autocomplete", "current-password");
    await expect(password).toHaveAttribute("type", "password");
    const eye = page.getByRole("button", {
      name: "Mostrar senha",
      exact: true,
    });
    const field = (await password.boundingBox())!,
      button = (await eye.boundingBox())!;
    expect(button.x).toBeGreaterThanOrEqual(field.x);
    expect(button.x + button.width).toBeLessThanOrEqual(field.x + field.width);
    expect(button.y).toBeGreaterThanOrEqual(field.y);
    expect(button.y + button.height).toBeLessThanOrEqual(
      field.y + field.height,
    );
    await eye.focus();
    await eye.press("Enter");
    await expect(password).toHaveAttribute("type", "text");
    await page
      .getByRole("button", { name: "Ocultar senha", exact: true })
      .click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(email).toHaveValue("isolated@example.test");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
