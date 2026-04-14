/**
 * DoseBand — Clinical Invariants
 *
 * Formal rules that every valid dose calculation must satisfy.
 * Each invariant returns null (pass) or a string describing the violation.
 */

import { DoseResult, PatientInputs } from "../src/types";
import { calculateDose } from "../src/engine";
import { getDrug } from "../src/formulary";

export interface InvariantResult {
  name: string;
  passed: boolean;
  violation: string | null;
}

type Invariant = (result: DoseResult, inputs: PatientInputs) => string | null;

const DOSE_IS_POSITIVE: Invariant = (r) =>
  r.calculatedDoseMg > 0 ? null : `Dose is non-positive: ${r.calculatedDoseMg}`;

const DOSE_IS_FINITE: Invariant = (r) =>
  isFinite(r.calculatedDoseMg) ? null : `Dose is not finite: ${r.calculatedDoseMg}`;

const DOSE_IS_REASONABLE: Invariant = (r) => {
  if (r.calculatedDoseMg > 20000) return `Dose suspiciously high: ${r.calculatedDoseMg.toFixed(1)} mg`;
  if (r.calculatedDoseMg < 1)     return `Dose suspiciously low: ${r.calculatedDoseMg.toFixed(4)} mg`;
  return null;
};

const BAND_EXISTS: Invariant = (r) =>
  r.recommendedBand && r.recommendedBand.label ? null : "No band assigned";

const DOSE_WITHIN_BAND: Invariant = (r) => {
  const { calculatedDoseMg: d, recommendedBand: b } = r;
  if (d < b.minMg) return `Dose ${d.toFixed(1)} mg is below band ${b.label} minimum ${b.minMg}`;
  if (b.maxMg !== Infinity && d >= b.maxMg)
    return `Dose ${d.toFixed(1)} mg is at or above band ${b.label} maximum ${b.maxMg}`;
  return null;
};

const PK_IS_POSITIVE: Invariant = (r) => {
  const pk = r.derivedPK;
  if (pk.crClMlMin <= 0)      return `CrCl non-positive: ${pk.crClMlMin}`;
  if (pk.bsaM2 <= 0)          return `BSA non-positive: ${pk.bsaM2}`;
  if (pk.ibwKg <= 0)          return `IBW non-positive: ${pk.ibwKg}`;
  if (pk.dosingWeightKg <= 0) return `DosingWeight non-positive: ${pk.dosingWeightKg}`;
  if (pk.bmi <= 0)            return `BMI non-positive: ${pk.bmi}`;
  return null;
};

const HAS_AUDIT_TIMESTAMP: Invariant = (r) =>
  /^\d{4}-\d{2}-\d{2}T/.test(r.calculatedAt) ? null
  : `Missing or malformed calculatedAt: ${r.calculatedAt}`;

const FLAGS_WELL_FORMED: Invariant = (r) => {
  for (const flag of r.flags) {
    if (!flag.severity) return `Flag missing severity: ${JSON.stringify(flag)}`;
    if (!flag.code)     return `Flag missing code: ${JSON.stringify(flag)}`;
    if (!flag.message)  return `Flag missing message: ${JSON.stringify(flag)}`;
    if (!["info", "warning", "danger"].includes(flag.severity))
      return `Unknown flag severity: ${flag.severity}`;
  }
  return null;
};

const ALWAYS_HAS_MONITORING_FLAG: Invariant = (r) =>
  r.flags.some(f => f.code === "MONITORING_GUIDANCE") ? null
  : "Missing MONITORING_GUIDANCE flag";

export interface MonotonicityCheck {
  name: string;
  drugKey: string;
  baseInputs: PatientInputs;
  perturbedInputs: PatientInputs;
  assertion: "lower" | "higher" | "equal_or_lower" | "equal_or_higher";
  description: string;
}

export function buildMonotonicityChecks(): MonotonicityCheck[] {
  const base: PatientInputs = {
    weightKg: 70, heightCm: 170, ageYears: 50,
    serumCreatinineUmolL: 90, sex: "M",
    population: "general", hepaticGrade: "normal",
  };

  const checks: MonotonicityCheck[] = [];

  const renalDrugs = ["carboplatin", "gentamicin", "amikacin", "vancomycin",
                      "cisplatin", "acyclovir", "fluconazole", "meropenem",
                      "piperacillinTazobactam"];

  for (const drug of renalDrugs) {
    checks.push({
      name: `${drug}: higher creatinine gives lower dose`,
      drugKey: drug,
      baseInputs: { ...base, serumCreatinineUmolL: 90 },
      perturbedInputs: { ...base, serumCreatinineUmolL: 400 },
      assertion: "lower",
      description: "Dose must decrease as renal function worsens",
    });
  }

  const hepaticDrugs = ["docetaxel", "paclitaxel", "voriconazole"];
  for (const drug of hepaticDrugs) {
    checks.push({
      name: `${drug}: Child-Pugh B lower than normal`,
      drugKey: drug,
      baseInputs: { ...base, hepaticGrade: "normal" },
      perturbedInputs: { ...base, hepaticGrade: "childPughB" },
      assertion: "lower",
      description: "Dose must decrease as hepatic impairment worsens",
    });
    checks.push({
      name: `${drug}: Child-Pugh C lower than B`,
      drugKey: drug,
      baseInputs: { ...base, hepaticGrade: "childPughB" },
      perturbedInputs: { ...base, hepaticGrade: "childPughC" },
      assertion: "lower",
      description: "Child-Pugh C dose must be lower than Child-Pugh B",
    });
  }

  for (const drug of ["gentamicin", "amikacin"]) {
    checks.push({
      name: `${drug}: SSA lower than general`,
      drugKey: drug,
      baseInputs: { ...base, population: "general" },
      perturbedInputs: { ...base, population: "subSaharanAfrica" },
      assertion: "lower",
      description: "SSA adjustment must reduce aminoglycoside dose",
    });
    checks.push({
      name: `${drug}: malnourished lower than general`,
      drugKey: drug,
      baseInputs: { ...base, population: "general" },
      perturbedInputs: { ...base, population: "malnourished" },
      assertion: "lower",
      description: "Malnutrition adjustment must reduce aminoglycoside dose",
    });
  }

  checks.push({
    name: "gentamicin: pregnancy higher than general",
    drugKey: "gentamicin",
    baseInputs: { ...base, sex: "F", population: "general" },
    perturbedInputs: { ...base, sex: "F", population: "pregnant" },
    assertion: "higher",
    description: "Pregnancy increases gentamicin dose",
  });

  checks.push({
    name: "vancomycin: HIV+ lower than general",
    drugKey: "vancomycin",
    baseInputs: { ...base, population: "general" },
    perturbedInputs: { ...base, population: "hivPositive" },
    assertion: "lower",
    description: "HIV+ adjustment must reduce vancomycin dose",
  });

  checks.push({
    name: "carboplatin: elderly lower than general",
    drugKey: "carboplatin",
    baseInputs: { ...base, population: "general" },
    perturbedInputs: { ...base, population: "elderly" },
    assertion: "lower",
    description: "Elderly adjustment must reduce carboplatin dose",
  });

  return checks;
}

export function checkDeterminism(inputs: PatientInputs, drugKey: string): string | null {
  const r1 = calculateDose({ drugKey, patient: inputs });
  const r2 = calculateDose({ drugKey, patient: inputs });
  if (r1.calculatedDoseMg !== r2.calculatedDoseMg) {
    return `Non-deterministic: first=${r1.calculatedDoseMg}, second=${r2.calculatedDoseMg}`;
  }
  return null;
}

export function checkResistanceFlagConsistency(
  result: DoseResult,
  inputs: PatientInputs,
  drugKey: string
): string | null {
  const drug = getDrug(drugKey);
  if (!drug.resistanceThresholdMgPerKg) return null;

  const dosePerKg = result.calculatedDoseMg / result.derivedPK.dosingWeightKg;
  const threshold = drug.resistanceThresholdMgPerKg;
  const hasResistanceFlag = result.flags.some(
    f => f.code === "RESISTANCE_RISK_UNDEREXPOSURE" || f.code === "RESISTANCE_RISK_LOW_NORMAL"
  );
  const hasDangerFlag = result.flags.some(f => f.code === "RESISTANCE_RISK_UNDEREXPOSURE");

  if (dosePerKg < threshold && !hasDangerFlag) {
    return `Dose/kg=${dosePerKg.toFixed(2)} < threshold ${threshold} but no danger flag`;
  }
  if (dosePerKg >= threshold * 1.15 && hasResistanceFlag) {
    return `Dose/kg=${dosePerKg.toFixed(2)} above threshold but resistance flag present`;
  }
  return null;
}

export const INVARIANTS: Array<{ name: string; fn: Invariant }> = [
  { name: "dose_is_positive",      fn: DOSE_IS_POSITIVE },
  { name: "dose_is_finite",        fn: DOSE_IS_FINITE },
  { name: "dose_is_reasonable",    fn: DOSE_IS_REASONABLE },
  { name: "band_exists",           fn: BAND_EXISTS },
  { name: "dose_within_band",      fn: DOSE_WITHIN_BAND },
  { name: "pk_is_positive",        fn: PK_IS_POSITIVE },
  { name: "has_audit_timestamp",   fn: HAS_AUDIT_TIMESTAMP },
  { name: "flags_well_formed",     fn: FLAGS_WELL_FORMED },
  { name: "always_has_monitoring", fn: ALWAYS_HAS_MONITORING_FLAG },
];