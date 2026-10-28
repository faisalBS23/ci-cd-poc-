# ci-cd-poc-

Small Playwright proof of concept. Settings smokes copied from `teq-test`:

- Price & salary opens and its catalogs are reachable
- List catalogs can create; Weekend and Calculator cannot
- Company settings profile page loads
- Invoicing settings page loads
- Product settings page load is included so CI can show a failure

A pull request runs only the `.spec.ts` files that changed on that branch.

Local run, from this folder, after you copy `.env.example` to `.env` and fill it in:

```bash
npm install
npx playwright install chromium
npm test
```

GitHub Actions needs these repository secrets: `TEQ_V5_FRONTEND_URL`, `TEQ_V5_BACKEND_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`. Do not commit `.env`.
