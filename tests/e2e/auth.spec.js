const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login.html');

    await expect(page.locator('h2')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login.html');

    await page.fill('#email', 'invalid@my.yorku.ca');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message to appear
    await expect(page.locator('.error, #errorMessage, [class*="error"]')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/login.html');

    // Use seeded user credentials
    await page.fill('#email', 'testadmin@my.yorku.ca');
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/login.html');

    // Use first() to handle multiple signup links
    const signupLink = page.locator('a[href*="signup"]').first();
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/.*signup.*/);
    }
  });

  test('should display signup page correctly', async ({ page }) => {
    await page.goto('/signup.html');

    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login.html');
    await page.fill('#email', 'testadmin@my.yorku.ca');
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    // Find and click logout
    const logoutLink = page.locator('#logoutLink, a[href*="logout"], button:has-text("Logout"), a:has-text("Logout")');
    if (await logoutLink.isVisible()) {
      await logoutLink.click();
      await page.waitForURL('**/login**', { timeout: 10000 });
      await expect(page).toHaveURL(/.*login.*/);
    }
  });
});
