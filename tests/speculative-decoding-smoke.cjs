// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5174/posts/speculative-decoding.html");

    await page
      .getByRole("heading", {
        name: "DFlash 2: choose a coherent path without rerunning the backbone",
      })
      .waitFor();
    assert.equal(await page.locator(".method-card").count(), 5);
    assert.equal(
      await page.locator(".comparison-card tr:first-child th").count(),
      6,
    );

    await page.getByRole("tab", { name: /DFlash 2/ }).click();
    for (let step = 0; step < 5; step += 1) {
      await page.getByRole("button", { name: "Next" }).click();
    }
    assert.match(await page.locator("#stepCount").textContent(), /6 \/ 6/);
    assert.match(
      await page.locator("#viz").innerText(),
      /Target verifies the selected path/,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "mobile page must not overflow horizontally",
    );
    assert(
      await page
        .locator(".comparison-card .mini-table")
        .evaluate((table) => table.scrollWidth > table.clientWidth),
      "wide comparison must remain horizontally scrollable",
    );
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      "PASS: DFlash 2 section, five-method matrix, six lab steps, mobile table containment; no page errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
