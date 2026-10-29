import fs from 'fs';
import path from 'path';

const playwrightJsonPath = path.resolve(process.argv[2] || 'reports/v5/json/results.json');
const ledgerPath = path.resolve('ci-report/results.json');
const htmlPath = path.resolve('ci-report/test-automation-summary.html');
const markdownPath = path.resolve('ci-report/test-automation-summary.md');

function mapStatus(status) {
  if (status === 'passed') return 'passed';
  if (status === 'failed' || status === 'timedOut' || status === 'interrupted') return 'failed';
  if (status === 'flaky') return 'flaky';
  return 'skipped';
}

function walk(suites, inheritedFile, found) {
  for (const suite of suites || []) {
    const suiteFile = suite.file || inheritedFile || '';
    for (const spec of suite.specs || []) {
      const specFile = (spec.file || suiteFile).replace(/\\/g, '/');
      for (const test of spec.tests || []) {
        const result = test.results?.[test.results.length - 1];
        const title = spec.title || '';
        const idMatch = title.match(/^(TC-[A-Z0-9-]+)/);
        found.push({
          id: idMatch ? idMatch[1] : title,
          title,
          status: mapStatus(result?.status),
          file: specFile,
          error: (result?.error?.message || '').split('\n')[0].slice(0, 240),
        });
      }
    }
    walk(suite.suites, suiteFile, found);
  }
}

function readLedger() {
  if (!fs.existsSync(ledgerPath)) return [];
  const parsed = readJson(ledgerPath);
  return Array.isArray(parsed.tests) ? parsed.tests : [];
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(tests, updatedAt) {
  const counts = { passed: 0, failed: 0, skipped: 0, flaky: 0 };
  for (const test of tests) counts[test.status] = (counts[test.status] || 0) + 1;
  const rows = tests
    .map(
      (test) => `<tr>
        <td><code>${escapeHtml(test.id)}</code></td>
        <td class="${escapeHtml(test.status)}">${escapeHtml(test.status)}</td>
        <td>${escapeHtml(test.title)}</td>
        <td><code>${escapeHtml(test.file)}</code></td>
        <td>${escapeHtml(test.updatedAt)}</td>
      </tr>`,
    )
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Test automation summary</title>
  <style>
    body { font-family: sans-serif; margin: 2rem; }
    td, th { border-bottom: 1px solid #ddd; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
    .passed { color: #067a34; font-weight: 700; }
    .failed { color: #b42318; font-weight: 700; }
    .skipped, .flaky { color: #9a6700; font-weight: 700; }
  </style>
</head>
<body>
  <h1>Test automation summary</h1>
  <p>Updated ${escapeHtml(updatedAt)}. Passed ${counts.passed}. Failed ${counts.failed}. Skipped ${counts.skipped}. Flaky ${counts.flaky}.</p>
  <p>This page keeps the last result for every test that has run on a pull request. A pull request updates only the tests it ran.</p>
  <table>
    <thead><tr><th>Id</th><th>Result</th><th>Title</th><th>File</th><th>Updated</th></tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

function renderMarkdown(tests, updatedAt) {
  const counts = { passed: 0, failed: 0, skipped: 0, flaky: 0 };
  for (const test of tests) counts[test.status] = (counts[test.status] || 0) + 1;
  const lines = [
    '# Test automation summary',
    '',
    `Updated ${updatedAt}.`,
    '',
    `Passed ${counts.passed}. Failed ${counts.failed}. Skipped ${counts.skipped}. Flaky ${counts.flaky}.`,
    '',
    'This page keeps the last result for every test that has run on a pull request. A pull request updates only the tests it ran.',
    '',
    '| Id | Result | Title | File | Updated |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const test of tests) {
    const cell = (value) => String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
    lines.push(
      `| ${cell(test.id)} | ${cell(test.status)} | ${cell(test.title)} | ${cell(test.file)} | ${cell(test.updatedAt)} |`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

if (!fs.existsSync(playwrightJsonPath)) {
  console.log(`No Playwright JSON at ${playwrightJsonPath}. Saved summary was left unchanged.`);
  process.exit(0);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

const report = readJson(playwrightJsonPath);
const fresh = [];
walk(report.suites, '', fresh);
if (fresh.length === 0) {
  console.log('Playwright JSON has no tests. Saved summary was left unchanged.');
  process.exit(0);
}

const updatedAt = new Date().toISOString();
const byId = new Map(readLedger().map((test) => [test.id, test]));
for (const test of fresh) {
  byId.set(test.id, { ...test, updatedAt });
}
const tests = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
fs.writeFileSync(ledgerPath, `${JSON.stringify({ updatedAt, tests }, null, 2)}\n`);
fs.writeFileSync(htmlPath, renderHtml(tests, updatedAt));
fs.writeFileSync(markdownPath, renderMarkdown(tests, updatedAt));
console.log(`Updated ${tests.length} saved results in ci-report/. This run changed ${fresh.length}.`);
