import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function getStoragePath(): string {
  return path.resolve(__dirname, '../.auth/v5-user.json');
}

function shouldReuseExistingAuth(): boolean {
  if (process.env.REFRESH_V5_AUTH === 'true' || process.env.REFRESH_AUTH === 'true') {
    return false;
  }
  const storagePath = getStoragePath();
  if (!fs.existsSync(storagePath)) return false;

  const maxAgeHours = Number(process.env.V5_AUTH_MAX_AGE_HOURS || '24');
  const ageMs = Date.now() - fs.statSync(storagePath).mtimeMs;
  return ageMs < maxAgeHours * 60 * 60 * 1000;
}

async function globalSetup(_config: FullConfig) {
  if (shouldReuseExistingAuth()) {
    console.log(
      `✅ [V5] Reusing existing authentication state at ${getStoragePath()} (set REFRESH_V5_AUTH=true to force login)\n`
    );
    return;
  }

  console.log('\n🔐 [V5] Setting up authentication...\n');

  const backendURL = process.env.TEQ_V5_BACKEND_URL || 'https://local-be.ferdia.app:8443';
  const frontendURL = process.env.TEQ_V5_FRONTEND_URL || 'https://local-fe.ferdia.app:8080';

  const authDir = path.resolve(__dirname, '../.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
  });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    baseURL: backendURL,
  });
  const page = await context.newPage();

  try {
    // Navigate to backend logout which triggers Auth0 login flow
    console.log(`📍 [V5] Navigating to backend: ${backendURL}/logout/\n`);
    await page.goto(`${backendURL}/logout/`, { waitUntil: 'networkidle', timeout: 60000 });

    // Step 1: Wait for Auth0 email/username input
    console.log('🔑 [V5] Waiting for Auth0 login form...\n');
    const emailInput = page
      .locator('input[name="username"]:visible, input[type="email"]:visible, #username:visible')
      .first();
    await emailInput.waitFor({ state: 'visible', timeout: 30000 });

    // Step 2: Enter email
    await emailInput.fill(process.env.TEST_USER_EMAIL || '');
    console.log('🔑 [V5] Email entered, clicking Continue...\n');

    // Step 3: Click Continue button (Auth0 two-step flow)
    const continueButton = page
      .locator('button[type="submit"], button:has-text("Continue")')
      .first();
    await continueButton.click();

    // Step 4: Wait for password field to appear (after redirect to password page)
    const passwordInput = page
      .locator(
        'input[name="password"]:visible:not([aria-hidden="true"]), input[type="password"]:visible:not([aria-hidden="true"]), #password:visible'
      )
      .first();
    await passwordInput.waitFor({ state: 'visible', timeout: 30000 });

    // Step 5: Enter password
    console.log('🔑 [V5] Entering password...\n');
    await passwordInput.fill(process.env.TEST_USER_PASSWORD || '');

    // Step 6: Click login button
    const loginButton = page.locator('button[type="submit"], button[name="action"]').first();
    await loginButton.waitFor({ state: 'visible', timeout: 10000 });
    await loginButton.click();

    console.log('🔑 [V5] Submitting credentials...\n');

    // Wait for the Auth0 callback to complete and session cookie to be set.
    // We don't need the old backend dashboard to fully load — just wait until
    // we land anywhere other than the Auth0 domain (i.e. the callback has fired).
    await page.waitForFunction(() => !window.location.hostname.includes('auth0.com'), {
      timeout: 60000,
    });
    console.log('✅ [V5] Auth0 callback complete, current URL:', page.url(), '\n');

    // Set language cookie
    await context.addCookies([
      {
        name: 'user_lang',
        value: 'en',
        domain: '.ferdia.app',
        path: '/',
        secure: true,
      },
    ]);

    // Verify the session cookie exists for .ferdia.app domain
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(
      (c) => c.name === 'sessionid' && c.domain.includes('ferdia.app')
    );

    if (!sessionCookie) {
      console.warn('⚠️  [V5] No sessionid cookie found on .ferdia.app domain');
      console.log('    Available cookies:', cookies.map((c) => `${c.name}@${c.domain}`).join(', '));
    } else {
      console.log('✅ [V5] Session cookie found on .ferdia.app domain\n');
    }

    // Now navigate to V5 frontend to confirm it works
    console.log(`📍 [V5] Verifying V5 frontend access: ${frontendURL}\n`);
    await page.goto(frontendURL, { waitUntil: 'networkidle', timeout: 30000 });

    // Save authentication state
    const storagePath = getStoragePath();
    await context.storageState({ path: storagePath });
    console.log(`✅ [V5] Authentication state saved to ${storagePath}\n`);
  } catch (error) {
    console.error('❌ [V5] Global setup failed:', error);
    console.error(`📍 [V5] Current URL at failure: ${page.url()}`);
    // Take a screenshot for debugging
    const screenshotPath = path.resolve(__dirname, '../reports/v5/setup-failure.png');
    const screenshotDir = path.dirname(screenshotPath);
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error(`📸 [V5] Screenshot saved to: ${screenshotPath}`);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
