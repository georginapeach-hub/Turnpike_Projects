const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");
let server;
let activeBrowser;
(async () => {
  server = spawn(
    "npm",
    ["run", "dev", "--", "--port", "5180", "--strictPort"],
    { stdio: "ignore", detached: true },
  );
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch("http://localhost:5180");
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  assert.ok(ready, "Development server started");
  const executablePath = process.env.CHROMIUM_PATH;
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: ["--no-sandbox"],
  });
  activeBrowser = browser;
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:5180");
  await page.getByRole("button", { name: "＋ New booking" }).waitFor();

  assert.equal(await page.locator("tbody tr").count(), 4);
  await page.getByRole("textbox", { name: "Search bookings" }).fill("Oxford");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 1,
  );
  await page
    .getByRole("textbox", { name: "Search bookings" })
    .fill("  paper moon  ");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 2,
  );
  await page.getByRole("textbox", { name: "Search bookings" }).fill("");
  await page.getByLabel("Filter by company").selectOption("Moving Stories");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 1,
  );
  assert.ok(
    (await page.locator("tbody").innerText()).includes("Between the Lines"),
  );
  await page
    .getByLabel("Filter by production")
    .selectOption("The Last Lighthouse");
  await page
    .getByText("No bookings match these filters.", { exact: true })
    .waitFor();
  await page.getByLabel("Filter by company").selectOption("All companies");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 2,
  );
  await page.getByLabel("Filter by production").selectOption("All productions");
  for (const [directory, query, expected] of [
    ["Venues", "oxford", "Riverside Arts"],
    ["Companies", "charlie", "Paper Moon Theatre"],
    ["Productions", "paper moon", "The Last Lighthouse"],
  ]) {
    await page
      .getByRole("navigation")
      .getByRole("button", { name: directory, exact: true })
      .click();
    const input = page.getByRole("textbox", {
      name: "Search " + directory.toLowerCase(),
    });
    await input.fill(query);
    await page.waitForFunction(
      () => document.querySelectorAll(".directory .panel").length === 1,
    );
    assert.equal(await page.locator(".directory h2").innerText(), expected);
    await input.fill("no such record");
    await page
      .getByText("No " + directory.toLowerCase() + " match your search.", {
        exact: true,
      })
      .waitFor();
    await input.fill("");
    await page.waitForFunction(
      () => document.querySelectorAll(".directory .panel").length > 1,
    );
  }
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Bookings", exact: true })
    .click();
  assert.ok(
    !(await page.locator("main").innerText()).includes("A LITTLE LESS ADMIN"),
  );
  assert.ok(
    !(await page.locator("main").innerText()).includes("Keep the dates"),
  );
  assert.ok(
    !(await page.locator("main").innerText()).includes("One place for every"),
  );
  await page.getByRole("button", { name: "＋ New booking" }).click();
  await page.getByLabel("Performance date", { exact: true }).fill("2027-02-12");
  await page.getByLabel("Venue", { exact: true }).selectOption("2");
  await page
    .getByLabel("Booking status", { exact: true })
    .selectOption("Confirmed");
  await page.getByLabel("Publish to website when confirmed").check();
  await page
    .getByLabel("Follow-up task", { exact: true })
    .fill("Request sales report");
  await page.getByLabel("Due date", { exact: true }).fill("2027-02-13");
  await page
    .getByLabel("Agreed deal", { exact: true })
    .fill('£900 guarantee, or 70% "net"');
  await page.getByLabel("Notes", { exact: true }).fill("Test booking notes");
  await page.getByRole("button", { name: "Save booking", exact: true }).click();
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 5,
  );
  await page.reload();
  await page.getByRole("button", { name: "＋ New booking" }).waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr").length === 5,
  );
  await page
    .getByRole("button", {
      name: "Open The Last Lighthouse at Riverside Arts",
      exact: true,
    })
    .click();
  assert.equal(
    await page.getByLabel("Notes", { exact: true }).inputValue(),
    "Test booking notes",
  );
  const briefPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download artist briefing" }).click();
  const brief = await briefPromise;
  const briefText = await fs.readFile(await brief.path(), "utf8");
  assert.ok(briefText.includes("Riverside Arts"));
  assert.ok(briefText.includes("£900 guarantee"));
  await page.getByRole("button", { name: "Back to bookings" }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Tasks/ })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Complete Request sales report",
      exact: true,
    })
    .check();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Website export", exact: true })
    .click();
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  const csv = await csvPromise;
  const csvText = await fs.readFile(await csv.path(), "utf8");
  assert.ok(csvText.includes("2027-02-12"));
  assert.ok(!csvText.includes("2026-11-12"));
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Bookings", exact: true })
    .click();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  assert.equal(await page.locator(".calendar-event").count(), 5);
  await page.setViewportSize({ width: 390, height: 844 });

  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: directory search, company search and combined filters, create/edit, reload persistence, artist briefing, task completion, CSV selection, calendar and mobile layout; no browser errors.",
  );
  await browser.close();
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await activeBrowser?.close();
    if (server?.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {}
    }
  });
