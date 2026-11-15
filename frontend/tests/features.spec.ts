/* Feature flows: landing, predictions and solutions by role, gamification, sound. */
import { expect, test, type Page } from "@playwright/test";
import { DEMO_USERS } from "../src/data/demo/users";

const ROLE_BUTTON = { astronaute: /^Astronaut/, "medecin-bord": /^Crew surgeon/, nasa: /^NASA Houston/ } as const;
const HOME = { astronaute: "/astronaute", "medecin-bord": "/medecin-bord", nasa: "/nasa" } as const;

async function login(page: Page, id: string, _code: string) {
  const u = DEMO_USERS.find((x) => x.id === id);
  if (!u) throw new Error(id);
  await page.goto("/connexion");
  if (u.id === "AST-001" || u.id === "CMO-001" || u.id === "NASA-FS-001") {
    await page.getByRole("button", { name: ROLE_BUTTON[u.role] }).click();
  } else {
    await page.evaluate((user) => {
      const now = Date.now();
      localStorage.setItem("pulsar.session", JSON.stringify({
        user: { id: user.id, role: user.role, displayName: user.displayName, title: user.title, crewId: user.crewId },
        token: "demo.test",
        issuedAt: now,
        expiresAt: now + 12 * 3600_000,
      }));
    }, u);
    await page.goto(HOME[u.role]);
  }
  await page.waitForURL(new RegExp(HOME[u.role]));
}

test("public landing: sections, CTA to /connexion", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("pulsar.landing.intro", "1"));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("PULSAR");
  await expect(page.getByText("Crew health")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Five hazards of human spaceflight" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What you need", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "From wrist to Houston" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Three roles, one interface" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Watch and vitals" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your vitals" })).toBeVisible();
  await page.getByRole("tab", { name: /Distance from Earth/ }).click();
  await expect(page.locator(".lp-hz-body")).toContainText(/latency/i);
  await expect(page.locator(".lp-film-sun").first()).toBeVisible();
  await expect(page.locator(".lp-live .recharts-line").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Enter your space" })).toBeVisible();
  await page.getByTestId("cta-hero").click();
  await expect(page).toHaveURL(/\/connexion$/);
  await page.locator("a.login-back").click();
  await expect(page).toHaveURL(/\/$/);
});

test("signed-in user: /connexion returns to their dashboard, CTA “My space”", async ({ page }) => {
  await login(page, "NASA-FS-001", "905218");
  await page.goto("/connexion");
  await expect(page).toHaveURL(/\/nasa$/);
  await page.goto("/");
  await expect(page.getByTestId("cta-nav")).toHaveText(/My space/);
});

test("astronaut: own forecasts and solutions only, Mark done / Escalate", async ({ page }) => {
  await login(page, "AST-001", "482105");
  await page.locator('.r-rail a[href="/astronaute/predictions"]').click();
  await expect(page.getByRole("heading", { level: 1, name: "Your forecasts" })).toBeVisible();
  await expect(page.locator(".forecast")).toHaveCount(7);
  await expect(page.getByText("tell the crew surgeon")).toBeVisible();
  await expect(page.locator(".pred")).toHaveAttribute("data-astronaut", "LK");
  for (const other of ["Alex Morgan", "Sofia Reyes"]) await expect(page.getByText(other)).toHaveCount(0);
  await expect(page.locator(".inspector")).toHaveCount(0); // simple view, no inspector
  const first = page.locator(".sol").first();
  await first.getByRole("button", { name: /Mark done/ }).click();
  await expect(first).toHaveAttribute("data-status", "faite");
  const hydra = page.locator('.sol[data-id="RC-LK-02"]');
  await hydra.getByRole("button", { name: /Escalate to the crew surgeon/ }).click();
  await expect(hydra).toContainText("Escalated · crew surgeon");
  // the astronaut cannot open the crew's predictions
  await page.goto("/medecin-bord/predictions/AM");
  await expect(page).toHaveURL(/\/astronaute$/);
  await expect(page.locator(".r-denied")).toBeVisible();
});

test("crew surgeon: whole-crew predictions, inspector, validate / replace a solution", async ({ page }) => {
  await login(page, "CMO-001", "731406");
  await page.goto("/medecin-bord/predictions/LK");
  await expect(page.locator(".pred-crew button")).toHaveCount(4);
  await expect(page.locator(".anom-list")).toContainText("LSTM autoencoder");
  await expect(page.locator(".contrib-row").first()).toBeVisible();
  await page.locator('.forecast[data-metric="heart_rate"] .forecast-inspect').click();
  await expect(page.locator(".inspector")).toContainText("≥ 100 bpm");
  await expect(page.locator(".lad tr.is-limit").first()).toBeVisible();
  const s1 = page.locator('.sol[data-id="RC-LK-02"]');
  await s1.getByRole("button", { name: "Validate" }).click();
  await expect(s1).toHaveAttribute("data-status", "validee");
  const s2 = page.locator('.sol[data-id="RC-LK-03"]');
  await s2.getByRole("button", { name: /Replace/ }).click();
  await s2.getByLabel("New instruction").fill("Repos complet jusqu’à 18:00");
  await s2.getByRole("button", { name: "Save" }).click();
  await expect(s2).toHaveAttribute("data-status", "remplacee");
  await expect(s2).toContainText("Repos complet jusqu’à 18:00");
  await page.locator(".pred-crew button", { hasText: "Alex Morgan" }).click();
  await expect(page).toHaveURL(/predictions\/AM$/);
  await expect(page.locator('.sol[data-id="RC-AM-01"]')).toContainText("radiation shelter");
});

test("crew surgeon: time conductor realtime / fixed", async ({ page }) => {
  await login(page, "CMO-001", "731406");
  await page.goto("/medecin-bord/dossier/LK");
  await page.getByRole("button", { name: /Fixed/ }).click();
  await expect(page.getByTestId("conductor-range")).toBeVisible();
  await page.getByRole("button", { name: /Realtime/ }).click();
  await expect(page.getByTestId("conductor-range")).toHaveCount(0);
});

test("NASA: the report includes the predictions and anomalies summary", async ({ page }) => {
  await login(page, "NASA-FS-001", "905218");
  await page.goto("/nasa/rapport/R-127-03");
  await expect(page.getByRole("heading", { name: /Predictions and anomalies/ })).toBeVisible();
  await expect(page.locator(".pred-table tbody tr")).toHaveCount(4);
  await expect(page.locator('.pred-table tr[data-id="LK"]')).toContainText("Resting HR");
});

test("NASA: ultrasound names the patient, the view and the measurement", async ({ page }) => {
  await login(page, "NASA-FS-001", "905218");
  await page.goto("/nasa/rapport/R-127-03");
  const echo = page.getByTestId("echo-review");
  await expect(echo).toContainText("Lina Kovacs");
  await expect(echo).toContainText("Apical 4-chamber view");
  await expect(echo.getByTestId("echo-dossier")).toContainText("4.1 cm");
  await expect(echo.getByTestId("echo-dossier")).toContainText("Within limits");
  await expect(echo.getByTestId("echo-dossier")).toContainText("3.5–5.6 cm");
  await echo.getByRole("button", { name: /Clip 6 s/ }).click();
  await expect(echo.getByTestId("echo-dossier")).toContainText("No measurement on this clip");
  await expect(echo.getByTestId("echo-dossier")).not.toContainText("4.1 cm");
  await page.goto("/nasa/rapport/R-126-01");
  await expect(page.getByTestId("echo-review")).toContainText("Alex Morgan");
  await expect(page.getByTestId("echo-review")).toContainText("Optic nerve");
  await expect(page.getByTestId("echo-review")).not.toContainText("Lina Kovacs");
  await page.goto("/nasa/rapport/R-126-A1");
  await expect(page.getByTestId("echo-review")).toContainText("No image");
  await expect(page.getByTestId("echo-review")).not.toContainText("Lina Kovacs");
  await page.goto("/nasa/reponse");
  const send = page.getByRole("button", { name: /Queue for send/ });
  await expect(send).toBeDisabled();
  await expect(page.getByTestId("echo-target")).toContainText("Lina Kovacs");
  await expect(page.getByTestId("echo-target")).toContainText("4.1 cm");
  await page.getByRole("checkbox", { name: /identity, the view and the measurement/ }).check();
  await expect(send).toBeEnabled();
});

test("gamification: missions, streak, crew goal; persistent opt-out", async ({ page }) => {
  await login(page, "AST-002", "130742");
  await expect(page.getByTestId("goals-strip")).toBeVisible();
  await page.locator('.r-rail a[href="/astronaute/objectifs"]').click();
  await expect(page.locator(".badges li")).toHaveCount(11);
  await expect(page.getByText("Seven orbits")).toBeVisible();
  await expect(page.locator(".grade-now")).toContainText("Gold");
  await expect(page.getByText("never on your health values")).toBeVisible();
  await expect(page.getByTestId("missions-count")).toHaveText("2/7");
  await page.getByRole("checkbox", { name: /Fasting glucose/ }).click();
  await expect(page.getByTestId("missions-count")).toHaveText("3/7");
  await page.locator('.r-rail a[href="/astronaute/reglages"]').click();
  await page.getByRole("switch", { name: "Gamification" }).click();
  await expect(page.locator('.r-rail a[href="/astronaute/objectifs"]')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("switch", { name: "Gamification" })).toHaveAttribute("aria-checked", "false");
  await page.goto("/astronaute");
  await expect(page.getByTestId("goals-strip")).toHaveCount(0);
  await page.goto("/astronaute/objectifs");
  await expect(page).toHaveURL(/\/astronaute\/reglages$/);
  await page.goto("/astronaute/montre");
  await expect(page.locator(".wt-comp")).toHaveCount(0);
});

test("crew surgeon: crew-goal participation, no health values", async ({ page }) => {
  await login(page, "CMO-001", "731406");
  const card = page.locator(".r-card", { hasText: "Crew goal · participation" });
  await expect(card).toBeVisible();
  await expect(card.locator(".participation li")).toHaveCount(4);
  await expect(card).not.toContainText("bpm");
});

test("sound: silent visual orange alarm + red alarm that cannot be muted", async ({ page }) => {
  await login(page, "CMO-001", "731406");
  await expect(page.locator('.alarm[data-level="orange"]').first()).toBeVisible(); // visual signal always present
  await page.getByTestId("sound-menu").click();
  await page.getByTestId("sound-mute").click();
  await expect(page.getByTestId("sound-mute")).toHaveAttribute("aria-checked", "true");
  await expect(page.locator('input[data-cat="alarmHigh"]')).toBeDisabled();
  await expect(page.locator('input[data-cat="badge"]')).toHaveCount(0); // outside red: no sound checkbox
  await page.reload();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("pulsar.sound") || "{}"));
  expect(saved.muted).toBe(true);
  expect(saved.categories?.alarmHigh !== false).toBe(true);
  await page.getByTestId("sound-menu").click();
  await page.locator(".sound-tests summary").click();
  await page.getByTestId("sound-test-red").scrollIntoViewIfNeeded();
  await page.getByTestId("sound-test-red").click({ force: true });
  await page.keyboard.press("Escape"); // close the sound panel
  await expect(page.getByRole("dialog", { name: "Sound settings" })).toHaveCount(0);
  const red = page.locator('.alarm[data-level="rouge"]');
  await expect(red).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window.__pulsarSoundLog ?? []).filter((e) => e.id === "alarmHigh").length)).toBeGreaterThan(0); // plays despite mute
  await red.getByRole("button", { name: /Pause 2 min/ }).click();
  await expect(red).toContainText("Pause");
  await red.getByRole("button", { name: "Acknowledge" }).click();
  await expect(red).toHaveCount(0);
});
