const { test, expect } = require('@playwright/test');

test.describe('Wellness Tools', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login.html');
    await page.fill('#email', 'kieranb@my.yorku.ca');
    await page.fill('#password', 'Sova-never1');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Clear localStorage so each test starts from a clean state
    await page.evaluate(() => localStorage.clear());

    // Navigate to wellness tools page
    await page.goto('/wellness-tools.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display wellness tools page with 4 tools', async ({ page }) => {
    const grid = page.locator('.wellness-tools-grid');
    await expect(grid).toBeVisible();

    const cards = grid.locator('.dashboard-card');
    await expect(cards).toHaveCount(4);
  });

  test('should show all Mark Complete buttons initially', async ({ page }) => {
    const buttons = page.locator('.wellness-tools-grid .btn-success');
    const count = await buttons.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      await expect(btn).toHaveText('Mark Complete');
      await expect(btn).not.toBeDisabled();
    }
  });

  test('should show streak element on each card', async ({ page }) => {
    const cards = page.locator('.wellness-tools-grid .dashboard-card');
    const count = await cards.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const streak = cards.nth(i).locator('.wellness-tool-streak');
      await expect(streak).toBeVisible({ timeout: 5000 });
    }
  });

  test('should mark first tool complete', async ({ page }) => {
    const firstButton = page.locator('.wellness-tools-grid .btn-success').first();
    await firstButton.click();

    await expect(firstButton).toHaveText('Completed Today');
    await expect(firstButton).toBeDisabled();

    const firstCard = page.locator('.wellness-tools-grid .dashboard-card').first();
    const streak = firstCard.locator('.wellness-tool-streak');
    await expect(streak).toContainText('Total: 1', { timeout: 5000 });
  });

  test('should not allow marking same tool twice', async ({ page }) => {
    const firstButton = page.locator('.wellness-tools-grid .btn-success').first();
    await firstButton.click();

    await expect(firstButton).toBeDisabled();

    // Attempt a second click — should be a no-op because the button is disabled
    await firstButton.click({ force: true });

    const firstCard = page.locator('.wellness-tools-grid .dashboard-card').first();
    const streak = firstCard.locator('.wellness-tool-streak');
    await expect(streak).toContainText('Total: 1', { timeout: 5000 });
  });

  test('should mark multiple tools independently', async ({ page }) => {
    const cards = page.locator('.wellness-tools-grid .dashboard-card');

    const firstButton = cards.nth(0).locator('.btn-success');
    const secondButton = cards.nth(1).locator('.btn-success');
    const thirdButton = cards.nth(2).locator('.btn-success');
    const fourthButton = cards.nth(3).locator('.btn-success');

    await firstButton.click();
    await secondButton.click();

    await expect(firstButton).toHaveText('Completed Today');
    await expect(secondButton).toHaveText('Completed Today');

    await expect(thirdButton).toHaveText('Mark Complete');
    await expect(fourthButton).toHaveText('Mark Complete');
  });

  test('should persist completion state on reload', async ({ page }) => {
    const firstButton = page.locator('.wellness-tools-grid .btn-success').first();
    await firstButton.click();
    await expect(firstButton).toHaveText('Completed Today');

    await page.reload();
    await page.waitForLoadState('networkidle');

    const firstButtonAfterReload = page.locator('.wellness-tools-grid .btn-success').first();
    await expect(firstButtonAfterReload).toHaveText('Completed Today');
    await expect(firstButtonAfterReload).toBeDisabled();
  });

  test('should show confetti after marking complete', async ({ page }) => {
    const firstButton = page.locator('.wellness-tools-grid .btn-success').first();
    await firstButton.click();

    // Confetti pieces are appended to body immediately on click and removed after ~1800ms
    const confettiCount = await page.locator('.confetti-piece').count();
    expect(confettiCount).toBeGreaterThan(0);
  });
});
