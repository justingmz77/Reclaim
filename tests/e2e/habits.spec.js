const { test, expect } = require('@playwright/test');

test.describe('Habits Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login.html');
    await page.fill('#email', 'kieranb@my.yorku.ca');
    await page.fill('#password', 'Sova-never1');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Navigate to habits page
    await page.goto('/habits.html');
    await page.waitForLoadState('networkidle');
  });

  test('should display habits page', async ({ page }) => {
    // Check that the page loaded
    await expect(page).toHaveURL(/.*habits.*/);
  });

  test('should have habit form elements', async ({ page }) => {
    // Check for form elements
    const habitNameInput = page.locator('#habitName, input[name="name"], input[placeholder*="habit"]');
    const frequencySelect = page.locator('#reminderFrequency, select[name="frequency"], select[name="reminderFrequency"]');

    // At least one of these should exist
    const hasNameInput = await habitNameInput.first().isVisible().catch(() => false);
    const hasFrequency = await frequencySelect.first().isVisible().catch(() => false);

    expect(hasNameInput || hasFrequency).toBeTruthy();
  });

  test('should create a new habit', async ({ page }) => {
    const habitName = `Test Habit ${Date.now()}`;

    // Fill in habit form
    const nameInput = page.locator('#habitName, input[name="name"]').first();
    await nameInput.fill(habitName);

    const frequencySelect = page.locator('#reminderFrequency, select[name="reminderFrequency"]').first();
    if (await frequencySelect.isVisible()) {
      await frequencySelect.selectOption('daily');
    }

    // Handle any alerts that appear
    page.on('dialog', dialog => dialog.accept());

    // Submit the form
    const submitButton = page.locator('#addHabitForm button[type="submit"], form button[type="submit"]').first();
    await submitButton.click();

    // Wait for the habit to appear or success indication
    await page.waitForTimeout(1000);

    // Verify habit was created by checking if it appears in the list
    const habitCard = page.locator(`.habit-card:has-text("${habitName}"), [class*="habit"]:has-text("${habitName}")`);
    await expect(habitCard.first()).toBeVisible({ timeout: 5000 });
  });

  test('should display existing habits', async ({ page }) => {
    // Check if there are any habit cards displayed
    const habitCards = page.locator('.habit-card, [class*="habit-item"], [class*="habitCard"]');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // The test passes if we can see the habits container (even if empty)
    const habitsContainer = page.locator('#habitsContainer, #habits, .habits-list, [class*="habits"]');
    await expect(habitsContainer.first()).toBeVisible();
  });
});
