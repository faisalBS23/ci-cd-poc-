import { Page, Locator, expect } from '@playwright/test';
import { INTEGRATION_PATHS } from '../../helpers/settings/integrations-api.helper';
import { v5PageUrl } from '../../helpers/v5-routes';

/** Settings integrations SPA route (full URL from TEQ_V5_FRONTEND_URL).
 * Override with `TEQ_V5_INTEGRATIONS_URL` when needed.
 */
export function integrationsSettingsUrl(): string {
  const fromEnv = process.env.TEQ_V5_INTEGRATIONS_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '') || v5PageUrl('/settings/integrations');
  return v5PageUrl('/settings/integrations');
}

/**
 * Page Object for V5 Settings → Integrations.
 *
 * Locators prefer role/label; `data-testid` is used only as a structural anchor where
 * a card or panel has no accessible name of its own. Toasts are matched by
 * `getByRole('alert')` rather than the `.p-toast-*` CSS other settings POMs still use —
 * §2 bans CSS selectors, and new code should not add more of them.
 *
 * The page is schema-driven: field names come from the backend's `config_fields`, so
 * this POM takes field names as arguments rather than exposing a fixed set of locators.
 */
export class IntegrationsPage {
  readonly page: Page;
  readonly url = integrationsSettingsUrl();

  readonly pageRoot: Locator;
  readonly tabs: Locator;
  readonly emptyState: Locator;
  readonly errorState: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageRoot = page.getByTestId('int-page');
    this.tabs = page.getByRole('tablist');
    this.emptyState = page.getByText('No integrations are available for this company.');
    this.errorState = page.getByText('Could not load integrations.');
  }

  /**
   * Navigate and wait until the list query has settled, so no spec has to poll.
   *
   * The response wait is a hint, not the gate: a cold dev-server compile can push
   * the first list request past its window, and failing there produces a bare
   * `waitForResponse` timeout that says nothing about the page. The settled
   * assertion below — cards, empty state, or error state — is what actually
   * decides, and it reports which of the three it got.
   */
  async goto(): Promise<void> {
    const listResponse = this.page
      .waitForResponse(
        (response) =>
          response.url().includes(INTEGRATION_PATHS.list) &&
          response.request().method() === 'GET',
        { timeout: 30_000 }
      )
      .catch(() => undefined);
    await this.page.goto(this.url, { waitUntil: 'domcontentloaded' });
    await listResponse;
    await expect(this.pageRoot).toBeVisible();
    await expect(
      this.page
        .locator('[data-testid^="int-card-"]')
        .first()
        .or(this.emptyState)
        .or(this.errorState)
    ).toBeVisible();
  }

  async expectSidebarIntegrationsActive(): Promise<void> {
    await expect(this.page).toHaveURL(/\/settings\/integrations(\?.*)?$/);
    // Settings side nav may collapse the label off-viewport; URL is the active-state signal.
    const navItem = this.page
      .getByRole('link', { name: /Integrations/i })
      .or(this.page.getByText('Integrations', { exact: true }));
    await expect(navItem.first()).toBeAttached();
  }

  // --- cards ---------------------------------------------------------

  card(key: string): Locator {
    return this.page.getByTestId(`int-card-${key}`);
  }

  cardTitle(label: string): Locator {
    return this.page.getByRole('heading', { name: label, level: 3 });
  }

  statusTag(key: string): Locator {
    return this.page.getByTestId(`int-status-${key}`);
  }

  configureButton(key: string): Locator {
    return this.card(key).getByRole('button', { name: /Configure/i });
  }

  panel(key: string): Locator {
    return this.page.getByTestId(`int-panel-${key}`);
  }

  /** Every card currently rendered, in DOM order. */
  async visibleIntegrationKeys(): Promise<string[]> {
    const ids = await this.page
      .locator('[data-testid^="int-card-"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-testid') ?? '')
      );
    return ids.map((id) => id.replace('int-card-', '')).filter(Boolean);
  }

  async expectCardVisible(key: string): Promise<void> {
    await expect(this.card(key)).toBeVisible();
  }

  async expectStatus(key: string, status: 'Active' | 'Inactive'): Promise<void> {
    await expect(this.statusTag(key)).toHaveText(status);
  }

  // --- expand / collapse ---------------------------------------------

  async expand(key: string): Promise<void> {
    await this.configureButton(key).click();
    await expect(this.panel(key)).toBeVisible();
  }

  async cancel(key: string): Promise<void> {
    await this.panel(key).getByRole('button', { name: /^Cancel$/i }).click();
    await expect(this.panel(key)).toBeHidden();
  }

  async expectPanelHidden(key: string): Promise<void> {
    await expect(this.panel(key)).toBeHidden();
  }

  /** Configure is absent while a card is open — the panel's Cancel closes it. */
  async expectConfigureHidden(key: string): Promise<void> {
    await expect(this.configureButton(key)).toBeHidden();
  }

  // --- fields --------------------------------------------------------

  /**
   * A field by its backend descriptor name.
   *
   * `data-testid` here is the structural anchor; the control inside is reached by
   * role so the assertion still goes through the accessible name.
   */
  field(name: string): Locator {
    return this.page.getByTestId(`int-field-${name}`);
  }

  fieldInput(label: string): Locator {
    return this.page.getByLabel(label);
  }

  /**
   * The control inside a field, located by role within its container.
   *
   * Preferred over `getByLabel` for `select`: PrimeVue's `Select` puts `inputId` on
   * an internal element, so the label is not reliably associated with anything
   * clickable. Scoping to the field's container and asking for the role works for
   * every descriptor type.
   */
  fieldControl(name: string): Locator {
    return this.field(name).getByRole('textbox').or(this.field(name).getByRole('combobox'));
  }

  /** Descriptor names rendered in the open panel, in DOM order — for schema assertions. */
  async renderedFieldNames(key: string): Promise<string[]> {
    const ids = await this.panel(key)
      .locator('[data-testid^="int-field-"]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-testid') ?? '')
      );
    return ids.map((id) => id.replace('int-field-', '')).filter(Boolean);
  }

  /** Fill a text or password field, addressed by its backend descriptor name. */
  async fillFieldByName(name: string, value: string): Promise<void> {
    await this.fieldControl(name).fill(value);
  }

  /** Choose an option in a `select` field, addressed by its descriptor name. */
  async selectOptionByName(name: string, optionText: string): Promise<void> {
    await this.fieldControl(name).click();
    await this.page.getByRole('option', { name: optionText }).click();
  }

  // --- active toggle -------------------------------------------------

  activeToggle(key: string): Locator {
    return this.panel(key).getByRole('group', { name: /Active/i });
  }

  async setActive(key: string, on: boolean): Promise<void> {
    const label = on ? 'On' : 'Off';
    await this.activeToggle(key).getByRole('button', { name: label, exact: true }).click();
  }

  async expectActiveToggleState(key: string, on: boolean): Promise<void> {
    const label = on ? 'On' : 'Off';
    await expect(
      this.activeToggle(key).getByRole('button', { name: label, exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
  }

  async expectNoActiveToggle(key: string): Promise<void> {
    await expect(this.activeToggle(key)).toBeHidden();
  }

  // --- actions -------------------------------------------------------

  saveButton(key: string): Locator {
    return this.panel(key).getByRole('button', { name: /Save changes/i });
  }

  disconnectButton(key: string): Locator {
    return this.panel(key).getByRole('button', { name: /Disconnect/i });
  }

  // --- disconnect confirm --------------------------------------------

  /** Confirmation dialog shown before credentials are cleared. */
  get disconnectDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  get disconnectConfirmButton(): Locator {
    return this.page.getByTestId('int-disconnect-confirm');
  }

  get disconnectCancelButton(): Locator {
    return this.page.getByTestId('int-disconnect-cancel');
  }

  /** Open the confirm dialog without acting on it. */
  async requestDisconnect(key: string): Promise<void> {
    await this.disconnectButton(key).click();
    await expect(this.disconnectDialog).toBeVisible();
  }

  /** Confirm the dialog and wait for the write to land. */
  async confirmDisconnect(): Promise<void> {
    const disconnectResponse = this.page.waitForResponse((response) =>
      response.url().includes(INTEGRATION_PATHS.disconnect)
    );
    await this.disconnectConfirmButton.click();
    await disconnectResponse;
  }

  async cancelDisconnect(): Promise<void> {
    await this.disconnectCancelButton.click();
    await expect(this.disconnectDialog).toBeHidden();
  }

  /** Click Save and wait for the write to land, so specs never poll. */
  async save(key: string): Promise<void> {
    const saveResponse = this.page.waitForResponse((response) =>
      response.url().includes(INTEGRATION_PATHS.save)
    );
    await this.saveButton(key).click();
    await saveResponse;
  }

  async expectNoSaveButton(key: string): Promise<void> {
    await expect(this.saveButton(key)).toBeHidden();
  }

  async expectNoDisconnectButton(key: string): Promise<void> {
    await expect(this.disconnectButton(key)).toBeHidden();
  }

  // --- toasts --------------------------------------------------------

  /** PrimeVue Toast renders `role="alert"`; matched by role, not `.p-toast-*` CSS. */
  toast(messageFragment: string): Locator {
    return this.page.getByRole('alert').filter({ hasText: messageFragment });
  }

  async expectSuccessToast(messageFragment = 'saved'): Promise<void> {
    await expect(this.toast(messageFragment)).toBeVisible();
  }

  async expectErrorToast(messageFragment: string): Promise<void> {
    await expect(this.toast(messageFragment)).toBeVisible();
  }

  // --- category tabs -------------------------------------------------

  tab(name: string): Locator {
    return this.page.getByRole('tab', { name });
  }

  async selectCategory(name: string): Promise<void> {
    await this.tab(name).click();
  }

  async tabNames(): Promise<string[]> {
    return this.page.getByRole('tab').allInnerTexts();
  }
}
