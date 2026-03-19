const { chromium } = require("playwright");

(async () => {
  const email = `copilot_e2e_${Date.now()}@example.com`;
  const password = "Passw0rd!123";

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const refreshLogs = [];
  page.on("response", async (res) => {
    if (res.url().includes("/api/auth/refresh")) {
      let body = "";
      try {
        body = await res.text();
      } catch {
        body = "";
      }
      refreshLogs.push({ status: res.status(), body: body.slice(0, 180) });
    }
  });

  const signupRes = await context.request.post("http://localhost/api/auth/signup", {
    headers: { "Content-Type": "application/json" },
    data: { email, password, name: "Copilot", nickname: "cp_e2e" },
  });

  const loginRes = await context.request.post("http://localhost/api/auth/login", {
    headers: { "Content-Type": "application/json" },
    data: { email, password },
  });

  console.log("signupStatus=", signupRes.status());
  console.log("loginStatus=", loginRes.status());

  await page.goto("http://localhost/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const weeklyVisibleAfterLoad = await page
    .getByRole("button", { name: "WEEKLY" })
    .isVisible()
    .catch(() => false);

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const weeklyVisibleAfterReload = await page
    .getByRole("button", { name: "WEEKLY" })
    .isVisible()
    .catch(() => false);

  const clickToLoginVisibleAfterReload = await page
    .getByText("Click here to log in")
    .isVisible()
    .catch(() => false);

  console.log("weeklyVisibleAfterLoad=", weeklyVisibleAfterLoad);
  console.log("weeklyVisibleAfterReload=", weeklyVisibleAfterReload);
  console.log("clickToLoginVisibleAfterReload=", clickToLoginVisibleAfterReload);
  console.log("refreshLogs=", JSON.stringify(refreshLogs, null, 2));

  await browser.close();
})();
