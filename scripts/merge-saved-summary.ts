import fs from 'fs';
import path from 'path';
import {
  mergeSavedResults,
  readSavedResultDir,
  readSavedSummaryLedger,
  renderSavedSummary,
  testsFromPlaywrightJson,
  writeSavedResultFiles,
  type SavedSummaryTest,
} from '../tests-v5/helpers/v5-test-automation-summary-reporter.ts';

const [mode, ...args] = process.argv.slice(2);

function readJson(file: string) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function readLedger(htmlPath: string): SavedSummaryTest[] {
  if (!htmlPath || !fs.existsSync(htmlPath)) return [];
  return readSavedSummaryLedger(fs.readFileSync(htmlPath, 'utf8'));
}

if (mode === 'save-run') {
  const [playwrightJsonPath, previousSavedDir, previousHtmlPath, outSavedDir, outHtmlPath] = args;
  if (!playwrightJsonPath || !outSavedDir || !outHtmlPath) {
    console.error(
      'Use: merge-saved-summary.ts save-run <playwright-json> <previous-saved-dir> <previous-html> <out-saved-dir> <out-html>',
    );
    process.exit(1);
  }
  const resolvedJson = path.resolve(playwrightJsonPath);
  if (!fs.existsSync(resolvedJson)) {
    console.log(`No Playwright JSON at ${resolvedJson}. Saved results were left unchanged.`);
    process.exit(0);
  }
  const playwrightJson = readJson(resolvedJson);
  const fresh = testsFromPlaywrightJson(playwrightJson);
  const merged = mergeSavedResults(
    readLedger(previousHtmlPath ? path.resolve(previousHtmlPath) : ''),
    readSavedResultDir(previousSavedDir ? path.resolve(previousSavedDir) : ''),
    fresh,
  );
  const written = writeSavedResultFiles(path.resolve(outSavedDir), fresh);
  const rendered = renderSavedSummary({
    tests: merged,
    outputHtml: path.resolve(outHtmlPath),
    title: 'Test Automation Report',
    durationMs: playwrightJson.stats?.duration ?? 0,
  });
  console.log(
    `Saved ${written.length} result file(s) for this run. The summary page has ${rendered.total} test(s).`,
  );
} else if (mode === 'render') {
  const [savedDir, htmlPath] = args;
  if (!savedDir || !htmlPath) {
    console.error('Use: merge-saved-summary.ts render <saved-dir> <html>');
    process.exit(1);
  }
  const dir = path.resolve(savedDir);
  const html = path.resolve(htmlPath);
  const fromFiles = readSavedResultDir(dir);
  const fromHtml = readLedger(html);
  const merged = mergeSavedResults(fromHtml, fromFiles);
  const fileIds = new Set(fromFiles.map((test) => test.id));
  const missing = merged.filter((test) => !fileIds.has(test.id));
  if (missing.length) writeSavedResultFiles(dir, missing);
  const rendered = renderSavedSummary({
    tests: merged,
    outputHtml: html,
    title: 'Test Automation Report',
  });
  console.log(`Custom summary has ${rendered.total} saved test(s). Added ${missing.length} result file(s) from the old page.`);
} else {
  console.error('Use: merge-saved-summary.ts save-run ... | render <saved-dir> <html>');
  process.exit(1);
}
