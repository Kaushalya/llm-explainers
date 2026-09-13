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
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5174/?explainer=diffusion");
    await page
      .getByRole("heading", { name: "Append a token. Or refine a canvas." })
      .waitFor();
    const basics = page.locator("#dl-basics");
    for (let i = 0; i < 4; i++)
      await basics.getByRole("button", { name: "Next model call" }).click();
    assert.equal(await basics.locator(".masked").count(), 0);
    assert.match(await basics.innerText(), /4\/8 tokens · 4 calls/);
    await basics.getByRole("button", { name: "Reset", exact: true }).click();
    assert.equal(await basics.locator(".masked").count(), 8);
    await basics.getByRole("combobox").selectOption("2");
    for (let i = 0; i < 8; i++)
      await basics.getByRole("button", { name: "Next model call" }).click();
    assert(
      await basics
        .getByRole("button", { name: "Next model call" })
        .isDisabled(),
    );
    await basics.getByRole("button", { name: "No, only next round" }).click();
    assert.match(await basics.locator(".dl-quiz").innerText(), /Correct/);
    const attention = page.locator("#dl-attention");
    await attention.getByRole("button", { name: "AR", exact: true }).click();
    assert.equal(await attention.locator(".visible").count(), 4);
    await attention.getByRole("button", { name: "Block", exact: true }).click();
    assert.equal(await attention.locator(".visible").count(), 4);
    await attention
      .getByRole("button", { name: "Masked", exact: true })
      .click();
    assert.equal(await attention.locator(".visible").count(), 8);
    const training = page.locator("#dl-training");
    await training.getByRole("slider").fill("1");
    assert.equal(await training.locator(".masked").count(), 8);
    assert.match(await training.innerText(), /1.00×/);
    const reverse = page.locator("#dl-reverse");
    assert.match(await reverse.innerText(), /Reveal: 25%/);
    await reverse
      .getByRole("slider", { name: "Earlier noise fraction" })
      .fill("0");
    assert.match(await reverse.innerText(), /Reveal: 100%/);
    await reverse
      .getByRole("slider", { name: "Earlier noise fraction" })
      .fill("1");
    assert.match(await reverse.innerText(), /Reveal: 0%/);
    for (const name of [
      "Continuous",
      "Discrete",
      "Masked",
      "Block",
      "Editable",
    ]) {
      await page
        .locator("#dl-families")
        .getByRole("button", { name, exact: true })
        .click();
      assert(
        (await page
          .locator("#dl-families")
          .getByRole("button", { name, exact: true })
          .getAttribute("aria-pressed")) === "true",
      );
    }
    const editing = page.locator("#dl-editing");
    for (const mode of ["Absorbing", "Remasking", "Levenshtein"]) {
      await editing.getByRole("button", { name: mode, exact: true }).click();
      for (let i = 0; i < 2; i++)
        await editing.getByRole("button", { name: "Next edit" }).click();
      assert.equal(
        await editing.locator(".dl-tokens > span").count(),
        mode === "Levenshtein" ? 6 : 5,
      );
    }
    const cost = page.locator("#dl-tradeoffs");
    assert.match(await cost.innerText(), /1.33×/);
    await cost.getByRole("slider").fill("16");
    assert.match(await cost.innerText(), /0.25×/);
    await page.screenshot({ path: "/tmp/dlm-desktop.png" });
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `overflow at ${width}`,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://127.0.0.1:5174/?explainer=diffusion");
    await page.screenshot({ path: "/tmp/dlm-mobile.png" });
    await page.goto("http://127.0.0.1:5174/");
    assert.equal(await page.locator(".explainer-card").count(), 3);
    await page.getByRole("link", { name: /Diffusion language models/ }).click();
    await page
      .getByRole("heading", { name: "Append a token. Or refine a canvas." })
      .waitFor();
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      "PASS: generation, attention, loss, reverse boundaries, families, editing, quiz, cost, navigation, 4 viewport sizes; no page errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
