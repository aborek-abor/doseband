/**
 * DoseBand — Main Calculation Engine
 *
 * Orchestrates PK derivation, dose calculation, band assignment,
 * population/renal/hepatic adjustments, and clinical flag generation.
 *
 * This module is the single public API for dose calculation.
 * All inputs are validated before processing.
 */

import { PatientInputs, DoseResult, DoseBand, ClinicalFlag, Regimen } from "./types";
import { derivePK } from "./pk";
import { getDrug } from "./formulary";
import {
  applyPopulationAdjustment,
  applyRenalAdjustment,
  applyHepaticAdjustment,
  applyRegimenAdjustment,
  assessResistanceRisk,
} from "./adjustments";

export interface CalculationRequest {
  drugKey: string;
  patient: PatientInputs;
  regimen?: Regimen;
}

function validateInputs(patient: PatientInputs): void {
  if (patient.weightKg < 10 || patient.weightKg > 300)
    throw new Error(`Weight ${patient.weightKg} kg is outside plausible range (10-300 kg)`);
  if (patient.heightCm < 50 || patient.heightCm > 250)
    throw new Error(`Height ${patient.heightCm} cm is outside plausible range (50-250 cm)`);
  if (patient.ageYears < 1 || patient.ageYears > 120)
    throw new Error(`Age ${patient.ageYears} years is outside plausible range (1-120)`);
  if (patient.serumCreatinineUmolL < 20 || patient.serumCreatinineUmolL > 2000)
    throw new Error(`Creatinine ${patient.serumCreatinineUmolL} umol/L is outside plausible range (20-2000)`);
  if (!["M", "F"].includes(patient.sex))
    throw new Error(`Sex must be "M" or "F"`);
}

function assignBand(doseMg: number, bands: DoseBand[]): DoseBand {
  for (const band of bands) {
    if (doseMg >= band.minMg && doseMg < band.maxMg) {
      return band;
    }
  }
  return bands[bands.length - 1];
}

function calculateBaseDose(
  drugKey: string,
  dosingMethod: string,
  baseDosePerUnit: number,
  crClMlMin: number,
  bsaM2: number,
  dosingWeightKg: number
): number {
  switch (dosingMethod) {
    case "calvert":
      return baseDosePerUnit * (crClMlMin + 25);
    case "bsa":
      return baseDosePerUnit * bsaM2;
    case "weightPK":
      return baseDosePerUnit * dosingWeightKg;
    case "weightFixed":
      return baseDosePerUnit;
    default:
      throw new Error(`Unknown dosing method: "${dosingMethod}" for drug "${drugKey}"`);
  }
}

export function calculateDose(request: CalculationRequest): DoseResult {
  const { drugKey, patient, regimen = "standard" } = request;

  validateInputs(patient);

  const drug = getDrug(drugKey);
  const pk = derivePK(patient);

  const baseDose = calculateBaseDose(
    drugKey,
    drug.dosingMethod,
    drug.baseDosePerUnit,
    pk.crClMlMin,
    pk.bsaM2,
    pk.dosingWeightKg
  );

  const popAdj = applyPopulationAdjustment(drugKey, patient.population, baseDose);
  const renalAdj = applyRenalAdjustment(drug, pk.crClMlMin);
  const hepaticAdj = applyHepaticAdjustment(drug, patient.hepaticGrade);
  const regimenRatio = applyRegimenAdjustment(regimen);

  const totalRatio = popAdj.ratio * regimenRatio * renalAdj.ratio * hepaticAdj.ratio;
  const adjustedDose = baseDose * totalRatio;

  const band = assignBand(adjustedDose, drug.bands);

  const flags: ClinicalFlag[] = [];

  if (popAdj.flag) flags.push(popAdj.flag);
  if (renalAdj.flag) flags.push(renalAdj.flag);
  if (hepaticAdj.flag) flags.push(hepaticAdj.flag);

  const resistanceFlag = assessResistanceRisk(drug, adjustedDose, pk.dosingWeightKg);
  if (resistanceFlag) flags.push(resistanceFlag);

  if (patient.concurrentNephrotoxins && drug.renallyCleared) {
    flags.push({
      severity: "warning",
      code: "CONCURRENT_NEPHROTOXIN",
      message: `Concurrent nephrotoxin co-prescribed with renally-cleared ${drug.name}. Increased acute kidney injury risk - consider dose reduction or agent substitution. Monitor CrCl daily.`,
      source: "BNF Appendix 1. Interactions. 2023.",
    });
  }

  flags.push({
    severity: "info",
    code: "MONITORING_GUIDANCE",
    message: drug.monitoringGuidance,
  });

  return {
    drugKey,
    drugName: drug.name,
    calculatedDoseMg: adjustedDose,
    recommendedBand: band,
    unit: drug.unit,
    derivedPK: pk,
    flags,
    populationAdjustmentApplied: popAdj.ratio !== 1.0,
    populationAdjustmentRatio: popAdj.ratio,
    renalAdjustmentApplied: renalAdj.ratio !== 1.0,
    hepaticAdjustmentApplied: hepaticAdj.ratio !== 1.0,
    regimenAdjustmentApplied: regimenRatio !== 1.0,
    calculatedAt: new Date().toISOString(),
  };
}

export function calculateMultiple(
  drugs: string[],
  patient: PatientInputs,
  regimen: Regimen = "standard"
): DoseResult[] {
  return drugs.map((drugKey) => calculateDose({ drugKey, patient, regimen }));
}