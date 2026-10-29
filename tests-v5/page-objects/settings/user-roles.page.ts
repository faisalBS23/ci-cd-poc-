import { Page, Locator, expect, Response } from '@playwright/test';
import { getFrontendOrigin } from '../../helpers/django-api.helper';

/**
 * Page Object for Settings → Categories → User roles (`/settings/user-roles`).
 *
 * API base: `GET|POST /papi/v4/settings/roles/`
 *           `GET|PUT|DELETE /papi/v4/settings/roles/<id>/`
 *           `GET /papi/v4/settings/roles/permissions/`
 */
export class UserRolesPage {
  readonly page: Page;
  readonly pageUrl: string;

  readonly pageHeading: Locator;
  readonly userRoleTab: Locator;
  readonly userGroupsTab: Locator;
  readonly searchInput: Locator;
  readonly addRoleButton: Locator;
  readonly table: Locator;

  readonly formDialog: Locator;
  readonly deleteDialog: Locator;

  readonly nameInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageUrl = `${getFrontendOrigin()}/settings/user-roles`;

    // Actual h2 heading rendered by the Vue component is "Users roles" (plural)
    this.pageHeading = page.getByRole('heading', { name: /users?\s+roles?/i, level: 2 });
    this.userRoleTab = page.getByRole('tab', { name: /^user role$/i });
    this.userGroupsTab = page.getByRole('tab', { name: /^user groups$/i });
    // CollapsibleSearch — placeholder is "Search in list" (visible after expand)
    this.searchInput = page.getByPlaceholder(/search in list/i).first();
    this.addRoleButton = page
      .getByRole('button', { name: /add role/i })
      .or(page.locator('button').filter({ hasText: /add role/i }))
      .first();
    this.table = page.getByRole('table').first();

    // Dialog headings are "Add role" / "Edit role" (from i18n en-US)
    this.formDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /add role|edit role/i }),
    });

    this.deleteDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /delete/i }),
    });

    // FormInput/FormTextarea components render with id="<name>" via FormFieldShell.
    // Name field: <input id="roleName">, Description: <textarea id="roleDescription">
    this.nameInput = this.formDialog.locator('#roleName');
    this.descriptionInput = this.formDialog.locator('#roleDescription');
    this.saveButton = this.formDialog.getByRole('button', { name: /^save$/i });
    this.cancelButton = this.formDialog
      .getByRole('button', { name: /^cancel$/i })
      .filter({ hasText: /cancel/i });
  }

  // ── Response matchers ─────────────────────────────────────────────

  private isRolesListResponse(response: Response): boolean {
    return (
      response.request().method() === 'GET' &&
      /\/papi\/v4\/settings\/roles\/?(\?|$)/.test(response.url())
    );
  }

  private isRolesWriteResponse(response: Response, method: 'POST' | 'PUT' | 'DELETE'): boolean {
    return (
      response.request().method() === method &&
      response.url().includes('/papi/v4/settings/roles/')
    );
  }

  private isPermissionsResponse(response: Response): boolean {
    return (
      response.request().method() === 'GET' &&
      response.url().includes('/papi/v4/settings/roles/permissions/')
    );
  }

  // ── Navigation ────────────────────────────────────────────────────

  async goto() {
    const listResponse = this.page.waitForResponse(
      (r) => this.isRolesListResponse(r) && r.ok(),
      { timeout: 30000 }
    );
    await this.page.goto(this.pageUrl, { waitUntil: 'domcontentloaded' });

    const assertNotLoggedOut = () => {
      if (/auth0\.com|\/u\/login/i.test(this.page.url())) {
        throw new Error(
          `User roles page redirected to login (session expired?). URL: ${this.page.url()}. Re-run with REFRESH_V5_AUTH=true.`
        );
      }
    };
    assertNotLoggedOut();

    try {
      await listResponse;
    } catch (err) {
      assertNotLoggedOut();
      throw err;
    }
    await expect(this.pageHeading).toBeVisible();
    await expect(this.table).toBeVisible();
  }

  /** Close create/edit dialog — force Cancel, else Escape. No-op if already closed. */
  async closeFormDialog() {
    if (!(await this.formDialog.isVisible().catch(() => false))) return;
    await this.cancelButton.click({ force: true }).catch(async () => {
      await this.page.keyboard.press('Escape');
    });
    await expect(this.formDialog).toBeHidden({ timeout: 10000 }).catch(() => undefined);
  }

  // ── List helpers ──────────────────────────────────────────────────

  bodyRows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  rowByName(name: string | RegExp): Locator {
    return this.bodyRows().filter({ hasText: name });
  }

  async expectRowVisible(name: string | RegExp) {
    await expect(this.rowByName(name).first()).toBeVisible({ timeout: 15000 });
  }

  async expectRowHidden(name: string) {
    await expect(this.rowByName(name)).toHaveCount(0);
  }

  async getBodyRowCount(): Promise<number> {
    return this.bodyRows().count();
  }

  // ── Create / Edit ─────────────────────────────────────────────────

  async openCreate() {
    await this.addRoleButton.click();
    await expect(this.formDialog).toBeVisible({ timeout: 10000 });
    await expect(this.formDialog.getByRole('heading', { name: /add role/i })).toBeVisible();
  }

  async openEditByName(name: string | RegExp) {
    // Set up permissions response listener BEFORE clicking to avoid race condition
    // (the response may arrive during dialog open, before external callers have a chance to listen)
    const permPromise = this.page
      .waitForResponse((r) => this.isPermissionsResponse(r) && r.ok(), { timeout: 20000 })
      .catch(() => undefined);

    const row = this.rowByName(name).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: /edit/i }).first().click();
    await expect(this.formDialog).toBeVisible({ timeout: 10000 });
    await permPromise;
  }

  async fillForm(data: { name?: string; description?: string }) {
    if (data.name != null) {
      await this.nameInput.clear();
      await this.nameInput.fill(data.name);
    }
    if (data.description != null) {
      await this.descriptionInput.clear();
      await this.descriptionInput.fill(data.description);
    }
  }

  // ── Permission tree ───────────────────────────────────────────────

  permissionTreeTab(label: 'Actions' | 'Features'): Locator {
    return this.formDialog.getByRole('tab', { name: label });
  }

  /**
   * Waits until at least one VISIBLE tree node is available in the dialog.
   * Uses Playwright's :visible pseudo-class to skip nodes in inactive (hidden) tab panels.
   */
  async waitForPermissionTree() {
    await expect(
      this.formDialog.locator('[role="treeitem"]:visible').first()
    ).toBeVisible({ timeout: 15000 });
  }

  async clickPermissionTreeTab(tab: 'Actions' | 'Features') {
    await this.permissionTreeTab(tab).click();
    await this.waitForPermissionTree();
  }

  /**
   * Waits until permissions have loaded.
   * Delegates to waitForPermissionTree() which checks DOM visibility rather than
   * the network response (which may have already arrived by the time this is called).
   */
  async waitForPermissionsApiResponse() {
    await this.waitForPermissionTree();
  }

  /**
   * Group (parent) nodes — PrimeVue Tree sets aria-expanded on ALL treeitems,
   * so we distinguish by the toggle button's data-p-leaf="false" attribute.
   */
  groupNodes(): Locator {
    return this.formDialog.locator('[role="treeitem"]').filter({
      has: this.page.locator('button[data-p-leaf="false"]'),
    });
  }

  /**
   * Leaf nodes — toggle button carries data-p-leaf="true".
   */
  leafNodes(): Locator {
    return this.formDialog.locator('[role="treeitem"]').filter({
      has: this.page.locator('button[data-p-leaf="true"]'),
    });
  }

  private treeNodeToggleBtn(node: Locator): Locator {
    // PrimeVue 4 Tree expand/collapse button
    return node
      .locator('button.p-tree-node-toggle-button, button.p-tree-toggler, [data-pc-section="nodetogglebutton"]')
      .first();
  }

  private treeNodeCheckbox(node: Locator): Locator {
    // PrimeVue 4 Tree: clicking the node checkbox area (the checkbox square, not the toggle arrow)
    // The checkbox is inside .p-tree-node-content; scope to exclude the toggle button
    // and target the .p-checkbox or [data-pc-name="checkbox"] area.
    return node
      .locator('[data-pc-name="checkbox"], [data-pc-section="nodeCheckbox"], .p-checkbox-box, .p-checkbox')
      .first();
  }

  async checkFirstLeafNode() {
    // Top-level tree nodes are all groups. Expand the first to reveal leaf children.
    const group = this.groupNodes().first();
    await expect(group).toBeVisible({ timeout: 10000 });
    const isExpanded = (await group.getAttribute('aria-expanded')) === 'true';
    if (!isExpanded) {
      await this.treeNodeToggleBtn(group).click();
      await expect(group.locator('[role="group"]')).toBeVisible({ timeout: 5000 });
    }
    // Click the first leaf inside the expanded group.
    // Use data-p-leaf="true" because PrimeVue sets aria-expanded on ALL treeitems.
    const leaf = group
      .locator('[role="group"] [role="treeitem"]')
      .filter({ has: this.page.locator('button[data-p-leaf="true"]') })
      .first();
    await expect(leaf).toBeVisible({ timeout: 10000 });
    await this.treeNodeCheckbox(leaf).click();
  }

  async checkFirstGroupNode() {
    const group = this.groupNodes().first();
    await expect(group).toBeVisible({ timeout: 10000 });

    // Expand the group so its children appear in DOM
    const isExpanded = (await group.getAttribute('aria-expanded')) === 'true';
    if (!isExpanded) {
      await this.treeNodeToggleBtn(group).click();
      await expect(group.locator('[role="group"]')).toBeVisible({ timeout: 5000 });
    }

    // Check the group's own checkbox
    await this.treeNodeCheckbox(group).click();
  }

  async uncheckFirstGroupNode() {
    const group = this.groupNodes().first();
    await expect(group).toBeVisible({ timeout: 10000 });
    // Group should already be expanded from checkFirstGroupNode
    await this.treeNodeCheckbox(group).click();
  }

  /** Returns checked checkbox elements inside the tree (PrimeVue 4). */
  checkedTreeNodes(): Locator {
    // PrimeVue 4: fully-checked leaves → aria-checked="true" / data-p-checked="true"
    // When the leaf is in a collapsed group (not in DOM), the group checkbox shows as
    // indeterminate → aria-checked="mixed" / data-p-partialchecked="true".
    // Include both so pre-seeded permissions are detected even before expanding groups.
    return this.formDialog.locator(
      '[data-p-checked="true"], [aria-checked="true"], [aria-checked="mixed"], [data-p-partialchecked="true"]'
    );
  }

  /** Returns all leaf nodes that are checked. */
  checkedLeafNodes(): Locator {
    return this.leafNodes().filter({
      has: this.formDialog.locator(
        '[data-p-checked="true"], [aria-checked="true"]'
      ),
    });
  }

  /** Returns child treeitem nodes of the first group (must be expanded first). */
  firstGroupChildNodes(): Locator {
    return this.groupNodes()
      .first()
      .locator('[role="group"] [role="treeitem"]');
  }

  // ── Save / submit ─────────────────────────────────────────────────

  async saveFormExpecting(method: 'POST' | 'PUT', expectedStatus: number) {
    const expectSuccess = [200, 201].includes(expectedStatus);
    const writePromise = this.page.waitForResponse(
      (r) => this.isRolesWriteResponse(r, method) && r.status() === expectedStatus,
      { timeout: 30000 }
    );
    await this.saveButton.click();
    const writeResponse = await writePromise;
    if (expectSuccess) {
      // Set up AFTER write resolves so we catch the invalidation-triggered list
      // refetch, not a stale background refetch that fired before the mutation.
      const listPromise = this.page.waitForResponse(
        (r) => this.isRolesListResponse(r) && r.ok(),
        { timeout: 30000 }
      );
      await listPromise.catch(() => undefined);
      await expect(this.formDialog).toBeHidden({ timeout: 15000 });
    }
    return writeResponse;
  }

  /** Intercepts the outgoing write request — returns the request object for body inspection. */
  async saveAndCaptureRequest(method: 'POST' | 'PUT') {
    const reqPromise = this.page.waitForRequest(
      (req) =>
        req.method() === method && req.url().includes('/papi/v4/settings/roles/'),
      { timeout: 30000 }
    );
    await this.saveButton.click();
    return reqPromise;
  }

  async saveFormExpectingClientValidation() {
    await this.saveButton.click();
    // Dialog must remain open — wait briefly so any async validation runs
    await this.page.waitForTimeout(500);
    await expect(this.formDialog).toBeVisible();
  }

  // ── Delete ────────────────────────────────────────────────────────

  async openDeleteByName(name: string | RegExp) {
    const row = this.rowByName(name).first();
    await expect(row).toBeVisible();
    await row
      .getByRole('button', { name: /delete/i })
      .or(row.locator('.pi-trash').locator('..'))
      .first()
      .click();
    await expect(this.deleteDialog).toBeVisible({ timeout: 10000 });
  }

  async confirmDelete() {
    const delPromise = this.page.waitForResponse(
      (r) => this.isRolesWriteResponse(r, 'DELETE') && r.status() === 200,
      { timeout: 30000 }
    );
    const listPromise = this.page.waitForResponse(
      (r) => this.isRolesListResponse(r) && r.ok(),
      { timeout: 30000 }
    );
    await this.deleteDialog.getByRole('button', { name: /^delete$/i }).click();
    await delPromise;
    await listPromise.catch(() => undefined);
    await expect(this.deleteDialog).toBeHidden({ timeout: 15000 });
  }

  // ── Search ────────────────────────────────────────────────────────

  /**
   * CollapsibleSearch — on desktop the input is hidden behind a toggle button.
   * Check `aria-expanded` on the `[role="search"]` container and click to expand if needed.
   */
  async search(term: string) {
    const searchRegion = this.page.locator('[role="search"]').first();
    if ((await searchRegion.getAttribute('aria-expanded')) !== 'true') {
      await searchRegion.click();
      await expect(searchRegion).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });
    }
    await this.searchInput.click({ force: true });
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.press('Backspace');
    await this.searchInput.pressSequentially(term, { delay: 50 });
    await this.page.waitForTimeout(500);
  }

  async clearSearch() {
    const searchRegion = this.page.locator('[role="search"]').first();
    if ((await searchRegion.getAttribute('aria-expanded')) !== 'true') {
      await searchRegion.click();
      await expect(searchRegion).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });
    }
    await this.searchInput.click({ force: true });
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.press('Backspace');
    await this.page.waitForTimeout(500);
  }

  // ── Toast ─────────────────────────────────────────────────────────

  async expectToast(text: string | RegExp) {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: 10000 });
  }
}
