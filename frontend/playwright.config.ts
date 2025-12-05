import { defineConfig, devices } from '@playwright/test';

/**
 * Seryvo Platform - Playwright E2E Test Configuration
 * 
 * This configuration sets up comprehensive end-to-end testing for the
 * multi-user transport booking platform.
 */

// Use the production URL for testing
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://seryvo.vectorhost.net';

export default defineConfig({
  // Test directory containing all test files
  testDir: './e2e',
  
  // Run tests in files in parallel
  fullyParallel: false, // We need sequential tests for multi-user scenarios
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry failed tests (2 retries for flaky network conditions)
  retries: process.env.CI ? 2 : 1,
  
  // Only one worker for multi-browser session tests to ensure proper coordination
  workers: 1,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for all page.goto() calls
    baseURL: BASE_URL,
    
    // Collect trace when retrying failed tests
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video for failed tests
    video: 'on-first-retry',
    
    // Default navigation timeout
    navigationTimeout: 30000,
    
    // Default action timeout
    actionTimeout: 15000,
    
    // Ignore HTTPS errors (for self-signed certs in development)
    ignoreHTTPSErrors: true,
  },

  // Configure projects for different browsers and devices
  projects: [
    // Desktop browsers
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    // Tablet viewports
    {
      name: 'ipad-tablet',
      use: {
        ...devices['iPad Pro 11'],
      },
    },
    {
      name: 'android-tablet',
      use: {
        viewport: { width: 800, height: 1280 },
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: true,
      },
    },
    
    // Mobile viewports
    {
      name: 'iphone-mobile',
      use: {
        ...devices['iPhone 14 Pro'],
      },
    },
    {
      name: 'android-mobile',
      use: {
        ...devices['Pixel 7'],
      },
    },
    
    // Multi-user scenario project (uses chromium by default)
    {
      name: 'multi-user-flow',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
      testMatch: /multi-user.*\.spec\.ts$/,
    },
  ],

  // Global timeout for each test
  timeout: 120000, // 2 minutes per test for complex multi-user flows

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Output directory for test artifacts
  outputDir: 'test-results',
});
