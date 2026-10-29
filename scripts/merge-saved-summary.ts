import fs from 'fs';
import path from 'path';
import {
  mergeSavedResults,
  readSavedResultsFile,
  readSavedSummaryLedger,
  renderSavedSummary,
  testsFromPlaywrightJson,
  writeSavedResultsFile,
  type SavedSummaryTest,
} from '../tests-v5/helpers/v5-test-automation-summary-reporter.ts';

const [mode, ...args] = process.argv.slice(2);

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function readHtmlLedger(htmlPath: string): SavedSummaryTest[] {
  if (!htmlPath || !fs.existsSync(htmlPath)) return [];
  return readSavedSummaryLedger(fs.readFileSync(htmlPath, 'utf8'));
}

function previousFromMain(ledgerPath: string, htmlPath: string): SavedSummaryTest[] {
  return mergeSavedResults(
    readSavedResultsFile(ledgerPath ? path.resolve(ledgerPath) : ''),
    readHtmlLedger(htmlPath ? path.resolve(htmlPath) : ''),
  );
}

if (mode === 'preview') {
  const [playwrightJsonPath, mainLedgerPath, mainHtmlPath, outHtmlPath] = args;
  if (!playwrightJsonPath || !outHtmlPath) {
    console.error(
      'Use: merge-saved-summary.ts preview <playwright-json> <main-ledger> <main-html> <out-html>',
    );
    process.exit(1);
  }
  const resolvedJson = path.resolve(playwrightJsonPath);
  if (!fs.existsSync(resolvedJson)) {
    console.log(`No Playwright JSON at ${resolvedJson}. Preview was skipped.`);
    process.exit(0);
  }
  const playwrightJson = readJson(resolvedJson);
  const fresh = testsFromPlaywrightJson(playwrightJson);
  const merged = mergeSavedResults(previousFromMain(mainLedgerPath || '', mainHtmlPath || ''), fresh);
  const rendered = renderSavedSummary({
    tests: merged,
    outputHtml: path.resolve(outHtmlPath),
    title: 'Test Automation Report',
    durationMs: playwrightJson.stats?.duration ?? 0,
  });
  console.log(
    `Preview summary has ${rendered.total} test(s). This run added or updated ${fresh.length}.`,
  );
} else if (mode === 'update') {
  const [playwrightJsonPath, ledgerPath, htmlPath] = args;
  if (!ledgerPath || !htmlPath) {
    console.error('Use: merge-saved-summary.ts update <playwright-json-or--> <ledger> <html>');
    process.exit(1);
  }
  const ledger = path.resolve(ledgerPath);
  const html = path.resolve(htmlPath);
  let previous = previousFromMain(ledger, html);
  let updated = 0;
  let durationMs = 0;
  if (playwrightJsonPath && playwrightJsonPath !== '-' && fs.existsSync(path.resolve(playwrightJsonPath))) {
    const playwrightJson = readJson(path.resolve(playwrightJsonPath));
    const fresh = testsFromPlaywrightJson(playwrightJson);
    previous = mergeSavedResults(previous, fresh);
    updated = fresh.length;
    durationMs = playwrightJson.stats?.duration ?? 0;
  }
  const tests = writeSavedResultsFile(ledger, previous);
  const rendered = renderSavedSummary({
    tests,
    outputHtml: html,
    title: 'Test Automation Report',
    durationMs,
  });
  console.log(
    `Main summary has ${rendered.total} test(s). This run added or updated ${updated}.`,
  );
} else if (mode === 'render') {
  const [ledgerPath, htmlPath] = args;
  if (!ledgerPath || !htmlPath) {
    console.error('Use: merge-saved-summary.ts render <ledger> <html>');
    process.exit(1);
  }
  const ledger = path.resolve(ledgerPath);
  const html = path.resolve(htmlPath);
  const tests = writeSavedResultsFile(ledger, previousFromMain(ledger, html));
  const rendered = renderSavedSummary({
    tests,
    outputHtml: html,
    title: 'Test Automation Report',
  });
  console.log(`Main summary has ${rendered.total} test(s).`);
} else {
  console.error('Use: merge-saved-summary.ts preview ... | update ... | render ...');
  process.exit(1);
}
