import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PUBLIC_VIEWS: { name: string; path: string }[] = [
  { name: "home / lobby", path: "/" },
  { name: "new game", path: "/new" },
  { name: "404 not-found", path: "/does-not-exist" },
];

for (const view of PUBLIC_VIEWS) {
  test(`${view.name} — no axe violations`, async ({ page }) => {
    await page.goto(view.path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations,
      results.violations
        .map((v) => `${v.id}: ${v.description} (${v.nodes.length} node(s))`)
        .join("\n"),
    ).toEqual([]);
  });
}
