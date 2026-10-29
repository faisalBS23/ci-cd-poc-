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

A pull request runs only the `.spec.ts` files that changed on that branch. It reads the summary already on `main`, adds this run, and uploads that page. It commits one small result file per test it ran, under `reports/v5/saved/`. It does not commit the HTML page. After the pull request merges, Actions rebuilds `reports/v5/test-automation-summary.html` on `main` from every saved result file and commits that page there. Do not commit the HTML page from your machine. A local run rewrites it for the tests you just ran.

Local run, from this folder, after you copy `.env.example` to `.env` and fill it in:

```bash
npm install
npx playwright install chromium
npm test
```

GitHub Actions needs these repository secrets: `TEQ_V5_FRONTEND_URL`, `TEQ_V5_BACKEND_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`. Do not commit `.env`.
