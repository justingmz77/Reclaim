const { test, expect } = require('@playwright/test');

test.describe('Signup / Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/signup.html');
  });

  // -------------------------------------------------------------------------
  // Page structure
  // -------------------------------------------------------------------------

  test('should display signup page correctly', async ({ page }) => {
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // Email validation
  // -------------------------------------------------------------------------

  test('should show error for non-YorkU email (gmail)', async ({ page }) => {
    await page.fill('#email', 'student@gmail.com');
    await page.fill('#password', 'Test@Pass1');
    await page.fill('#confirmPassword', 'Test@Pass1');
    await page.click('button[type="submit"]');

    // #errorMessage is hidden by default; signup.js sets display:block on failure
    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for non-YorkU email (hotmail)', async ({ page }) => {
    await page.fill('#email', 'student@hotmail.com');
    await page.fill('#password', 'Test@Pass1');
    await page.fill('#confirmPassword', 'Test@Pass1');
    await page.click('button[type="submit"]');

    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for missing email', async ({ page }) => {
    // Leave email blank; fill only the password fields
    await page.fill('#password', 'Test@Pass1');
    await page.fill('#confirmPassword', 'Test@Pass1');
    await page.click('button[type="submit"]');

    // The browser required-field constraint or the JS validation will fire
    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // Password validation
  // -------------------------------------------------------------------------

  test('should show error for weak password (missing uppercase)', async ({ page }) => {
    await page.fill('#email', 'newstudent@my.yorku.ca');
    // password1! has a number and special char but no uppercase letter
    await page.fill('#password', 'password1!');
    await page.fill('#confirmPassword', 'password1!');
    await page.click('button[type="submit"]');

    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#errorMessage')).toContainText('uppercase', { ignoreCase: true });
  });

  test('should show error for weak password (too short)', async ({ page }) => {
    await page.fill('#email', 'newstudent@my.yorku.ca');
    // Ab1! is only 4 characters — well under the 8-character minimum
    await page.fill('#password', 'Ab1!x');
    await page.fill('#confirmPassword', 'Ab1!x');
    await page.click('button[type="submit"]');

    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#errorMessage')).toContainText('8', { ignoreCase: true });
  });

  test('should show error for weak password (missing number)', async ({ page }) => {
    await page.fill('#email', 'newstudent@my.yorku.ca');
    await page.fill('#password', 'Password!');
    await page.fill('#confirmPassword', 'Password!');
    await page.click('button[type="submit"]');

    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for weak password (missing special character)', async ({ page }) => {
    await page.fill('#email', 'newstudent@my.yorku.ca');
    await page.fill('#password', 'Password1');
    await page.fill('#confirmPassword', 'Password1');
    await page.click('button[type="submit"]');

    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.fill('#email', 'newstudent@my.yorku.ca');
    await page.fill('#password', 'Test@Pass1');
    await page.fill('#confirmPassword', 'Test@Pass2');
    await page.click('button[type="submit"]');

    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#errorMessage')).toContainText('match', { ignoreCase: true });
  });

  // -------------------------------------------------------------------------
  // Successful registration
  // -------------------------------------------------------------------------

  test('should successfully register a new user and redirect to dashboard', async ({ page }) => {
    const uniqueEmail = `e2e_${Date.now()}@my.yorku.ca`;

    await page.fill('#email', uniqueEmail);
    await page.fill('#password', 'Test@Pass1');
    await page.fill('#confirmPassword', 'Test@Pass1');
    await page.click('button[type="submit"]');

    // signup.js redirects to /dashboard on a 2xx response from POST /api/register
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  // -------------------------------------------------------------------------
  // Duplicate email
  // -------------------------------------------------------------------------

  test('should show error for duplicate email', async ({ page }) => {
    // kieranb@my.yorku.ca is expected to exist in the seeded database
    await page.fill('#email', 'kieranb@my.yorku.ca');
    await page.fill('#password', 'Test@Pass1');
    await page.fill('#confirmPassword', 'Test@Pass1');
    await page.click('button[type="submit"]');

    // auth.js throws 'User with this email already exists' which the API
    // surfaces as { error: '...' } and signup.js renders in #errorMessage
    await expect(page.locator('#errorMessage')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#errorMessage')).toContainText('already exists', { ignoreCase: true });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  test('should have link back to login page and navigate correctly', async ({ page }) => {
    // signup.html: <a href="login.html">Log in here</a>
    const loginLink = page.locator('a[href*="login"]');
    await expect(loginLink).toBeVisible();
    await loginLink.click();

    await page.waitForURL('**/login**', { timeout: 5000 });
    await expect(page).toHaveURL(/login\.html/);
  });
});
