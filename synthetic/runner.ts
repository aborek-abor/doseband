/**
 * DoseBand — Synthetic Test Runner
 *
 * Runs all synthetic patients through all invariants and monotonicity checks.
 * Produces structured results for the report generator.
 */

import { calculateDose } from "../src/engine";
import { listDrugs, getDrug } from "../src/formulary";
import { PatientInputs, DoseResult } from "../src/types";
import { SyntheticPatient, generateAllPatients } from "./generator";
import {
  INVARIANTS,
  buildMonotonicityChecks,
  checkDeterminism,
  checkResistanceFlagConsistency,
  MonotonicityCheck,
} from "./invariants";

export interface PatientTestResult {
  patient: SyntheticPatient;
  drugKey: string;
  passed: boolean;
  violations: string[];
  result?: DoseResult;
  durationMs: number;
}

export interface MonotonicityTestResult {
  check: MonotonicityCheck;
  passed: boolean;
  violation: string | null;
  baseDose: number;
  perturbedDose: number;
}

export interface FlagStats {
  code: string;
  count: number;
  pct: number;
}

export interface BandStats {
  drugKey: string;
  drugName: string;
  bands: Record<string, number>;
}

export interface SuiteResults {
  totalCases: number;
  totalPassed: number;
  totalFailed: number;
  passRate: number;
  durationMs: number;
  failures: PatientTestResult[];
  monotonicityResults: MonotonicityTestResult[];
  monotonicityPassed: number;
  monotonicityFailed: number;
  flagStats: FlagStats[];
  bandStats: BandStats[];
  categoryBreakdown: Record<string, { total: number; passed: number }>;
  drugBreakdown: Record<string, { total: number; passed: number }>;
  generatedAt: string;
}

export function runSuite(randomN = 2000): SuiteResults {
  const startTime = Date.now();
  const patients = generateAllPatients(randomN);
  const drugs = listDrugs();

  const failures: PatientTestResult[] = [];
  const flagCounts: Record<string, number> = {};
  const bandCounts: Record<string, Record<string, number>> = {};
  const categoryBreakdown: Record<string, { total: number; passed: number }> = {};
  const drugBreakdown: Record<string, { total: number; passed: number }> = {};

  let totalCases = 0;
  let totalPassed = 0;

  for (const key of drugs) {
    bandCounts[key] = {};
    drugBreakdown[key] = { total: 0, passed: 0 };
  }

  for (const patient of patients) {
    const cat = patient.category;
    if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { total: 0, passed: 0 };

    for (const drugKey of drugs) {
      totalCases++;
      categoryBreakdown[cat].total++;
      drugBreakdown[drugKey].total++;

      const caseStart = Date.now();
      const violations: string[] = [];
      let result: DoseResult | undefined;

      try {
        result = calculateDose({ drugKey, patient: patient.inputs });

        for (const { name, fn } of INVARIANTS) {
          const v = fn(result, patient.inputs);
          if (v) violations.push(`[${name}] ${v}`);
        }

        const detV = checkDeterminism(patient.inputs, drugKey);
        if (detV) violations.push(`[determinism] ${detV}`);

        const resV = checkResistanceFlagConsistency(result, patient.inputs, drugKey);
        if (resV) violations.push(`[resistance_flags] ${resV}`);

        for (const flag of result.flags) {
          flagCounts[flag.code] = (flagCounts[flag.code] || 0) + 1;
        }

        const bandLabel = result.recommendedBand.label;
        bandCounts[drugKey][bandLabel] = (bandCounts[drugKey][bandLabel] || 0) + 1;

      } catch (err: any) {
        violations.push(`[exception] ${err.message || String(err)}`);
      }

      const passed = violations.length === 0;
      const caseResult: PatientTestResult = {
        patient, drugKey, passed, violations, result,
        durationMs: Date.now() - caseStart,
      };

      if (passed) {
        totalPassed++;
        categoryBreakdown[cat].passed++;
        drugBreakdown[drugKey].passed++;
      } else {
        failures.push(caseResult);
      }
    }
  }

  const monoChecks = buildMonotonicityChecks();
  const monotonicityResults: MonotonicityTestResult[] = [];
  let monoPassed = 0;
  let monoFailed = 0;

  for (const check of monoChecks) {
    try {
      const base = calculateDose({ drugKey: check.drugKey, patient: check.baseInputs });
      const perturbed = calculateDose({ drugKey: check.drugKey, patient: check.perturbedInputs });
      const baseDose = base.calculatedDoseMg;
      const pertDose = perturbed.calculatedDoseMg;

      let violation: string | null = null;
      if (check.assertion === "lower" && pertDose >= baseDose) {
        violation = `Expected perturbed dose (${pertDose.toFixed(1)}) < base dose (${baseDose.toFixed(1)})`;
      } else if (check.assertion === "higher" && pertDose <= baseDose) {
        violation = `Expected perturbed dose (${pertDose.toFixed(1)}) > base dose (${baseDose.toFixed(1)})`;
      } else if (check.assertion === "equal_or_lower" && pertDose > baseDose) {
        violation = `Expected perturbed dose (${pertDose.toFixed(1)}) <= base dose (${baseDose.toFixed(1)})`;
      }

      monotonicityResults.push({ check, passed: !violation, violation, baseDose, perturbedDose: pertDose });
      if (!violation) monoPassed++; else monoFailed++;
    } catch (err: any) {
      monotonicityResults.push({
        check, passed: false, violation: `Exception: ${err.message}`, baseDose: 0, perturbedDose: 0,
      });
      monoFailed++;
    }
  }

  const flagStats: FlagStats[] = Object.entries(flagCounts)
    .map(([code, count]) => ({ code, count, pct: +((count / totalCases) * 100).toFixed(1) }))
    .sort((a, b) => b.count - a.count);

  const bandStats: BandStats[] = drugs.map(key => ({
    drugKey: key,
    drugName: getDrug(key).name,
    bands: bandCounts[key],
  }));

  return {
    totalCases,
    totalPassed,
    totalFailed: totalCases - totalPassed,
    passRate: +((totalPassed / totalCases) * 100).toFixed(4),
    durationMs: Date.now() - startTime,
    failures,
    monotonicityResults,
    monotonicityPassed: monoPassed,
    monotonicityFailed: monoFailed,
    flagStats,
    bandStats,
    categoryBreakdown,
    drugBreakdown,
    generatedAt: new Date().toISOString(),
  };
}