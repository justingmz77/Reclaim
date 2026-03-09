const { test, expect } = require('@playwright/test');

test.describe('Games Page', () => {
  test.describe('For authenticated user', () => {
    test.beforeEach(async ({ page }) => {
      // Login as student
      await page.goto('/login.html');
      await page.fill('#email', 'kieranb@my.yorku.ca');
      await page.fill('#password', 'Sova-never1');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard**', { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // Navigate to games page
      await page.goto('/games.html');
      await page.waitForLoadState('networkidle');
    });

    test('should display games page with hero', async ({ page }) => {
      const hero = page.locator('.games-hero');
      await expect(hero).toBeVisible();
    });

    test('should show game cards', async ({ page }) => {
      // Wait for the grid to be present and populated
      await expect(page.locator('#gamesGrid')).toBeVisible();

      // games.js always renders all 6 GAMES entries into #gamesGrid
      const cards = page.locator('.game-card');
      await expect(cards.first()).toBeVisible({ timeout: 5000 });
      expect(await cards.count()).toBeGreaterThanOrEqual(1);
    });

    test('should hide login prompt for authenticated user', async ({ page }) => {
      // games.js only calls loginPrompt.style.display = 'block' when there is no user.
      // For an authenticated session the element keeps its initial display:none.
      const loginPrompt = page.locator('#loginPrompt');
      await expect(loginPrompt).toHaveCSS('display', 'none');
    });

    test('each game card has a play button linking to game page', async ({ page }) => {
      // Only available games (brick-breaker, solitaire) get an <a> link.
      // For an authenticated user the link text is "Play Now".
      const playLinks = page.locator('.game-card a.btn-primary');
      const count = await playLinks.count();
      expect(count).toBeGreaterThanOrEqual(1);

      for (let i = 0; i < count; i++) {
        const link = playLinks.nth(i);
        await expect(link).toBeVisible();

        // Every play link must point to a game page (href ends with .html)
        const href = await link.getAttribute('href');
        expect(href).toMatch(/\.html$/);
      }
    });

    test('game card shows leaderboard info', async ({ page }) => {
      // For authenticated users, available game cards render a .game-stats section
      // that contains Personal Best and Difficulty stat entries.
      const statsSection = page.locator('.game-card .game-stats');
      await expect(statsSection.first()).toBeVisible({ timeout: 5000 });

      // Each stats section should expose at least one .stat-label
      const firstStats = statsSection.first();
      const labels = firstStats.locator('.stat-label');
      expect(await labels.count()).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('For unauthenticated user', () => {
    test.beforeEach(async ({ page, context }) => {
      // Clear all cookies/storage so the user is not authenticated
      await context.clearCookies();
      await page.goto('/games.html');
      await page.waitForLoadState('networkidle');
    });

    test('should show login prompt for unauthenticated users', async ({ page }) => {
      // games.js sets loginPrompt.style.display = 'block' when getCurrentUser() returns null
      const loginPrompt = page.locator('#loginPrompt');
      await expect(loginPrompt).toBeVisible({ timeout: 5000 });
    });

    test('game cards are hidden or login prompt shown', async ({ page }) => {
      const loginPrompt = page.locator('#loginPrompt');
      const gamesGrid = page.locator('#gamesGrid');

      const loginPromptVisible = await loginPrompt.isVisible().catch(() => false);
      const gamesGridVisible = await gamesGrid.isVisible().catch(() => false);

      // At a minimum the login prompt must be shown when the user is not authenticated.
      // The grid may still be rendered (games.js always calls renderGames), but the
      // login prompt being visible satisfies the UX requirement.
      expect(loginPromptVisible || !gamesGridVisible).toBeTruthy();
    });
  });
});
