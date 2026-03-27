import { type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Viewport constants matching playwright.config.ts projects
export const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
} as const;

// Test data constants
export const TEST_MOSQUE_SLUG = 'test-mosque-e2e';
export const TEST_MOSQUE_NAME = 'Test Mosque E2E';

export const TEST_ADMIN = {
  email: 'admin-e2e@test.tareeqah.dev',
  password: 'test-password-123!',
  fullName: 'Test Admin',
};

export const TEST_TEACHER = {
  email: 'teacher-e2e@test.tareeqah.dev',
  password: 'test-password-123!',
  fullName: 'Test Teacher',
};

export const TEST_STUDENT = {
  email: 'student-e2e@test.tareeqah.dev',
  password: 'test-password-123!',
  fullName: 'Test Student',
};

export const TEST_PARENT = {
  email: 'parent-e2e@test.tareeqah.dev',
  password: 'test-password-123!',
  fullName: 'Test Parent',
};

export const TEST_TEACHER_REQUESTER = {
  email: 'teacher-requester-e2e@test.tareeqah.dev',
  password: 'test-password-123!',
  fullName: 'Test Teacher Requester',
};

/**
 * Creates a Supabase service client for test data operations.
 * Uses env vars that must be available at test time.
 */
export function createTestSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for E2E tests'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Logs in a test user via the UI login form.
 */
export async function login(
  page: Page,
  email: string,
  password: string,
  mosqueSlug: string = TEST_MOSQUE_SLUG
) {
  await page.goto(`/m/${mosqueSlug}/login`);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /log in|sign in/i }).click();
  // Wait for redirect to dashboard
  await page.waitForURL(`**/m/${mosqueSlug}/dashboard`, { timeout: 10000 });
}

/**
 * Logs in as the test admin user.
 */
export async function loginAsAdmin(page: Page) {
  await login(page, TEST_ADMIN.email, TEST_ADMIN.password);
}

/**
 * Logs in as the test teacher user.
 */
export async function loginAsTeacher(page: Page) {
  await login(page, TEST_TEACHER.email, TEST_TEACHER.password);
}

/**
 * Logs in as the test student user.
 */
export async function loginAsStudent(page: Page) {
  await login(page, TEST_STUDENT.email, TEST_STUDENT.password);
}

/**
 * Logs in as the test parent user.
 */
export async function loginAsParent(page: Page) {
  await login(page, TEST_PARENT.email, TEST_PARENT.password);
}

/**
 * Logs in via the global login page (not mosque-scoped).
 */
export async function globalLogin(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /log in|login/i }).click();
  await page.waitForURL('**/', { timeout: 10000 });
}
