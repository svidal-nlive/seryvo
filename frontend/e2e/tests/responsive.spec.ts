/**
 * Seryvo Platform - Responsive Testing
 * 
 * Tests the application across multiple viewport sizes to ensure
 * responsive design works correctly for all user types.
 * 
 * Uses demo credentials from backend seed data.
 */

import { test, expect, Page } from '@playwright/test';
import {
  waitForAppLoad,
  isOnLoginScreen,
  login,
  takeScreenshot,
} from '../helpers';
import { DEMO_USERS, TEST_VIEWPORTS, ViewportConfig } from '../types';

// Test viewports (subset for faster testing)
const VIEWPORTS = TEST_VIEWPORTS.slice(0, 4); // desktop, laptop, tablet-landscape, tablet-portrait

test.describe('Responsive Design Tests', () => {
  const adminUser = DEMO_USERS.admin;
  const clientUser = DEMO_USERS.alice;

  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      });

      test('Login screen renders correctly', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);
        
        // Login form should be visible
        const loginForm = page.getByRole('button', { name: /sign in|login/i })
          .or(page.getByPlaceholder(/email/i).first());
        await expect(loginForm).toBeVisible({ timeout: 10000 });
        
        await takeScreenshot(page, `responsive-login-${viewport.name}`);
      });

      test('Admin dashboard renders correctly', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);
        
        if (await isOnLoginScreen(page)) {
          await login(page, adminUser);
        }
        
        await waitForAppLoad(page);
        
        // Dashboard should be visible
        const dashboardContent = page.locator('[class*="stat"], [class*="card"]').first()
          .or(page.getByRole('heading', { name: /overview|dashboard/i }));
        await expect(dashboardContent).toBeVisible({ timeout: 10000 });
        
        await takeScreenshot(page, `responsive-admin-dashboard-${viewport.name}`);
        
        // Check for mobile menu if on small viewport
        if (viewport.isMobile || viewport.width < 768) {
          const mobileMenuBtn = page.getByRole('button', { name: /menu|open/i })
            .or(page.locator('[class*="hamburger"], [class*="menu-btn"]').first());
          
          if (await mobileMenuBtn.isVisible().catch(() => false)) {
            console.log(`  ✓ Mobile menu visible at ${viewport.name}`);
          }
        }
      });

      test('Navigation is accessible', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);
        
        if (await isOnLoginScreen(page)) {
          await login(page, adminUser);
        }
        
        await waitForAppLoad(page);
        
        // On mobile, should have hamburger menu
        if (viewport.isMobile || viewport.width < 768) {
          const mobileMenu = page.getByRole('button', { name: /menu|toggle/i })
            .or(page.locator('[class*="hamburger"]').first());
          
          if (await mobileMenu.isVisible().catch(() => false)) {
            await mobileMenu.click();
            await page.waitForTimeout(300);
            
            // Sidebar should appear
            const sidebar = page.locator('[class*="sidebar"], nav').first();
            await expect(sidebar).toBeVisible({ timeout: 3000 });
            console.log(`  ✓ Mobile menu opens at ${viewport.name}`);
          }
        } else {
          // On desktop, sidebar should be visible by default
          const sidebar = page.locator('[class*="sidebar"], nav').first();
          if (await sidebar.isVisible().catch(() => false)) {
            console.log(`  ✓ Sidebar visible at ${viewport.name}`);
          }
        }
        
        await takeScreenshot(page, `responsive-nav-${viewport.name}`);
      });

      test('Client dashboard renders correctly', async ({ page }) => {
        await page.goto('/');
        await waitForAppLoad(page);
        
        if (await isOnLoginScreen(page)) {
          await login(page, clientUser);
        }
        
        await waitForAppLoad(page);
        
        // Client dashboard should be visible
        const clientContent = page.getByText(/book|pickup|destination/i).first()
          .or(page.locator('[class*="booking"], [class*="map"]').first())
          .or(page.getByRole('heading', { name: /dashboard|welcome/i }));
        
        await expect(clientContent).toBeVisible({ timeout: 10000 });
        
        await takeScreenshot(page, `responsive-client-dashboard-${viewport.name}`);
      });
    });
  }
});

test.describe('Mobile-specific Tests', () => {
  const mobileViewport = TEST_VIEWPORTS.find(v => v.name === 'mobile-large') || TEST_VIEWPORTS[TEST_VIEWPORTS.length - 1];
  
  test.use({
    viewport: { width: mobileViewport.width, height: mobileViewport.height },
    isMobile: true,
    hasTouch: true,
  });

  test('Touch interactions work on mobile', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    
    // Verify touch-friendly buttons exist
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    
    expect(buttonCount).toBeGreaterThan(0);
    console.log(`Found ${buttonCount} buttons for touch interaction`);
    
    await takeScreenshot(page, 'mobile-touch-buttons');
  });

  test('Login form is usable on mobile', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    
    // Form inputs should be large enough to tap
    const emailInput = page.getByPlaceholder(/email/i).first();
    const passwordInput = page.getByPlaceholder(/password/i).first();
    const submitBtn = page.getByRole('button', { name: /sign in|login/i });
    
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    
    // Verify inputs are accessible
    await emailInput.tap();
    await page.waitForTimeout(200);
    
    await takeScreenshot(page, 'mobile-login-form');
  });
});
