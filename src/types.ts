/**
 * DoseBand Clinical Decision Support Engine
 * Core types and interfaces
 *
 * All dosing logic must be traceable to a published clinical source.
 * No parameter may be added without a citation in the drug database.
 */

export type Sex = "M" | "F";

export type PopulationContext =
  | "general"
  | "subSaharanAfrica"
  | "hivPositive"
  | "malnourished"
  | "pregnant"
  | "elderly";

export type HepaticGrade = "normal" | "childPughA" | "childPughB" | "childPughC";

export type Regimen = "standard" | "highDose" | "palliative" | "paediatric";

export type DosingMethod =
  | "calvert"      // Carboplatin: AUC × (CrCl + 25)
  | "bsa"          // BSA-based: mg/m²
  | "weightPK"     // Weight-based PK: mg/kg using dosing weight
  | "weightFixed"; // Fixed dose adjusted by renal/hepatic function

export type RenalStage =
  | "G1_normal"
  | "G2_mild"
  | "G3a_moderate"
  | "G3b_moderate"
  | "G4_severe"
  | "G5_ESRD";

/** Raw patient inputs — no derived values */
export interface PatientInputs {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  serumCreatinineUmolL: number;
  sex: Sex;
  population: PopulationContext;
  hepaticGrade: HepaticGrade;
  bilirubinUmolL?: number;
  altUL?: number;
  concurrentNephrotoxins?: boolean;
}

/** Derived pharmacokinetic parameters — all calculated, none user-supplied */
export interface DerivedPK {
  crClMlMin: number;       // Cockcroft-Gault
  bsaM2: number;           // Mosteller formula
  ibwKg: number;           // Ideal body weight (Devine)
  abwKg: number;           // Adjusted body weight (obesity correction)
  dosingWeightKg: number;  // Selected weight for dosing (IBW, ABW, or actual)
  bmi: number;
  renalStage: RenalStage;
}

/** A single dose band definition */
export interface DoseBand {
  label: string;
  minMg: number;   // inclusive lower bound
  maxMg: number;   // exclusive upper bound (except final band)
}

/** A clinical flag attached to a dose recommendation */
export interface ClinicalFlag {
  severity: "info" | "warning" | "danger";
  code: string;       // machine-readable code for filtering
  message: string;    // human-readable clinical message
  source?: string;    // guideline or reference
}

/** Full output of a dose calculation */
export interface DoseResult {
  drugKey: string;
  drugName: string;
  calculatedDoseMg: number;
  recommendedBand: DoseBand;
  unit: string;
  derivedPK: DerivedPK;
  flags: ClinicalFlag[];
  populationAdjustmentApplied: boolean;
  populationAdjustmentRatio: number; // 1.0 = no adjustment
  renalAdjustmentApplied: boolean;
  hepaticAdjustmentApplied: boolean;
  regimenAdjustmentApplied: boolean;
  /** ISO timestamp of calculation — for audit trail */
  calculatedAt: string;
}

/** Static definition of a drug in the formulary */
export interface DrugDefinition {
  key: string;
  name: string;
  category: "oncology" | "infectious_disease" | "antifungal" | "antiviral";
  dosingMethod: DosingMethod;
  /** Base dose per unit (mg/m² for BSA, mg/kg for weight, AUC target for Calvert) */
  baseDosePerUnit: number;
  unit: string;
  bands: DoseBand[];
  renallyCleared: boolean;
  hepaticallyCleared: boolean;
  /** mg/kg threshold below which resistance risk is flagged (aminoglycosides) */
  resistanceThresholdMgPerKg?: number;
  monitoringGuidance: string;
  targetExposure: string;
  /** Primary clinical references for this drug's dosing parameters */
  citations: string[];
}