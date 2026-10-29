import { Page, Locator, expect } from '@playwright/test';
import { ORGANISATION_PATHS } from '../../helpers/settings/organisation-api.helper';
import { v5PageUrl } from '../../helpers/v5-routes';

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Settings organisation SPA route (full URL from TEQ_V5_FRONTEND_URL).
 * Override with `TEQ_V5_ORGANISATION_URL` when needed.
 */
export function organisationSettingsUrl(): string {
  const fromEnv = process.env.TEQ_V5_ORGANISATION_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '') || v5PageUrl('/settings/organisation');
  return v5PageUrl('/settings/organisation');
}

/**
 * Page Object for V5 Settings → Organisation.
 * Locators prefer role/label; existing `data-testid`s used where already in the DOM.
 */
export class OrganisationPage {
  readonly page: Page;
  readonly url = organisationSettingsUrl();

  readonly pageRoot: Locator;
  readonly toolbar: Locator;
  readonly newUnitButton: Locator;
  readonly newGarageButton: Locator;
  readonly treeTable: Locator;
  readonly treeEmpty: Locator;
  readonly loading: Locator;
  readonly errorCard: Locator;

  readonly unitDialog: Locator;
  readonly garageDialog: Locator;
  readonly deleteUnitDialog: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageRoot = page.getByTestId('org-page');
    this.toolbar = page.getByTestId('org-toolbar');
    this.newUnitButton = page.getByTestId('org-new-unit');
    this.newGarageButton = page.getByTestId('org-new-garage');
    this.treeTable = page.getByTestId('org-tree-table');
    this.treeEmpty = page.getByTestId('org-tree-empty');
    this.loading = page.getByTestId('org-loading');
    this.errorCard = page.getByTestId('org-error');

    // Header testids sit inside AppDialog slots — scope to the dialog that contains them.
    // Delete dialog puts `org-delete-unit-dialog` on AppDialog root (same as role=dialog),
    // so filter by the header testid (descendant), matching unit/garage pattern.
    this.unitDialog = page.getByRole('dialog').filter({
      has: page.getByTestId('org-unit-dialog'),
    });
    this.garageDialog = page.getByRole('dialog').filter({
      has: page.getByTestId('org-garage-dialog'),
    });
    this.deleteUnitDialog = page.getByRole('dialog').filter({
      has: page.getByTestId('org-delete-unit-dialog-header'),
    });
  }

  /**
   * Page + tree settled enough to click toolbar / rows.
   * Timeouts are ceilings only — returns as soon as ready.
   */
  private async waitUntilReady() {
    const notFound = this.page.getByRole('heading', { name: '404' });
    if (await notFound.isVisible().catch(() => false)) {
      throw new Error(
        `Organisation route 404 at ${this.url}. Deploy PROD-5633 FE to TEQ_V5_FRONTEND_URL (Organisation page not in this build).`
      );
    }

    await expect(this.pageRoot).toBeVisible({ timeout: 15000 });
    await this.loading.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => undefined);
    await expect(
      this.treeTable.or(this.treeEmpty).or(this.errorCard)
    ).toBeVisible({ timeout: 15000 });
  }

  private async waitForTreeResponse() {
    return this.page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/settings/organisation/tree') &&
          (resp.status() === 200 || resp.status() === 403 || resp.status() === 404),
        { timeout: 15000 }
      )
      .catch(() => undefined);
  }

  async goto() {
    const treeWait = this.waitForTreeResponse();
    await this.page.goto(this.url);
    await treeWait;
    await this.waitUntilReady();
  }

  /**
   * Refresh Organisation while already on the page (after API seed).
   * Same readiness checks as goto — avoids a full route navigation.
   */
  async reloadTree() {
    const treeWait = this.waitForTreeResponse();
    await this.page.reload();
    await treeWait;
    await this.waitUntilReady();
  }

  async expectSidebarOrganisationActive() {
    await expect(this.page).toHaveURL(/\/settings\/organisation\/?$/);
    // Settings side nav may collapse “Organisation” text off-viewport; URL is the active-state signal.
    const navItem = this.page.getByRole('link', { name: /Organisation/i }).or(
      this.page.getByText('Organisation', { exact: true })
    );
    await expect(navItem.first()).toBeAttached();
  }

  rowByName(name: string): Locator {
    return this.treeTable.getByRole('treeitem').filter({ hasText: name });
  }

  async expectNodeVisible(name: string) {
    await expect(this.rowByName(name).first()).toBeVisible({ timeout: 15000 });
  }

  async expectNodeHidden(name: string) {
    await expect(this.rowByName(name)).toHaveCount(0, { timeout: 15000 });
  }

  async openEditByName(name: string) {
    const row = this.rowByName(name).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    await row.getByRole('button', { name: 'Edit' }).click();
  }

  /**
   * Ensure a tree row is expanded. Tree auto-expands on load — do not click when
   * already expanded (toggle would collapse and hide children).
   */
  async expandRowByName(name: string) {
    const row = this.rowByName(name).first();
    await expect(row).toBeVisible({ timeout: 15000 });
    if ((await row.getAttribute('aria-expanded')) === 'true') return;
    const expand = row.getByRole('button', { name: 'Expand or collapse' });
    if (!(await expand.isVisible().catch(() => false))) return;
    await expand.click();
    await expect(row).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });
  }

  // --- Unit dialog ---

  async openCreateUnit() {
    await this.newUnitButton.click();
    await expect(this.unitDialog).toBeVisible();
  }

  unitNameInput(): Locator {
    return this.unitDialog.getByPlaceholder('Enter Name');
  }

  unitParentTrigger(): Locator {
    return this.unitDialog.locator('.p-treeselect').first();
  }

  unitInheritToggle(): Locator {
    return this.unitDialog.getByRole('switch', { name: /Use Parent Business Profile/i });
  }

  unitBillingSelect(): Locator {
    // Only FormSelect in the unit dialog (TreeSelect uses .p-treeselect).
    return this.unitDialog.locator('.p-select').first();
  }

  unitSaveButton(): Locator {
    return this.page.getByTestId('org-unit-dialog-save');
  }

  unitCancelButton(): Locator {
    return this.page.getByTestId('org-unit-dialog-cancel');
  }

  unitDeleteButton(): Locator {
    return this.page.getByTestId('org-unit-dialog-delete');
  }

  unitDepartmentIdField(): Locator {
    return this.page.getByTestId('org-unit-department-id');
  }

  async fillUnitName(name: string) {
    await this.unitNameInput().fill(name);
  }

  async selectTreeParent(parentLabel: string) {
    await this.selectParentDepartment(this.unitDialog, parentLabel);
  }

  /** Garage dialog parent picker (same label). */
  async selectGarageParent(parentLabel: string) {
    await this.selectParentDepartment(this.garageDialog, parentLabel);
  }

  /**
   * TreeSelect overlay is portaled (PrimeVue 4: `.p-treeselect-overlay`).
   * Prefer exact label text — `getByRole('treeitem', { name })` substring-matches
   * ancestors that include the child label in their accessible name.
   */
  private async selectParentDepartment(dialog: Locator, parentLabel: string) {
    const trigger = dialog.locator('.p-treeselect').first();
    await trigger.click();
    const panel = this.page.locator('.p-treeselect-overlay').last();
    await panel.waitFor({ state: 'visible', timeout: 10000 });
    const option = panel.getByText(parentLabel, { exact: true }).first();
    await option.waitFor({ state: 'visible', timeout: 10000 });
    await option.click();
    await expect(panel).toBeHidden({ timeout: 5000 });
    await expect(trigger).toContainText(parentLabel, { timeout: 5000 });
  }

  async saveUnit() {
    const wait = this.page.waitForResponse(
      (resp) =>
        resp.url().includes(ORGANISATION_PATHS.units.replace('/papi/v4', '')) &&
        (resp.request().method() === 'POST' || resp.request().method() === 'PUT'),
      { timeout: 30000 }
    );
    await this.unitSaveButton().click();
    await wait.catch(() => undefined);
  }

  async createUnitUi(name: string, parentLabel: string) {
    await this.openCreateUnit();
    await this.fillUnitName(name);
    await this.selectTreeParent(parentLabel);
    await this.saveUnit();
    // Toast + dialog close together — avoid “toast shown but still waiting”.
    await Promise.all([
      this.waitForSuccessToast('Unit created'),
      expect(this.unitDialog).toBeHidden({ timeout: 15000 }),
    ]);
  }

  // --- Garage dialog ---

  async openCreateGarage() {
    await this.newGarageButton.click();
    await expect(this.garageDialog).toBeVisible();
  }

  garageNameInput(): Locator {
    return this.garageDialog.getByPlaceholder('Enter Name');
  }

  garageLocationInput(): Locator {
    return this.garageDialog.getByPlaceholder('Enter Location');
  }

  garageSaveButton(): Locator {
    return this.page.getByTestId('org-garage-dialog-save');
  }

  garageCancelButton(): Locator {
    return this.page.getByTestId('org-garage-dialog-cancel');
  }

  garageDeleteButton(): Locator {
    return this.page.getByTestId('org-garage-dialog-delete');
  }

  garageArchiveButton(): Locator {
    return this.page.getByTestId('org-garage-dialog-archive');
  }

  garageRestoreButton(): Locator {
    return this.page.getByTestId('org-garage-dialog-restore');
  }

  geofenceSlider(): Locator {
    return this.page.getByTestId('org-garage-radius-slider');
  }

  geofenceValue(): Locator {
    return this.page.getByTestId('org-garage-radius-value');
  }

  mapPlaceholder(): Locator {
    return this.page.getByTestId('org-garage-map-placeholder');
  }

  async fillGarageBasics(name: string, location: string, parentLabel: string) {
    await this.garageNameInput().fill(name);
    await this.garageLocationInput().fill(location);
    await this.selectGarageParent(parentLabel);
  }

  async saveGarage() {
    const wait = this.page.waitForResponse(
      (resp) =>
        resp.url().includes('/settings/organisation/garages') &&
        (resp.request().method() === 'POST' || resp.request().method() === 'PUT'),
      { timeout: 30000 }
    );
    await this.garageSaveButton().click();
    await wait.catch(() => undefined);
  }

  async createGarageUi(name: string, location: string, parentLabel: string) {
    await this.openCreateGarage();
    await this.fillGarageBasics(name, location, parentLabel);
    await this.saveGarage();
    const success = this.page.getByText('Garage created', { exact: false });
    // Do not match bare "location" — the form label would false-trigger this race.
    const errorToast = this.page.getByText(
      /Failed to save garage|Could not resolve|geocode|coordinates required|invalid coordinates/i
    );
    await Promise.race([
      success.waitFor({ state: 'visible', timeout: 20000 }),
      errorToast.waitFor({ state: 'visible', timeout: 20000 }).then(async () => {
        const detail = (await errorToast.first().textContent())?.trim() ?? 'garage save failed';
        throw new Error(`Garage create blocked: ${detail}`);
      }),
    ]);
    await expect(this.garageDialog).toBeHidden({ timeout: 15000 });
  }

  async toggleNearestLookup() {
    await this.garageDialog
      .getByRole('switch', { name: 'Include in nearest garage lookup' })
      .or(this.garageDialog.getByLabel('Include in nearest garage lookup'))
      .click();
  }

  nearestLookupSwitch(): Locator {
    return this.garageDialog
      .getByRole('switch', { name: 'Include in nearest garage lookup' })
      .or(this.garageDialog.getByLabel('Include in nearest garage lookup'));
  }

  /**
   * Open the portaled TreeSelect overlay for the unit (or garage) parent field.
   */
  async openParentTreeSelect(dialog: Locator): Promise<Locator> {
    await dialog.locator('.p-treeselect').first().click();
    const panel = this.page.locator('.p-treeselect-overlay').last();
    await panel.waitFor({ state: 'visible', timeout: 10000 });
    return panel;
  }

  async setGeofenceNearEdge(edge: 'min' | 'max') {
    const slider = this.geofenceSlider();
    await expect(slider).toBeVisible();
    const box = await slider.boundingBox();
    if (!box) throw new Error('Geofence slider has no bounding box');
    const handle = slider.locator('.p-slider-handle, [role="slider"]').first();
    await handle.dragTo(slider, {
      force: true,
      targetPosition: {
        x: edge === 'min' ? 0 : Math.max(box.width - 1, 0),
        y: Math.floor(box.height / 2),
      },
    });
    // Drag often lands 1 step short — nudge with arrows to the exact edge.
    await handle.focus();
    const expected = edge === 'min' ? '50' : '100';
    for (let i = 0; i < 15; i++) {
      const text = (await this.geofenceValue().textContent()) ?? '';
      if (text.includes(expected)) break;
      await this.page.keyboard.press(edge === 'max' ? 'ArrowRight' : 'ArrowLeft');
    }
    await expect(this.geofenceValue()).toContainText(expected, { timeout: 5000 });
  }

  // --- Delete unit ---

  async openDeleteUnitFromEdit() {
    await this.unitDeleteButton().click();
    await expect(this.deleteUnitDialog).toBeVisible({ timeout: 15000 });
  }

  deleteUnitConfirmButton(): Locator {
    return this.page.getByTestId('org-delete-unit-dialog-confirm');
  }

  deleteUnitCancelButton(): Locator {
    return this.page.getByTestId('org-delete-unit-dialog-cancel');
  }

  async selectReplacementDepartment(label: string) {
    // FormSelect options use path labels (`Company / Dept`) — match by leaf name.
    await this.deleteUnitDialog.getByText('Select department').click();
    const listbox = this.page.locator('.p-select-overlay, .p-popover, [role="listbox"]').last();
    await listbox.waitFor({ state: 'visible', timeout: 10000 });
    const option = listbox
      .getByRole('option', { name: new RegExp(`(?:^|/ )${escapeRegExp(label)}$`) })
      .first();
    await option.click();
    await expect(this.deleteUnitDialog.getByText(label).first()).toBeVisible({ timeout: 5000 });
  }

  // --- Confirms (DeleteConfirmDialog) ---

  confirmDialog(): Locator {
    // Must not match the Edit garage dialog (it also contains "Archive garage" button text).
    return this.page.getByRole('dialog').filter({
      hasText: /Are you sure you want to (archive|delete) the garage/,
    });
  }

  async confirmPrimaryAction(buttonName: RegExp | string) {
    await this.confirmDialog()
      .getByRole('button', { name: buttonName, exact: typeof buttonName === 'string' })
      .click();
  }

  async cancelConfirm() {
    await this.confirmDialog().getByRole('button', { name: 'Cancel' }).click();
  }

  // --- Toasts / validation ---

  async waitForSuccessToast(messageFragment: string) {
    await expect(
      this.page.getByText(messageFragment, { exact: false }).first()
    ).toBeVisible({ timeout: 15000 });
  }

  async expectValidationMessage(fragment: string) {
    await expect(this.page.getByText(fragment, { exact: false }).first()).toBeVisible();
  }

  async expectCompanyRowHasNoEdit(companyName: string) {
    const row = this.rowByName(companyName).first();
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  }

  /** Default departments are not editable in the tree (same as company root). */
  async expectDefaultDepartmentHasNoEdit(name: string) {
    await this.expectCompanyRowHasNoEdit(name);
  }

  parentTreePanel(): Locator {
    return this.page.locator('.p-treeselect-overlay').last();
  }
}
