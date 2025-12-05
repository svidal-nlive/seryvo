/**
 * Seryvo Platform - Test Fixtures
 * 
 * Custom Playwright fixtures for multi-user testing scenarios.
 * Provides isolated browser contexts for each user role.
 * Uses demo user credentials from the backend seed data.
 */

import { test as base, Page, BrowserContext, Browser } from '@playwright/test';
import { TestUser, TestCredentials, getDemoUser, DEMO_USERS } from './types';

// Extended test fixture types
interface MultiUserFixtures {
  /** Admin browser context with fresh session */
  adminContext: BrowserContext;
  /** Admin page instance */
  adminPage: Page;
  /** Client browser context with fresh session */
  clientContext: BrowserContext;
  /** Client page instance */
  clientPage: Page;
  /** Driver browser context with fresh session */
  driverContext: BrowserContext;
  /** Driver page instance */
  driverPage: Page;
  /** Support Agent browser context with fresh session */
  supportContext: BrowserContext;
  /** Support Agent page instance */
  supportPage: Page;
  /** Pre-configured demo credentials for all users */
  testCredentials: TestCredentials;
  /** Helper to create authenticated context */
  createAuthenticatedContext: (user: TestUser) => Promise<{ context: BrowserContext; page: Page }>;
}

// Create the extended test with multi-user fixtures
export const test = base.extend<MultiUserFixtures>({
  // Use demo credentials from the seeded database
  testCredentials: async ({}, use) => {
    const credentials: TestCredentials = {
      admin: getDemoUser('admin'),
      client: getDemoUser('client'),
      driver: getDemoUser('driver'),
      supportAgent: getDemoUser('support_agent'),
    };
    await use(credentials);
  },

  // Admin context - isolated browser context
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: undefined, // Fresh session
    });
    await use(context);
    await context.close();
  },

  // Admin page
  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
  },

  // Client context - isolated browser context
  clientContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: undefined, // Fresh session
    });
    await use(context);
    await context.close();
  },

  // Client page
  clientPage: async ({ clientContext }, use) => {
    const page = await clientContext.newPage();
    await use(page);
  },

  // Driver context - isolated browser context
  driverContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: undefined, // Fresh session
    });
    await use(context);
    await context.close();
  },

  // Driver page
  driverPage: async ({ driverContext }, use) => {
    const page = await driverContext.newPage();
    await use(page);
  },

  // Support Agent context - isolated browser context
  supportContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: undefined, // Fresh session
    });
    await use(context);
    await context.close();
  },

  // Support Agent page
  supportPage: async ({ supportContext }, use) => {
    const page = await supportContext.newPage();
    await use(page);
  },

  // Helper to create an authenticated context for any user
  createAuthenticatedContext: async ({ browser }, use) => {
    const contexts: BrowserContext[] = [];
    
    const createContext = async (user: TestUser) => {
      const context = await browser.newContext({
        storageState: undefined,
      });
      contexts.push(context);
      const page = await context.newPage();
      return { context, page };
    };

    await use(createContext);

    // Cleanup all created contexts
    for (const context of contexts) {
      await context.close();
    }
  },
});

export { expect } from '@playwright/test';
