/** Used by the business profile page object create flow. Smoke load tests do not throw it. */
export class InvoicePrefixUnavailableError extends Error {
  constructor() {
    super(
      'No invoice prefix options in create dialog — seed unassigned InvoiceNumberSeries (Django admin / legacy invoicing settings).',
    );
    this.name = 'InvoicePrefixUnavailableError';
  }
}
