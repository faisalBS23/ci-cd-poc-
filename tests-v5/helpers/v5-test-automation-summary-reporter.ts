// A Playwright custom reporter that writes a clean, client-facing HTML summary

import type {
  Reporter, FullConfig, Suite, TestCase, FullResult,
} from '@playwright/test/reporter';
import * as fs from 'fs';
import * as path from 'path';

const TYPE_INDEX = 0;   // path segment used as "test type" (regression / e2e / smoke)
const MODULE_INDEX = 1; // path segment used as "module"    (hr / sales / planning ...)

type Status = 'passed' | 'failed' | 'flaky' | 'skipped';
type Bucket = { name: string; total: number; passed: number; failed: number; flaky: number; skipped: number };

interface Options {
  outputFile?: string; // where to write the HTML
  tcListOutputFile?: string; // plain-text TC list grouped by outcome + module
  title?: string;      // report heading
  version?: string;    // release/version label shown in the header (e.g. '1.0.0')
}

const TC_ID_RE = /^(TC-[A-Z0-9-]+)/;
const TC_IN_SPEC_RE = /^\s+test(?:\.(?:skip|fixme|only))?\(\s*['"`](TC-[A-Z0-9-]+)/gm;
const MODULE_DISPLAY_ORDER = ['HR', 'Settings', 'Customer', 'Planning', 'Invoice', 'Sales'];

type OutcomeBucket = 'passed' | 'failed' | 'skipped' | 'didntRun';
type TcLists = Record<OutcomeBucket, Map<string, string[]>>;

export default class TestAutomationSummaryReporter implements Reporter {
  private config!: FullConfig;
  private suite!: Suite;
  private started = Date.now();
  private opts: Options;

  constructor(opts: Options = {}) {
    this.opts = opts;
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.config = config;
    this.suite = suite;
    this.started = Date.now();
  }

  onEnd(result: FullResult) {
    const rootDir = this.config.rootDir;
    const records: { type: string; module: string; status: Status }[] = [];
    const projects = new Set<string>();

    for (const test of this.suite.allTests()) {
      const rel = path.relative(rootDir, test.location.file).replace(/\\/g, '/');
      const { type, module } = classify(rel);
      records.push({ type, module, status: outcomeToStatus(test) });
      const projName = test.titlePath()[1]; // ['', project, file, ...]
      if (projName) projects.add(projName);
    }

    const tcLists = buildTcLists(this.suite, rootDir);
    const agg = aggregate(records);
    const meta = {
      title: this.opts.title || 'Automated Test Summary',
      project: [...projects].join(', ') || '—',
      version: this.opts.version || '',
      date: new Date(this.started).toLocaleString(),
      durationMs: Date.now() - this.started,
      ok: result.status === 'passed',
      generatedAt: new Date().toISOString(),
    };
    const html = renderHtml({ meta, agg, tcLists });
    const textReport = renderTextReport({ meta, tcLists });

    // Resolve the output path the same way the built-in reporters do:
    // relative to the config file's directory (falls back to rootDir).
    const base = this.config.configFile ? path.dirname(this.config.configFile) : rootDir;
    const outFile = path.resolve(base, this.opts.outputFile || 'test-automation-summary.html');
    const tcListFile = path.resolve(
      base,
      this.opts.tcListOutputFile || '../../reports/v5/test-automation-tc-list.txt',
    );
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.mkdirSync(path.dirname(tcListFile), { recursive: true });
    fs.writeFileSync(outFile, html, 'utf8');
    fs.writeFileSync(tcListFile, textReport, 'utf8');
    // eslint-disable-next-line no-console
    console.log(`\n📄 Test automation summary written to ${outFile}`);
    // eslint-disable-next-line no-console
    console.log(`📋 TC list written to ${tcListFile}`);
  }
}

function outcomeToStatus(test: TestCase): Status {
  switch (test.outcome()) {
    case 'expected': return 'passed';
    case 'unexpected': return 'failed';
    case 'flaky': return 'flaky';
    default: return 'skipped';
  }
}

// Classify a test file path into a "type" and "module" based on its directory structure.
function classify(relFile: string): { type: string; module: string } {
  const parts = relFile.split('/').filter(Boolean);
  const dirs = parts.slice(0, -1);
  const type = dirs[TYPE_INDEX] ?? '(root)';
  const module = dirs[MODULE_INDEX] ?? type;
  return { type, module };
}

function extractTcId(title: string): string | null {
  const match = title.match(TC_ID_RE);
  return match ? match[1] : null;
}

/** Map TC id (or file path) to a client-facing module label. */
function tcModuleGroup(tcId: string, relFile: string): string {
  if (tcId.startsWith('TC-HR-')) return 'HR';
  if (tcId.startsWith('TC-SET-')) return 'Settings';
  if (tcId.startsWith('TC-SALES-')) return 'Customer';
  if (tcId.startsWith('TC-PLANNING-')) return 'Planning';
  if (tcId.startsWith('TC-INV-')) return 'Invoice';
  const { module } = classify(relFile);
  return label(module);
}

function emptyTcLists(): TcLists {
  return {
    passed: new Map(),
    failed: new Map(),
    skipped: new Map(),
    didntRun: new Map(),
  };
}

function addTcToList(lists: TcLists, bucket: OutcomeBucket, module: string, tcId: string) {
  const map = lists[bucket];
  if (!map.has(module)) map.set(module, []);
  const ids = map.get(module)!;
  if (!ids.includes(tcId)) ids.push(tcId);
}

function sortModules(modules: Iterable<string>): string[] {
  const all = [...modules];
  const rank = (name: string) => {
    const idx = MODULE_DISPLAY_ORDER.indexOf(name);
    return idx === -1 ? MODULE_DISPLAY_ORDER.length : idx;
  };
  return all.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

function scanSpecTcIds(testRoot: string): Set<string> {
  const ids = new Set<string>();
  if (!fs.existsSync(testRoot)) return ids;
  for (const file of walkSpecFiles(testRoot)) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(TC_IN_SPEC_RE)) {
      ids.add(match[1]);
    }
  }
  return ids;
}

function walkSpecFiles(dir: string): string[] {
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkSpecFiles(full));
    else if (ent.name.endsWith('.spec.ts')) out.push(full);
  }
  return out;
}

function outcomeToTcBucket(test: TestCase): OutcomeBucket {
  switch (test.outcome()) {
    case 'expected':
      return 'passed';
    case 'unexpected':
    case 'flaky':
      return 'failed';
    default:
      return 'skipped';
  }
}

function buildTcLists(suite: Suite, rootDir: string): TcLists {
  const lists = emptyTcLists();
  const discoveredTcIds = new Set<string>();

  for (const test of suite.allTests()) {
    const rel = path.relative(rootDir, test.location.file).replace(/\\/g, '/');
    const tcId = extractTcId(test.title);
    if (!tcId) continue;
    discoveredTcIds.add(tcId);
    const module = tcModuleGroup(tcId, rel);
    addTcToList(lists, outcomeToTcBucket(test), module, tcId);
  }

  const testRoot = fs.existsSync(path.join(rootDir, 'smoke'))
    ? rootDir
    : path.join(rootDir, 'tests');
  const sourceTcIds = scanSpecTcIds(testRoot);
  for (const tcId of sourceTcIds) {
    if (discoveredTcIds.has(tcId)) continue;
    const module = tcModuleGroup(tcId, '');
    addTcToList(lists, 'didntRun', module, tcId);
  }

  for (const bucket of Object.keys(lists) as OutcomeBucket[]) {
    for (const [mod, ids] of lists[bucket]) {
      ids.sort((a, b) => a.localeCompare(b));
      lists[bucket].set(mod, ids);
    }
  }

  return lists;
}

function countTcInLists(lists: TcLists, bucket: OutcomeBucket): number {
  let n = 0;
  for (const ids of lists[bucket].values()) n += ids.length;
  return n;
}

function renderTextReport({ meta, tcLists }: { meta: { title: string; date: string }; tcLists: TcLists }): string {
  const sections: { key: OutcomeBucket; title: string }[] = [
    { key: 'passed', title: 'Pass' },
    { key: 'failed', title: 'Fail' },
    { key: 'skipped', title: 'Skipped' },
    { key: 'didntRun', title: "Didn't Run" },
  ];
  const lines: string[] = [
    meta.title,
    `Run: ${meta.date}`,
    '',
  ];
  for (const { key, title } of sections) {
    lines.push(`${title}:`);
    const modules = sortModules(tcLists[key].keys());
    if (modules.length === 0) {
      lines.push('  (none)');
      lines.push('');
      continue;
    }
    for (const mod of modules) {
      lines.push(`${mod}:`);
      for (const tcId of tcLists[key].get(mod)!) {
        lines.push(tcId);
      }
    }
    lines.push('');
  }
  lines.push(
    `Totals — Pass: ${countTcInLists(tcLists, 'passed')} · Fail: ${countTcInLists(tcLists, 'failed')} · Skipped: ${countTcInLists(tcLists, 'skipped')} · Didn't Run: ${countTcInLists(tcLists, 'didntRun')}`,
  );
  return lines.join('\n');
}

function renderHtmlTcSection(tcLists: TcLists): string {
  const sections: { key: OutcomeBucket; title: string; cls: string }[] = [
    { key: 'passed', title: 'Pass', cls: 'pass' },
    { key: 'failed', title: 'Fail', cls: 'fail' },
    { key: 'skipped', title: 'Skipped', cls: 'skip' },
    { key: 'didntRun', title: "Didn't Run", cls: 'muted' },
  ];
  const blocks = sections.map(({ key, title, cls }) => {
    const modules = sortModules(tcLists[key].keys());
    if (modules.length === 0) {
      return `<details class="tc-bucket"><summary class="${cls}">${esc(title)} <span class="tc-count">(0)</span></summary><p class="muted tc-empty">None</p></details>`;
    }
    const body = modules.map((mod) => {
      const ids = tcLists[key].get(mod)!;
      const items = ids.map((id) => `<li><code>${esc(id)}</code></li>`).join('');
      return `<div class="tc-mod"><div class="tc-mod-name">${esc(mod)}</div><ul class="tc-ids">${items}</ul></div>`;
    }).join('');
    const count = countTcInLists(tcLists, key);
    return `<details class="tc-bucket"><summary class="${cls}">${esc(title)} <span class="tc-count">(${count})</span></summary>${body}</details>`;
  }).join('');
  return `<section class="tc-section"><h2>Test cases by outcome</h2>${blocks}</section>`;
}

const SPECIAL: Record<string, string> = { hr: 'HR', e2e: 'E2E', api: 'API', ui: 'UI' };
function label(token: string): string {
  if (!token) return '';
  const key = token.toLowerCase();
  if (SPECIAL[key]) return SPECIAL[key];
  if (token.length <= 3) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function emptyBucket(name: string): Bucket {
  return { name, total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0 };
}
function add(b: Bucket, s: Status) { b.total += 1; (b as any)[s] += 1; }
function passRate(b: Bucket): number | null {
  const run = b.passed + b.failed + b.flaky;
  return run === 0 ? null : b.passed / run;
}
function aggregate(records: { type: string; module: string; status: Status }[]) {
  const totals = emptyBucket('All');
  const byModule = new Map<string, Bucket>();
  const byType = new Map<string, Bucket>();
  for (const r of records) {
    add(totals, r.status);
    const m = r.module || '(none)';
    if (!byModule.has(m)) byModule.set(m, emptyBucket(m));
    add(byModule.get(m)!, r.status);
    const t = r.type || '(none)';
    if (!byType.has(t)) byType.set(t, emptyBucket(t));
    add(byType.get(t)!, r.status);
  }
  const byName = (a: Bucket, b: Bucket) => a.name.localeCompare(b.name);
  return { totals, modules: [...byModule.values()].sort(byName), types: [...byType.values()].sort(byName) };
}

function fmtDuration(ms: number): string {
  if (!ms || ms < 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${(ms / 3_600_000).toFixed(1)}h (${h}h ${m % 60}m)`;
}
function esc(s: any): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
function toneOf(r: number) { return r >= 0.95 ? 'good' : r >= 0.8 ? 'warn' : 'bad'; }
function toneColor(r: number) { return r >= 0.95 ? 'var(--pass)' : r >= 0.8 ? 'var(--skip)' : 'var(--fail)'; }
function bar(r: number | null): string {
  if (r === null) return '<span class="muted">—</span>';
  const p = (r * 100).toFixed(1);
  return `<div class="ratecell"><div class="bar"><div class="bar-fill ${toneOf(r)}" style="width:${p}%"></div></div><span class="bar-num">${p}%</span></div>`;
}
function donut(r: number | null): string {
  const C = 2 * Math.PI * 45;
  const len = r === null ? 0 : r * C;
  const color = r === null ? '#ccd2dc' : toneColor(r);
  const txt = r === null ? '—' : (r * 100).toFixed(1) + '%';
  return `<svg width="108" height="108" viewBox="0 0 108 108" class="donut" role="img" aria-label="Overall pass rate ${txt}">
    <circle cx="54" cy="54" r="45" fill="none" stroke="#eceff5" stroke-width="12"/>
    <circle cx="54" cy="54" r="45" fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" transform="rotate(-90 54 54)"/>
    <text x="54" y="52" text-anchor="middle" font-size="21" font-weight="700" fill="#1c2230">${txt}</text>
    <text x="54" y="67" text-anchor="middle" font-size="8.5" letter-spacing="1" fill="#7a8496">PASS RATE</text>
  </svg>`;
}
function rows(buckets: Bucket[], firstCol: string): string {
  const anyFlaky = buckets.some((b) => b.flaky > 0);
  const head = `<tr><th class="l">${firstCol}</th><th>Total</th><th>Passed</th><th>Failed</th>${anyFlaky ? '<th>Flaky</th>' : ''}<th>Skipped</th><th class="rate">Pass rate</th></tr>`;
  const body = buckets.map((b) => `<tr>
      <td class="l">${esc(label(b.name))}</td>
      <td>${b.total}</td>
      <td class="pass">${b.passed || '<span class="muted">0</span>'}</td>
      <td class="${b.failed ? 'fail' : ''}">${b.failed || '<span class="muted">0</span>'}</td>
      ${anyFlaky ? `<td class="${b.flaky ? 'flakyc' : ''}">${b.flaky || '<span class="muted">0</span>'}</td>` : ''}
      <td class="${b.skipped ? 'skip' : ''}">${b.skipped || '<span class="muted">0</span>'}</td>
      <td class="rate">${bar(passRate(b))}</td></tr>`).join('\n');
  return `<thead>${head}</thead><tbody>${body}</tbody>`;
}
function renderHtml({ meta, agg, tcLists }: { meta: any; agg: ReturnType<typeof aggregate>; tcLists: TcLists }): string {
  const t = agg.totals;
  const pdfName = (String((meta.title || 'test-summary') + (meta.version ? '-' + meta.version : ''))
    .replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'test-summary');
  const executed = t.passed + t.failed + t.flaky;
  const overall = passRate(t);
  const anyFlaky = agg.modules.some((b) => b.flaky > 0);
  const stat = (n: number, l: string, cls = '') => `<div class="stat ${cls}"><div class="n">${n}</div><div class="s">${l}</div></div>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(meta.title)} — Test Summary</title>
<style>
  :root{--ink:#1c2230;--muted:#7a8496;--line:#e6e9ef;--bg:#fff;--panel:#f7f8fb;
    --pass:#158f5a;--fail:#d1373a;--skip:#c07f14;--flaky:#8a5cf0;}
  *{box-sizing:border-box}
  body{margin:0;background:#eef1f6;color:var(--ink);
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
    font:15px/1.55 "Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
  .head-right{display:flex;flex-direction:column;align-items:flex-end;gap:14px}
  .pdf-btn{background:#2b59d8;color:#fff;border:none;border-radius:8px;padding:9px 14px;font:600 13px/1 inherit;
    cursor:pointer;display:inline-flex;align-items:center;gap:7px;box-shadow:0 1px 2px rgba(20,30,60,.12);transition:background .12s}
  .pdf-btn:hover{background:#244fc4}.pdf-btn:active{transform:translateY(1px)}
  .pdf-btn svg{width:15px;height:15px;display:block}
  .wrap{max-width:960px;margin:32px auto;padding:0 20px}
  .card{background:var(--bg);border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 2px rgba(20,30,60,.04);overflow:hidden}
  header.head{padding:26px 28px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap}
  .title{font-size:22px;font-weight:700;letter-spacing:-.01em;margin:0}
  .sub{color:var(--muted);font-size:13px;margin-top:4px}
  .meta{text-align:right;color:var(--muted);font-size:13px;line-height:1.7}
  .meta b{color:var(--ink)}
  .headline{padding:24px 28px;display:flex;align-items:center;gap:26px;flex-wrap:wrap;border-bottom:1px solid var(--line)}
  .donut{flex:0 0 auto}
  .headtext{flex:1 1 260px}
  .headtext .big{font-size:15px;color:var(--muted)}
  .headtext .big b{color:var(--ink);font-size:17px}
  .stats{display:flex;border-bottom:1px solid var(--line)}
  .stat{flex:1 1 0;padding:18px 20px;border-left:1px solid var(--line)}
  .stat:first-child{border-left:none}
  .stat .n{font-size:24px;font-weight:750;letter-spacing:-.02em}
  .stat .s{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
  .stat.pass .n{color:var(--pass)}.stat.fail .n{color:var(--fail)}.stat.skip .n{color:var(--skip)}
  section{padding:22px 28px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:0 0 12px;font-weight:700}
  table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
  th,td{padding:10px 12px;text-align:right;border-bottom:1px solid var(--line);font-size:14px}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);font-weight:700}
  th.l,td.l{text-align:left}
  td.l{font-weight:600}
  tbody tr:last-child td{border-bottom:none}
  tbody tr:hover{background:var(--panel)}
  td.pass{color:var(--pass);font-weight:600}
  td.fail{color:var(--fail);font-weight:700}
  td.skip{color:var(--skip);font-weight:600}
  td.flakyc{color:var(--flaky);font-weight:600}
  .muted{color:#c2c8d2}
  th.rate,td.rate{width:180px}
  .ratecell{display:flex;align-items:center;gap:10px;justify-content:flex-end}
  .bar{flex:1 1 auto;background:#eef1f6;border-radius:6px;height:9px;overflow:hidden;min-width:70px}
  .bar-fill{height:100%;border-radius:6px}
  .bar-fill.good{background:var(--pass)}.bar-fill.warn{background:var(--skip)}.bar-fill.bad{background:var(--fail)}
  .bar-num{flex:0 0 auto;font-size:12px;font-weight:700;color:var(--ink);min-width:44px;text-align:right}
  tfoot td{font-weight:700;border-top:2px solid var(--line);background:var(--panel)}
  footer{padding:16px 28px;color:var(--muted);font-size:12px;border-top:1px solid var(--line)}
  .tc-section{border-top:1px solid var(--line)}
  .tc-bucket{margin-bottom:12px;border:1px solid var(--line);border-radius:10px;overflow:hidden}
  .tc-bucket summary{padding:12px 16px;cursor:pointer;font-weight:700;list-style:none;background:var(--panel)}
  .tc-bucket summary::-webkit-details-marker{display:none}
  .tc-count{font-weight:600;color:var(--muted);font-size:13px}
  .tc-mod{padding:8px 16px 4px;border-top:1px solid var(--line)}
  .tc-mod-name{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin-bottom:6px}
  .tc-ids{margin:0 0 8px;padding-left:18px;font-size:13px;line-height:1.6}
  .tc-ids code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px}
  .tc-empty{padding:12px 16px;margin:0}
  @media screen and (max-width:640px){.stats{flex-wrap:wrap}.stat{flex:1 1 45%}th.rate,td.rate{display:none}}
  @media print{@page{margin:14mm}body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .pdf-btn{display:none !important}.card{border:none;box-shadow:none}.wrap{margin:0;max-width:none}tbody tr:hover{background:none}}
</style></head>
<body>
<div class="wrap"><div class="card">
  <header class="head">
    <div><h1 class="title">${esc(meta.title)}</h1>
      <div class="sub">Project: ${esc(meta.project)}${meta.version ? ' &middot; Version ' + esc(meta.version) : ''}</div></div>
    <div class="head-right">
      <button class="pdf-btn" type="button" onclick="downloadPdf()" aria-label="Download PDF"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M4 21h16"/></svg>Download PDF</button>
      <div class="meta">
        <div>Run: <b>${esc(meta.date)}</b></div>
        <div>Duration: <b>${esc(fmtDuration(meta.durationMs))}</b></div>
        <div>Result: <b style="color:${meta.ok ? 'var(--pass)' : 'var(--fail)'}">${meta.ok ? 'PASSED' : 'FAILED'}</b></div>
      </div>
    </div>
  </header>
  <div class="headline">${donut(overall)}
    <div class="headtext">
      <div class="big"><b>${executed}</b> test cases executed across <b>${agg.modules.length}</b> modules.</div>
      <div class="big" style="margin-top:6px">${t.passed} passed · ${t.failed} failed${t.flaky ? ' · ' + t.flaky + ' flaky' : ''} · ${t.skipped} skipped (not run)</div>
    </div>
  </div>
  <div class="stats">
    ${stat(t.total, 'Total cases')}${stat(t.passed, 'Passed', 'pass')}${stat(t.failed, 'Failed', 'fail')}${stat(t.skipped, 'Skipped', 'skip')}
  </div>
  <section><h2>Results by module</h2><table>${rows(agg.modules, 'Module')}
    <tfoot><tr><td class="l">Total</td><td>${t.total}</td><td class="pass">${t.passed}</td><td class="fail">${t.failed}</td>${anyFlaky ? `<td>${t.flaky}</td>` : ''}<td class="skip">${t.skipped}</td><td class="rate">${bar(overall)}</td></tr></tfoot>
  </table></section>
  <section style="border-top:1px solid var(--line)"><h2>Results by test type</h2><table>${rows(agg.types, 'Test type')}</table></section>
  ${renderHtmlTcSection(tcLists)}
  <footer>Pass rate = passed ÷ executed (skipped cases excluded). Generated ${esc(meta.generatedAt)}. TC list also written as plain text alongside this report.</footer>
</div></div>
<script>function downloadPdf(){var p=document.title;document.title=${JSON.stringify(pdfName)};var r=function(){document.title=p;window.removeEventListener('afterprint',r);};window.addEventListener('afterprint',r);window.print();}</script>
</body></html>`;
}

// ─── Shard JSON merge (used after parallel --shard runs) ───────────────────

interface JsonResult {
  status?: string;
}

interface JsonTest {
  results?: JsonResult[];
}

interface JsonSpec {
  title?: string;
  file?: string;
  tests?: JsonTest[];
}

interface JsonSuite {
  title?: string;
  file?: string;
  specs?: JsonSpec[];
  suites?: JsonSuite[];
}

interface JsonReport {
  stats?: { duration?: number; expected?: number; unexpected?: number; skipped?: number; flaky?: number };
  suites?: JsonSuite[];
}

export interface MergeShardOptions {
  shardJsonPaths: string[];
  testRoot: string;
  outputHtml: string;
  outputTcList: string;
  title?: string;
  startedAt?: number;
}

function statusFromJsonResult(status: string | undefined): Status {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
    case 'timedOut':
    case 'interrupted':
      return 'failed';
    case 'flaky':
      return 'flaky';
    default:
      return 'skipped';
  }
}

function walkJsonSuites(
  suites: JsonSuite[] | undefined,
  cb: (file: string, title: string, status: Status) => void,
) {
  if (!suites) return;
  for (const suite of suites) {
    const suiteFile = suite.file || '';
    for (const spec of suite.specs || []) {
      const file = spec.file || suiteFile;
      for (const test of spec.tests || []) {
        const title = spec.title || '';
        const result = test.results?.[test.results.length - 1];
        cb(file, title, statusFromJsonResult(result?.status));
      }
    }
    walkJsonSuites(suite.suites, cb);
  }
}

function mergeTcListsFromRecords(
  records: { file: string; title: string; status: Status }[],
  testRoot: string,
): TcLists {
  const lists = emptyTcLists();
  const discoveredTcIds = new Set<string>();

  for (const { file, title, status } of records) {
    const tcId = extractTcId(title);
    if (!tcId) continue;
    discoveredTcIds.add(tcId);
    const rel = file.replace(/\\/g, '/');
    const module = tcModuleGroup(tcId, rel);
    const bucket: OutcomeBucket =
      status === 'passed' ? 'passed' : status === 'failed' || status === 'flaky' ? 'failed' : 'skipped';
    addTcToList(lists, bucket, module, tcId);
  }

  const sourceTcIds = scanSpecTcIds(testRoot);
  for (const tcId of sourceTcIds) {
    if (discoveredTcIds.has(tcId)) continue;
    addTcToList(lists, 'didntRun', tcModuleGroup(tcId, ''), tcId);
  }

  for (const bucket of Object.keys(lists) as OutcomeBucket[]) {
    for (const [mod, ids] of lists[bucket]) {
      ids.sort((a, b) => a.localeCompare(b));
      lists[bucket].set(mod, ids);
    }
  }
  return lists;
}

export function mergeV5ShardReportsFromJson(opts: MergeShardOptions): void {
  const records: { type: string; module: string; status: Status }[] = [];
  const jsonRecords: { file: string; title: string; status: Status }[] = [];
  let totalDurationMs = 0;
  let totalExpected = 0;
  let totalUnexpected = 0;
  let totalSkipped = 0;
  let totalFlaky = 0;

  for (const jsonPath of opts.shardJsonPaths) {
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`Missing shard JSON: ${jsonPath}`);
    }
    const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as JsonReport;
    totalDurationMs += report.stats?.duration ?? 0;
    totalExpected += report.stats?.expected ?? 0;
    totalUnexpected += report.stats?.unexpected ?? 0;
    totalSkipped += report.stats?.skipped ?? 0;
    totalFlaky += report.stats?.flaky ?? 0;

    walkJsonSuites(report.suites, (file, title, status) => {
      const rel = file.replace(/\\/g, '/');
      const parts = rel.split('/').filter(Boolean);
      const typeIdx = parts.indexOf('tests') >= 0 ? parts.indexOf('tests') + 1 : 0;
      const type = parts[typeIdx] ?? '(root)';
      const module = parts[typeIdx + 1] ?? type;
      records.push({ type, module, status });
      jsonRecords.push({ file: rel, title, status });
    });
  }

  const agg = aggregate(records);
  const tcLists = mergeTcListsFromRecords(jsonRecords, opts.testRoot);
  const started = opts.startedAt ?? Date.now();
  const meta = {
    title: opts.title || 'Test Automation Report',
    project: 'v5-chromium (4 shards merged)',
    version: '',
    date: new Date(started).toLocaleString(),
    durationMs: totalDurationMs,
    ok: totalUnexpected === 0 && totalFlaky === 0,
    generatedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(opts.outputHtml), { recursive: true });
  fs.mkdirSync(path.dirname(opts.outputTcList), { recursive: true });
  fs.writeFileSync(opts.outputHtml, renderHtml({ meta, agg, tcLists }), 'utf8');
  fs.writeFileSync(opts.outputTcList, renderTextReport({ meta, tcLists }), 'utf8');

  const statusPath = path.join(path.dirname(opts.outputHtml), 'overnight-run-status.txt');
  fs.writeFileSync(
    statusPath,
    [
      'V5 overnight sharded run — MERGED',
      `Completed: ${meta.generatedAt}`,
      `Shard JSON files: ${opts.shardJsonPaths.length}`,
      `Total cases (merged): ${agg.totals.total}`,
      `Passed: ${agg.totals.passed}`,
      `Failed: ${agg.totals.failed}`,
      `Skipped: ${agg.totals.skipped}`,
      `Flaky: ${agg.totals.flaky}`,
      `Duration (sum of shards): ${fmtDuration(totalDurationMs)}`,
      `HTML: ${opts.outputHtml}`,
      `TC list: ${opts.outputTcList}`,
    ].join('\n'),
    'utf8',
  );

  // eslint-disable-next-line no-console
  console.log(`\n✅ Merged ${opts.shardJsonPaths.length} shards → ${opts.outputHtml}`);
  // eslint-disable-next-line no-console
  console.log(`   Total: ${agg.totals.total} | Pass: ${agg.totals.passed} | Fail: ${agg.totals.failed} | Skip: ${agg.totals.skipped}`);
}

export type SavedSummaryTest = {
  id: string;
  title: string;
  status: Status;
  file: string;
  updatedAt: string;
};

const SAVED_LEDGER_RE =
  /<script type="application\/json" id="saved-summary-ledger">([\s\S]*?)<\/script>/;

/** Read the last saved results hidden inside the custom summary page. */
export function readSavedSummaryLedger(html: string): SavedSummaryTest[] {
  const match = html.match(SAVED_LEDGER_RE);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]) as unknown;
    return Array.isArray(parsed) ? (parsed as SavedSummaryTest[]) : [];
  } catch {
    return [];
  }
}

function reportPath(file: string): string {
  const parts = file.replace(/\\/g, '/').split('/').filter(Boolean);
  const testsAt = parts.indexOf('tests');
  return (testsAt >= 0 ? parts.slice(testsAt + 1) : parts).join('/');
}

function statusFromPlaywright(status: string | undefined): Status {
  if (status === 'passed') return 'passed';
  if (status === 'failed' || status === 'timedOut' || status === 'interrupted') return 'failed';
  if (status === 'flaky') return 'flaky';
  return 'skipped';
}

function collectPlaywrightTests(report: JsonReport, updatedAt: string): SavedSummaryTest[] {
  const found: SavedSummaryTest[] = [];
  const walk = (suites: JsonSuite[] | undefined, inheritedFile: string) => {
    for (const suite of suites || []) {
      const suiteFile = suite.file || inheritedFile;
      for (const spec of suite.specs || []) {
        const specFile = spec.file || suiteFile;
        for (const test of spec.tests || []) {
          const result = test.results?.[test.results.length - 1];
          const title = spec.title || '';
          const id = extractTcId(title) || title;
          if (!id) continue;
          found.push({
            id,
            title,
            status: statusFromPlaywright(result?.status),
            file: reportPath(specFile),
            updatedAt,
          });
        }
      }
      walk(suite.suites, suiteFile);
    }
  };
  walk(report.suites, '');
  return found;
}

function tcBucketForStatus(status: Status): OutcomeBucket {
  if (status === 'passed') return 'passed';
  if (status === 'failed' || status === 'flaky') return 'failed';
  return 'skipped';
}

/** One result file per test, so two branches can add different tests without a merge conflict. */
export function savedResultFileName(id: string): string {
  const safe = id.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^\.+/, '');
  if (!safe) throw new Error(`Test id cannot be saved as a file name: ${id}`);
  return `${safe}.json`;
}

export function readSavedResultDir(dir: string): SavedSummaryTest[] {
  if (!dir || !fs.existsSync(dir)) return [];
  const tests: SavedSummaryTest[] = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    const raw = fs.readFileSync(path.join(dir, name), 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw) as SavedSummaryTest;
    if (!parsed || typeof parsed.id !== 'string' || !parsed.id) continue;
    tests.push(parsed);
  }
  return tests;
}

/** Later groups replace the same test id. */
export function mergeSavedResults(...groups: SavedSummaryTest[][]): SavedSummaryTest[] {
  const byId = new Map<string, SavedSummaryTest>();
  for (const group of groups) {
    for (const test of group) {
      if (!test?.id) continue;
      byId.set(test.id, { ...test, file: reportPath(test.file || '') });
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function writeSavedResultFiles(dir: string, tests: SavedSummaryTest[]): string[] {
  fs.mkdirSync(dir, { recursive: true });
  return tests.map((test) => {
    const file = path.join(dir, savedResultFileName(test.id));
    const stored = { ...test, file: reportPath(test.file || '') };
    fs.writeFileSync(file, `${JSON.stringify(stored, null, 2)}\n`);
    return file;
  });
}

export function testsFromPlaywrightJson(report: JsonReport, updatedAt = new Date().toISOString()): SavedSummaryTest[] {
  return collectPlaywrightTests(report, updatedAt);
}

/**
 * Rewrite the custom summary page from a full set of saved results.
 * Tests that did not run in the latest job stay on the page.
 */
export function renderSavedSummary(opts: {
  tests: SavedSummaryTest[];
  outputHtml: string;
  title?: string;
  durationMs?: number;
}): { total: number } {
  const tests = mergeSavedResults(opts.tests);
  const updatedAt = new Date().toISOString();
  const records = tests.map((test) => {
    const { type, module } = classify(reportPath(test.file));
    return { type, module, status: test.status };
  });
  const tcLists = emptyTcLists();
  for (const test of tests) {
    if (!extractTcId(test.id)) continue;
    addTcToList(tcLists, tcBucketForStatus(test.status), tcModuleGroup(test.id, test.file), test.id);
  }
  for (const bucket of Object.keys(tcLists) as OutcomeBucket[]) {
    for (const [mod, ids] of tcLists[bucket]) {
      ids.sort((a, b) => a.localeCompare(b));
      tcLists[bucket].set(mod, ids);
    }
  }

  const agg = aggregate(records);
  const failed = tests.some((test) => test.status === 'failed' || test.status === 'flaky');
  const html = renderHtml({
    meta: {
      title: opts.title || 'Test Automation Report',
      project: 'v5-chromium',
      version: '',
      date: new Date().toLocaleString(),
      durationMs: opts.durationMs ?? 0,
      ok: !failed,
      generatedAt: updatedAt,
    },
    agg,
    tcLists,
  });
  const ledger = JSON.stringify(tests).replace(/</g, '\\u003c');
  const withLedger = html.replace(
    '</body>',
    `<script type="application/json" id="saved-summary-ledger">${ledger}</script></body>`,
  );
  fs.mkdirSync(path.dirname(opts.outputHtml), { recursive: true });
  fs.writeFileSync(opts.outputHtml, withLedger, 'utf8');
  return { total: tests.length };
}

/**
 * Rewrite the custom summary page from the previous saved results plus this run.
 * Tests that did not run keep their last pass or fail.
 */
export function writeCumulativeSummary(opts: {
  previous: SavedSummaryTest[];
  playwrightJson: JsonReport;
  outputHtml: string;
  title?: string;
}): { total: number; updated: number } {
  const fresh = testsFromPlaywrightJson(opts.playwrightJson);
  const tests = mergeSavedResults(opts.previous, fresh);
  const rendered = renderSavedSummary({
    tests,
    outputHtml: opts.outputHtml,
    title: opts.title,
    durationMs: opts.playwrightJson.stats?.duration ?? 0,
  });
  return { total: rendered.total, updated: fresh.length };
}
