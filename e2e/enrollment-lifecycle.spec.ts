import { test, expect } from '@playwright/test';
import {
  TEST_MOSQUE_SLUG,
  loginAsStudent,
  loginAsTeacher,
  loginAsAdmin,
  createTestSupabaseClient,
} from './helpers';

test.describe('Enrollment lifecycle', () => {
  // Reset the student's application state before each test to avoid cross-test contamination
  test.describe('Student application states on program detail', () => {
    test('unauthenticated user sees "Log in to Apply" on program detail', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
      await page.getByRole('heading', { name: 'Free Quran Studies' }).first().click();
      await expect(page.getByText(/log in to apply/i)).toBeVisible();
    });

    test('enrolled student sees "Go to Class" and "Withdraw" on program detail', async ({ page }) => {
      await loginAsStudent(page);
      // Student is enrolled in Free Quran Studies from seed data
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
      await page.getByRole('heading', { name: 'Free Quran Studies' }).first().click();
      await expect(page.getByText(/enrolled/i)).toBeVisible();
      await expect(page.getByText(/go to class/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /withdraw/i })).toBeVisible();
    });

    test('student with pending application sees "Application Pending" badge', async ({ page }) => {
      await loginAsStudent(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
      await page.getByRole('heading', { name: 'Advanced Arabic' }).first().click();
      await expect(page.getByText(/application pending/i)).toBeVisible();
    });
  });

  test.describe('Admin cannot enroll in programs', () => {
    test('admin sees disabled message on program detail', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
      await page.getByRole('heading', { name: 'Free Quran Studies' }).first().click();
      await expect(page.getByText(/mosque admins cannot apply/i)).toBeVisible();
    });
  });

  test.describe('Teacher cannot enroll in programs', () => {
    test('teacher sees disabled message on program detail', async ({ page }) => {
      await loginAsTeacher(page);
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
      await page.getByRole('heading', { name: 'Free Quran Studies' }).first().click();
      await expect(page.getByText(/teachers cannot apply/i)).toBeVisible();
    });
  });

  test.describe('Program browsing', () => {
    test('program detail shows description section', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
      await page.getByRole('heading', { name: 'Free Quran Studies' }).first().click();
      await expect(page.getByRole('heading', { name: /description/i })).toBeVisible();
    });

    test('program detail shows contact teacher section', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
      await page.getByRole('heading', { name: 'Free Quran Studies' }).first().click();
      await expect(page.getByRole('heading', { name: /contact teacher/i })).toBeVisible();
    });

    test('program detail shows pricing section', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
      await page.getByRole('heading', { name: 'Free Quran Studies' }).first().click();
      await expect(page.getByText(/monthly/i)).toBeVisible();
    });

    test('back to programs link works', async ({ page }) => {
      await page.goto(`/m/${TEST_MOSQUE_SLUG}/programs`);
      await page.getByRole('heading', { name: 'Free Quran Studies' }).first().click();
      await page.getByText(/back to programs/i).first().click();
      await expect(page).toHaveURL(new RegExp(`/m/${TEST_MOSQUE_SLUG}/programs`));
    });
  });
});
