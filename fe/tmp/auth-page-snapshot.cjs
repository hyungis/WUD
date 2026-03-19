const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("http://localhost/", { waitUntil: "networkidle" });
  await page.screenshot({ path: "tmp/localhost-home.png", fullPage: true });

  const bodyText = await page.locator("body").innerText();
  console.log("--- body text first 1200 ---");
  console.log(bodyText.slice(0, 1200));

  const hasLoginEmail = await page.locator("#auth-email").count();
  const hasClickText = await page.getByText("Click here to log in").count();
  const hasWeekly = await page.getByRole("button", { name: "WEEKLY" }).count();

  console.log("has #auth-email:", hasLoginEmail);
  console.log("has click text:", hasClickText);
  console.log("has WEEKLY button:", hasWeekly);

  await browser.close();
})();
