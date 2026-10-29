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

A pull request runs only the `.spec.ts` files that changed on that branch. It reads the report already on `main`, builds a preview of the full suite, and uploads that page. It does not commit the report. After the pull request merges, Actions runs those new specs on `main` again if needed, updates one ledger file `reports/v5/saved-results.json`, rebuilds `reports/v5/test-automation-summary.html`, and commits both on `main`. Only one main job updates the report at a time, so several people can open pull requests without overwriting each other. Do not commit the report from your machine. A local run rewrites the HTML for the tests you just ran.

Local run, from this folder, after you copy `.env.example` to `.env` and fill it in:

```bash
npm install
npx playwright install chromium
npm test
```

GitHub Actions needs these repository secrets: `TEQ_V5_FRONTEND_URL`, `TEQ_V5_BACKEND_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`. Do not commit `.env`.
