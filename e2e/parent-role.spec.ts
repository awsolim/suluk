import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, TEST_PARENT, loginAsParent } from './helpers';

// Covers: US-P1, US-P2, US-P3, US-P4, US-P5, US-P6, US-P7
test.describe('Parent role', () => {

  // US-P1: As a parent, I can sign up selecting the "Parent" role
  test('US-P1: parent signup with role selection', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/signup`);
    // Select the parent role option
    await page.click('[data-testid="role-parent"]');
    await page.getByLabel(/full name|name/i).fill('New Test Parent');
    await page.getByLabel(/email/i).fill(`parent-${Date.now()}@test.com`);
    await page.getByLabel(/password/i).fill('TestPassword123!');
    await page.getByRole('button', { name: /sign up|register|create/i }).click();
    await expect(page).toHaveURL(new RegExp(`/m/${TEST_MOSQUE_SLUG}/dashboard`), { timeout: 10000 });
  });

  // US-P2: As a parent, I can add a child to my account
  test('US-P2: parent adds a child', async ({ page }) => {
    await loginAsParent(page);

    await page.click('[data-testid="add-child-button"]');
    await page.getByLabel(/full name|name/i).fill('New Child');
    await page.getByLabel(/date of birth|birthday/i).fill('2018-05-15');
    // Use ARIA selectors for base-ui Select (not native <select>)
    await page.getByRole('combobox', { name: /gender/i }).click();
    await page.getByRole('option', { name: /male/i }).click();
    await page.click('[data-testid="submit-add-child"]');

    await expect(page.locator('[data-testid="child-card"]').last()).toContainText('New Child', { timeout: 10000 });
  });

  // US-P3: As a parent, I can view my children's enrollments on my dashboard
  test('US-P3: parent views children enrollments', async ({ page }) => {
    await loginAsParent(page);

    // Seed data places the test child enrolled in the free program
    await expect(page.locator('[data-testid="child-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="enrollment-info"]')).toBeVisible();
  });

  // US-P4: As a parent, I can browse programs and enroll a child
  test('US-P4: parent enrolls child in program', async ({ page }) => {
    await loginAsParent(page);

    await page.click('a[href*="/programs"]');
    await page.locator('[data-testid="program-card"]').first().click();
    await page.click('[data-testid="child-selector"]');
    await page.locator('[data-testid="child-option"]').first().click();
    await page.click('[data-testid="enroll-child-button"]');
    await expect(page.getByText(/enrolled/i)).toBeVisible({ timeout: 10000 });
  });

  // US-P5: As a parent, I can apply to a program on behalf of my child
  test('US-P5: parent applies for child', async ({ page }) => {
    await loginAsParent(page);

    await page.click('a[href*="/programs"]');
    await page.locator('[data-testid="program-card-requires-application"]').click();
    await page.click('[data-testid="child-selector"]');
    await page.locator('[data-testid="child-option"]').first().click();
    await page.click('[data-testid="apply-child-button"]');
    await expect(page.getByText(/pending/i)).toBeVisible({ timeout: 10000 });
  });

  // US-P6: As a parent, I can view application status for my children
  test('US-P6: parent views application status', async ({ page }) => {
    await loginAsParent(page);

    // Seed data places the test child with an accepted application on the paid program
    await expect(page.locator('[data-testid="child-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="application-status"]')).toBeVisible();
  });

  // US-P7: As a parent, I can pay for my child's enrollment in a paid program
  test('US-P7: parent initiates checkout for child paid program', async ({ page }) => {
    await loginAsParent(page);

    // Navigate to the paid program (Advanced Arabic)
    await page.click('a[href*="/programs"]');
    await page.getByText('Advanced Arabic').click();

    // Parent should see the ChildSelector on the program detail page
    await expect(page.locator('[data-testid="child-selector"]')).toBeVisible({ timeout: 10000 });

    // Select the child
    await page.locator('[data-testid="child-option"]').first().click();

    // Since the child has an accepted application on this paid program,
    // the checkout button should appear
    const checkoutButton = page.locator('[data-testid="checkout-child-button"]');
    await expect(checkoutButton).toBeVisible({ timeout: 10000 });
    await expect(checkoutButton).toContainText(/pay.*enroll/i);

    // Click checkout — this will call /api/stripe/checkout with childProfileId
    // We intercept the API call to verify it includes childProfileId without
    // actually redirecting to Stripe
    const [checkoutRequest] = await Promise.all([
      page.waitForRequest((req) =>
        req.url().includes('/api/stripe/checkout') && req.method() === 'POST'
      ),
      checkoutButton.click(),
    ]);

    // Verify the request body includes the child profile ID
    const body = checkoutRequest.postDataJSON();
    expect(body).toHaveProperty('childProfileId');
    expect(body.childProfileId).toBeTruthy();
    expect(body.programId).toBeTruthy();
    expect(body.slug).toBe(TEST_MOSQUE_SLUG);
  });
});
