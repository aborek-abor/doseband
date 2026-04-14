/**
 * DoseBand — Synthetic Validation Suite Entry Point
 *
 * Usage:
 *   npx ts-node synthetic/run.ts           # 2000 random patients (default)
 *   npx ts-node synthetic/run.ts --n 5000  # custom random patient count
 *   npx ts-node synthetic/run.ts --fast    # 500 random patients (quick check)
 */

import * as fs from "fs";
import * as path from "path";
import { runSuite } from "./runner";
import { generateHTMLReport } from "./report";

const args = process.argv.slice(2);
let randomN = 2000;

if (args.includes("--fast")) randomN = 500;
if (args.includes("--n")) {
  const idx = args.indexOf("--n");
  randomN = parseInt(args[idx + 1]) || 2000;
}

console.log("\n┌─────────────────────────────────────────────┐");
console.log("│  DoseBand Synthetic Patient Validation Suite │");
console.log("└─────────────────────────────────────────────┘\n");
console.log(`  Random patients:  ${randomN.toLocaleString()}`);
console.log(`  Drugs tested:     13`);
console.log(`  Invariants:       9 per case`);
console.log("");
console.log("  Running...\n");

const startTime = Date.now();
const results = runSuite(randomN);
const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

const passColor = results.totalFailed === 0 ? "\x1b[32m" : "\x1b[31m";
const reset = "\x1b[0m";
const dim = "\x1b[2m";
const bold = "\x1b[1m";

console.log(`  ${bold}Results${reset}`);
console.log(`  ─────────────────────────────────────────────`);
console.log(`  Total cases:      ${bold}${results.totalCases.toLocaleString()}${reset}`);
console.log(`  Passed:           ${passColor}${bold}${results.totalPassed.toLocaleString()}${reset}`);
console.log(`  Failed:           ${results.totalFailed > 0 ? "\x1b[31m" : dim}${results.totalFailed}${reset}`);
console.log(`  Pass rate:        ${passColor}${bold}${results.passRate}%${reset}`);
console.log(`  Duration:         ${dim}${totalTime}s${reset}`);
console.log("");
console.log(`  Monotonicity:     ${results.monotonicityFailed === 0 ? "\x1b[32m" : "\x1b[31m"}${results.monotonicityPassed} passed, ${results.monotonicityFailed} failed${reset}`);
console.log("");

if (results.totalFailed > 0) {
  console.log(`  ${bold}\x1b[31mFailed cases:${reset}`);
  results.failures.slice(0, 10).forEach(f => {
    console.log(`    ${dim}${f.patient.id} / ${f.drugKey}${reset}`);
    f.violations.forEach(v => console.log(`      \x1b[31m↳ ${v}${reset}`));
  });
  console.log("");
}

if (results.monotonicityFailed > 0) {
  console.log(`  ${bold}\x1b[31mMonotonicity failures:${reset}`);
  results.monotonicityResults.filter(m => !m.passed).forEach(m => {
    console.log(`    \x1b[31m↳ ${m.check.name}${reset}`);
    console.log(`      ${dim}${m.violation}${reset}`);
  });
  console.log("");
}

const reportPath = path.join(__dirname, "..", "synthetic-validation-report.html");
const html = generateHTMLReport(results);
fs.writeFileSync(reportPath, html, "utf8");

console.log(`  Report written → ${dim}${reportPath}${reset}`);
console.log("");

const jsonPath = path.join(__dirname, "..", "synthetic-results.json");
const jsonSummary = {
  totalCases: results.totalCases,
  totalPassed: results.totalPassed,
  totalFailed: results.totalFailed,
  passRate: results.passRate,
  monotonicityPassed: results.monotonicityPassed,
  monotonicityFailed: results.monotonicityFailed,
  durationMs: results.durationMs,
  generatedAt: results.generatedAt,
  passed: results.totalFailed === 0 && results.monotonicityFailed === 0,
};
fs.writeFileSync(jsonPath, JSON.stringify(jsonSummary, null, 2), "utf8");
console.log(`  JSON summary  → ${dim}${jsonPath}${reset}\n`);

process.exit(results.totalFailed === 0 && results.monotonicityFailed === 0 ? 0 : 1);