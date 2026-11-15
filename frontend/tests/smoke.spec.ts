/* Smoke test: each demo identity opens its dashboard, route guards, errors, sign-out. */
import { expect, test, type Page } from "@playwright/test";
import { DEMO_USERS } from "../src/data/demo/users";

const HOME = { astronaute: "/astronaute", "medecin-bord": "/medecin-bord", nasa: "/nasa" } as const;
const HEADING = { astronaute: "Your status today", "medecin-bord": "Crew monitoring", nasa: "Scheduled report · D127 · 3/4" } as const;

const ROLE_BUTTON = { astronaute: /^Astronaut/, "medecin-bord": /^Crew surgeon/, nasa: /^NASA Houston/ } as const;

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
  await page.waitForURL(new RegExp(`${HOME[u.role]}`));
}

test("without a session, every protected page redirects to /connexion", async ({ page }) => {
  for (const p of ["/astronaute", "/medecin-bord/dossier/LK", "/nasa/reponse"]) {
    await page.goto(p);
    await expect(page).toHaveURL(/\/connexion$/);
  }
});

for (const u of DEMO_USERS) {
  test(`${u.id} (${u.role}) → their dashboard only, then sign-out`, async ({ page }) => {
    await login(page, u.id, u.code);
    await expect(page).toHaveURL(new RegExp(`${HOME[u.role]}$`));
    await expect(page.locator(".r-user")).toContainText(u.displayName);
    await expect(page.locator(".r-user")).toContainText(u.id);
    await expect(page.getByRole("heading", { level: 1, name: HEADING[u.role] })).toBeVisible();
    // Guard: other spaces are forbidden → back to this role's own space
    for (const other of Object.values(HOME).filter((h) => h !== HOME[u.role])) {
      await page.goto(other);
      await expect(page).toHaveURL(new RegExp(`${HOME[u.role]}$`));
      await expect(page.locator(".r-denied")).toBeVisible();
    }
    // Persisted session (localStorage): reload stays signed in
    await page.reload();
    await expect(page.locator(".r-user")).toContainText(u.displayName);
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/connexion$/);
    expect(await page.evaluate(() => localStorage.getItem("pulsar.session"))).toBeNull();
  });
}

test("astronaut: sees only their own data, plus the watch", async ({ page }) => {
  await login(page, "AST-002", "130742");
  await expect(page.locator(".r-user")).toContainText("Alex");
  await expect(page.getByText("Lina Kovacs")).toHaveCount(0);
  await page.locator('.r-rail a[href="/astronaute/montre"]').click();
  await expect(page.getByRole("heading", { name: "Fingerprint" })).toBeVisible();
  await expect(page.getByText("Rien de connecté")).toHaveCount(0);
  await expect(page.getByTestId("watch-connect")).toHaveCount(0);
  await expect(page.getByText("PULSAR Montre")).toHaveCount(0);
  await expect(page.locator(".watch-prev")).toHaveCount(0);
  await page.goto("/astronaute/montre/ecrans");
  await expect(page).toHaveURL(/\/astronaute\/montre\/ecrans$/);
  await expect(page.getByRole("heading", { name: "Watch screens" })).toBeVisible();
});

test("crew surgeon: sees the whole crew and opens a file", async ({ page }) => {
  await login(page, "CMO-001", "731406");
  await expect(page.locator(".crew-tile")).toHaveCount(4);
  await page.locator(".crew-tile", { hasText: "Lina Kovacs" }).click();
  await expect(page).toHaveURL(/\/medecin-bord\/dossier\/LK$/);
  await expect(page.getByRole("heading", { level: 1, name: "Lina Kovacs" })).toBeVisible();
  await expect(page.locator(".crew-live .recharts-line").first()).toBeVisible();
  await expect(page.locator(".alert-list li").first()).toBeVisible();
});

test("sign-in: role choice, no id and no code", async ({ page }) => {
  await page.goto("/login"); // old address → /connexion
  await expect(page).toHaveURL(/\/connexion$/);
  await expect(page.locator("#login-id")).toHaveCount(0);
  await expect(page.locator("#login-code")).toHaveCount(0);
  await expect(page.getByLabel("Identifiant personnel")).toHaveCount(0);
  await expect(page.getByLabel("Code personnel")).toHaveCount(0);
  await expect(page.getByText(/Choix du profil|Comptes de démonstration/)).toHaveCount(0);
  for (const id of ["AST-001", "CMO-001", "NASA-FS-001"]) await expect(page.getByText(id, { exact: false })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Astronaut/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Crew surgeon/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^NASA Houston/ })).toBeVisible();
  await page.getByRole("button", { name: /^Astronaut/ }).click();
  await expect(page).toHaveURL(/\/astronaute$/);
  await expect(page.locator(".r-user")).toContainText("Lina Kovacs");
});

test("NASA: report list and reply", async ({ page }) => {
  await login(page, "NASA-FS-002", "618847");
  await expect(page.locator(".rep")).toHaveCount(4);
  await page.locator('.r-rail a[href="/nasa/reponse"]').click();
  await expect(page).toHaveURL(/\/nasa\/reponse$/);
});

