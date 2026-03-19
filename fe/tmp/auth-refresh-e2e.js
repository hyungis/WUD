const { chromium } = require("playwright");

(async () => {
  const email = "copilot_auth_test2_1773852188@example.com";
  const password = "Passw0rd!123";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const refreshLogs = [];
  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("/api/auth/refresh")) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        body = "";
      }
      refreshLogs.push({ status: res.status(), body: body.slice(0, 200) });
    }
  });

  await page.goto("http://localhost/", { waitUntil: "domcontentloaded" });
  await page.getByText("Click here to log in").first().click();
  await page.waitForSelector("#auth-email", { timeout: 10000 });
  await page.fill("#auth-email", email);
  await page.fill("#auth-password", password);
  await page.getByRole("button", { name: "로그인" }).first().click();

  await page.waitForTimeout(4500);

  let beforeReloadLoggedIn = false;
  try {
    await page.getByRole("button", { name: "WEEKLY" }).waitFor({ timeout: 10000 });
    beforeReloadLoggedIn = true;
  } catch {
    beforeReloadLoggedIn = false;
  }

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const loginInputVisible = await page
    .locator("#auth-email")
    .isVisible()
    .catch(() => false);
  const weeklyVisible = await page
    .getByRole("button", { name: "WEEKLY" })
    .isVisible()
    .catch(() => false);

  console.log("beforeReloadLoggedIn=", beforeReloadLoggedIn);
  console.log("afterReload_loginInputVisible=", loginInputVisible);
  console.log("afterReload_weeklyVisible=", weeklyVisible);
  console.log("refreshLogs=", JSON.stringify(refreshLogs, null, 2));

  await browser.close();
})();
