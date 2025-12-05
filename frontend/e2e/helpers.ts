/**
 * Seryvo Platform - Page Object Helpers
 * 
 * Reusable helper functions for common page interactions across all user roles.
 */

import { Page, expect, Locator } from '@playwright/test';
import { TestUser, BookingDetails, SupportTicketDetails } from './types';

/**
 * Base URL for the application
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://seryvo.vectorhost.net';

/**
 * Wait for the page to be fully loaded
 */
export async function waitForAppLoad(page: Page): Promise<void> {
  // Wait for the main app container or login screen
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="app-container"], form, .min-h-screen', {
    state: 'visible',
    timeout: 15000,
  }).catch(() => {
    // Fallback - just wait for body to be visible
    return page.waitForSelector('body', { state: 'visible' });
  });
}

/**
 * Check if user is on login screen
 */
export async function isOnLoginScreen(page: Page): Promise<boolean> {
  const loginButton = page.getByRole('button', { name: /sign in|login|log in/i });
  const emailInput = page.getByRole('textbox', { name: /email/i });
  return (await loginButton.isVisible().catch(() => false)) || 
         (await emailInput.isVisible().catch(() => false));
}

/**
 * Check if user is on setup wizard
 */
export async function isOnSetupWizard(page: Page): Promise<boolean> {
  const setupHeading = page.getByRole('heading', { name: /welcome|setup|get started/i });
  return await setupHeading.isVisible().catch(() => false);
}

/**
 * Complete the initial setup wizard (first admin creation)
 */
export async function completeSetupWizard(page: Page, admin: TestUser): Promise<void> {
  console.log('Completing setup wizard for first admin...');
  
  // Wait for setup form to be visible
  await page.waitForSelector('input[type="email"], input[name="email"]', { state: 'visible', timeout: 10000 });
  
  // Fill in admin details
  await page.getByLabel(/full name|name/i).first().fill(admin.fullName);
  await page.getByLabel(/email/i).first().fill(admin.email);
  await page.getByLabel(/password/i).first().fill(admin.password);
  
  // Look for confirm password if it exists
  const confirmPassword = page.getByLabel(/confirm.*password/i);
  if (await confirmPassword.isVisible().catch(() => false)) {
    await confirmPassword.fill(admin.password);
  }
  
  // Submit the form
  const submitButton = page.getByRole('button', { name: /create|setup|complete|continue|submit/i });
  await submitButton.click();
  
  // Wait for redirect to dashboard
  await page.waitForURL(/.*/, { timeout: 15000 });
  await waitForAppLoad(page);
}

/**
 * Login with credentials - handles error gracefully
 * Returns true if login successful, false otherwise
 */
export async function login(page: Page, user: TestUser): Promise<boolean> {
  console.log(`Logging in as ${user.role}: ${user.email}`);
  
  // Navigate to home page if not already there
  if (!page.url().includes(BASE_URL)) {
    await page.goto('/');
  }
  
  await waitForAppLoad(page);
  
  // Check if already logged in
  const dashboardIndicator = page.getByRole('heading', { name: /dashboard|overview|welcome/i })
    .or(page.getByText(/total bookings|active drivers/i).first());
  if (await dashboardIndicator.isVisible().catch(() => false)) {
    console.log('Already logged in, skipping login');
    return true;
  }
  
  // Fill login form - use placeholder text since labels are not standard
  const emailInput = page.getByPlaceholder(/email|you@example/i)
    .or(page.getByLabel(/email/i).first())
    .or(page.locator('input[type="email"]').first());
  await emailInput.fill(user.email);
  
  const passwordInput = page.getByPlaceholder(/password|••••|8 characters/i)
    .or(page.getByLabel(/password/i).first())
    .or(page.locator('input[type="password"]').first());
  await passwordInput.fill(user.password);
  
  // Click login button
  const loginButton = page.getByRole('button', { name: /sign in|login|log in/i });
  await loginButton.click();
  
  // Wait for response
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  // Check for error message
  const errorMessage = page.getByText(/invalid.*email|invalid.*password|incorrect|failed/i);
  if (await errorMessage.isVisible().catch(() => false)) {
    console.log('Login failed - invalid credentials');
    return false;
  }
  
  // Verify login was successful
  const loggedIn = await dashboardIndicator.isVisible({ timeout: 5000 }).catch(() => false);
  if (loggedIn) {
    console.log('Login successful');
    return true;
  }
  
  return false;
}

/**
 * Login or register if login fails
 * This is useful when demo data may not be loaded
 */
export async function loginOrRegister(page: Page, user: TestUser): Promise<void> {
  // First try to login
  const loginSuccess = await login(page, user);
  
  if (loginSuccess) {
    return;
  }
  
  // If login failed, try to register
  console.log('Login failed, attempting to register...');
  await register(page, user);
  
  // Wait for app to load after registration
  await waitForAppLoad(page);
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  console.log('Logging out...');
  
  // Look for logout button
  const logoutButton = page.getByRole('button', { name: /logout|sign out|log out/i });
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await page.waitForLoadState('networkidle');
    return;
  }
  
  // Try clicking on user menu first
  const userMenu = page.getByRole('button', { name: /account|profile|user|menu/i });
  if (await userMenu.isVisible().catch(() => false)) {
    await userMenu.click();
    await page.getByRole('menuitem', { name: /logout|sign out/i }).click();
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Register a new user
 */
export async function register(page: Page, user: TestUser): Promise<void> {
  console.log(`Registering new user: ${user.email}`);
  
  // Navigate to home if not there
  await page.goto('/');
  await waitForAppLoad(page);
  
  // Click register/sign up link - look for both link and button
  const registerLink = page.getByRole('button', { name: /create account/i })
    .or(page.getByRole('link', { name: /register|sign up|create account/i }));
  
  if (await registerLink.isVisible().catch(() => false)) {
    await registerLink.click();
    await page.waitForLoadState('networkidle');
  }
  
  // Wait for registration form to appear
  await page.waitForSelector('text=Create Account', { timeout: 5000 }).catch(() => {});
  
  // Fill registration form using placeholders
  const nameInput = page.getByPlaceholder(/john smith|full name|name/i)
    .or(page.getByLabel(/full name|name/i).first())
    .or(page.locator('input').first());
  await nameInput.fill(user.fullName);
  
  const emailInput = page.getByPlaceholder(/email|you@example/i)
    .or(page.getByLabel(/email/i).first());
  await emailInput.fill(user.email);
  
  const passwordInput = page.getByPlaceholder(/password|8 characters/i)
    .or(page.getByLabel(/password/i).first())
    .or(page.locator('input[type="password"]').first());
  await passwordInput.fill(user.password);
  
  // Handle confirm password if present
  const confirmPwd = page.getByPlaceholder(/confirm/i).or(page.getByLabel(/confirm.*password/i));
  if (await confirmPwd.isVisible().catch(() => false)) {
    await confirmPwd.fill(user.password);
  }
  
  // Submit registration - find the submit button (not the "Back to sign in")
  const submitBtn = page.getByRole('button', { name: /^create account$/i });
  await submitBtn.click();
  
  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to a specific view using sidebar navigation
 */
export async function navigateTo(page: Page, viewName: string): Promise<void> {
  console.log(`Navigating to: ${viewName}`);
  
  // Try to find and click the navigation item
  const navItem = page.getByRole('button', { name: new RegExp(viewName, 'i') })
    .or(page.getByRole('link', { name: new RegExp(viewName, 'i') }));
  
  if (await navItem.isVisible().catch(() => false)) {
    await navItem.click();
    await page.waitForLoadState('networkidle');
    return;
  }
  
  // If not visible, might need to open sidebar first (mobile)
  const menuButton = page.getByRole('button', { name: /menu|open/i });
  if (await menuButton.isVisible().catch(() => false)) {
    await menuButton.click();
    await page.waitForTimeout(300); // Wait for sidebar animation
    
    const sidebarNavItem = page.getByRole('button', { name: new RegExp(viewName, 'i') })
      .or(page.getByRole('link', { name: new RegExp(viewName, 'i') }));
    await sidebarNavItem.click();
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Open a quick action modal/panel
 */
export async function openQuickAction(page: Page, actionName: string): Promise<void> {
  console.log(`Opening quick action: ${actionName}`);
  
  const actionButton = page.getByRole('button', { name: new RegExp(actionName, 'i') });
  await expect(actionButton).toBeVisible({ timeout: 5000 });
  await actionButton.click();
  
  // Wait for modal to open
  await page.waitForTimeout(500);
}

/**
 * Close any open modal
 */
export async function closeModal(page: Page): Promise<void> {
  const closeButton = page.getByRole('button', { name: /close|cancel|dismiss|×|✕/i })
    .or(page.getByLabel(/close/i));
  
  if (await closeButton.first().isVisible().catch(() => false)) {
    await closeButton.first().click();
    await page.waitForTimeout(300);
  }
}

/**
 * Admin: Create a new user
 */
export async function adminCreateUser(page: Page, newUser: TestUser): Promise<void> {
  console.log(`Admin creating user: ${newUser.email} (${newUser.role})`);
  
  // Navigate to user management
  await openQuickAction(page, 'User Mgmt');
  
  // Click create user button
  const createBtn = page.getByRole('button', { name: /create|add|new.*user/i });
  await createBtn.click();
  
  // Fill user details in the form
  await page.getByLabel(/full name|name/i).first().fill(newUser.fullName);
  await page.getByLabel(/email/i).first().fill(newUser.email);
  await page.getByLabel(/password/i).first().fill(newUser.password);
  
  // Select role
  const roleSelect = page.getByLabel(/role/i).or(page.getByRole('combobox', { name: /role/i }));
  if (await roleSelect.isVisible().catch(() => false)) {
    await roleSelect.selectOption(newUser.role);
  } else {
    // Try clicking role radio/checkbox
    const roleOption = page.getByRole('radio', { name: new RegExp(newUser.role.replace('_', ' '), 'i') })
      .or(page.getByLabel(new RegExp(newUser.role.replace('_', ' '), 'i')));
    if (await roleOption.isVisible().catch(() => false)) {
      await roleOption.click();
    }
  }
  
  // Submit
  const submitBtn = page.getByRole('button', { name: /create|save|add|submit/i });
  await submitBtn.click();
  
  // Wait for success
  await page.waitForLoadState('networkidle');
  
  // Close the modal if still open
  await closeModal(page);
}

/**
 * Verify empty state is displayed
 */
export async function verifyEmptyState(page: Page, context: string): Promise<void> {
  console.log(`Verifying empty state for: ${context}`);
  
  // Look for common empty state indicators
  const emptyIndicators = [
    page.getByText(/no.*found|no.*available|no.*data|nothing.*here|empty/i),
    page.getByText(/0 /), // "0 trips", "0 drivers", etc.
    page.getByRole('heading', { name: /no.*logged|no.*data|no.*records/i }),
  ];
  
  let foundEmpty = false;
  for (const indicator of emptyIndicators) {
    if (await indicator.first().isVisible().catch(() => false)) {
      foundEmpty = true;
      break;
    }
  }
  
  if (!foundEmpty) {
    // Check for "0" values in stat cards
    const zeroStats = page.locator('text=/^0$/');
    if (await zeroStats.first().isVisible().catch(() => false)) {
      foundEmpty = true;
    }
  }
  
  expect(foundEmpty).toBe(true);
}

/**
 * Client: Create a new booking request
 */
export async function clientCreateBooking(page: Page, booking: BookingDetails): Promise<void> {
  console.log('Client creating booking request...');
  
  // Find and fill pickup address
  const pickupInput = page.getByPlaceholder(/pickup|from|where.*pickup/i)
    .or(page.getByLabel(/pickup/i));
  await pickupInput.first().fill(booking.pickupAddress);
  
  // Wait for autocomplete and select first result if needed
  await page.waitForTimeout(500);
  const autocompleteItem = page.getByRole('option').first();
  if (await autocompleteItem.isVisible().catch(() => false)) {
    await autocompleteItem.click();
  }
  
  // Fill dropoff address
  const dropoffInput = page.getByPlaceholder(/dropoff|to|destination|where.*going/i)
    .or(page.getByLabel(/dropoff|destination/i));
  await dropoffInput.first().fill(booking.dropoffAddress);
  
  await page.waitForTimeout(500);
  const dropoffAutocomplete = page.getByRole('option').first();
  if (await dropoffAutocomplete.isVisible().catch(() => false)) {
    await dropoffAutocomplete.click();
  }
  
  // Set passenger count if field exists
  const passengerInput = page.getByLabel(/passenger/i);
  if (await passengerInput.isVisible().catch(() => false)) {
    await passengerInput.fill(booking.passengerCount.toString());
  }
  
  // Add special notes if provided
  if (booking.specialNotes) {
    const notesInput = page.getByLabel(/notes|instructions|comments/i);
    if (await notesInput.isVisible().catch(() => false)) {
      await notesInput.fill(booking.specialNotes);
    }
  }
  
  // Request ride
  const requestBtn = page.getByRole('button', { name: /request|book|confirm|submit/i });
  await requestBtn.click();
  
  await page.waitForLoadState('networkidle');
}

/**
 * Driver: Accept a booking request
 */
export async function driverAcceptBooking(page: Page): Promise<void> {
  console.log('Driver accepting booking...');
  
  // Look for incoming booking request
  const acceptBtn = page.getByRole('button', { name: /accept|take|confirm/i });
  await expect(acceptBtn.first()).toBeVisible({ timeout: 30000 });
  await acceptBtn.first().click();
  
  await page.waitForLoadState('networkidle');
}

/**
 * Driver: Update trip status
 */
export async function driverUpdateTripStatus(page: Page, status: 'en_route' | 'arrived' | 'started' | 'completed'): Promise<void> {
  console.log(`Driver updating trip status to: ${status}`);
  
  const statusButtonMap: Record<string, RegExp> = {
    'en_route': /en route|on.*way|heading/i,
    'arrived': /arrived|here|at.*pickup/i,
    'started': /start.*trip|begin|pick.*up/i,
    'completed': /complete|finish|end.*trip/i,
  };
  
  const btn = page.getByRole('button', { name: statusButtonMap[status] });
  await expect(btn.first()).toBeVisible({ timeout: 10000 });
  await btn.first().click();
  
  await page.waitForLoadState('networkidle');
}

/**
 * Support: Create support ticket
 */
export async function createSupportTicket(page: Page, ticket: SupportTicketDetails): Promise<void> {
  console.log('Creating support ticket...');
  
  // Navigate to help/support section
  await navigateTo(page, 'Help');
  
  // Click new ticket button
  const newTicketBtn = page.getByRole('button', { name: /new.*ticket|create.*ticket|submit.*request|contact/i });
  if (await newTicketBtn.isVisible().catch(() => false)) {
    await newTicketBtn.click();
  }
  
  // Fill ticket form
  const subjectInput = page.getByLabel(/subject|title/i);
  await subjectInput.fill(ticket.subject);
  
  const descInput = page.getByLabel(/description|message|details/i);
  await descInput.fill(ticket.description);
  
  // Select category if available
  const categorySelect = page.getByLabel(/category|type/i);
  if (await categorySelect.isVisible().catch(() => false)) {
    await categorySelect.selectOption(ticket.category);
  }
  
  // Select priority if available
  const prioritySelect = page.getByLabel(/priority/i);
  if (await prioritySelect.isVisible().catch(() => false)) {
    await prioritySelect.selectOption(ticket.priority);
  }
  
  // Submit
  const submitBtn = page.getByRole('button', { name: /submit|send|create/i });
  await submitBtn.click();
  
  await page.waitForLoadState('networkidle');
}

/**
 * Support Agent: Respond to a ticket
 */
export async function supportAgentRespondToTicket(page: Page, ticketSubject: string, response: string): Promise<void> {
  console.log(`Support responding to ticket: ${ticketSubject}`);
  
  // Find and click on the ticket
  const ticketRow = page.getByText(ticketSubject).first();
  await ticketRow.click();
  
  // Add response
  const responseInput = page.getByLabel(/response|reply|message|note/i)
    .or(page.getByPlaceholder(/response|reply|message/i));
  await responseInput.fill(response);
  
  // Send response
  const sendBtn = page.getByRole('button', { name: /send|reply|respond|add.*note/i });
  await sendBtn.click();
  
  await page.waitForLoadState('networkidle');
}

/**
 * Support Agent: Resolve a ticket
 */
export async function supportAgentResolveTicket(page: Page): Promise<void> {
  console.log('Support resolving ticket...');
  
  const resolveBtn = page.getByRole('button', { name: /resolve|close|complete/i });
  await resolveBtn.click();
  
  // Confirm if needed
  const confirmBtn = page.getByRole('button', { name: /confirm|yes/i });
  if (await confirmBtn.isVisible().catch(() => false)) {
    await confirmBtn.click();
  }
  
  await page.waitForLoadState('networkidle');
}

/**
 * Get current trip status from the UI
 */
export async function getCurrentTripStatus(page: Page): Promise<string> {
  // Look for status badge or text
  const statusElement = page.locator('[data-status]').or(
    page.getByText(/status:|trip.*status/i).locator('..').locator('span, badge, div')
  );
  
  if (await statusElement.first().isVisible().catch(() => false)) {
    return await statusElement.first().textContent() || '';
  }
  
  return '';
}

/**
 * Wait for real-time update
 */
export async function waitForRealtimeUpdate(page: Page, expectedText: string, timeout = 30000): Promise<void> {
  console.log(`Waiting for realtime update containing: ${expectedText}`);
  
  await expect(page.getByText(new RegExp(expectedText, 'i'))).toBeVisible({ timeout });
}

/**
 * Take a labeled screenshot for debugging
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Verify data correctness - ensure no stale/demo data exists
 */
export async function verifyNoStaleData(page: Page): Promise<void> {
  console.log('Verifying no stale/demo data...');
  
  // Look for common demo data indicators
  const demoIndicators = [
    /demo.*data/i,
    /sample.*data/i,
    /test.*user.*123/i,
    /john.*doe/i, // Common mock name
    /jane.*doe/i,
  ];
  
  for (const indicator of demoIndicators) {
    const demoElement = page.getByText(indicator);
    const count = await demoElement.count();
    expect(count).toBe(0);
  }
}

/**
 * Set viewport for responsive testing
 */
export async function setResponsiveViewport(page: Page, width: number, height: number, isMobile = false): Promise<void> {
  await page.setViewportSize({ width, height });
  
  // If mobile, we might need to handle touch events differently
  if (isMobile) {
    // Trigger any mobile-specific UI adjustments
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForTimeout(300);
  }
}

/**
 * Verify responsive layout
 */
export async function verifyResponsiveLayout(page: Page): Promise<void> {
  // Check that content is not overflowing
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  
  // Minor horizontal scroll might be acceptable, but large overflow is not
  expect(hasHorizontalScroll).toBe(false);
  
  // Verify main content is visible
  const mainContent = page.locator('main, [role="main"], .main-content');
  if (await mainContent.first().isVisible().catch(() => false)) {
    await expect(mainContent.first()).toBeVisible();
  }
}
