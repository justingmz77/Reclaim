const { test, expect } = require('@playwright/test');

test.describe('Journal', () => {
  test.beforeEach(async ({ page }) => {
    // Login as student before each test
    await page.goto('/login.html');
    await page.fill('#email', 'kieranb@my.yorku.ca');
    await page.fill('#password', 'Sova-never1');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    // Navigate to journal page
    await page.goto('/journal.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display journal page correctly', async ({ page }) => {
    await expect(page.locator('#guidedBtn')).toBeVisible();
    await expect(page.locator('#freeBtn')).toBeVisible();
    await expect(page.locator('#saveMoodBtn')).toBeDisabled();
  });

  test('should show guided prompts when clicking Guided', async ({ page }) => {
    await page.click('#guidedBtn');

    await expect(page.locator('#guidedPrompts')).toBeVisible();

    const promptButtons = page.locator('#guidedPrompts button');
    await expect(promptButtons.first()).toBeVisible({ timeout: 5000 });
    expect(await promptButtons.count()).toBeGreaterThanOrEqual(1);
  });

  test('should fill textarea when clicking a prompt', async ({ page }) => {
    await page.click('#guidedBtn');

    const firstPrompt = page.locator('#guidedPrompts button').first();
    await expect(firstPrompt).toBeVisible({ timeout: 5000 });
    await firstPrompt.click();

    const moodNotesValue = await page.locator('#moodNotes').inputValue();
    expect(moodNotesValue.trim().length).toBeGreaterThan(0);

    await expect(page.locator('#saveMoodBtn')).toBeEnabled();
  });

  test('should enable save button when typing in free mode', async ({ page }) => {
    await page.click('#freeBtn');

    await page.fill('#moodNotes', 'Today I felt really good about my progress.');

    await expect(page.locator('#saveMoodBtn')).toBeEnabled();
  });

  test('should save a journal entry and show in history', async ({ page }) => {
    const uniqueTitle = `Test Entry ${Date.now()}`;

    await page.click('#freeBtn');
    await page.fill('#journalTitle', uniqueTitle);
    await page.fill('#moodNotes', 'This is a test journal entry for E2E testing.');
    await page.click('#saveMoodBtn');

    await expect(page.locator('#mood-message')).toHaveText('Journal entry saved!', { timeout: 5000 });

    const journalCards = page.locator('#moodHistory .journal-card');
    await expect(journalCards.first()).toBeVisible({ timeout: 5000 });
  });

  test('should clear form after saving', async ({ page }) => {
    await page.click('#freeBtn');
    await page.fill('#moodNotes', 'Entry to verify form reset after save.');
    await page.click('#saveMoodBtn');

    await expect(page.locator('#mood-message')).toHaveText('Journal entry saved!', { timeout: 5000 });

    const moodNotesValue = await page.locator('#moodNotes').inputValue();
    expect(moodNotesValue).toBe('');

    await expect(page.locator('#saveMoodBtn')).toBeDisabled();
  });

  test.describe('Access control', () => {
    test('unauthenticated user is redirected to login', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/journal.html');
      await page.waitForURL('**/login**', { timeout: 10000 });
      await expect(page).toHaveURL(/.*login.*/);
    });
  });
});
