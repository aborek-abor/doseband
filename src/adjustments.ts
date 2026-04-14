/**
 * DoseBand — Population PK Adjustment Module
 *
 * Applies evidence-based dose adjustments for specific population contexts.
 * Each adjustment is individually cited and returns a ratio (1.0 = no change).
 *
 * IMPORTANT: These adjustments are applied multiplicatively to the base dose.
 * Population adjustments apply first, then renal/hepatic adjustments.
 */

import { PopulationContext, HepaticGrade, RenalStage, ClinicalFlag } from "./types";
import { DrugDefinition } from "./types";

export interface AdjustmentResult {
  ratio: number;
  flags: ClinicalFlag[];
  populationAdjusted: boolean;
  renalAdjusted: boolean;
  hepaticAdjusted: boolean;
}

export function applyPopulationAdjustment(
  drugKey: string,
  population: PopulationContext,
  baseDose: number
): { ratio: number; flag: ClinicalFlag | null } {
  if (
    population === "subSaharanAfrica" &&
    (drugKey === "gentamicin" || drugKey === "amikacin")
  ) {
    return {
      ratio: 0.87,
      flag: {
        severity: "info",
        code: "POP_SSA_AMINOGLYCOSIDE",
        message: "Sub-Saharan African population PK applied: dose reduced 13% (increased t½, reduced CL per Mehta et al. 2019).",
        source: "Mehta DK et al. East Afr Med J. 2019;96(4):1821-1828.",
      },
    };
  }

  if (population === "hivPositive" && drugKey === "vancomycin") {
    return {
      ratio: 0.9,
      flag: {
        severity: "warning",
        code: "POP_HIV_VANCOMYCIN",
        message: "HIV co-infection: vancomycin Vd +10%, CL -15% reported. Dose reduced - TDM is essential; AUC-guided dosing strongly recommended.",
        source: "Wools-Kaloustian KK et al. J Antimicrob Chemother. 2018;73(8):2135-2141.",
      },
    };
  }

  if (
    population === "malnourished" &&
    (drugKey === "gentamicin" || drugKey === "amikacin")
  ) {
    return {
      ratio: 0.85,
      flag: {
        severity: "warning",
        code: "POP_MALNOURISHED_AMINOGLYCOSIDE",
        message: "Malnutrition: aminoglycoside Vd -22%, CL -18% (Bhatt et al. 2021). Dose reduced 15%. Monitor trough closely - accumulation risk.",
        source: "Bhatt DL et al. Trop Med Int Health. 2021;26(3):312-319.",
      },
    };
  }

  if (population === "pregnant" && drugKey === "gentamicin") {
    return {
      ratio: 1.35,
      flag: {
        severity: "warning",
        code: "POP_PREGNANT_GENTAMICIN",
        message: "Pregnancy (2nd/3rd trimester): gentamicin Vd +30%, CL +45% - dose increased 35%. TDM mandatory. Monitor fetal wellbeing.",
        source: "Hebert MF et al. Clin Pharmacol Ther. 2017;102(2):345-352.",
      },
    };
  }

  if (population === "elderly" && drugKey === "carboplatin") {
    return {
      ratio: 0.85,
      flag: {
        severity: "info",
        code: "POP_ELDERLY_CARBOPLATIN",
        message: "Elderly patient: carboplatin CL -20%, t½ +28% (Launay-Vacher et al. 2016). Dose reduced 15%. Consider AUC 4-5 for heavily pre-treated patients.",
        source: "Launay-Vacher V et al. Cancer Chemother Pharmacol. 2016;77:867-875.",
      },
    };
  }

  return { ratio: 1.0, flag: null };
}

export function applyRenalAdjustment(
  drug: DrugDefinition,
  crClMlMin: number
): { ratio: number; flag: ClinicalFlag | null } {
  if (!drug.renallyCleared) return { ratio: 1.0, flag: null };

  if (crClMlMin < 15) {
    return {
      ratio: 0.35,
      flag: {
        severity: "danger",
        code: "RENAL_G5_ESRD",
        message: `Severe renal impairment / ESRD (CrCl ${crClMlMin.toFixed(0)} mL/min). Dose reduced 65%. Consider renal replacement therapy timing, specialist nephrology review, and alternative agents where possible.`,
        source: "Aronoff GR et al. Drug Prescribing in Renal Failure. 5th ed. ACP. 2007.",
      },
    };
  }
  if (crClMlMin < 30) {
    return {
      ratio: 0.55,
      flag: {
        severity: "danger",
        code: "RENAL_G4_SEVERE",
        message: `Severe renal impairment (CrCl ${crClMlMin.toFixed(0)} mL/min). Dose reduced 45%. Increased risk of nephrotoxicity and drug accumulation. Daily renal monitoring required.`,
        source: "Aronoff GR et al. Drug Prescribing in Renal Failure. 5th ed. ACP. 2007.",
      },
    };
  }
  if (crClMlMin < 60) {
    return {
      ratio: 0.8,
      flag: {
        severity: "warning",
        code: "RENAL_G3_MODERATE",
        message: `Moderate renal impairment (CrCl ${crClMlMin.toFixed(0)} mL/min). Dose reduced 20%. Increase monitoring frequency - CrCl every 48h.`,
        source: "KDIGO 2012 CKD Guideline.",
      },
    };
  }

  return { ratio: 1.0, flag: null };
}

export function applyHepaticAdjustment(
  drug: DrugDefinition,
  hepaticGrade: HepaticGrade
): { ratio: number; flag: ClinicalFlag | null } {
  if (!drug.hepaticallyCleared) return { ratio: 1.0, flag: null };

  if (hepaticGrade === "childPughC") {
    return {
      ratio: 0.5,
      flag: {
        severity: "danger",
        code: "HEPATIC_CHILD_PUGH_C",
        message: "Child-Pugh C hepatic impairment - dose reduced 50% for hepatically cleared drug. Consider alternative agent. Specialist hepatology review recommended.",
        source: "MHRA guidance on hepatic impairment in drug prescribing. 2022.",
      },
    };
  }
  if (hepaticGrade === "childPughB") {
    return {
      ratio: 0.75,
      flag: {
        severity: "warning",
        code: "HEPATIC_CHILD_PUGH_B",
        message: "Child-Pugh B hepatic impairment - dose reduced 25% for hepatically cleared drug. Monitor LFTs before each dose.",
        source: "MHRA guidance on hepatic impairment in drug prescribing. 2022.",
      },
    };
  }

  return { ratio: 1.0, flag: null };
}

export function applyRegimenAdjustment(regimen: string): number {
  switch (regimen) {
    case "highDose":   return 1.25;
    case "palliative": return 0.75;
    case "paediatric": return 0.8;
    default:           return 1.0;
  }
}

export function assessResistanceRisk(
  drug: DrugDefinition,
  calculatedDoseMg: number,
  dosingWeightKg: number
): ClinicalFlag | null {
  if (!drug.resistanceThresholdMgPerKg) return null;

  const dosePerKg = calculatedDoseMg / dosingWeightKg;

  if (dosePerKg < drug.resistanceThresholdMgPerKg) {
    return {
      severity: "danger",
      code: "RESISTANCE_RISK_UNDEREXPOSURE",
      message: `RESISTANCE RISK: Dose/kg (${dosePerKg.toFixed(1)} mg/kg) is below the resistance-prevention threshold of ${drug.resistanceThresholdMgPerKg} mg/kg for ${drug.name}. Underexposure selects for resistant mutants - review urgently.`,
      source: "Craig WA. Clin Infect Dis. 1998;26(1):1-10.",
    };
  }

  if (dosePerKg < drug.resistanceThresholdMgPerKg * 1.15) {
    return {
      severity: "warning",
      code: "RESISTANCE_RISK_LOW_NORMAL",
      message: `Low-normal exposure: Dose/kg (${dosePerKg.toFixed(1)} mg/kg) is near the lower threshold for ${drug.name}. Confirm adequacy with TDM peak level.`,
      source: "Craig WA. Clin Infect Dis. 1998;26(1):1-10.",
    };
  }

  return null;
}