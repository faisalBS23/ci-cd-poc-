# ci-cd-poc-

Small Playwright proof of concept. Settings smokes copied from `teq-test`:

- Price & salary opens and its catalogs are reachable
- List catalogs can create; Weekend and Calculator cannot
- Company settings profile page loads
- Invoicing settings page loads
- Driver settings page loads
- Policies page loads
- Vehicle type list loads
- Vehicle state list loads
- Trip type page loads
- Vehicle category list loads
- Vehicle decoration list loads
- Vehicle color list loads
- Trip settings page loads
- User roles list loads
- Organisation page loads
- Business profile list loads
- Integrations page loads
- Notification settings page loads
- Locations page loads
- Product settings page loads
- My Profile personal form loads
- Planning settings page loads
- My Profile account settings loads

A pull request runs only the `.spec.ts` files that changed on that branch. It reads the report already on `main`, builds a preview of the full suite, and uploads that page. It also uploads this run’s results as a GitHub Actions artifact named `pr-run-results-<PR number>`. Nothing about the report is committed on the pull request branch. After the pull request merges, Actions does **not** run Playwright again. It downloads that artifact, merges it into `reports/v5/saved-results.json`, rebuilds `reports/v5/test-automation-summary.html`, and commits those on `main`. Only one main job updates the report at a time. Do not commit the HTML report from your machine. A local run rewrites the HTML for the tests you just ran.

Local run, from this folder, after you copy `.env.example` to `.env` and fill it in:

```bash
npm install
npx playwright install chromium
npm test
```

GitHub Actions needs these repository secrets: `TEQ_V5_FRONTEND_URL`, `TEQ_V5_BACKEND_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`. Do not commit `.env`.
