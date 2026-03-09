const { test, expect } = require('@playwright/test');

async function loginAs(page, email, password) {
  await page.goto('/login.html');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

test.describe('Dashboard', () => {
  test.describe('For student user', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'kieranb@my.yorku.ca', 'Sova-never1');
      await page.goto('/dashboard.html');
      await page.waitForLoadState('networkidle');
    });

    test('should display user email', async ({ page }) => {
      await expect(page.locator('#userEmail')).toContainText('kieranb@my.yorku.ca');
    });

    test('should show dashboard cards', async ({ page }) => {
      await expect(page.locator('h3', { hasText: 'Mood Tracker' })).toBeVisible();
      await expect(page.locator('h3', { hasText: 'Habits' })).toBeVisible();
      await expect(page.locator('h3', { hasText: 'Resources' })).toBeVisible();
    });

    test('should hide admin card for student', async ({ page }) => {
      await expect(page.locator('#adminManageCard')).toBeHidden();
    });

    test('should display stats section', async ({ page }) => {
      const moodCount = page.locator('#moodEntriesCount');
      const habitsCount = page.locator('#habitsCount');
      const completedHabitsCount = page.locator('#completedHabitsCount');

      await expect(moodCount).toBeVisible();
      await expect(habitsCount).toBeVisible();
      await expect(completedHabitsCount).toBeVisible();

      await expect(moodCount).toHaveText(/^[-\d]+$/);
      await expect(habitsCount).toHaveText(/^[-\d]+$/);
      await expect(completedHabitsCount).toHaveText(/^[-\d]+$/);
    });

    test('should show habit reminder card', async ({ page }) => {
      await expect(page.locator('#habitReminderTime')).toBeVisible();
      await expect(page.locator('#saveHabitReminderBtn')).toBeVisible();
    });

    test('can set a habit reminder time', async ({ page }) => {
      await page.fill('#habitReminderTime', '09:00');
      await page.click('#saveHabitReminderBtn');
      await expect(page.locator('#habitReminderStatus')).toContainText('Reminder set');
    });
  });

  test.describe('For admin user', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'testadmin@my.yorku.ca', 'password');
      await page.goto('/dashboard.html');
      await page.waitForLoadState('networkidle');
    });

    test('should show admin manage content card', async ({ page }) => {
      await expect(page.locator('#adminManageCard')).toBeVisible();
    });

    test('admin card links to admin.html', async ({ page }) => {
      await expect(page.locator('#adminManageCard a[href="admin.html"]')).toBeVisible();
    });
  });

  test.describe('Access control', () => {
    test('unauthenticated user is redirected to login', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/dashboard.html');
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    });
  });
});
