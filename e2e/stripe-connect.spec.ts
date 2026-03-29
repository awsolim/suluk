import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsAdmin, loginAsStudent } from './helpers';

// Covers: US-SC1 (Stripe Connect admin UI)
test.describe('Stripe Connect admin settings', () => {
  test('US-SC1: admin sees Payments card with Connect Stripe button', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);

    // Payments card is visible
    await expect(page.getByRole('heading', { name: /payments/i })).toBeVisible();
    await expect(
      page.getByText(/connect a stripe account to accept payments/i)
    ).toBeVisible();

    // Connect or continue button is rendered (depends on whether account was started)
    await expect(
      page.getByRole('button', { name: /connect stripe account|continue stripe setup/i })
    ).toBeVisible();
  });

  test('US-SC1: non-admin does not see Payments card', async ({ page }) => {
    await loginAsStudent(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/settings`);

    // Confirm the settings page actually loaded for the student
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();

    // Payments heading should not exist
    await expect(page.getByRole('heading', { name: /payments/i })).not.toBeAttached();

    // Connect/continue button should not exist
    await expect(
      page.getByRole('button', { name: /connect stripe account|continue stripe setup/i })
    ).not.toBeAttached();
  });
});
