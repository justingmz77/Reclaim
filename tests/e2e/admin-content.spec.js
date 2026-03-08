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
    const uniqueTitle = `E2E Test Prompt ${Date.now()}`;
    const uniqueText = 'E2E test prompt text';

    test.beforeEach(async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin.html');
      await page.waitForLoadState('networkidle');
    });

    test('add a new prompt', async ({ page }) => {
      // Queue dialog responses: first prompt() = title, second = text
      const dialogs = [uniqueTitle, uniqueText];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') {
          await dialog.accept(dialogs[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      await page.click('#addPromptBtn');
      await page.waitForLoadState('networkidle');

      // New prompt should appear in the list
      await expect(page.locator('#promptsList')).toContainText(uniqueTitle);
    });

    test('edit an existing prompt', async ({ page }) => {
      // First add a prompt to edit
      const titleToEdit = `Edit Me ${Date.now()}`;
      const dialogs = [titleToEdit, 'Original text'];
      let dialogIndex = 0;
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') {
          await dialog.accept(dialogs[dialogIndex++]);
        } else {
          await dialog.accept();
        }
      });

      await page.click('#addPromptBtn');
      await page.waitForLoadState('networkidle');

      // Find the newly added prompt row and update its title input
      const titleInput = page.locator(`#promptsList input[value="${titleToEdit}"]`);
      await expect(titleInput).toBeVisible();
      await titleInput.fill('Updated Title');

      // Click Save on that row
      const row = page.locator('#promptsList .admin-row').filter({ hasText: 'Updated Title' });
      await row.locator('button[data-action="save"]').click();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('#promptsList')).toContainText('Updated Title');
    });

    test('delete a prompt', async ({ page }) => {
      // Add a prompt to delete
      const titleToDelete = `Delete Me ${Date.now()}`;
      const addDialogs = [titleToDelete, 'Text to delete'];
      let addIndex = 0;

      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') {
          await dialog.accept(addDialogs[addIndex++]);
        } else {
          // confirm() dialog for delete
          await dialog.accept();
        }
      });

      await page.click('#addPromptBtn');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#promptsList')).toContainText(titleToDelete);

      // Delete it
      const row = page.locator('#promptsList .admin-row').filter({ hasText: titleToDelete });
      await row.locator('button[data-action="delete"]').click();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('#promptsList')).not.toContainText(titleToDelete);
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
      const instructions = 'Breathe in, breathe out.';
      const dialogs = [title, instructions];
      let i = 0;
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept(dialogs[i++]);
        else await dialog.accept();
      });

      await page.click('#addExerciseBtn');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('#exercisesList')).toContainText(title);
    });

    test('delete an exercise', async ({ page }) => {
      const title = `Del Exercise ${Date.now()}`;
      const dialogs = [title, 'Some instructions'];
      let i = 0;
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept(dialogs[i++]);
        else await dialog.accept();
      });

      await page.click('#addExerciseBtn');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#exercisesList')).toContainText(title);

      const row = page.locator('#exercisesList .admin-row').filter({ hasText: title });
      await row.locator('button[data-action="delete"]').click();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('#exercisesList')).not.toContainText(title);
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
      const description = 'A test game entry.';
      const dialogs = [title, description];
      let i = 0;
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept(dialogs[i++]);
        else await dialog.accept();
      });

      await page.click('#addGameBtn');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('#gamesList')).toContainText(title);
    });
  });

  test.describe('Changes apply globally', () => {
    test('added prompt appears in /api/content', async ({ page }) => {
      await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto('/admin.html');
      await page.waitForLoadState('networkidle');

      const title = `Global Prompt ${Date.now()}`;
      const dialogs = [title, 'Global text'];
      let i = 0;
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept(dialogs[i++]);
        else await dialog.accept();
      });

      await page.click('#addPromptBtn');
      await page.waitForLoadState('networkidle');

      // Fetch /api/content and verify the new prompt is present
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
      const dialogs = [title, 'Will be removed'];
      let i = 0;
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'prompt') await dialog.accept(dialogs[i++]);
        else await dialog.accept();
      });

      await page.click('#addPromptBtn');
      await page.waitForLoadState('networkidle');

      const row = page.locator('#promptsList .admin-row').filter({ hasText: title });
      await row.locator('button[data-action="delete"]').click();
      await page.waitForLoadState('networkidle');

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
});
