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
    await expect(frequencySelect).toBeVisible({ timeout: 5000 });
    await frequencySelect.selectOption('daily');

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
    const habitsContainer = page.locator('#currentHabits, [class*="habits"]');
    await expect(habitsContainer.first()).toBeVisible();
  });

  test('should show streaks container', async ({ page }) => {
    const streaksContainer = page.locator('#streaksContainer');
    await expect(streaksContainer).toBeVisible();
  });
});

test.describe('Habit Actions', () => {
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

  /**
   * Helper: create a habit and return its name.
   */
  async function createHabit(page, habitName) {
    page.on('dialog', dialog => dialog.accept());

    const nameInput = page.locator('#habitName').first();
    await nameInput.fill(habitName);

    const frequencySelect = page.locator('#reminderFrequency').first();
    await expect(frequencySelect).toBeVisible({ timeout: 5000 });
    await frequencySelect.selectOption('daily');

    const submitButton = page.locator('#addHabitForm button[type="submit"]').first();
    await submitButton.click();

    // Wait for the card to appear in #currentHabits
    const habitCard = page.locator(`#currentHabits .habit-card:has-text("${habitName}")`);
    await expect(habitCard.first()).toBeVisible({ timeout: 5000 });

    return habitName;
  }

  test('should mark a habit as complete today', async ({ page }) => {
    const habitName = `Complete Habit ${Date.now()}`;
    await createHabit(page, habitName);

    // Accept any confirm/alert dialogs that may appear on mark-complete
    page.on('dialog', dialog => dialog.accept());

    const habitCard = page.locator(`#currentHabits .habit-card:has-text("${habitName}")`).first();

    // Click the "Mark Complete" button
    const markCompleteBtn = habitCard.locator('button.btn-success:has-text("Mark Complete")');
    await markCompleteBtn.click();

    await page.waitForTimeout(1000);

    // After clicking, the button should read "Completed!" and be disabled
    const completedBtn = habitCard.locator('button.btn-success:has-text("Completed!")');
    await expect(completedBtn).toBeVisible({ timeout: 5000 });
    await expect(completedBtn).toBeDisabled();
  });

  test('should mark a habit as done', async ({ page }) => {
    const habitName = `Done Habit ${Date.now()}`;
    await createHabit(page, habitName);

    // Accept any confirm/alert dialogs
    page.on('dialog', dialog => dialog.accept());

    const habitCard = page.locator(`#currentHabits .habit-card:has-text("${habitName}")`).first();

    // Click "Mark as Done"
    const markDoneBtn = habitCard.locator('button.btn-secondary:has-text("Mark as Done")');
    await markDoneBtn.click();

    await page.waitForTimeout(1000);

    // Habit should now appear in the completed section
    const completedCard = page.locator(`#completedHabits .habit-card:has-text("${habitName}")`);
    await expect(completedCard.first()).toBeVisible({ timeout: 5000 });
  });

  test('should delete a habit', async ({ page }) => {
    const habitName = `Delete Habit ${Date.now()}`;
    await createHabit(page, habitName);

    // Accept the confirmation dialog triggered by the Delete button
    page.on('dialog', dialog => dialog.accept());

    const habitCard = page.locator(`#currentHabits .habit-card:has-text("${habitName}")`).first();

    // Click the Delete button inside .habit-actions
    const deleteBtn = habitCard.locator('.habit-actions button.btn-danger:has-text("Delete")');
    await deleteBtn.click();

    await page.waitForTimeout(1000);

    // The habit card should no longer be visible
    const deletedCard = page.locator(`#currentHabits .habit-card:has-text("${habitName}")`);
    await expect(deletedCard).toHaveCount(0, { timeout: 5000 });
  });
});
