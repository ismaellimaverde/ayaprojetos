import { test, expect } from "@playwright/test";

test("sidebar selection, neighboring hover and keyboard focus remain distinct and separated", async ({
  page,
}, testInfo) => {
  await page.route("**/api/boss/**", (route) =>
    route.fulfill({
      json: route.request().url().endsWith("/me")
        ? {
            user: { name: "Teste" },
            organizations: [{ id: "org", name: "Workspace de teste" }],
          }
        : { admin: true, projects: [], companies: [] },
    }),
  );
  await page.goto("/");
  const selected = page.getByRole("button", {
    name: "Visão do portfólio",
    exact: true,
  });
  const neighbor = page.getByRole("button", { name: "Projetos", exact: true });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(selected).toHaveAttribute("aria-current", "page");
    await neighbor.hover();
    const active = await selected.evaluate((el) => ({
      color: getComputedStyle(el, "::before").backgroundColor,
      inset: getComputedStyle(el, "::before").top,
      height: el.getBoundingClientRect().height,
      bottom: el.getBoundingClientRect().bottom,
    }));
    const hover = await neighbor.evaluate((el) => ({
      color: getComputedStyle(el, "::before").backgroundColor,
      top: el.getBoundingClientRect().top,
      ink: getComputedStyle(el).color,
    }));
    expect(active.color).toBe("rgb(239, 156, 131)");
    expect(hover.color).toBe("rgb(251, 229, 221)");
    expect(hover.ink).toBe("rgb(29, 30, 33)");
    expect(active.inset).toBe("5px");
    expect(active.height).toBeGreaterThanOrEqual(44);
    if (width === 1440)
      expect(hover.top - active.bottom).toBeGreaterThanOrEqual(4);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`menu-${width}.png`) });
    await selected.focus();
    await page.keyboard.press("Tab");
    await expect(neighbor).toBeFocused();
    expect(
      await neighbor.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).toBe("solid");
    expect(
      await neighbor.evaluate((el) => getComputedStyle(el).outlineWidth),
    ).toBe("2px");
    await selected.hover();
    expect(
      await selected.evaluate(
        (el) => getComputedStyle(el, "::before").backgroundColor,
      ),
    ).toBe("rgb(239, 156, 131)");
  }
  await page.getByRole("button", { name: "Alternar tema" }).click();
  await neighbor.hover();
  expect(
    await selected.evaluate(
      (el) => getComputedStyle(el, "::before").backgroundColor,
    ),
  ).toBe("rgb(239, 156, 131)");
  expect(
    await neighbor.evaluate(
      (el) => getComputedStyle(el, "::before").backgroundColor,
    ),
  ).toBe("rgb(251, 229, 221)");
  expect(await neighbor.evaluate((el) => getComputedStyle(el).color)).toBe(
    "rgb(29, 30, 33)",
  );
});
