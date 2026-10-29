import fs from 'fs';
import path from 'path';
import {
  readSavedSummaryLedger,
  writeCumulativeSummary,
} from '../tests-v5/helpers/v5-test-automation-summary-reporter.ts';

const [mode, first, second, third] = process.argv.slice(2);

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

if (mode === 'extract') {
  const htmlPath = path.resolve(first || 'reports/v5/test-automation-summary.html');
  const ledgerPath = path.resolve(second || 'summary-ledger.json');
  const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';
  const tests = html ? readSavedSummaryLedger(html) : [];
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  fs.writeFileSync(ledgerPath, `${JSON.stringify(tests)}\n`);
  console.log(`Kept ${tests.length} saved results from the custom summary.`);
} else if (mode === 'write') {
  const ledgerPath = path.resolve(first || 'summary-ledger.json');
  const playwrightJsonPath = path.resolve(second || 'reports/v5/json/results.json');
  const htmlPath = path.resolve(third || 'reports/v5/test-automation-summary.html');
  if (!fs.existsSync(playwrightJsonPath)) {
    console.log(`No Playwright JSON at ${playwrightJsonPath}. Custom summary was left unchanged.`);
    process.exit(0);
  }
  const previous = fs.existsSync(ledgerPath) ? readJson(ledgerPath) : [];
  const result = writeCumulativeSummary({
    previous,
    playwrightJson: readJson(playwrightJsonPath),
    outputHtml: htmlPath,
    title: 'Test Automation Report',
  });
  console.log(
    `Updated the custom summary at ${htmlPath}. Saved ${result.total}. This run changed ${result.updated}.`,
  );
} else {
  console.error('Use: merge-saved-summary.ts extract <html> <ledger> | write <ledger> <playwright-json> <html>');
  process.exit(1);
}
