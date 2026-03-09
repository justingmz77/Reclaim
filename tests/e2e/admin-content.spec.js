const { test, expect } = require('@playwright/test');

const ADMIN_EMAIL = 'testadmin@my.yorku.ca';
const ADMIN_PASSWORD = 'password';
const STUDENT_EMAIL = 'kieranb@my.yorku.ca';
const STUDENT_PASSWORD = 'Sova-never1';

async function loginAs(page, email, password) {
  await page.goto('/login.html');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

// Helper: accept dialogs in sequence (prompts get values from array, others accepted)
function handleDialogs(page, values) {
  let i = 0;
  page.on('dialog', async (dialog) => {
    if (dialog.type() === 'prompt') {
      await dialog.accept(values[i++] ?? '');
    } else {
      await dialog.accept();
    }
  });
}

// Helper: click a button that triggers dialog(s) + API save, wait for list to update
async function clickAndWaitForSave(page, buttonSelector, apiPath) {
  const saved = page.waitForResponse(
    (resp) => resp.url().includes(apiPath) && ['POST', 'PUT', 'DELETE'].includes(resp.request().method())
  );
  await page.click(buttonSelector);
  await saved;
}

test.describe('Admin Content Management', () => {
  test.describe('Dashboard access', () => {
    test('admin sees Manage Content card on dashboard', async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      const manageCard = page.locator('#adminManageCard');
      await expect(manageCard).toBeVisible();
      await expect(manageCard.locator('h3')).toHaveText('Manage Content');
      await expect(manageCard.locator('a[href="admin.html"]')).toBeVisible();
    });

    test('student does not see Manage Content card on dashboard', async ({ page }) => {
      await loginAs(page, STUDENT_EMAIL, STUDENT_PASSWORD);

      const manageCard = page.locator('#adminManageCard');
      await expect(manageCard).toBeHidden();
    });

    test('admin Manage Content card links to admin.html', async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

      await page.click('#adminManageCard a[href="admin.html"]');
      await page.waitForURL('**/admin.html**', { timeout: 10000 });
      await expect(page).toHaveURL(/.*admin\.html.*/);
    });
  });

  test.describe('Manage Content page', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin.html');
      await page.waitForLoadState('networkidle');
    });

    test('shows admin app for admin user', async ({ page }) => {
      await expect(page.locator('#adminApp')).toBeVisible();
      await expect(page.locator('#adminOnlyGate')).toBeHidden();
    });

    test('shows all content tabs', async ({ page }) => {
      await expect(page.locator('[data-tab="prompts"]')).toBeVisible();
      await expect(page.locator('[data-tab="games"]')).toBeVisible();
      await expect(page.locator('[data-tab="exercises"]')).toBeVisible();
      await expect(page.locator('[data-tab="users"]')).toBeVisible();
    });

    test('can switch between tabs', async ({ page }) => {
      // Games tab
      await page.click('[data-tab="games"]');
      await expect(page.locator('#tab-games')).toBeVisible();
      await expect(page.locator('#tab-prompts')).toBeHidden();

      // Exercises tab
      await page.click('[data-tab="exercises"]');
      await expect(page.locator('#tab-exercises')).toBeVisible();
      await expect(page.locator('#tab-games')).toBeHidden();

      // Back to prompts
      await page.click('[data-tab="prompts"]');
      await expect(page.locator('#tab-prompts')).toBeVisible();
    });
  });

  test.describe('Journaling prompts CRUD', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin.html');
      await page.waitForLoadState('networkidle');
    });

    test('add a new prompt', async ({ page }) => {
      const uniqueTitle = `E2E Test Prompt ${Date.now()}`;
      handleDialogs(page, [uniqueTitle, 'E2E test prompt text']);

      await clickAndWaitForSave(page, '#addPromptBtn', '/api/content/prompts');

      await expect(page.locator('#promptsList')).toContainText(uniqueTitle, { timeout: 8000 });
    });

    test('edit an existing prompt', async ({ page }) => {
      const titleToEdit = `Edit Me ${Date.now()}`;
      handleDialogs(page, [titleToEdit, 'Original text']);

      await clickAndWaitForSave(page, '#addPromptBtn', '/api/content/prompts');
      await expect(page.locator('#promptsList')).toContainText(titleToEdit, { timeout: 8000 });

      // Find the newly added prompt row and update its title input
      const titleInput = page.locator(`#promptsList input[value="${titleToEdit}"]`);
      await expect(titleInput).toBeVisible();
      await titleInput.fill('Updated Title');

      // Click Save on that row
      const row = page.locator('#promptsList .admin-row').filter({ hasText: 'Updated Title' });
      const putDone = page.waitForResponse(
        (resp) => resp.url().includes('/api/content/prompts') && resp.request().method() === 'PUT'
      );
      await row.locator('button[data-action="save"]').click();
      await putDone;

      await expect(page.locator('#promptsList')).toContainText('Updated Title', { timeout: 8000 });
    });

    test('delete a prompt', async ({ page }) => {
      const titleToDelete = `Delete Me ${Date.now()}`;
      handleDialogs(page, [titleToDelete, 'Text to delete']);

      await clickAndWaitForSave(page, '#addPromptBtn', '/api/content/prompts');
      await expect(page.locator('#promptsList')).toContainText(titleToDelete, { timeout: 8000 });

      // Delete it — dialog handler accepts the confirm()
      const deleteDone = page.waitForResponse(
        (resp) => resp.url().includes('/api/content/prompts') && resp.request().method() === 'DELETE'
      );
      const row = page.locator('#promptsList .admin-row').filter({ hasText: titleToDelete });
      await row.locator('button[data-action="delete"]').click();
      await deleteDone;

      await expect(page.locator('#promptsList')).not.toContainText(titleToDelete, { timeout: 8000 });
    });
  });

  test.describe('Exercises CRUD', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin.html');
      await page.waitForLoadState('networkidle');
      await page.click('[data-tab="exercises"]');
    });

    test('add a new exercise', async ({ page }) => {
      const title = `E2E Exercise ${Date.now()}`;
      handleDialogs(page, [title, 'Breathe in, breathe out.']);

      await clickAndWaitForSave(page, '#addExerciseBtn', '/api/content/exercises');

      await expect(page.locator('#exercisesList')).toContainText(title, { timeout: 8000 });
    });

    test('delete an exercise', async ({ page }) => {
      const title = `Del Exercise ${Date.now()}`;
      handleDialogs(page, [title, 'Some instructions']);

      await clickAndWaitForSave(page, '#addExerciseBtn', '/api/content/exercises');
      await expect(page.locator('#exercisesList')).toContainText(title, { timeout: 8000 });

      const deleteDone = page.waitForResponse(
        (resp) => resp.url().includes('/api/content/exercises') && resp.request().method() === 'DELETE'
      );
      const row = page.locator('#exercisesList .admin-row').filter({ hasText: title });
      await row.locator('button[data-action="delete"]').click();
      await deleteDone;

      await expect(page.locator('#exercisesList')).not.toContainText(title, { timeout: 8000 });
    });
  });

  test.describe('Games CRUD', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin.html');
      await page.waitForLoadState('networkidle');
      await page.click('[data-tab="games"]');
    });

    test('add a new game entry', async ({ page }) => {
      const title = `E2E Game ${Date.now()}`;
      handleDialogs(page, [title, 'A test game entry.']);

      await clickAndWaitForSave(page, '#addGameBtn', '/api/content/games');

      await expect(page.locator('#gamesList')).toContainText(title, { timeout: 8000 });
    });
  });

  test.describe('Changes apply globally', () => {
    test('added prompt appears in /api/content', async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin.html');
      await page.waitForLoadState('networkidle');

      const title = `Global Prompt ${Date.now()}`;
      handleDialogs(page, [title, 'Global text']);

      await clickAndWaitForSave(page, '#addPromptBtn', '/api/content/prompts');
      await expect(page.locator('#promptsList')).toContainText(title, { timeout: 8000 });

      const response = await page.request.get('/api/content');
      expect(response.ok()).toBeTruthy();
      const content = await response.json();
      const found = content.prompts.some(p => p.title === title);
      expect(found).toBe(true);
    });

    test('deleted prompt is removed from /api/content', async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin.html');
      await page.waitForLoadState('networkidle');

      const title = `Remove Me ${Date.now()}`;
      handleDialogs(page, [title, 'Will be removed']);

      await clickAndWaitForSave(page, '#addPromptBtn', '/api/content/prompts');
      await expect(page.locator('#promptsList')).toContainText(title, { timeout: 8000 });

      const deleteDone = page.waitForResponse(
        (resp) => resp.url().includes('/api/content/prompts') && resp.request().method() === 'DELETE'
      );
      const row = page.locator('#promptsList .admin-row').filter({ hasText: title });
      await row.locator('button[data-action="delete"]').click();
      await deleteDone;

      const response = await page.request.get('/api/content');
      const content = await response.json();
      const found = content.prompts.some(p => p.title === title);
      expect(found).toBe(false);
    });
  });

  test.describe('Access control', () => {
    test('student is blocked from admin page', async ({ page }) => {
      await loginAs(page, STUDENT_EMAIL, STUDENT_PASSWORD);
      await page.goto('/admin.html');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('#adminOnlyGate')).toBeVisible();
      await expect(page.locator('#adminApp')).toBeHidden();
    });

    test('unauthenticated user cannot write to content API', async ({ page }) => {
      const response = await page.request.post('/api/content/prompts', {
        data: { id: 'unauth-test', title: 'Unauthorized', text: 'Should fail' }
      });
      expect(response.status()).toBe(401);
    });

    test('student cannot write to content API', async ({ page }) => {
      await loginAs(page, STUDENT_EMAIL, STUDENT_PASSWORD);

      const response = await page.request.post('/api/content/prompts', {
        data: { id: 'student-test', title: 'Blocked', text: 'Should fail' }
      });
      expect(response.status()).toBe(403);
    });
  });

  test.describe('User Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin.html');
      await page.waitForLoadState('networkidle');
      await page.click('[data-tab="users"]');
    });

    test('shows users list', async ({ page }) => {
      await expect(page.locator('#usersList')).toBeVisible();
    });

    test('shows existing users in the list', async ({ page }) => {
      await expect(page.locator('#usersList .admin-row').first()).toBeVisible();
    });

    test('can add a new user', async ({ page }) => {
      const newEmail = `testuser${Date.now()}@my.yorku.ca`;
      handleDialogs(page, [newEmail, 'TestPass1!', 'student']);

      const addDone = page.waitForResponse(
        (resp) => resp.url().includes('/api/admin/users') && resp.request().method() === 'POST'
      );
      await page.click('#addUserBtn');
      await addDone;

      await expect(page.locator('#usersList')).toContainText(newEmail, { timeout: 8000 });
    });

    test('can change a user role', async ({ page }) => {
      // Retrieve the current user list to find a non-self user to update
      const listResponse = await page.request.get('/api/admin/users');
      expect(listResponse.ok()).toBeTruthy();
      const { users } = await listResponse.json();

      // Pick the first user that is not the admin performing the request
      const target = users.find(u => u.email !== ADMIN_EMAIL);
      expect(target).toBeTruthy();

      const originalRole = target.role;
      const newRole = originalRole === 'student' ? 'admin' : 'student';

      const updateResponse = await page.request.put(`/api/admin/users/${target.id}`, {
        data: { role: newRole }
      });
      expect(updateResponse.ok()).toBeTruthy();

      // Verify the change persisted by re-fetching the list
      const verifyResponse = await page.request.get('/api/admin/users');
      const { users: updatedUsers } = await verifyResponse.json();
      const updated = updatedUsers.find(u => u.id === target.id);
      expect(updated.role).toBe(newRole);

      // Restore the original role to avoid polluting other tests
      await page.request.put(`/api/admin/users/${target.id}`, {
        data: { role: originalRole }
      });
    });

    test('student cannot access users tab UI', async ({ page }) => {
      // Logout the current admin session, then log in as student
      await page.request.post('/api/logout');
      await loginAs(page, STUDENT_EMAIL, STUDENT_PASSWORD);
      await page.goto('/admin.html');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('#adminOnlyGate')).toBeVisible();
      await expect(page.locator('#adminApp')).toBeHidden();
    });
  });
});
