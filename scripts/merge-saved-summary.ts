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

function readIncomingFile(file: string): SavedSummaryTest[] {
  if (!fs.existsSync(file)) return [];
  const parsed = readJson(file) as unknown;
  if (Array.isArray(parsed)) return parsed as SavedSummaryTest[];
  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { tests?: unknown }).tests)) {
    return (parsed as { tests: SavedSummaryTest[] }).tests;
  }
  return [];
}

function readIncomingDir(dir: string): SavedSummaryTest[] {
  if (!dir || !fs.existsSync(dir)) return [];
  const groups: SavedSummaryTest[][] = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('.json')) continue;
    groups.push(readIncomingFile(path.join(dir, name)));
  }
  return mergeSavedResults(...groups);
}

if (mode === 'save-incoming') {
  const [playwrightJsonPath, outPath] = args;
  if (!playwrightJsonPath || !outPath) {
    console.error('Use: merge-saved-summary.ts save-incoming <playwright-json> <out-json>');
    process.exit(1);
  }
  const resolvedJson = path.resolve(playwrightJsonPath);
  if (!fs.existsSync(resolvedJson)) {
    console.log(`No Playwright JSON at ${resolvedJson}. Incoming results were not saved.`);
    process.exit(0);
  }
  const playwrightJson = readJson(resolvedJson);
  const tests = testsFromPlaywrightJson(playwrightJson);
  const out = path.resolve(outPath);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(
    out,
    `${JSON.stringify({ updatedAt: new Date().toISOString(), tests }, null, 2)}\n`,
  );
  console.log(`Saved ${tests.length} result(s) for this pull request at ${out}.`);
} else if (mode === 'preview') {
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
} else if (mode === 'absorb') {
  const [incomingDir, ledgerPath, htmlPath] = args;
  if (!incomingDir || !ledgerPath || !htmlPath) {
    console.error('Use: merge-saved-summary.ts absorb <incoming-dir> <ledger> <html>');
    process.exit(1);
  }
  const ledger = path.resolve(ledgerPath);
  const html = path.resolve(htmlPath);
  const incoming = readIncomingDir(path.resolve(incomingDir));
  const merged = mergeSavedResults(previousFromMain(ledger, html), incoming);
  const tests = writeSavedResultsFile(ledger, merged);
  const rendered = renderSavedSummary({
    tests,
    outputHtml: html,
    title: 'Test Automation Report',
  });
  console.log(
    `Main summary has ${rendered.total} test(s). Absorbed ${incoming.length} incoming result(s).`,
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
} else if (mode === 'update') {
  const [playwrightJsonPath, ledgerPath, htmlPath] = args;
  if (!playwrightJsonPath || !ledgerPath || !htmlPath) {
    console.error('Use: merge-saved-summary.ts update <playwright-json> <ledger> <html>');
    process.exit(1);
  }
  const resolvedJson = path.resolve(playwrightJsonPath);
  if (!fs.existsSync(resolvedJson)) {
    console.log(`No Playwright JSON at ${resolvedJson}. Main summary was not updated.`);
    process.exit(0);
  }
  const playwrightJson = readJson(resolvedJson);
  const fresh = testsFromPlaywrightJson(playwrightJson);
  const ledger = path.resolve(ledgerPath);
  const html = path.resolve(htmlPath);
  const merged = mergeSavedResults(previousFromMain(ledger, html), fresh);
  const tests = writeSavedResultsFile(ledger, merged);
  const rendered = renderSavedSummary({
    tests,
    outputHtml: html,
    title: 'Test Automation Report',
    durationMs: playwrightJson.stats?.duration ?? 0,
  });
  console.log(
    `Main summary has ${rendered.total} test(s). This full suite run updated ${fresh.length}.`,
  );
} else {
  console.error(
    'Use: merge-saved-summary.ts save-incoming ... | preview ... | absorb ... | render ... | update ...',
  );
  process.exit(1);
}
