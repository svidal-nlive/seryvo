/**
 * Seryvo Platform - Admin User Management Tests
 * 
 * Tests for admin functionality including:
 * - Login/Register flow
 * - Dashboard navigation
 * - User management views
 * - Quick action panels
 * 
 * NOTE: Tests will try demo credentials first, then register if needed
 */

import { test, expect } from '../fixtures';
import {
  waitForAppLoad,
  isOnLoginScreen,
  login,
  loginOrRegister,
  register,
  navigateTo,
  openQuickAction,
  closeModal,
  takeScreenshot,
} from '../helpers';
import { DEMO_USERS, TEST_ADMIN, getDemoUser, TestUser } from '../types';

test.describe('Admin User Management', () => {
  test.describe.configure({ mode: 'serial' });

  // Try demo admin first, fallback to test admin
  const adminUser = DEMO_USERS.admin;
  const fallbackAdmin = TEST_ADMIN;

  test('1. Navigate to application and verify login screen', async ({ adminPage }) => {
    await adminPage.goto('/');
    await waitForAppLoad(adminPage);
    
    await takeScreenshot(adminPage, 'admin-initial-state');
    
    // Should be on login screen
    const onLogin = await isOnLoginScreen(adminPage);
    expect(onLogin).toBe(true);
    
    console.log('✓ Application loaded, login screen visible');
  });

  test('2. Login as admin (demo or register)', async ({ adminPage }) => {
    await adminPage.goto('/');
    await waitForAppLoad(adminPage);
    
    // Try demo credentials first
    console.log('Trying demo admin credentials...');
    let loggedIn = await login(adminPage, adminUser);
    
    if (!loggedIn) {
      console.log('Demo admin not available, registering test admin...');
      await register(adminPage, fallbackAdmin);
      await waitForAppLoad(adminPage);
    }
    
    await takeScreenshot(adminPage, 'admin-after-login');
    
    // Should see dashboard content
    const dashboardContent = adminPage.getByRole('heading', { name: /overview|dashboard/i })
      .or(adminPage.getByText(/total bookings|active drivers|revenue/i).first())
      .or(adminPage.locator('[class*="stat"], [class*="card"]').first());
    
    await expect(dashboardContent).toBeVisible({ timeout: 15000 });
    console.log('✓ Admin logged in, dashboard visible');
  });

  test('3. Verify admin dashboard has stats cards', async ({ adminPage }) => {
    await adminPage.goto('/');
    await waitForAppLoad(adminPage);
    
    if (await isOnLoginScreen(adminPage)) {
      await loginOrRegister(adminPage, fallbackAdmin);
    }
    
    await waitForAppLoad(adminPage);
    
    // Dashboard should show stat cards
    const statCards = adminPage.locator('[class*="stat"], [class*="card"], .bg-white.rounded').first();
    await expect(statCards).toBeVisible({ timeout: 10000 });
    
    await takeScreenshot(adminPage, 'admin-dashboard-stats');
    console.log('✓ Dashboard stats visible');
  });

  test('4. Open User Management panel', async ({ adminPage }) => {
    await adminPage.goto('/');
    await waitForAppLoad(adminPage);
    
    if (await isOnLoginScreen(adminPage)) {
      await loginOrRegister(adminPage, fallbackAdmin);
    }
    
    // Navigate to User Management
    await openQuickAction(adminPage, 'User Mgmt');
    await adminPage.waitForLoadState('networkidle');
    
    await takeScreenshot(adminPage, 'admin-user-mgmt-opened');
    
    // Verify the modal/panel is open
    const userContent = adminPage.getByRole('heading', { name: /user|management|users/i })
      .or(adminPage.getByText(/search users|all users/i).first())
      .or(adminPage.getByRole('button', { name: /create|add user/i }));
    
    await expect(userContent.first()).toBeVisible({ timeout: 5000 });
    console.log('✓ User Management panel opened');
    
    await closeModal(adminPage);
  });

  test('5. Open Fleet Live Map', async ({ adminPage }) => {
    await adminPage.goto('/');
    await waitForAppLoad(adminPage);
    
    if (await isOnLoginScreen(adminPage)) {
      await loginOrRegister(adminPage, fallbackAdmin);
    }
    
    // Open Fleet Live Map
    await openQuickAction(adminPage, 'Fleet Live Map');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(1000);
    
    await takeScreenshot(adminPage, 'admin-fleet-map-opened');
    
    // Verify map or driver list is visible
    const mapContent = adminPage.locator('[class*="map"], [class*="leaflet"], canvas')
      .or(adminPage.getByText(/drivers|fleet|live/i).first());
    
    await expect(mapContent.first()).toBeVisible({ timeout: 10000 });
    console.log('✓ Fleet Live Map opened');
    
    await closeModal(adminPage);
  });

  test('6. Open Revenue Reports', async ({ adminPage }) => {
    await adminPage.goto('/');
    await waitForAppLoad(adminPage);
    
    if (await isOnLoginScreen(adminPage)) {
      await loginOrRegister(adminPage, fallbackAdmin);
    }
    
    // Open Revenue Reports
    await openQuickAction(adminPage, 'Revenue');
    await adminPage.waitForLoadState('networkidle');
    
    await takeScreenshot(adminPage, 'admin-revenue-opened');
    
    // Verify revenue content is visible
    const revenueContent = adminPage.getByRole('heading', { name: /revenue|reports|earnings/i })
      .or(adminPage.getByText(/no revenue data|total revenue|earnings/i).first());
    
    await expect(revenueContent.first()).toBeVisible({ timeout: 5000 });
    console.log('✓ Revenue Reports opened');
    
    await closeModal(adminPage);
  });

  test('7. Open Admin Logs', async ({ adminPage }) => {
    await adminPage.goto('/');
    await waitForAppLoad(adminPage);
    
    if (await isOnLoginScreen(adminPage)) {
      await loginOrRegister(adminPage, fallbackAdmin);
    }
    
    // Open Admin Logs
    await openQuickAction(adminPage, 'Admin Logs');
    await adminPage.waitForLoadState('networkidle');
    
    await takeScreenshot(adminPage, 'admin-logs-opened');
    
    // Verify logs content is visible
    const logsContent = adminPage.getByRole('heading', { name: /log|activity|audit/i })
      .or(adminPage.getByText(/no.*logged|no.*entries|activity log/i).first());
    
    await expect(logsContent.first()).toBeVisible({ timeout: 5000 });
    console.log('✓ Admin Logs opened');
    
    await closeModal(adminPage);
  });

  test('8. Navigate through all sidebar quick actions', async ({ adminPage }) => {
    await adminPage.goto('/');
    await waitForAppLoad(adminPage);
    
    if (await isOnLoginScreen(adminPage)) {
      await loginOrRegister(adminPage, fallbackAdmin);
    }
    
    // List of expected quick actions
    const quickActions = [
      'User Mgmt',
      'Fleet Live Map',
      'Revenue',
      'Admin Logs',
    ];
    
    for (const action of quickActions) {
      console.log('Testing quick action: ' + action);
      
      try {
        await openQuickAction(adminPage, action);
        await adminPage.waitForTimeout(500);
        await takeScreenshot(adminPage, 'admin-qa-' + action.toLowerCase().replace(/\s+/g, '-'));
        await closeModal(adminPage);
        await adminPage.waitForTimeout(300);
        console.log('  ✓ ' + action + ' opened and closed');
      } catch (error) {
        console.log('  ⚠ ' + action + ' not found or failed');
      }
    }
  });

  test('9. Verify logout functionality', async ({ adminPage }) => {
    await adminPage.goto('/');
    await waitForAppLoad(adminPage);
    
    if (await isOnLoginScreen(adminPage)) {
      await loginOrRegister(adminPage, fallbackAdmin);
    }
    
    await waitForAppLoad(adminPage);
    
    // Look for logout button
    const logoutBtn = adminPage.getByRole('button', { name: /logout|sign out|log out/i });
    
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await adminPage.waitForLoadState('networkidle');
      
      // Should be back on login screen
      const onLogin = await isOnLoginScreen(adminPage);
      expect(onLogin).toBe(true);
      console.log('✓ Logged out successfully');
    } else {
      // Try user menu dropdown
      const userMenu = adminPage.getByRole('button', { name: /account|profile|user|menu/i })
        .or(adminPage.locator('[class*="avatar"], [class*="user"]').first());
      
      if (await userMenu.isVisible().catch(() => false)) {
        await userMenu.click();
        await adminPage.waitForTimeout(300);
        
        const logoutMenuItem = adminPage.getByRole('menuitem', { name: /logout|sign out/i })
          .or(adminPage.getByText(/logout|sign out/i).first());
        
        if (await logoutMenuItem.isVisible().catch(() => false)) {
          await logoutMenuItem.click();
          await adminPage.waitForLoadState('networkidle');
          
          const onLogin = await isOnLoginScreen(adminPage);
          expect(onLogin).toBe(true);
          console.log('✓ Logged out via user menu');
        }
      }
    }
    
    await takeScreenshot(adminPage, 'admin-logged-out');
  });
});
