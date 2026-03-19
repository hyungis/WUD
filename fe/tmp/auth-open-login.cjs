const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://localhost/", { waitUntil: "domcontentloaded" });

  const size = page.viewportSize();
  const cx = Math.floor(size.width / 2);
  const cy = Math.floor(size.height / 2);

  for (let i = 0; i < 6; i += 1) {
    await page.mouse.click(cx, cy);
    await page.waitForTimeout(400);
    const visible = await page.locator("#auth-email").isVisible().catch(() => false);
    console.log("attempt", i + 1, "visible", visible);
    if (visible) {
      break;
    }
  }

  await page.screenshot({ path: "tmp/after-click.png", fullPage: true });
  console.log("emailCount", await page.locator("#auth-email").count());

  await browser.close();
})();
