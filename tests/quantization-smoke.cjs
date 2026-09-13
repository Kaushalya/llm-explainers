const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      pathToFileURL(path.resolve("posts/quantization-explainer.html")).href,
    );
    const results = await page.evaluate(() => {
      const c = cfg(),
        base = est(c, c.meth),
        two = est({ ...c, n: 2 }, c.meth),
        batched = est({ ...c, batch: 4 }, c.meth);
      const assert = (condition, message) => {
        if (!condition) throw Error(message);
      };
      assert(
        Math.abs(two.toks / base.toks - 2) < 1e-10,
        "device rate must scale linearly, not quadratically",
      );
      assert(
        batched.toks / base.toks <= 4,
        "batch gain must not exceed ideal weight amortization",
      );
      assert(
        Math.abs(batched.seq * 4 - batched.toks) < 1e-10,
        "sequence versus aggregate rate",
      );
      assert(Math.abs(base.weights - 4.125e9) < 1, "metadata weight budget");
      assert(
        base.kv === 2 * 32 * 8 * 128 * 8192 * 2,
        "KV payload dimensional check",
      );
      assert(
        base.ops === 2 * 8e9 + 4 * 32 * 32 * 128 * 8192,
        "attention uses query heads, not KV heads",
      );
      const half = est({ ...c, kb: 1 }, c.meth);
      assert(
        half.kv === base.kv / 2 && half.weights === base.weights,
        "independent KV precision",
      );
      const sym = quantGroup([-1, 0, 1], 2, "sym");
      assert(
        sym.qmin === -1 && sym.qmax === 1 && sym.values[1] === 0,
        "symmetric narrow-range levels",
      );
      const aff = quantGroup([-2, 0, 5], 4, "asym");
      assert(
        Number.isInteger(aff.z) && aff.values[1] === 0,
        "affine integer zero point",
      );
      assert(
        quantGroup([0, 0, 0], 4, "sym").values.every(Number.isFinite),
        "zero range",
      );
      return "PASS numerical regressions";
    });
    console.log(results);
    await page.locator("#pGroup").selectOption("16");
    const rmse = await page.evaluate(() =>
      Math.sqrt(
        playground.data.reduce(
          (sum, x, i) => sum + (x - playground.values[i]) ** 2,
          0,
        ) / 256,
      ),
    );
    assert.equal(await page.locator("#mRmse").textContent(), rmse.toFixed(4));
    assert.match(await page.locator("#mComp").textContent(), /5.000 bits/);
    await page.locator("#pOutlier").check();
    const before = await page.locator("#mMax").textContent();
    await page.locator("#pClip").fill("20");
    assert.notEqual(await page.locator("#mMax").textContent(), before);
    await page.locator("#pInspect").fill("255");
    assert.match(
      await page.locator("#inspectValue").textContent(),
      /255 · group 16/,
    );
    await page.locator("#pMode").selectOption("asym");
    await page.locator("#pShift").selectOption("3");
    await page.locator("#cModel").selectOption("m123b");
    await page.locator("#cMethod").selectOption("fp16");
    assert.match(await page.locator("#oS").textContent(), /exceeds budget/);
    await page.locator("#cModel").selectOption("m8b");
    await page.locator("#cCount").selectOption("2");
    await page.locator("#cNative").check();
    await page.locator('#cTable button[data-method="fp8"]').focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#cMethod").inputValue(), "fp8");
    for (const quiz of await page.locator(".quiz").all()) {
      const answer = await quiz.getAttribute("data-answer");
      await quiz.locator(`[data-choice="${answer}"]`).click();
      assert.match(await quiz.locator(".feedback").textContent(), /^Correct/);
    }
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `horizontal overflow at ${width}`,
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("#playground").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/quant-desktop.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#calculator").scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/tmp/quant-mobile.png" });
    assert.equal(errors.length, 0, errors.join("\n"));
    console.log(
      "PASS controls, quizzes, keyboard selection, no-fit state, 4 widths, no page errors.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
