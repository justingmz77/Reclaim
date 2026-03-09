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

    // #errorMessage is hidden by default; wait for it to become visible on failure
    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
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

    const signupLink = page.locator('a[href*="signup"]').first();
    await expect(signupLink).toBeVisible();
    await signupLink.click();
    await expect(page).toHaveURL(/.*signup.*/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login.html');
    await page.fill('#email', 'testadmin@my.yorku.ca');
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**', { timeout: 10000 });

    // nav.js renders the logout anchor with id="logoutLink" once the user is
    // confirmed logged-in; wait for it to appear before clicking.
    const logoutLink = page.locator('#logoutLink');
    await expect(logoutLink).toBeVisible({ timeout: 5000 });
    await logoutLink.click();

    await page.waitForURL('**/login**', { timeout: 10000 });
    await expect(page).toHaveURL(/.*login.*/);
  });
});

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('should display signup page correctly', async ({ page }) => {
    await page.goto('/signup.html');

    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should show error for non-YorkU email', async ({ page }) => {
    await page.goto('/signup.html');

    await page.fill('#email', 'test@gmail.com');
    await page.fill('#password', 'ValidPass1!');
    await page.fill('#confirmPassword', 'ValidPass1!');
    await page.click('button[type="submit"]');

    // #errorMessage is hidden by default; the signup script makes it visible
    // when validation fails.
    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for weak password', async ({ page }) => {
    await page.goto('/signup.html');

    await page.fill('#email', 'newstudent@my.yorku.ca');
    // Weak: no uppercase, no special char, under complexity requirements
    await page.fill('#password', 'weakpass');
    await page.fill('#confirmPassword', 'weakpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard after successful signup', async ({ page }) => {
    await page.goto('/signup.html');

    // Use a unique email to avoid collisions across test runs
    const uniqueEmail = `testuser_${Date.now()}@my.yorku.ca`;
    await page.fill('#email', uniqueEmail);
    await page.fill('#password', 'ValidPass1!');
    await page.fill('#confirmPassword', 'ValidPass1!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await expect(page).toHaveURL(/.*dashboard.*/);
  });
});
