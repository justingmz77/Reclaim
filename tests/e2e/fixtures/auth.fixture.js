const { test as base } = require('@playwright/test');

// Extend the base test with authentication fixture
exports.test = base.extend({
  // Authenticated page fixture for student user
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login.html');
    // Use seeded user from bin/seed.js
    await page.fill('#email', 'kieranb@my.yorku.ca');
    await page.fill('#password', 'Sova-never1');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    await use(page);
  },

  // Admin authenticated page fixture
  adminPage: async ({ page }, use) => {
    await page.goto('/login.html');
    // Use seeded admin from bin/seed.js
    await page.fill('#email', 'testadmin@my.yorku.ca');
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    await use(page);
  }
});

exports.expect = base.expect;
