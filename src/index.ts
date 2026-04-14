/**
 * DoseBand Calculation Engine — Public API
 *
 * Import from this file only. Internal modules are subject to change.
 */

export { calculateDose, calculateMultiple, type CalculationRequest } from "./engine";
export { derivePK, calcCrCl, calcBSA, calcIBW, calcABW, classifyRenalStage } from "./pk";
export { getDrug, listDrugs, getDrugsByCategory, DRUG_FORMULARY } from "./formulary";
export type {
  PatientInputs,
  DoseResult,
  DoseBand,
  ClinicalFlag,
  DerivedPK,
  DrugDefinition,
  Sex,
  PopulationContext,
  HepaticGrade,
  Regimen,
  RenalStage,
} from "./types";