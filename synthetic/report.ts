/**
 * DoseBand — Synthetic Validation Report Generator
 *
 * Takes SuiteResults and produces a self-contained HTML report
 * suitable for pharmacist review and IRB submission.
 */

import { SuiteResults } from "./runner";
import { getDrug } from "../src/formulary";

export function generateHTMLReport(results: SuiteResults): string {
  const {
    totalCases, totalPassed, totalFailed, passRate, durationMs,
    failures, monotonicityResults, monotonicityPassed, monotonicityFailed,
    flagStats, bandStats, categoryBreakdown, drugBreakdown, generatedAt,
  } = results;

  const statusColor = totalFailed === 0 ? "#4dbe8a" : "#e05c5c";
  const statusLabel = totalFailed === 0 ? "ALL TESTS PASSED" : `${totalFailed} FAILURES`;
  const monoColor = monotonicityFailed === 0 ? "#4dbe8a" : "#e05c5c";

  const failureRows = failures.slice(0, 50).map(f => `
    <tr>
      <td><code>${f.patient.id}</code></td>
      <td>${f.drugKey}</td>
      <td>${f.patient.category}</td>
      <td class="violation">${f.violations.join("<br>")}</td>
    </tr>
  `).join("");

  const monoRows = monotonicityResults.map(m => `
    <tr class="${m.passed ? "pass-row" : "fail-row"}">
      <td>${m.passed ? "✓" : "✗"}</td>
      <td>${m.check.name}</td>
      <td>${m.baseDose.toFixed(1)}</td>
      <td>${m.perturbedDose.toFixed(1)}</td>
      <td>${m.check.assertion}</td>
      <td>${m.violation || "—"}</td>
    </tr>
  `).join("");

  const flagRows = flagStats.map(f => `
    <tr>
      <td><code>${f.code}</code></td>
      <td>${f.count.toLocaleString()}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:${Math.min(f.pct*3, 200)}px;height:6px;background:#4dbe8a;border-radius:3px;opacity:0.7"></div>
          ${f.pct}%
        </div>
      </td>
    </tr>
  `).join("");

  const drugRows = Object.entries(drugBreakdown).map(([key, stats]) => {
    const drug = getDrug(key);
    const pct = ((stats.passed / stats.total) * 100).toFixed(1);
    const ok = stats.passed === stats.total;
    return `
      <tr>
        <td>${drug.name}</td>
        <td>${drug.category}</td>
        <td>${stats.total.toLocaleString()}</td>
        <td style="color:${ok ? "#4dbe8a" : "#e05c5c"}">${stats.passed.toLocaleString()}</td>
        <td style="color:${ok ? "#4dbe8a" : "#e05c5c"}">${stats.total - stats.passed}</td>
        <td style="color:${ok ? "#4dbe8a" : "#e05c5c"}">${pct}%</td>
      </tr>
    `;
  }).join("");

  const bandRows = bandStats.map(b => {
    const total = Object.values(b.bands).reduce((s, n) => s + n, 0);
    const cells = Object.entries(b.bands).sort((a, b2) => a[0].localeCompare(b2[0])).map(([label, count]) => {
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
      return `<td>Band ${label}: ${count} (${pct}%)</td>`;
    }).join("");
    return `<tr><td>${b.drugName}</td>${cells}</tr>`;
  }).join("");

  const catRows = Object.entries(categoryBreakdown).map(([cat, stats]) => {
    const pct = ((stats.passed / stats.total) * 100).toFixed(2);
    const ok = stats.passed === stats.total;
    return `
      <tr>
        <td>${cat}</td>
        <td>${stats.total.toLocaleString()}</td>
        <td style="color:${ok ? "#4dbe8a" : "#e05c5c"}">${stats.passed.toLocaleString()}</td>
        <td style="color:${ok ? "#4dbe8a" : "#e05c5c"}">${stats.total - stats.passed}</td>
        <td style="color:${ok ? "#4dbe8a" : "#e05c5c"}">${pct}%</td>
      </tr>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DoseBand — Synthetic Validation Report</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #0d0f0e; --bg2: #141716; --bg3: #1c1f1d;
    --line: #2e3330; --muted: #6b7570; --dim: #8f9c96;
    --body: #c8d4ce; --head: #e8f0ec;
    --green: #4dbe8a; --amber: #e8a94a; --red: #e05c5c; --blue: #5a9fd4;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--body); font-family: 'DM Sans', sans-serif; font-size: 13px; line-height: 1.6; padding: 40px; max-width: 1100px; margin: 0 auto; }
  h1 { font-size: 22px; font-weight: 300; color: var(--head); margin-bottom: 4px; font-family: 'DM Mono', monospace; letter-spacing: 0.02em; }
  h2 { font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); font-family: 'DM Mono', monospace; margin: 32px 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
  p { color: var(--dim); margin-bottom: 8px; }
  code { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--amber); }
  .meta { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); margin-bottom: 32px; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 32px; }
  .stat-card { background: var(--bg2); border: 1px solid var(--line); border-radius: 8px; padding: 16px 18px; }
  .stat-val { font-family: 'DM Mono', monospace; font-size: 28px; font-weight: 500; margin-bottom: 4px; }
  .stat-lbl { font-size: 11px; color: var(--muted); font-family: 'DM Mono', monospace; letter-spacing: 0.06em; text-transform: uppercase; }
  .status-banner { background: var(--bg2); border: 1px solid var(--line); border-radius: 8px; padding: 20px 24px; margin-bottom: 32px; display: flex; align-items: center; gap: 16px; }
  .status-light { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; background: ${statusColor}; }
  .status-text { font-family: 'DM Mono', monospace; font-size: 14px; font-weight: 500; color: ${statusColor}; }
  .status-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
  th { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--line); font-weight: 500; }
  td { padding: 8px 12px; border-bottom: 1px solid var(--line); color: var(--body); vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: var(--bg2); }
  .pass-row td { color: var(--green); }
  .fail-row td { color: var(--red); }
  .violation { color: var(--red); font-family: 'DM Mono', monospace; font-size: 11px; }
  .disclaimer { background: #1a1200; border: 1px solid #5c3d10; border-radius: 8px; padding: 16px 20px; margin-top: 32px; }
  .disclaimer p { color: var(--amber); font-size: 12px; }
  .disclaimer strong { color: var(--amber); }
  @media print { body { background: white; color: black; padding: 20px; } }
</style>
</head>
<body>

<h1>DoseBand — Synthetic Patient Validation Report</h1>
<div class="meta">Generated: ${generatedAt} &nbsp;|&nbsp; Duration: ${(durationMs / 1000).toFixed(2)}s &nbsp;|&nbsp; Engine version: 1.0.0</div>

<div class="status-banner">
  <div class="status-light"></div>
  <div>
    <div class="status-text">${statusLabel}</div>
    <div class="status-sub">${totalPassed.toLocaleString()} / ${totalCases.toLocaleString()} cases passed &nbsp;·&nbsp; ${passRate}% pass rate &nbsp;·&nbsp; ${monotonicityPassed}/${monotonicityPassed + monotonicityFailed} monotonicity checks</div>
  </div>
</div>

<div class="summary-grid">
  <div class="stat-card">
    <div class="stat-val" style="color:var(--head)">${totalCases.toLocaleString()}</div>
    <div class="stat-lbl">Total test cases</div>
  </div>
  <div class="stat-card">
    <div class="stat-val" style="color:${statusColor}">${totalPassed.toLocaleString()}</div>
    <div class="stat-lbl">Passed</div>
  </div>
  <div class="stat-card">
    <div class="stat-val" style="color:${totalFailed > 0 ? "var(--red)" : "var(--muted)"}">${totalFailed}</div>
    <div class="stat-lbl">Failed</div>
  </div>
  <div class="stat-card">
    <div class="stat-val" style="color:${monoColor}">${monotonicityPassed}</div>
    <div class="stat-lbl">Monotonicity checks</div>
  </div>
</div>

<h2>Test category breakdown</h2>
<table>
  <thead><tr><th>Category</th><th>Cases</th><th>Passed</th><th>Failed</th><th>Pass rate</th></tr></thead>
  <tbody>${catRows}</tbody>
</table>

<h2>Per-drug results</h2>
<table>
  <thead><tr><th>Drug</th><th>Category</th><th>Cases</th><th>Passed</th><th>Failed</th><th>Pass rate</th></tr></thead>
  <tbody>${drugRows}</tbody>
</table>

<h2>Monotonicity checks — clinical invariants</h2>
<p>Verifies that doses respond correctly to changes in patient parameters.</p>
<table>
  <thead><tr><th>Pass</th><th>Check</th><th>Base dose (mg)</th><th>Perturbed dose (mg)</th><th>Expected</th><th>Violation</th></tr></thead>
  <tbody>${monoRows}</tbody>
</table>

<h2>Clinical flag frequency</h2>
<p>How often each flag fires across all ${totalCases.toLocaleString()} test cases.</p>
<table>
  <thead><tr><th>Flag code</th><th>Count</th><th>Frequency</th></tr></thead>
  <tbody>${flagRows}</tbody>
</table>

<h2>Band distribution by drug</h2>
<p>Distribution of synthetic patients across dose bands.</p>
<table>
  <thead><tr><th>Drug</th><th colspan="10">Band distribution</th></tr></thead>
  <tbody>${bandRows}</tbody>
</table>

${failures.length > 0 ? `
<h2>Failure details (first ${Math.min(failures.length, 50)} of ${failures.length})</h2>
<table>
  <thead><tr><th>Patient ID</th><th>Drug</th><th>Category</th><th>Violation</th></tr></thead>
  <tbody>${failureRows}</tbody>
</table>
` : `
<h2>Failures</h2>
<p style="color:var(--green)">✓ No failures. All ${totalCases.toLocaleString()} test cases passed all 9 invariants.</p>
`}

<div class="disclaimer">
  <p><strong>Important — pre-clinical validation only.</strong> This report confirms that the DoseBand calculation engine is internally consistent and satisfies formal clinical invariants across ${totalCases.toLocaleString()} synthetic patient scenarios. It does <strong>not</strong> constitute clinical validation. All drug parameters must be reviewed and approved by a qualified clinical pharmacist. IRB approval and a prospective clinical study are required before use with real patients in any healthcare setting.</p>
</div>

</body>
</html>`;
}