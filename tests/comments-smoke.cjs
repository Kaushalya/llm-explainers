// PLAYWRIGHT_MODULE and BASE_URL can point to a local browser runtime/server.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.BASE_URL || "http://127.0.0.1:5174";
  async function select(selector) {
    return page
      .locator(selector)
      .first()
      .evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        return range.toString();
      });
  }
  try {
    for (const [route, passage] of [
      ["/?explainer=diffusion", "#dl-basics h2"],
      ["/?explainer=speculative-decoding", ".panel h2"],
      ["/posts/quantization-explainer.html", "#why h2"],
      ["/posts/speculative-decoding.html", "#overview h2"],
    ]) {
      await page.goto(base + route);
      await page
        .getByRole("button", { name: "Comments · 0", exact: true })
        .waitFor();
      const quote = await select(passage);
      await page
        .getByRole("button", { name: "+ Add comment", exact: true })
        .click();
      assert.equal(
        await page.locator(".tc-panel blockquote").textContent(),
        quote,
      );
      assert(
        await page
          .getByRole("button", { name: "Save comment", exact: true })
          .isDisabled(),
      );
      await page
        .getByLabel("New comment", { exact: true })
        .fill("A useful note <script>alert(1)</script>");
      await page
        .getByRole("button", { name: "Save comment", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Close comments", exact: true })
        .click();
      await page
        .locator(passage)
        .first()
        .evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.locator(".tc-marker").waitFor();
      await page.reload();
      await page
        .locator(passage)
        .first()
        .evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.locator(".tc-marker").waitFor();
      await page.waitForFunction((selector) => {
        const range = document.createRange();
        range.selectNodeContents(document.querySelector(selector));
        const text = range.getClientRects()[0];
        const marker = document
          .querySelector(".tc-marker")
          ?.getBoundingClientRect();
        return marker && text && Math.abs(marker.bottom - (text.top - 4)) < 2;
      }, passage);
      assert((await page.locator(".tc-highlight").count()) > 0);
      await page.locator(".tc-marker").click();
      assert(
        await page
          .locator(".tc-comment")
          .evaluate((el) => el === document.activeElement),
      );
      assert.match(
        await page.locator(".tc-comment p").innerText(),
        /A useful note/,
      );
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await page
        .getByLabel("Edit comment", { exact: true })
        .fill("Edited note");
      await page
        .getByRole("button", { name: "Save comment", exact: true })
        .click();
      await page.getByRole("button", { name: "Edit", exact: true }).click();
      await page.getByLabel("Edit comment", { exact: true }).fill("Discard me");
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      assert.equal(
        await page.locator(".tc-comment p").innerText(),
        "Edited note",
      );
      await page.locator(".tc-quote").click();
      assert.equal(
        await page.evaluate(() => window.getSelection().toString()),
        quote,
      );
      await page
        .getByRole("button", { name: "Comments · 1", exact: true })
        .click();
      await page.getByRole("button", { name: "Delete", exact: true }).click();
      await page.locator(".tc-marker").waitFor({ state: "detached" });
      assert.equal(await page.locator(".tc-highlight").count(), 0);
      await page.reload();
      await page
        .getByRole("button", { name: "Comments · 0", exact: true })
        .waitFor();
    }
    await page.goto(base + "/?explainer=diffusion");
    const details = page.locator("#dl-training details").first();
    const summary = details.locator("summary");
    await summary.click();
    await select("#dl-training .dl-equation");
    await page
      .getByRole("button", { name: "+ Add comment", exact: true })
      .click();
    await page
      .getByLabel("New comment", { exact: true })
      .fill("Training objective note");
    await page
      .getByRole("button", { name: "Save comment", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Close comments", exact: true })
      .click();
    await page.locator(".tc-marker").waitFor();
    await summary.click();
    await page.locator(".tc-marker").waitFor({ state: "detached" });
    assert.equal(await page.locator(".tc-highlight").count(), 0);
    await page.reload();
    await summary.scrollIntoViewIfNeeded();
    await page
      .getByRole("button", { name: "Comments · 1", exact: true })
      .waitFor();
    assert.equal(await page.locator(".tc-marker").count(), 0);
    await summary.click();
    await page.locator(".tc-marker").waitFor();
    await page.locator(".tc-marker").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("button", { name: "Close comments", exact: true })
      .click();
    // A comment on the summary itself remains visible when details are closed.
    await select("#dl-training details summary");
    await page
      .getByRole("button", { name: "+ Add comment", exact: true })
      .click();
    await page.getByLabel("New comment", { exact: true }).fill("Summary note");
    await page
      .getByRole("button", { name: "Save comment", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Close comments", exact: true })
      .click();
    await summary.click();
    await page.locator(".tc-marker").waitFor();
    await page.locator(".tc-marker").click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("button", { name: "Close comments", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await select("#dl-basics h2");
    await page
      .getByRole("button", { name: "+ Add comment", exact: true })
      .click();
    await page
      .getByLabel("New comment", { exact: true })
      .fill("Mobile comment");
    const box = await page.locator(".tc-panel").boundingBox();
    assert(box.x >= 0 && box.x + box.width <= 390 && box.y >= 0);
    await page.screenshot({ path: "/tmp/comments-mobile.png" });
    await page
      .getByRole("button", { name: "Save comment", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Close comments", exact: true })
      .click();
    await page
      .locator("#dl-basics h2")
      .evaluate((el) => el.scrollIntoView({ block: "center" }));
    await page.locator(".tc-marker").waitFor();
    await page.locator(".tc-marker").click();
    await page
      .getByRole("button", { name: "Close comments", exact: true })
      .click();
    await page.screenshot({ path: "/tmp/comment-marker-mobile.png" });
    await page.goto(base + "/posts/quantization-explainer.html");
    await page
      .getByRole("button", { name: "Comments · 0", exact: true })
      .waitFor();
    await page.goto(base + "/");
    assert.equal(await page.locator(".tc-launcher").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "Comment CRUD, persistence, quote navigation, page isolation, and mobile layout passed.",
    );
  } finally {
    await browser.close();
  }
})();
