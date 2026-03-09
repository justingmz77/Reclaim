const { test, expect } = require('@playwright/test');

// Today's date string in the same format the app uses: YYYY-MM-DD
function todayString() {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Shared login helper
// ---------------------------------------------------------------------------
async function loginAsStudent(page) {
  await page.goto('/login.html');
  await page.fill('#email', 'kieranb@my.yorku.ca');
  await page.fill('#password', 'Sova-never1');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Clean up today's mood entry via API before each test so every test starts
// from a clean state.  The request piggy-backs on the active browser session.
// ---------------------------------------------------------------------------
async function deleteTodaysMoodEntry(page) {
  const today = todayString();
  await page.request.delete(`/api/mood-entries/${today}`);
  // Ignore 404 – it just means no entry existed yet.
}

// ---------------------------------------------------------------------------
test.describe('Mood Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStudent(page);
    await deleteTodaysMoodEntry(page);

    // The mood tracker lives on the homepage (/).
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // -------------------------------------------------------------------------
  // 1. UI visibility
  // -------------------------------------------------------------------------
  test('mood tracking section is visible when authenticated', async ({ page }) => {
    await expect(page.locator('section#mood')).toBeVisible();
    await expect(page.locator('.mood-selector')).toBeVisible();

    // All five mood buttons should be rendered
    const moodButtons = page.locator('.mood-btn');
    await expect(moodButtons).toHaveCount(5);

    // Save button exists and starts disabled (no mood selected yet)
    await expect(page.locator('#saveMoodBtn')).toBeVisible();
    await expect(page.locator('#saveMoodBtn')).toBeDisabled();

    // Notes textarea is present
    await expect(page.locator('#moodNotes')).toBeVisible();
  });

  // -------------------------------------------------------------------------
  // 2. Selecting a mood enables the save button
  // -------------------------------------------------------------------------
  test('clicking a mood button selects it and enables the save button', async ({ page }) => {
    const greatBtn = page.locator('.mood-btn[data-mood="great"]');

    await greatBtn.click();

    // The clicked button should receive the "active" class
    await expect(greatBtn).toHaveClass(/active/);

    // The other buttons should NOT be active
    for (const mood of ['good', 'okay', 'bad', 'terrible']) {
      await expect(page.locator(`.mood-btn[data-mood="${mood}"]`)).not.toHaveClass(/active/);
    }

    // Save button should now be enabled
    await expect(page.locator('#saveMoodBtn')).toBeEnabled();
  });

  test('switching mood selection moves the active state to the new button', async ({ page }) => {
    await page.locator('.mood-btn[data-mood="good"]').click();
    await expect(page.locator('.mood-btn[data-mood="good"]')).toHaveClass(/active/);

    await page.locator('.mood-btn[data-mood="terrible"]').click();
    await expect(page.locator('.mood-btn[data-mood="terrible"]')).toHaveClass(/active/);
    await expect(page.locator('.mood-btn[data-mood="good"]')).not.toHaveClass(/active/);
  });

  // -------------------------------------------------------------------------
  // 3. Saving a mood entry
  // -------------------------------------------------------------------------
  test('can save a mood entry for today and sees success message', async ({ page }) => {
    await page.locator('.mood-btn[data-mood="good"]').click();
    await page.locator('#saveMoodBtn').click();

    // Success banner should appear containing the mood label
    const moodMessage = page.locator('#mood-message');
    await expect(moodMessage).toBeVisible({ timeout: 5000 });
    await expect(moodMessage).toContainText('Good');
  });

  test('can save a mood entry with an optional note', async ({ page }) => {
    await page.locator('.mood-btn[data-mood="okay"]').click();
    await page.fill('#moodNotes', 'Feeling a bit tired today but pushing through.');
    await page.locator('#saveMoodBtn').click();

    const moodMessage = page.locator('#mood-message');
    await expect(moodMessage).toBeVisible({ timeout: 5000 });
    await expect(moodMessage).toContainText('Okay');
  });

  // -------------------------------------------------------------------------
  // 4. Saved mood appears in the history section
  // -------------------------------------------------------------------------
  test('saved mood entry appears in the recent mood history', async ({ page }) => {
    await page.locator('.mood-btn[data-mood="great"]').click();
    await page.locator('#saveMoodBtn').click();

    // Wait for the success banner so we know the save has completed and the
    // history has been re-rendered.
    await expect(page.locator('#mood-message')).toBeVisible({ timeout: 5000 });

    const historyItems = page.locator('#moodHistory .mood-history-item');
    await expect(historyItems.first()).toBeVisible({ timeout: 5000 });

    // At least one history item should show the "Great" label
    await expect(historyItems.first()).toContainText('Great');
  });

  test('mood history shows the note when one was provided', async ({ page }) => {
    const note = 'This is my unique test note for mood history.';

    await page.locator('.mood-btn[data-mood="bad"]').click();
    await page.fill('#moodNotes', note);
    await page.locator('#saveMoodBtn').click();

    await expect(page.locator('#mood-message')).toBeVisible({ timeout: 5000 });

    // The note text should be visible inside the history grid
    await expect(page.locator('#moodHistory')).toContainText(note, { timeout: 5000 });
  });

  // -------------------------------------------------------------------------
  // 5. One mood per day – saving again updates rather than duplicates
  // -------------------------------------------------------------------------
  test('saving a second mood for today updates the entry instead of creating a duplicate', async ({ page }) => {
    // Save first mood
    await page.locator('.mood-btn[data-mood="good"]').click();
    await page.locator('#saveMoodBtn').click();
    await expect(page.locator('#mood-message')).toBeVisible({ timeout: 5000 });

    // Reload and save a different mood for the same day
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('.mood-btn[data-mood="terrible"]').click();
    await page.locator('#saveMoodBtn').click();
    await expect(page.locator('#mood-message')).toBeVisible({ timeout: 5000 });

    // Verify via API that there is still only one entry for today
    const today = todayString();
    const response = await page.request.get('/api/mood-entries');
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    const todayEntries = body.entries.filter(e => e.date === today);
    expect(todayEntries).toHaveLength(1);

    // And the stored mood should be the updated one
    expect(todayEntries[0].mood).toBe('terrible');
  });

  test('page reload pre-selects mood button when today already has an entry', async ({ page }) => {
    // Save a mood entry first
    await page.locator('.mood-btn[data-mood="okay"]').click();
    await page.locator('#saveMoodBtn').click();
    await expect(page.locator('#mood-message')).toBeVisible({ timeout: 5000 });

    // Reload the page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The "okay" button should be pre-selected (active) on reload
    await expect(page.locator('.mood-btn[data-mood="okay"]')).toHaveClass(/active/, { timeout: 5000 });
    // And the save button should be enabled (a mood is already selected)
    await expect(page.locator('#saveMoodBtn')).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // 6. API integration
  // -------------------------------------------------------------------------
  test('saving via UI is reflected in GET /api/mood-entries', async ({ page }) => {
    const today = todayString();

    await page.locator('.mood-btn[data-mood="great"]').click();
    await page.locator('#saveMoodBtn').click();
    await expect(page.locator('#mood-message')).toBeVisible({ timeout: 5000 });

    // Confirm the entry exists via the list endpoint
    const listResponse = await page.request.get('/api/mood-entries');
    expect(listResponse.ok()).toBeTruthy();

    const listBody = await listResponse.json();
    expect(listBody.success).toBe(true);
    expect(Array.isArray(listBody.entries)).toBe(true);

    const todayEntry = listBody.entries.find(e => e.date === today);
    expect(todayEntry).toBeDefined();
    expect(todayEntry.mood).toBe('great');
    expect(todayEntry.emoji).toBe('😊');
  });

  test('saving via UI is reflected in GET /api/mood-entries/:date', async ({ page }) => {
    const today = todayString();

    await page.locator('.mood-btn[data-mood="bad"]').click();
    await page.fill('#moodNotes', 'API integration test note');
    await page.locator('#saveMoodBtn').click();
    await expect(page.locator('#mood-message')).toBeVisible({ timeout: 5000 });

    // Confirm via the date-specific endpoint
    const dateResponse = await page.request.get(`/api/mood-entries/${today}`);
    expect(dateResponse.ok()).toBeTruthy();

    const dateBody = await dateResponse.json();
    expect(dateBody.success).toBe(true);
    expect(dateBody.entry).toBeDefined();
    expect(dateBody.entry.mood).toBe('bad');
    expect(dateBody.entry.note).toBe('API integration test note');
    expect(dateBody.entry.date).toBe(today);
  });

  test('POST /api/mood-entries returns the saved entry in response body', async ({ page }) => {
    const today = todayString();

    const response = await page.request.post('/api/mood-entries', {
      data: { date: today, mood: 'good', emoji: '🙂', note: 'Direct API test' },
    });

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.entry).toBeDefined();
    expect(body.entry.mood).toBe('good');
    expect(body.entry.date).toBe(today);
  });

  test('GET /api/mood-entries/:date returns 404 for a date with no entry', async ({ page }) => {
    // A date in the past that certainly has no entry for this test user
    const response = await page.request.get('/api/mood-entries/1970-01-01');
    expect(response.status()).toBe(404);
  });

  // -------------------------------------------------------------------------
  // Access control
  // -------------------------------------------------------------------------
  test.describe('Access control', () => {
    test('unauthenticated user is redirected to login when visiting /', async ({ page }) => {
      await page.context().clearCookies();
      await page.goto('/');
      await page.waitForURL('**/login**', { timeout: 10000 });
      await expect(page).toHaveURL(/.*login.*/);
    });

    test('unauthenticated requests to POST /api/mood-entries return 401 or redirect', async ({ page }) => {
      await page.context().clearCookies();
      const response = await page.request.post('/api/mood-entries', {
        data: { date: todayString(), mood: 'good', emoji: '🙂' },
        failOnStatusCode: false,
      });
      // The requireAuth middleware redirects to login (302) or returns 401
      expect([302, 401]).toContain(response.status());
    });
  });
});
