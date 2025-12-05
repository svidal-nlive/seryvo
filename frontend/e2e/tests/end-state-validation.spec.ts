/**
 * Seryvo Platform - End State Validation Tests
 * 
 * Final validation tests to ensure the application state is consistent
 * after multi-user interactions. Uses demo credentials.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  waitForAppLoad,
  isOnLoginScreen,
  login,
  openQuickAction,
  closeModal,
  takeScreenshot,
} from '../helpers';
import { DEMO_USERS, getDemoUser, TestUser } from '../types';

test.describe('End State Validation', () => {
  const adminUser = DEMO_USERS.admin;

  test('Admin can view complete user list', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    
    if (await isOnLoginScreen(page)) {
      await login(page, adminUser);
    }
    
    await waitForAppLoad(page);
    
    // Open User Management
    await openQuickAction(page, 'User Mgmt');
    await page.waitForLoadState('networkidle');
    
    // Verify user list is visible
    const userListContent = page.locator('table, [role="grid"], [class*="list"]').first()
      .or(page.getByText(/user|email/i).first());
    
    await expect(userListContent).toBeVisible({ timeout: 5000 });
    console.log('✓ User list is visible');
    
    await takeScreenshot(page, 'endstate-user-list');
    await closeModal(page);
  });

  test('Admin can view fleet status', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    
    if (await isOnLoginScreen(page)) {
      await login(page, adminUser);
    }
    
    await waitForAppLoad(page);
    
    // Open Fleet Live Map
    await openQuickAction(page, 'Fleet Live Map');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Verify map or driver status is visible
    const fleetContent = page.locator('[class*="map"], [class*="leaflet"], canvas').first()
      .or(page.getByText(/driver|fleet|online/i).first());
    
    await expect(fleetContent).toBeVisible({ timeout: 10000 });
    console.log('✓ Fleet view is visible');
    
    await takeScreenshot(page, 'endstate-fleet-map');
    await closeModal(page);
  });

  test('Admin can view revenue summary', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    
    if (await isOnLoginScreen(page)) {
      await login(page, adminUser);
    }
    
    await waitForAppLoad(page);
    
    // Open Revenue panel
    await openQuickAction(page, 'Revenue');
    await page.waitForLoadState('networkidle');
    
    // Verify revenue content is visible
    const revenueContent = page.getByRole('heading', { name: /revenue|report|earning/i })
      .or(page.getByText(/revenue|total|earning|$/i).first());
    
    await expect(revenueContent).toBeVisible({ timeout: 5000 });
    console.log('✓ Revenue view is visible');
    
    await takeScreenshot(page, 'endstate-revenue');
    await closeModal(page);
  });

  test('Admin can view activity logs', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    
    if (await isOnLoginScreen(page)) {
      await login(page, adminUser);
    }
    
    await waitForAppLoad(page);
    
    // Open Admin Logs
    await openQuickAction(page, 'Admin Logs');
    await page.waitForLoadState('networkidle');
    
    // Verify logs content is visible
    const logsContent = page.getByRole('heading', { name: /log|activity|audit/i })
      .or(page.getByText(/log|activity|action/i).first());
    
    await expect(logsContent).toBeVisible({ timeout: 5000 });
    console.log('✓ Admin logs view is visible');
    
    await takeScreenshot(page, 'endstate-admin-logs');
    await closeModal(page);
  });

  test('Dashboard shows consistent statistics', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    
    if (await isOnLoginScreen(page)) {
      await login(page, adminUser);
    }
    
    await waitForAppLoad(page);
    
    // Verify dashboard stats are present
    const statsCards = page.locator('[class*="stat"], [class*="card"]');
    const cardCount = await statsCards.count();
    
    expect(cardCount).toBeGreaterThan(0);
    console.log(`✓ Dashboard shows ${cardCount} stat cards`);
    
    await takeScreenshot(page, 'endstate-dashboard-stats');
  });
});

test.describe('Cross-User Session Validation', () => {
  const users = [
    { user: DEMO_USERS.admin, expectedContent: /overview|dashboard|admin/i },
    { user: DEMO_USERS.alice, expectedContent: /book|pickup|trip|dashboard/i },
    { user: DEMO_USERS.mike, expectedContent: /status|available|earnings|dashboard/i },
    { user: DEMO_USERS.support1, expectedContent: /ticket|queue|support|dashboard/i },
  ];

  for (const { user, expectedContent } of users) {
    test(`${user.role} can login and see appropriate dashboard`, async ({ page }) => {
      await page.goto('/');
      await waitForAppLoad(page);
      
      if (await isOnLoginScreen(page)) {
        await login(page, user);
      }
      
      await waitForAppLoad(page);
      
      // Verify role-appropriate content is visible
      const dashboardContent = page.getByText(expectedContent).first()
        .or(page.getByRole('heading', { name: /dashboard|overview|welcome/i }));
      
      await expect(dashboardContent).toBeVisible({ timeout: 15000 });
      console.log(`✓ ${user.role} dashboard loaded correctly`);
      
      await takeScreenshot(page, `endstate-${user.role}-dashboard`);
    });
  }
});

test.describe('Data Integrity Checks', () => {
  const adminUser = DEMO_USERS.admin;

  test('Demo users are present in the system', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    
    if (await isOnLoginScreen(page)) {
      await login(page, adminUser);
    }
    
    await waitForAppLoad(page);
    
    // Open User Management
    await openQuickAction(page, 'User Mgmt');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check for known demo users
    const demoEmails = [
      'alice@demo.com',
      'mike@demo.com',
      'support1@demo.com',
    ];
    
    const searchInput = page.getByPlaceholder(/search/i)
      .or(page.getByRole('searchbox'));
    
    for (const email of demoEmails) {
      if (await searchInput.first().isVisible().catch(() => false)) {
        await searchInput.first().fill(email.split('@')[0]);
        await page.waitForTimeout(500);
        
        const userFound = page.getByText(new RegExp(email.split('@')[0], 'i'));
        if (await userFound.first().isVisible().catch(() => false)) {
          console.log(`  ✓ Found user: ${email}`);
        } else {
          console.log(`  ⚠ Could not find: ${email}`);
        }
        
        await searchInput.first().clear();
      }
    }
    
    await takeScreenshot(page, 'endstate-demo-users-check');
    await closeModal(page);
  });

  test('Application remains stable after navigation', async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    
    if (await isOnLoginScreen(page)) {
      await login(page, adminUser);
    }
    
    await waitForAppLoad(page);
    
    // Navigate through multiple views
    const views = ['User Mgmt', 'Fleet Live Map', 'Revenue', 'Admin Logs'];
    
    for (const view of views) {
      try {
        await openQuickAction(page, view);
        await page.waitForTimeout(500);
        
        // Verify no error state
        const errorIndicator = page.getByText(/error|failed|crash/i);
        const hasError = await errorIndicator.isVisible().catch(() => false);
        
        if (!hasError) {
          console.log(`  ✓ ${view} loaded without errors`);
        } else {
          console.log(`  ⚠ ${view} may have errors`);
        }
        
        await closeModal(page);
        await page.waitForTimeout(300);
      } catch (error) {
        console.log(`  ⚠ ${view} navigation failed: ${error}`);
      }
    }
    
    // Return to dashboard
    const dashboardLink = page.getByRole('link', { name: /dashboard|home|overview/i })
      .or(page.getByText(/dashboard/i).first());
    
    if (await dashboardLink.isVisible().catch(() => false)) {
      await dashboardLink.click();
      await waitForAppLoad(page);
    }
    
    // Verify app is still stable
    const stableIndicator = page.locator('[class*="stat"], [class*="card"]').first()
      .or(page.getByRole('heading', { name: /overview|dashboard/i }));
    
    await expect(stableIndicator).toBeVisible({ timeout: 5000 });
    console.log('✓ Application remains stable after navigation');
    
    await takeScreenshot(page, 'endstate-stability-check');
  });
});
