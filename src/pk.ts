/**
 * DoseBand — Pharmacokinetic Calculation Functions
 *
 * All formulas are cited to their primary source.
 * Functions are pure (no side effects) for testability.
 */

import { PatientInputs, DerivedPK, RenalStage } from "./types";

/**
 * Cockcroft-Gault creatinine clearance estimate.
 *
 * Formula: ((140 - age) × weight) / (serum_creatinine_µmol/L × 0.814)
 * Female correction: multiply by 0.85
 * Minimum returned value: 5 mL/min (avoids division issues in extreme renal failure)
 *
 * Citation: Cockcroft DW, Gault MH. Nephron. 1976;16(1):31-41.
 */
export function calcCrCl(
  ageYears: number,
  weightKg: number,
  serumCreatinineUmolL: number,
  sex: "M" | "F"
): number {
  if (serumCreatinineUmolL <= 0) throw new Error("Serum creatinine must be > 0");
  if (weightKg <= 0) throw new Error("Weight must be > 0");
  if (ageYears <= 0) throw new Error("Age must be > 0");

  const base = ((140 - ageYears) * weightKg) / (serumCreatinineUmolL * 0.814);
  const corrected = sex === "F" ? base * 0.85 : base;
  return Math.max(corrected, 5);
}

/**
 * Mosteller body surface area formula.
 *
 * Formula: sqrt((height_cm × weight_kg) / 3600)
 *
 * Citation: Mosteller RD. N Engl J Med. 1987;317(17):1098.
 */
export function calcBSA(weightKg: number, heightCm: number): number {
  if (weightKg <= 0) throw new Error("Weight must be > 0");
  if (heightCm <= 0) throw new Error("Height must be > 0");
  return Math.sqrt((heightCm * weightKg) / 3600);
}

/**
 * Devine ideal body weight formula.
 *
 * Male:   50 kg + 2.3 kg per inch over 5 feet
 * Female: 45.5 kg + 2.3 kg per inch over 5 feet
 * Minimum: 30 kg (safety floor for short patients)
 *
 * Citation: Devine BJ. Drug Intell Clin Pharm. 1974;8:650-655.
 */
export function calcIBW(heightCm: number, sex: "M" | "F"): number {
  if (heightCm <= 0) throw new Error("Height must be > 0");
  const heightInches = heightCm / 2.54;
  const inchesOver5Feet = Math.max(0, heightInches - 60);
  const base = sex === "M" ? 50 : 45.5;
  return Math.max(base + 2.3 * inchesOver5Feet, 30);
}

/**
 * Adjusted body weight for obese patients (BMI > 30).
 *
 * Formula: IBW + 0.4 × (actual_weight − IBW)
 * Used for aminoglycoside dosing in obesity to avoid toxicity.
 *
 * Citation: Pai MP, Bearden DT. Ann Pharmacother. 2007;41(7):1134-1142.
 */
export function calcABW(actualWeightKg: number, ibwKg: number): number {
  return ibwKg + 0.4 * (actualWeightKg - ibwKg);
}

/**
 * Select the appropriate dosing weight for weight-based drugs.
 *
 * Rules:
 *   - BMI ≤ 30: use actual body weight (or IBW if actual < IBW)
 *   - BMI > 30 (obese): use adjusted body weight (ABW)
 *
 * Citation: Pai MP, Bearden DT. Ann Pharmacother. 2007;41(7):1134-1142.
 */
export function selectDosingWeight(
  actualWeightKg: number,
  ibwKg: number,
  heightCm: number
): number {
  const heightM = heightCm / 100;
  const bmi = actualWeightKg / (heightM * heightM);
  if (bmi > 30) {
    return calcABW(actualWeightKg, ibwKg);
  }
  return Math.min(actualWeightKg, ibwKg + 0.4 * Math.max(0, actualWeightKg - ibwKg));
}

/**
 * Map CrCl (mL/min) to KDIGO renal staging.
 *
 * Citation: KDIGO 2012 Clinical Practice Guideline for CKD. Kidney Int Suppl. 2013;3(1):1-150.
 */
export function classifyRenalStage(crClMlMin: number): RenalStage {
  if (crClMlMin >= 90) return "G1_normal";
  if (crClMlMin >= 60) return "G2_mild";
  if (crClMlMin >= 45) return "G3a_moderate";
  if (crClMlMin >= 30) return "G3b_moderate";
  if (crClMlMin >= 15) return "G4_severe";
  return "G5_ESRD";
}

/**
 * Calculate all derived PK parameters from raw patient inputs.
 * This is the single entry point for PK derivation.
 */
export function derivePK(inputs: PatientInputs): DerivedPK {
  const ibwKg = calcIBW(inputs.heightCm, inputs.sex);
  const abwKg = calcABW(inputs.weightKg, ibwKg);
  const dosingWeightKg = selectDosingWeight(inputs.weightKg, ibwKg, inputs.heightCm);
  const crClMlMin = calcCrCl(
    inputs.ageYears,
    dosingWeightKg,
    inputs.serumCreatinineUmolL,
    inputs.sex
  );
  const bsaM2 = calcBSA(inputs.weightKg, inputs.heightCm);
  const heightM = inputs.heightCm / 100;
  const bmi = inputs.weightKg / (heightM * heightM);
  const renalStage = classifyRenalStage(crClMlMin);

  return {
    crClMlMin,
    bsaM2,
    ibwKg,
    abwKg,
    dosingWeightKg,
    bmi,
    renalStage,
  };
}