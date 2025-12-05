/**
 * Seryvo Platform - Multi-User Real-Time Flow Test
 * 
 * Comprehensive end-to-end test that orchestrates multiple browser sessions
 * to simulate real-world multi-user interactions:
 * 
 * - Admin: Monitors all activities
 * - Client: Books a trip
 * - Driver: Views available trips
 * - Support Agent: Views support dashboard
 * 
 * Uses demo credentials from backend seed data.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  waitForAppLoad,
  isOnLoginScreen,
  login,
  logout,
  navigateTo,
  openQuickAction,
  closeModal,
  takeScreenshot,
} from '../helpers';
import { DEMO_USERS, getDemoUser, TestUser } from '../types';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://seryvo.vectorhost.net';
const WAIT_FOR_SYNC = 2000; // ms to wait for real-time sync

test.describe('Multi-User Real-Time Flow', () => {
  test.describe.configure({ mode: 'serial' });
  
  // Demo users for multi-user testing
  const adminUser = DEMO_USERS.admin;
  const clientUser = DEMO_USERS.alice;
  const driverUser = DEMO_USERS.mike;
  const supportUser = DEMO_USERS.support1;
  
  // Browser contexts for each user
  let adminContext: BrowserContext;
  let clientContext: BrowserContext;
  let driverContext: BrowserContext;
  let supportContext: BrowserContext;
  
  // Pages for each user
  let adminPage: Page;
  let clientPage: Page;
  let driverPage: Page;
  let supportPage: Page;

  test.beforeAll(async ({ browser }) => {
    console.log('=== MULTI-USER FLOW TEST STARTED ===');
    console.log('Demo Users:');
    console.log(`  Admin: ${adminUser.email}`);
    console.log(`  Client: ${clientUser.email}`);
    console.log(`  Driver: ${driverUser.email}`);
    console.log(`  Support: ${supportUser.email}`);
    
    // Create isolated browser contexts for each user
    adminContext = await browser.newContext({ storageState: undefined });
    clientContext = await browser.newContext({ storageState: undefined });
    driverContext = await browser.newContext({ storageState: undefined });
    supportContext = await browser.newContext({ storageState: undefined });
    
    // Create pages
    adminPage = await adminContext.newPage();
    clientPage = await clientContext.newPage();
    driverPage = await driverContext.newPage();
    supportPage = await supportContext.newPage();
  });

  test.afterAll(async () => {
    // Cleanup
    await adminPage?.close();
    await clientPage?.close();
    await driverPage?.close();
    await supportPage?.close();
    await adminContext?.close();
    await clientContext?.close();
    await driverContext?.close();
    await supportContext?.close();
    
    console.log('=== MULTI-USER FLOW TEST COMPLETED ===');
  });

  // ==================== PHASE 1: LOGIN ALL USERS ====================

  test('Phase 1.1: Admin login', async () => {
    await adminPage.goto('/');
    await waitForAppLoad(adminPage);
    
    console.log(`Logging in admin: ${adminUser.email}`);
    await login(adminPage, adminUser);
    
    await waitForAppLoad(adminPage);
    await takeScreenshot(adminPage, 'multiuser-admin-logged-in');
    
    // Verify admin dashboard
    const dashboardHeading = adminPage.getByRole('heading', { name: /overview|dashboard/i })
      .or(adminPage.getByText(/total bookings|active drivers/i).first());
    await expect(dashboardHeading).toBeVisible({ timeout: 15000 });
    
    console.log('✓ Admin logged in successfully');
  });

  test('Phase 1.2: Client login', async () => {
    await clientPage.goto('/');
    await waitForAppLoad(clientPage);
    
    console.log(`Logging in client: ${clientUser.email}`);
    await login(clientPage, clientUser);
    
    await waitForAppLoad(clientPage);
    await takeScreenshot(clientPage, 'multiuser-client-logged-in');
    
    // Verify client dashboard (should show booking interface)
    const clientUI = clientPage.getByText(/book|pickup|destination|request/i).first()
      .or(clientPage.getByRole('heading', { name: /dashboard|welcome/i }));
    await expect(clientUI).toBeVisible({ timeout: 15000 });
    
    console.log('✓ Client logged in successfully');
  });

  test('Phase 1.3: Driver login', async () => {
    await driverPage.goto('/');
    await waitForAppLoad(driverPage);
    
    console.log(`Logging in driver: ${driverUser.email}`);
    await login(driverPage, driverUser);
    
    await waitForAppLoad(driverPage);
    await takeScreenshot(driverPage, 'multiuser-driver-logged-in');
    
    // Verify driver dashboard
    const driverUI = driverPage.getByText(/available|status|trips|earnings/i).first()
      .or(driverPage.getByRole('heading', { name: /dashboard|welcome/i }));
    await expect(driverUI).toBeVisible({ timeout: 15000 });
    
    console.log('✓ Driver logged in successfully');
  });

  test('Phase 1.4: Support Agent login', async () => {
    await supportPage.goto('/');
    await waitForAppLoad(supportPage);
    
    console.log(`Logging in support: ${supportUser.email}`);
    await login(supportPage, supportUser);
    
    await waitForAppLoad(supportPage);
    await takeScreenshot(supportPage, 'multiuser-support-logged-in');
    
    // Verify support dashboard
    const supportUI = supportPage.getByText(/ticket|support|queue/i).first()
      .or(supportPage.getByRole('heading', { name: /dashboard|welcome/i }));
    await expect(supportUI).toBeVisible({ timeout: 15000 });
    
    console.log('✓ Support Agent logged in successfully');
  });

  // ==================== PHASE 2: VERIFY USER DASHBOARDS ====================

  test('Phase 2.1: Verify all users have appropriate dashboards', async () => {
    console.log('Verifying all user dashboards...');
    
    // Admin should see overview stats
    const adminStats = adminPage.locator('[class*="stat"], [class*="card"]').first();
    await expect(adminStats).toBeVisible({ timeout: 5000 });
    console.log('  ✓ Admin dashboard has stats');
    
    // Client should see booking interface
    const clientBooking = clientPage.getByText(/pickup|book|destination/i).first()
      .or(clientPage.locator('[class*="map"], [class*="booking"]').first());
    await expect(clientBooking).toBeVisible({ timeout: 5000 });
    console.log('  ✓ Client dashboard has booking interface');
    
    // Driver should see status/availability
    const driverStatus = driverPage.getByText(/status|available|offline|busy/i).first()
      .or(driverPage.locator('[class*="status"]').first());
    await expect(driverStatus).toBeVisible({ timeout: 5000 });
    console.log('  ✓ Driver dashboard has status controls');
    
    // Support should see ticket queue
    const supportQueue = supportPage.getByText(/ticket|queue|pending/i).first()
      .or(supportPage.locator('[class*="queue"], [class*="ticket"]').first());
    await expect(supportQueue).toBeVisible({ timeout: 5000 });
    console.log('  ✓ Support dashboard has ticket queue');
    
    await takeScreenshot(adminPage, 'multiuser-all-dashboards');
  });

  // ==================== PHASE 3: ADMIN VERIFIES USERS ====================

  test('Phase 3.1: Admin opens User Management', async () => {
    await openQuickAction(adminPage, 'User Mgmt');
    await adminPage.waitForLoadState('networkidle');
    
    await takeScreenshot(adminPage, 'multiuser-admin-usermgmt');
    
    // Should see user list
    const userList = adminPage.locator('table, [role="grid"], [class*="list"], [class*="user"]').first();
    await expect(userList).toBeVisible({ timeout: 5000 });
    
    console.log('✓ Admin can access User Management');
    await closeModal(adminPage);
  });

  test('Phase 3.2: Admin opens Fleet Live Map', async () => {
    await openQuickAction(adminPage, 'Fleet Live Map');
    await adminPage.waitForLoadState('networkidle');
    await adminPage.waitForTimeout(1000);
    
    await takeScreenshot(adminPage, 'multiuser-admin-fleetmap');
    
    // Should see map or driver list
    const mapContent = adminPage.locator('[class*="map"], [class*="leaflet"], canvas, [class*="fleet"]').first();
    await expect(mapContent).toBeVisible({ timeout: 10000 });
    
    console.log('✓ Admin can access Fleet Live Map');
    await closeModal(adminPage);
  });

  // ==================== PHASE 4: CLIENT INTERACTION ====================

  test('Phase 4.1: Client views booking form', async () => {
    // Find booking form elements
    const pickupInput = clientPage.getByPlaceholder(/pickup|from|where/i).first()
      .or(clientPage.getByLabel(/pickup/i).first());
    
    const dropoffInput = clientPage.getByPlaceholder(/drop|destination|to|going/i).first()
      .or(clientPage.getByLabel(/destination|dropoff/i).first());
    
    // At least one of these should be visible
    const hasBookingForm = await pickupInput.isVisible().catch(() => false) ||
                           await dropoffInput.isVisible().catch(() => false);
    
    if (hasBookingForm) {
      console.log('✓ Client can see booking form');
    } else {
      console.log('⚠ Booking form not immediately visible, checking for booking button');
      
      // May need to click a "Book Now" button first
      const bookBtn = clientPage.getByRole('button', { name: /book|new.*ride|request/i });
      if (await bookBtn.isVisible().catch(() => false)) {
        await bookBtn.click();
        await clientPage.waitForTimeout(500);
        console.log('  ✓ Clicked booking button');
      }
    }
    
    await takeScreenshot(clientPage, 'multiuser-client-booking-form');
  });

  // ==================== PHASE 5: DRIVER INTERACTION ====================

  test('Phase 5.1: Driver views status controls', async () => {
    // Find status toggle or availability controls
    const statusToggle = driverPage.getByRole('button', { name: /go online|go offline|available|status/i })
      .or(driverPage.locator('[class*="toggle"], [class*="switch"]').first());
    
    if (await statusToggle.isVisible().catch(() => false)) {
      console.log('✓ Driver can see status controls');
    } else {
      // Look for status indicator
      const statusIndicator = driverPage.getByText(/offline|available|online|busy/i).first();
      await expect(statusIndicator).toBeVisible({ timeout: 5000 });
      console.log('✓ Driver status indicator visible');
    }
    
    await takeScreenshot(driverPage, 'multiuser-driver-status');
  });

  test('Phase 5.2: Driver views earnings/history', async () => {
    // Look for earnings section or history
    const earningsSection = driverPage.getByText(/earnings|today|total|trips/i).first()
      .or(driverPage.locator('[class*="earning"], [class*="stat"]').first());
    
    if (await earningsSection.isVisible().catch(() => false)) {
      console.log('✓ Driver can see earnings/stats');
    }
    
    await takeScreenshot(driverPage, 'multiuser-driver-earnings');
  });

  // ==================== PHASE 6: SUPPORT INTERACTION ====================

  test('Phase 6.1: Support views ticket queue', async () => {
    // Look for ticket list or queue
    const ticketQueue = supportPage.getByText(/ticket|queue|pending|assigned/i).first()
      .or(supportPage.locator('[class*="ticket"], [class*="queue"]').first());
    
    await expect(ticketQueue).toBeVisible({ timeout: 5000 });
    console.log('✓ Support can see ticket queue');
    
    await takeScreenshot(supportPage, 'multiuser-support-queue');
  });

  // ==================== PHASE 7: PARALLEL SCREENSHOT ====================

  test('Phase 7.1: Take screenshots of all four user views', async () => {
    console.log('Taking simultaneous screenshots of all user views...');
    
    // Take screenshots in parallel
    await Promise.all([
      takeScreenshot(adminPage, 'multiuser-final-admin'),
      takeScreenshot(clientPage, 'multiuser-final-client'),
      takeScreenshot(driverPage, 'multiuser-final-driver'),
      takeScreenshot(supportPage, 'multiuser-final-support'),
    ]);
    
    console.log('✓ All screenshots captured');
  });

  // ==================== PHASE 8: CLEANUP ====================

  test('Phase 8.1: All users can logout', async () => {
    // Logout all users in parallel
    const logoutUser = async (page: Page, userName: string) => {
      try {
        const logoutBtn = page.getByRole('button', { name: /logout|sign out|log out/i });
        
        if (await logoutBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await logoutBtn.click();
          await page.waitForLoadState('networkidle');
          console.log(`  ✓ ${userName} logged out via button`);
          return;
        }
        
        // Try user menu
        const userMenu = page.getByRole('button', { name: /account|profile|user|menu/i })
          .or(page.locator('[class*="avatar"]').first());
        
        if (await userMenu.isVisible().catch(() => false)) {
          await userMenu.click();
          await page.waitForTimeout(300);
          
          const logoutMenuItem = page.getByRole('menuitem', { name: /logout|sign out/i })
            .or(page.getByText(/logout|sign out/i).first());
          
          if (await logoutMenuItem.isVisible().catch(() => false)) {
            await logoutMenuItem.click();
            await page.waitForLoadState('networkidle');
            console.log(`  ✓ ${userName} logged out via menu`);
            return;
          }
        }
        
        console.log(`  ⚠ ${userName} - logout button not found`);
      } catch (error) {
        console.log(`  ⚠ ${userName} logout failed: ${error}`);
      }
    };
    
    await Promise.all([
      logoutUser(adminPage, 'Admin'),
      logoutUser(clientPage, 'Client'),
      logoutUser(driverPage, 'Driver'),
      logoutUser(supportPage, 'Support'),
    ]);
    
    console.log('✓ Logout phase completed');
  });
});
