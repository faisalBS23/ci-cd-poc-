import { expect, Locator, Page } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';

/**
 * My Profile (PROD-6241) — Personal Information and Account Settings.
 * Opened from the topbar user menu, not the sidebar.
 */
export class MyProfilePage {
  readonly page: Page;

  readonly personalUrl = routes.account.personal();
  readonly accountUrl = routes.account.settings();

  readonly profileMenuButton: Locator;
  readonly myProfileLink: Locator;
  readonly personalNav: Locator;
  readonly accountNav: Locator;
  readonly saveButton: Locator;
  readonly discardButton: Locator;
  readonly photoInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.profileMenuButton = page.getByRole('button', { name: 'Open profile menu' });
    this.myProfileLink = page.getByRole('link', { name: 'My Profile' });
    this.personalNav = page.getByRole('link', { name: 'Personal Information' });
    this.accountNav = page.getByRole('link', { name: 'Account Settings' });
    this.saveButton = page.getByRole('button', { name: /^Save\b/ });
    this.discardButton = page.getByRole('button', { name: /^Discard\b/ });
    this.photoInput = page.locator('input[type="file"][accept="image/jpeg,image/png"]');
  }

  field(id: string): Locator {
    return this.page.locator(`#${id}`);
  }

  selectRoot(id: string): Locator {
    return this.page.locator('.p-select').filter({ has: this.field(id) });
  }

  async gotoPersonal() {
    const loaded = this.waitForProfileGet();
    await this.page.goto(this.personalUrl);
    await loaded;
    await expect(this.page.getByRole('heading', { name: 'Personal Information' })).toBeVisible();
  }

  async gotoAccount() {
    const loaded = this.waitForProfileGet();
    await this.page.goto(this.accountUrl);
    await loaded;
    await expect(this.page.getByRole('heading', { name: 'Account Settings' })).toBeVisible();
  }

  /** Land on a logged-in page, then open My Profile from the header menu. */
  async openFromHeader() {
    await this.page.goto(routes.hr.employees.list());
    await this.profileMenuButton.click();
    await expect(this.myProfileLink).toBeVisible();
    await this.myProfileLink.click();
    await expect(this.page).toHaveURL(/\/user-profile\/personal/);
    await expect(this.page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
  }

  async save() {
    await this.saveButton.click();
  }

  /** Reset the form to the values it loaded with. Does not write to the server. */
  async discard() {
    await this.discardButton.click();
  }

  async expectSaveDisabled() {
    await expect(this.saveButton).toBeDisabled();
  }

  async expectSaveEnabled() {
    await expect(this.saveButton).toBeEnabled();
  }

  /** Tag the app shell so a later check can see it was not torn down. */
  async markShell() {
    await this.page.locator('#app-scroll').evaluate((el) => {
      el.dataset.profileShell = 'stay';
    });
  }

  /** Save must refresh session data without swapping the shell for AppLoader. */
  async expectShellStayed() {
    await expect(this.page.locator('#app-scroll')).toHaveAttribute('data-profile-shell', 'stay');
    await expect(this.page.locator('.loader-backdrop')).toHaveCount(0);
    await expect(this.page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
  }

  async fillField(id: string, value: string) {
    const input = this.field(id);
    await input.click();
    await input.fill(value);
    await input.blur();
  }

  async selectOption(id: string, optionName: string, filterText?: string) {
    await this.field(id).click();
    if (filterText) {
      await this.page.getByRole('searchbox').fill(filterText);
    }
    await this.page.getByRole('option', { name: optionName, exact: true }).click();
  }

  async expectSuccessToast(message: string) {
    await expect(
      this.page.locator('.p-toast-message-success').filter({ hasText: message })
    ).toBeVisible();
    await expect(this.page.getByText('user_info_update_successful')).toHaveCount(0);
  }

  async expectErrorToast(message: string) {
    await expect(
      this.page.locator('.p-toast-message-error').filter({ hasText: message })
    ).toBeVisible();
  }

  async expectValidation(message: string) {
    await expect(this.page.locator('small.text-red-500').filter({ hasText: message })).toBeVisible();
  }

  async expectMenuShowsName(name: string) {
    await this.profileMenuButton.click();
    await expect(this.page.getByText(name, { exact: false }).first()).toBeVisible();
    await this.page.keyboard.press('Escape');
  }

  private waitForProfileGet() {
    return this.page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/user/user-info/') &&
        response.ok(),
      { timeout: 30000 }
    );
  }
}
