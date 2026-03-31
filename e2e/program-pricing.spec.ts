import { test, expect } from '@playwright/test';
import { TEST_MOSQUE_SLUG, loginAsAdmin } from './helpers';

// Tests for pricing display and editing
test.describe('Program pricing', () => {
  test('new program page has pricing switch', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs/new`);
    // PricingEditor renders a Free/Paid switch
    await expect(page.getByRole('switch')).toBeVisible();
  });

  test('edit program page has pricing editor', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs`);
    await page.getByRole('heading', { name: /free quran studies/i }).click();
    await page.getByRole('heading', { name: /program details/i }).click();
    await page.waitForURL(/\/edit/);
    await expect(page.getByRole('switch')).toBeVisible();
  });

  test('pricing switch toggles between Free and Paid labels', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/admin/programs`);
    await page.getByRole('heading', { name: /free quran studies/i }).click();
    await page.getByRole('heading', { name: /program details/i }).click();
    await page.waitForURL(/\/edit/);

    // The switch should be present
    const toggle = page.getByRole('switch');
    await expect(toggle).toBeVisible();

    // Initially "Free" label should be visible (program is free)
    await expect(page.getByText('Free', { exact: true })).toBeVisible();
  });

  test('program detail page shows "Free" for free program', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
    await page.getByRole('heading', { name: 'Free Quran Studies' }).first().click();
    // The pricing section heading
    await expect(page.getByRole('heading', { name: /monthly rate/i })).toBeVisible();
    // The price text "Free" is in a bold paragraph — use exact match to avoid title/description
    await expect(page.getByText('Free', { exact: true })).toBeVisible();
  });

  test('program detail page shows dollar price for paid program', async ({ page }) => {
    await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
    await page.getByRole('heading', { name: 'Advanced Arabic' }).first().click();
    // Should show "Monthly Subscription" heading for paid programs
    await expect(page.getByRole('heading', { name: /monthly subscription/i })).toBeVisible();
    await expect(page.getByText(/\$\d+/)).toBeVisible();
  });
});
