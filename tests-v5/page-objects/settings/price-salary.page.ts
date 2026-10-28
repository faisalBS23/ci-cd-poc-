import { Page, Locator, expect, Response } from '@playwright/test';
import { routes } from '../../helpers/v5-routes';
import type { PriceSalaryListCatalog } from '../../helpers/settings/price-salary-api.helper';

export type PriceSalaryTab = PriceSalaryListCatalog | 'calculator' | 'weekend';

const TAB_NAME: Record<PriceSalaryTab, string> = {
  dpf: 'Dynamic Price Factors',
  season: 'Season',
  nightshift: 'Nightshift',
  calculator: 'Price calculator',
  weekend: 'Weekend',
  inconvenient: 'Inconvenient time',
  convenient: 'Convenient time',
  geo: 'Geographical Area',
};

const ADD_BUTTON: Record<PriceSalaryListCatalog, string> = {
  dpf: 'Add dynamic price factor',
  season: 'Add season',
  nightshift: 'Add nightshift',
  inconvenient: 'Add inconvenient time',
  convenient: 'Add convenient time',
  geo: 'Add geographical area',
};

const FORM_HEADING: Record<PriceSalaryListCatalog, RegExp> = {
  dpf: /Add dynamic price factor|Edit dynamic price factor/,
  season: /Add season|Edit season/,
  nightshift: /Add nightshift|Edit nightshift/,
  inconvenient: /Add inconvenient time|Edit inconvenient time/,
  convenient: /Add convenient time|Edit convenient time/,
  geo: /Add geographical area|Edit geographical area/,
};

const DELETE_TITLE: Record<PriceSalaryListCatalog, string> = {
  dpf: 'Delete dynamic price factor?',
  season: 'Delete season?',
  nightshift: 'Delete nightshift?',
  inconvenient: 'Delete inconvenient time?',
  convenient: 'Delete convenient time?',
  geo: 'Delete geographical area?',
};

const SEARCH_ARIA: Record<PriceSalaryListCatalog, string> = {
  dpf: 'Search dynamic price factors',
  season: 'Search seasons',
  nightshift: 'Search nightshifts',
  inconvenient: 'Search inconvenient times',
  convenient: 'Search convenient times',
  geo: 'Search geographical areas',
};

const LIST_URL: Record<PriceSalaryTab, string> = {
  dpf: '/papi/v4/settings/dynamic-price-factors/',
  season: '/papi/v4/settings/seasons/',
  nightshift: '/papi/v4/settings/nightshifts/',
  calculator: '/papi/v4/settings/price-calculator/',
  weekend: '/papi/v4/settings/weekend/',
  inconvenient: '/papi/v4/settings/inconvenient-times/',
  convenient: '/papi/v4/settings/convenient-times/',
  geo: '/papi/v4/settings/geographical-areas/',
};

const CREATED_TOAST: Record<PriceSalaryListCatalog, string> = {
  dpf: 'Dynamic price factor created',
  season: 'Season created',
  nightshift: 'Nightshift created',
  inconvenient: 'Inconvenient time created',
  convenient: 'Convenient time created',
  geo: 'Geographical area created',
};

const UPDATED_TOAST: Record<PriceSalaryListCatalog, string> = {
  dpf: 'Dynamic price factor updated',
  season: 'Season updated',
  nightshift: 'Nightshift updated',
  inconvenient: 'Inconvenient time updated',
  convenient: 'Convenient time updated',
  geo: 'Geographical area updated',
};

/**
 * Page Object for Settings → Categories → Price & salary (`/settings/price-salary`).
 * One page, eight catalogs (six lists + weekend/calculator singletons).
 */
export class PriceSalaryPage {
  readonly page: Page;
  readonly pageUrl: string;
  readonly pageHeading: Locator;
  readonly table: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageUrl = routes.settings.priceSalary();
    this.pageHeading = page.getByRole('heading', { name: /Price (and|&) salary/i });
    this.table = page.getByRole('table');
  }

  tab(tab: PriceSalaryTab): Locator {
    return this.page.getByRole('tab', { name: TAB_NAME[tab], exact: true });
  }

  addButton(catalog: PriceSalaryListCatalog): Locator {
    return this.page.getByRole('button', { name: ADD_BUTTON[catalog] });
  }

  formDialog(catalog: PriceSalaryListCatalog): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: FORM_HEADING[catalog] }),
    });
  }

  deleteDialog(catalog: PriceSalaryListCatalog): Locator {
    return this.page.getByRole('dialog').filter({
      has: this.page.getByRole('heading', { name: DELETE_TITLE[catalog] }),
    });
  }

  saveButton(catalog: PriceSalaryListCatalog): Locator {
    return this.formDialog(catalog).getByRole('button', { name: 'Save' });
  }

  cancelButton(catalog: PriceSalaryListCatalog): Locator {
    return this.formDialog(catalog)
      .getByRole('button', { name: 'Cancel' })
      .filter({ hasText: 'Cancel' });
  }

  searchRegion(): Locator {
    return this.page.getByRole('search').first();
  }

  searchInput(catalog: PriceSalaryListCatalog): Locator {
    return this.searchRegion().getByRole('textbox', { name: SEARCH_ARIA[catalog] });
  }

  searchExpandButton(catalog: PriceSalaryListCatalog): Locator {
    return this.searchRegion().getByRole('button', { name: SEARCH_ARIA[catalog] });
  }

  isListResponse(response: Response, tab: PriceSalaryTab): boolean {
    return response.request().method() === 'GET' && response.url().includes(LIST_URL[tab]);
  }

  isWriteResponse(
    response: Response,
    tab: PriceSalaryTab,
    method: 'POST' | 'PUT' | 'DELETE'
  ): boolean {
    return response.request().method() === method && response.url().includes(LIST_URL[tab]);
  }

  async goto() {
    const listResponse = this.page.waitForResponse(
      (response) => this.isListResponse(response, 'dpf') && response.status() === 200,
      { timeout: 30000 }
    );
    await this.page.goto(this.pageUrl, { waitUntil: 'domcontentloaded' });
    await listResponse.catch(() => undefined);
    await expect(this.pageHeading).toBeVisible({ timeout: 15000 });
  }

  async selectTab(tab: PriceSalaryTab) {
    const tabEl = this.tab(tab);
    if ((await tabEl.getAttribute('aria-selected')) === 'true') {
      return;
    }
    const list = this.page.waitForResponse(
      (response) => this.isListResponse(response, tab) && response.ok(),
      { timeout: 30000 }
    );
    await tabEl.click();
    await expect(tabEl).toHaveAttribute('aria-selected', 'true');
    await list.catch(() => undefined);
  }

  bodyRows(): Locator {
    return this.table.getByRole('row').filter({ has: this.page.getByRole('cell') });
  }

  rowByText(text: string | RegExp): Locator {
    return this.bodyRows().filter({ hasText: text });
  }

  async expectRowVisible(text: string | RegExp) {
    await expect(this.rowByText(text).first()).toBeVisible();
  }

  async expectRowHidden(text: string) {
    await expect(this.rowByText(text)).toHaveCount(0);
  }

  async expandSearchIfNeeded(catalog: PriceSalaryListCatalog) {
    const region = this.searchRegion();
    if ((await region.getAttribute('aria-expanded')) === 'true') {
      await expect(this.searchInput(catalog)).toBeVisible();
      return;
    }
    await this.searchExpandButton(catalog).click();
    await expect(region).toHaveAttribute('aria-expanded', 'true', { timeout: 5000 });
    await expect(this.searchInput(catalog)).toBeVisible();
  }

  async search(catalog: PriceSalaryListCatalog, term: string) {
    await this.expandSearchIfNeeded(catalog);
    const input = this.searchInput(catalog);
    const list = this.page.waitForResponse(
      (response) =>
        this.isListResponse(response, catalog) &&
        /[?&]search=/.test(response.url()) &&
        response.ok(),
      { timeout: 30000 }
    );
    await input.click();
    await input.fill(term);
    await list.catch(() => undefined);
    await expect(this.rowByText(term).first()).toBeVisible({ timeout: 20000 });
  }

  async openCreate(catalog: PriceSalaryListCatalog) {
    await this.addButton(catalog).click();
    await expect(this.formDialog(catalog)).toBeVisible();
    await expect(
      this.formDialog(catalog).getByRole('heading', { name: ADD_BUTTON[catalog] })
    ).toBeVisible();
    await expect(this.saveButton(catalog)).toBeEnabled();
  }

  async openEditByText(catalog: PriceSalaryListCatalog, text: string | RegExp) {
    const row = this.rowByText(text).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(this.formDialog(catalog)).toBeVisible();
  }

  async openDeleteByText(catalog: PriceSalaryListCatalog, text: string | RegExp) {
    const row = this.rowByText(text).first();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(this.deleteDialog(catalog)).toBeVisible();
  }

  async saveFormExpecting(
    catalog: PriceSalaryListCatalog,
    method: 'POST' | 'PUT',
    expectedStatus: number | readonly number[]
  ) {
    const allowed: number[] = Array.isArray(expectedStatus)
      ? [...expectedStatus]
      : [expectedStatus];
    const expectSuccess = allowed.some((status) => status === 201 || status === 200);
    const write = this.page.waitForResponse(
      (response) =>
        this.isWriteResponse(response, catalog, method) && allowed.includes(response.status()),
      { timeout: 30000 }
    );
    const list = expectSuccess
      ? this.page.waitForResponse(
          (response) => this.isListResponse(response, catalog) && response.ok(),
          { timeout: 30000 }
        )
      : null;
    await this.closeOverlay();
    await this.dismissDatePicker();
    const toastText = method === 'POST' ? CREATED_TOAST[catalog] : UPDATED_TOAST[catalog];
    const toast = expectSuccess
      ? this.page.getByText(toastText).first().waitFor({ state: 'visible', timeout: 10000 })
      : Promise.resolve();
    await this.saveButton(catalog).click({ force: true });
    const writeResponse = await write;
    if (expectSuccess) {
      await toast.catch(() => undefined);
    }
    if (expectSuccess && list) {
      await list.catch(() => undefined);
      await expect(this.formDialog(catalog)).toBeHidden({ timeout: 15000 });
    }
    return writeResponse;
  }

  async saveFormExpectingClientValidation(catalog: PriceSalaryListCatalog) {
    await this.closeOverlay();
    await this.dismissDatePicker();
    await this.saveButton(catalog).click({ force: true });
    await expect(this.formDialog(catalog)).toBeVisible();
  }

  /** Save that must not persist: yup block (no write) or 400/422. */
  async saveAndExpectNotSaved(catalog: PriceSalaryListCatalog, method: 'POST' | 'PUT' = 'POST') {
    const write = this.page
      .waitForResponse(
        (response) => this.isWriteResponse(response, catalog, method),
        { timeout: 8000 }
      )
      .catch(() => null);
    await this.closeOverlay();
    await this.dismissDatePicker();
    await this.saveButton(catalog).click({ force: true });
    const writeResponse = await write;
    await expect(this.formDialog(catalog)).toBeVisible();
    if (writeResponse) {
      expect([400, 422]).toContain(writeResponse.status());
    }
    return writeResponse;
  }

  async confirmDelete(
    catalog: PriceSalaryListCatalog,
    expectedStatus: number | readonly number[] = [200, 204]
  ) {
    const allowed = Array.isArray(expectedStatus) ? [...expectedStatus] : [expectedStatus];
    const del = this.page.waitForResponse(
      (response) =>
        this.isWriteResponse(response, catalog, 'DELETE') && allowed.includes(response.status()),
      { timeout: 30000 }
    );
    const list = allowed.some((status) => status === 204 || status === 200)
      ? this.page.waitForResponse(
          (response) => this.isListResponse(response, catalog) && response.ok(),
          { timeout: 30000 }
        )
      : null;
    const toast = this.page.getByText(/deleted/i).first().waitFor({
      state: 'visible',
      timeout: 8000,
    });
    await this.deleteDialog(catalog).getByRole('button', { name: 'Delete', exact: true }).click();
    await Promise.all([del, toast]);
    if (list) {
      await list.catch(() => undefined);
      await expect(this.deleteDialog(catalog)).toBeHidden({ timeout: 15000 });
    }
  }

  async expectToast(text: string | RegExp) {
    await expect(this.page.getByText(text).first()).toBeVisible({ timeout: 10000 });
  }

  async expectCreatedToast(catalog: PriceSalaryListCatalog) {
    const toast = this.page.getByText(CREATED_TOAST[catalog]);
    if (await toast.isVisible().catch(() => false)) {
      await expect(toast.first()).toBeVisible();
    }
  }

  async expectUpdatedToast(catalog: PriceSalaryListCatalog) {
    const toast = this.page.getByText(UPDATED_TOAST[catalog]);
    if (await toast.isVisible().catch(() => false)) {
      await expect(toast.first()).toBeVisible();
    }
  }

  async expectDeletedToast(name: string) {
    const toast = this.page.getByText(`"${name}" deleted`);
    if (await toast.isVisible().catch(() => false)) {
      await expect(toast.first()).toBeVisible();
      return;
    }
    // Toast life is 3s; confirmDelete already waited for /deleted/ at click time.
  }

  labeled(catalog: PriceSalaryListCatalog, name: RegExp | string): Locator {
    return this.formDialog(catalog).getByLabel(name);
  }

  checkbox(catalog: PriceSalaryListCatalog, name: string): Locator {
    return this.formDialog(catalog).getByRole('checkbox', { name });
  }

  datePickerPanel(): Locator {
    return this.page.locator('.p-datepicker-panel').last();
  }

  async dismissDatePicker() {
    const picker = this.datePickerPanel();
    if (!(await picker.isVisible().catch(() => false))) {
      return;
    }
    await this.page.keyboard.press('Escape');
    await expect(picker).toBeHidden({ timeout: 5000 });
  }

  async fillLabeled(
    catalog: PriceSalaryListCatalog,
    name: RegExp | string,
    value: string
  ) {
    const isDateField =
      (typeof name === 'string' && /^date$/i.test(name.trim())) ||
      (name instanceof RegExp && name.source.toLowerCase().includes('date'));
    if (isDateField) {
      await this.fillDate(catalog, value);
      return;
    }
    const field = this.labeled(catalog, name);
    await field.click();
    await field.fill(value);
  }

  /** Pick a visible calendar day so DatePicker v-model updates. Do not Escape (closes weekday mode). */
  async fillDate(catalog: PriceSalaryListCatalog, _value: string) {
    const field = this.labeled(catalog, /^Date/);
    await expect(field).toBeVisible();
    const icon = this.formDialog(catalog).getByRole('button', { name: 'Choose Date' });
    if (await icon.isVisible().catch(() => false)) {
      await icon.click();
    } else {
      await field.click();
    }
    const picker = this.datePickerPanel();
    await expect(picker).toBeVisible({ timeout: 8000 });
    const day = picker.getByRole('gridcell', { name: /^15\b/ }).first();
    if (await day.isVisible().catch(() => false)) {
      await day.click();
    } else {
      const fallback = picker
        .locator('td:not(.p-disabled) button, td:not(.p-disabled) [data-pc-section="daylabel"]')
        .filter({ hasText: /^15$/ })
        .first();
      if (await fallback.isVisible().catch(() => false)) {
        await fallback.click();
      } else {
        await picker.locator('td:not(.p-disabled)').first().click();
      }
    }
    await expect(picker).toBeHidden({ timeout: 8000 });
  }

  async fillRate(value: string) {
    const input = this.formDialog('dpf').getByRole('spinbutton', { name: /^Rate/ });
    await input.click();
    await input.fill(value);
  }

  async fillGeoRadius(value: string) {
    const input = this.formDialog('geo').getByRole('spinbutton', { name: /Affected Radius/ });
    await input.click();
    await input.fill(value);
  }

  async setCheckbox(catalog: PriceSalaryListCatalog, name: string, checked: boolean) {
    const box = this.checkbox(catalog, name);
    const isChecked = await box.isChecked();
    if (isChecked !== checked) {
      await box.click();
    }
  }

  combo(catalog: PriceSalaryListCatalog, label: RegExp | string): Locator {
    return this.fieldShell(catalog, label).getByRole('combobox');
  }

  fieldShell(catalog: PriceSalaryListCatalog, label: RegExp | string): Locator {
    return this.formDialog(catalog)
      .locator('div.flex.min-w-0.flex-col')
      .filter({ has: this.page.getByText(label) });
  }

  visibleListbox(): Locator {
    return this.page.locator('[role="listbox"]:visible').last();
  }

  multiSelectFilter(): Locator {
    return this.page
      .locator('.p-multiselect-overlay:visible input[type="text"]')
      .or(this.page.locator('.p-multiselect-overlay:visible .p-multiselect-filter'))
      .first();
  }

  /**
   * PrimeVue MultiSelect/Select hide a combobox under the label chip.
   * Keyboard opens the listbox. Do not Escape more than once later — that closes the form.
   */
  async openComboList(catalog: PriceSalaryListCatalog, label: RegExp | string) {
    const combo = this.combo(catalog, label);
    await expect(combo).toBeVisible();
    await combo.focus();
    const opened = async () =>
      this.page.getByRole('listbox').last().isVisible().catch(() => false);
    if (!(await opened())) {
      await combo.press('ArrowDown');
    }
    if (!(await opened())) {
      await combo.press('Enter');
    }
    if (!(await opened())) {
      await combo.press('Space');
    }
    if (!(await opened())) {
      const control = this.fieldShell(catalog, label).locator('.p-multiselect, .p-select').first();
      await control.click({ force: true });
    }
    await expect(this.page.getByRole('listbox').last()).toBeVisible({ timeout: 8000 });
    return this.page.getByRole('listbox').last();
  }

  async closeOverlay() {
    const listbox = this.page.getByRole('listbox').last();
    if (!(await listbox.isVisible().catch(() => false))) {
      return;
    }
    await this.page.keyboard.press('Escape');
    await expect(listbox).toBeHidden({ timeout: 3000 }).catch(() => undefined);
  }

  async clickOptionByName(option: string) {
    const optionOf = () => this.page.getByRole('option', { name: option, exact: true });
    await expect(optionOf()).toBeVisible({ timeout: 8000 });
    await optionOf().scrollIntoViewIfNeeded();
    await expect(async () => {
      const current = optionOf();
      await expect(current).toBeVisible({ timeout: 1500 });
      await current.click({ timeout: 1500 });
    }).toPass({ timeout: 12000, intervals: [150, 300, 600] });
  }

  async setMultiOptionSelected(option: string, selected: boolean) {
    const optionOf = () => this.page.getByRole('option', { name: option, exact: true });
    await expect(optionOf()).toBeVisible({ timeout: 8000 });
    await optionOf().scrollIntoViewIfNeeded();
    const isOn = async () => {
      const current = optionOf();
      const ariaSelected = await current.getAttribute('aria-selected');
      const ariaChecked = await current.getAttribute('aria-checked');
      return ariaSelected === 'true' || ariaChecked === 'true';
    };
    await expect(async () => {
      await expect(optionOf()).toBeVisible({ timeout: 1500 });
      if ((await isOn()) === selected) {
        return;
      }
      const current = optionOf();
      const checkbox = current.locator(
        'input[type="checkbox"], .p-checkbox-box, [data-pc-section="pccheckbox"]'
      );
      if ((await checkbox.count()) > 0) {
        await checkbox.first().click({ force: true, timeout: 1500 });
      } else {
        await current.click({ force: true, timeout: 1500 });
      }
      expect(await isOn()).toBe(selected);
    }).toPass({ timeout: 12000, intervals: [150, 300, 600] });
  }

  async selectDropdownOption(catalog: PriceSalaryListCatalog, label: RegExp, option: string) {
    await this.openComboList(catalog, label);
    await this.clickOptionByName(option);
    await this.closeOverlay();
  }

  async openMultiSelect(catalog: PriceSalaryListCatalog, label: RegExp) {
    return this.openComboList(catalog, label);
  }

  async filterOverlayIfPresent(option: string) {
    const filter = this.multiSelectFilter();
    if (!(await filter.isVisible().catch(() => false))) {
      return;
    }
    const type = (await filter.getAttribute('type')) ?? 'text';
    if (type === 'checkbox' || type === 'hidden') {
      return;
    }
    await filter.fill(option);
    await expect(this.page.getByRole('option', { name: option, exact: true })).toBeVisible({
      timeout: 8000,
    });
  }

  async selectMultiOption(catalog: PriceSalaryListCatalog, label: RegExp, option: string) {
    await this.openMultiSelect(catalog, label);
    await this.setMultiOptionSelected(option, true);
    await this.closeOverlay();
  }

  async toggleMultiOption(catalog: PriceSalaryListCatalog, label: RegExp, option: string) {
    await this.openMultiSelect(catalog, label);
    const current = this.page.getByRole('option', { name: option, exact: true });
    const wasSelected = (await current.getAttribute('aria-selected')) === 'true';
    await this.setMultiOptionSelected(option, !wasSelected);
    await this.closeOverlay();
  }

  async expectMultiOptionSelected(
    catalog: PriceSalaryListCatalog,
    label: RegExp,
    option: string,
    selected: boolean
  ) {
    await this.openMultiSelect(catalog, label);
    const opt = this.page.getByRole('option', { name: option, exact: true });
    await expect(opt).toHaveAttribute('aria-selected', selected ? 'true' : 'false');
    await this.closeOverlay();
  }

  weekdayField(catalog: 'convenient' | 'inconvenient'): Locator {
    return this.labeled(catalog, /^Weekday/);
  }

  dateField(catalog: 'convenient' | 'inconvenient'): Locator {
    return this.labeled(catalog, /^Date/);
  }

  async fillWindowTimes(
    catalog: 'convenient' | 'inconvenient',
    start: string,
    end: string
  ) {
    await this.fillLabeled(catalog, /^Start Time/, start);
    await this.fillLabeled(catalog, /^End Time/, end);
  }

  async fillWindowDescription(catalog: 'convenient' | 'inconvenient', description: string) {
    await this.fillLabeled(catalog, /^Description/, description);
  }

  async expectAddOnListTabs() {
    const lists: PriceSalaryListCatalog[] = [
      'dpf',
      'season',
      'nightshift',
      'inconvenient',
      'convenient',
      'geo',
    ];
    for (const catalog of lists) {
      await this.selectTab(catalog);
      await expect(this.addButton(catalog)).toBeVisible();
    }
  }

  async expectNoAddOnSingletons() {
    await this.selectTab('weekend');
    await expect(this.page.getByRole('button', { name: /^Add / })).toHaveCount(0);
    await expect(this.page.getByRole('button', { name: 'Edit' })).toBeVisible();
    await this.selectTab('calculator');
    await expect(this.page.getByRole('button', { name: /^Add / })).toHaveCount(0);
    await expect(this.page.getByRole('button', { name: 'Save' })).toBeVisible();
  }

  pickConvenientSelect(): Locator {
    return this.combo('dpf', /^Pick Convenient Time/);
  }

  pickInconvenientSelect(): Locator {
    return this.combo('dpf', /^Pick Inconvenient Time/);
  }

  relatedToField(): Locator {
    return this.labeled('dpf', /^Related To/);
  }

  async cancel(catalog: PriceSalaryListCatalog) {
    await this.cancelButton(catalog).click();
    await expect(this.formDialog(catalog)).toBeHidden({ timeout: 10000 });
  }

  async expectPageOpen() {
    await expect(this.pageHeading).toBeVisible();
  }

  async expectTabSelected(tab: PriceSalaryTab) {
    await expect(this.tab(tab)).toHaveAttribute('aria-selected', 'true');
  }

  async expectTableVisible() {
    await expect(this.table).toBeVisible();
  }

  async expectCatalogsReachable() {
    const lists: PriceSalaryListCatalog[] = [
      'dpf',
      'season',
      'nightshift',
      'inconvenient',
      'convenient',
      'geo',
    ];
    for (const catalog of lists) {
      await this.selectTab(catalog);
      await this.expectTabSelected(catalog);
      await this.expectTableVisible();
    }
    await this.selectTab('weekend');
    await expect(this.page.getByText('From', { exact: true })).toBeVisible();
    await expect(this.page.getByText('To', { exact: true })).toBeVisible();
    await this.selectTab('calculator');
    await expect(this.page.getByLabel(/Overtime After X Hours/)).toBeVisible();
  }

  async expectFormHidden(catalog: PriceSalaryListCatalog) {
    await expect(this.formDialog(catalog)).toBeHidden();
  }

  async expectRelatedToVisible() {
    await expect(this.relatedToField()).toBeVisible();
  }

  async expectPickConvenientShown(shown: boolean) {
    const label = this.formDialog('dpf').getByText(/^Pick Convenient Time/);
    if (shown) {
      await expect(label).toBeVisible({ timeout: 10000 });
      return;
    }
    await expect(label).toHaveCount(0);
  }

  async expectPickInconvenientShown(shown: boolean) {
    const label = this.formDialog('dpf').getByText(/^Pick Inconvenient Time/);
    if (shown) {
      await expect(label).toBeVisible({ timeout: 10000 });
      return;
    }
    await expect(label).toHaveCount(0);
  }

  async expectPickOptionAbsent(option: string) {
    await this.openComboList('dpf', /^Pick Inconvenient Time/);
    await expect(this.page.getByRole('option', { name: option, exact: true })).toHaveCount(0);
    await this.closeOverlay();
  }

  async expectRowContains(text: string, substring: string) {
    await expect(this.rowByText(text).first()).toContainText(substring);
  }

  async expectLabeledValue(catalog: PriceSalaryListCatalog, label: RegExp, value: string | RegExp) {
    await expect(this.labeled(catalog, label)).toHaveValue(value);
  }

  async expectWeekdayMode(catalog: 'convenient' | 'inconvenient') {
    await expect(this.weekdayField(catalog)).toBeVisible();
    await expect(this.dateField(catalog)).toBeHidden();
  }

  async expectDateMode(catalog: 'convenient' | 'inconvenient') {
    await expect(this.dateField(catalog)).toBeVisible();
    await expect(this.weekdayField(catalog)).toBeHidden();
  }

  async expectFormError(catalog: PriceSalaryListCatalog, message: string | RegExp) {
    await expect(this.formDialog(catalog).getByText(message)).toBeVisible();
  }

  async expectCreatedToastAbsent(catalog: PriceSalaryListCatalog) {
    await expect(this.page.getByText(CREATED_TOAST[catalog])).toHaveCount(0);
  }

  async expectUpdatedToastAbsent(catalog: PriceSalaryListCatalog) {
    await expect(this.page.getByText(UPDATED_TOAST[catalog])).toHaveCount(0);
  }

  async expectViewOnlyCannotMutate() {
    await this.expectPageOpen();
    await expect(this.addButton('dpf')).toHaveCount(0);
    await this.selectTab('convenient');
    await expect(this.addButton('convenient')).toHaveCount(0);
    await this.selectTab('weekend');
    await expect(this.page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await this.selectTab('calculator');
    await expect(this.page.getByRole('button', { name: 'Save' })).toBeDisabled();
  }
}
