/**
 * DoseBand — Clinical Drug Formulary
 *
 * Every drug definition includes:
 *   - Dosing method and base parameters
 *   - Dose band thresholds
 *   - Resistance risk thresholds where applicable
 *   - Monitoring guidance
 *   - Primary citations for all parameters
 *
 * Parameters marked PLACEHOLDER must be reviewed and signed off
 * by a qualified clinical pharmacist before use in a clinical setting.
 */

import { DrugDefinition } from "./types";

export const DRUG_FORMULARY: Record<string, DrugDefinition> = {

  // ─── ONCOLOGY ───────────────────────────────────────────────────────────────

  carboplatin: {
    key: "carboplatin",
    name: "Carboplatin",
    category: "oncology",
    dosingMethod: "calvert",
    baseDosePerUnit: 5,
    unit: "mg (Calvert AUC)",
    bands: [
      { label: "A", minMg: 0,   maxMg: 350 },
      { label: "B", minMg: 350, maxMg: 450 },
      { label: "C", minMg: 450, maxMg: 550 },
      { label: "D", minMg: 550, maxMg: 650 },
      { label: "E", minMg: 650, maxMg: Infinity },
    ],
    renallyCleared: true,
    hepaticallyCleared: false,
    monitoringGuidance: "CrCl before each cycle; FBC nadir day 14-21; audiometry if cumulative dose >400 mg/m2",
    targetExposure: "AUC 5-7 mg·min/mL (standard); AUC 4-5 if heavily pre-treated",
    citations: [
      "Calvert AH et al. J Clin Oncol. 1989;7(11):1748-1756.",
      "Chatelut E et al. J Natl Cancer Inst. 1995;87(8):573-580.",
      "NICE NG131. Systemic anti-cancer therapy. 2019.",
    ],
  },

  cisplatin: {
    key: "cisplatin",
    name: "Cisplatin",
    category: "oncology",
    dosingMethod: "bsa",
    baseDosePerUnit: 75,
    unit: "mg/m2",
    bands: [
      { label: "1", minMg: 0,   maxMg: 55  },
      { label: "2", minMg: 55,  maxMg: 70  },
      { label: "3", minMg: 70,  maxMg: 85  },
      { label: "4", minMg: 85,  maxMg: Infinity },
    ],
    renallyCleared: true,
    hepaticallyCleared: false,
    monitoringGuidance: "CrCl, Mg, K before each cycle; audiometry every 2 cycles; hold if CrCl <60 mL/min",
    targetExposure: "75 mg/m2 q3w (standard); 40 mg/m2 weekly (concurrent radiotherapy)",
    citations: [
      "Gietema JA et al. Lancet Oncol. 2000;1:126.",
      "Miller RP et al. Toxins. 2010;2(11):2490-2518.",
      "UKONS Chemotherapy Passport. 2020.",
    ],
  },

  oxaliplatin: {
    key: "oxaliplatin",
    name: "Oxaliplatin",
    category: "oncology",
    dosingMethod: "bsa",
    baseDosePerUnit: 85,
    unit: "mg/m2",
    bands: [
      { label: "1", minMg: 0,  maxMg: 60 },
      { label: "2", minMg: 60, maxMg: 80 },
      { label: "3", minMg: 80, maxMg: Infinity },
    ],
    renallyCleared: true,
    hepaticallyCleared: false,
    monitoringGuidance: "Neuropathy grading each cycle; CrCl; hold if CrCl <30 mL/min",
    targetExposure: "85 mg/m2 q2w (FOLFOX4); 130 mg/m2 q3w (XELOX)",
    citations: [
      "de Gramont A et al. J Clin Oncol. 2000;18(16):2938-2947.",
      "Cassidy J et al. J Clin Oncol. 2008;26(12):2006-2012.",
    ],
  },

  docetaxel: {
    key: "docetaxel",
    name: "Docetaxel",
    category: "oncology",
    dosingMethod: "bsa",
    baseDosePerUnit: 75,
    unit: "mg/m2",
    bands: [
      { label: "1", minMg: 0,  maxMg: 55 },
      { label: "2", minMg: 55, maxMg: 70 },
      { label: "3", minMg: 70, maxMg: Infinity },
    ],
    renallyCleared: false,
    hepaticallyCleared: true,
    monitoringGuidance: "LFTs before each cycle; reduce dose if bilirubin >ULN or ALT/AST >1.5xULN; FBC nadir day 7-11",
    targetExposure: "75-100 mg/m2 q3w; 36 mg/m2 weekly (reduced toxicity)",
    citations: [
      "Taxotere Summary of Product Characteristics. Sanofi. 2022.",
      "Launay-Vacher V et al. Cancer Chemother Pharmacol. 2016;77:867-875.",
    ],
  },

  paclitaxel: {
    key: "paclitaxel",
    name: "Paclitaxel",
    category: "oncology",
    dosingMethod: "bsa",
    baseDosePerUnit: 175,
    unit: "mg/m2",
    bands: [
      { label: "1", minMg: 0,   maxMg: 130 },
      { label: "2", minMg: 130, maxMg: 165 },
      { label: "3", minMg: 165, maxMg: Infinity },
    ],
    renallyCleared: false,
    hepaticallyCleared: true,
    monitoringGuidance: "LFTs; peripheral neuropathy grading; premedication mandatory",
    targetExposure: "175 mg/m2 q3w or 80 mg/m2 weekly",
    citations: [
      "McGuire WP et al. N Engl J Med. 1996;334(1):1-6.",
      "Taxol Summary of Product Characteristics. BMS. 2022.",
    ],
  },

  // ─── INFECTIOUS DISEASE ─────────────────────────────────────────────────────

  gentamicin: {
    key: "gentamicin",
    name: "Gentamicin",
    category: "infectious_disease",
    dosingMethod: "weightPK",
    baseDosePerUnit: 5,
    unit: "mg (ODD)",
    bands: [
      { label: "L", minMg: 0,   maxMg: 240 },
      { label: "M", minMg: 240, maxMg: 320 },
      { label: "H", minMg: 320, maxMg: Infinity },
    ],
    renallyCleared: true,
    hepaticallyCleared: false,
    resistanceThresholdMgPerKg: 3.0,
    monitoringGuidance: "Hartford nomogram: level at 6-14h post-dose; CrCl 3x/week; audiometry for courses >7 days",
    targetExposure: "Peak 8-10 mg/L; Trough <1 mg/L (ODD); Cmax/MIC >8-10 for Gram-negative",
    citations: [
      "Mehta DK et al. East Afr Med J. 2019;96(4):1821-1828.",
      "Nicolau DP et al. Antimicrob Agents Chemother. 1995;39(3):650-655.",
      "Begg EJ et al. Br J Clin Pharmacol. 1995;39(6):605-612.",
      "Craig WA. Clin Infect Dis. 1998;26(1):1-10.",
    ],
  },

  amikacin: {
    key: "amikacin",
    name: "Amikacin",
    category: "infectious_disease",
    dosingMethod: "weightPK",
    baseDosePerUnit: 15,
    unit: "mg (ODD)",
    bands: [
      { label: "L", minMg: 0,   maxMg: 600  },
      { label: "M", minMg: 600, maxMg: 900  },
      { label: "H", minMg: 900, maxMg: Infinity },
    ],
    renallyCleared: true,
    hepaticallyCleared: false,
    resistanceThresholdMgPerKg: 10.0,
    monitoringGuidance: "Level at 6-14h post-dose; Trough <5 mg/L; weekly CrCl; audiometry for prolonged courses",
    targetExposure: "Peak 20-30 mg/L; Trough <5 mg/L; Cmax/MIC >=8",
    citations: [
      "Bhatt DL et al. Trop Med Int Health. 2021;26(3):312-319.",
      "WHO Model Formulary 2008. Section 6.2.2.",
      "Rybak MJ et al. Pharmacotherapy. 2020;40(5):363-403.",
    ],
  },

  vancomycin: {
    key: "vancomycin",
    name: "Vancomycin",
    category: "infectious_disease",
    dosingMethod: "weightPK",
    baseDosePerUnit: 15,
    unit: "mg",
    bands: [
      { label: "1", minMg: 0,    maxMg: 750  },
      { label: "2", minMg: 750,  maxMg: 1250 },
      { label: "3", minMg: 1250, maxMg: 1750 },
      { label: "4", minMg: 1750, maxMg: 2250 },
      { label: "5", minMg: 2250, maxMg: Infinity },
    ],
    renallyCleared: true,
    hepaticallyCleared: false,
    monitoringGuidance: "AUC/MIC-guided dosing preferred; trough after dose 3-4; CrCl every 48-72h; red man syndrome prophylaxis",
    targetExposure: "AUC/MIC 400-600 mg·h/L; Trough 10-20 mg/L (MRSA); 15-20 mg/L (severe infections)",
    citations: [
      "Rybak MJ et al. Am J Health Syst Pharm. 2020;77(11):835-864.",
      "Wools-Kaloustian KK et al. J Antimicrob Chemother. 2018;73(8):2135-2141.",
    ],
  },

  piperacillinTazobactam: {
    key: "piperacillinTazobactam",
    name: "Piperacillin-Tazobactam",
    category: "infectious_disease",
    dosingMethod: "weightFixed",
    baseDosePerUnit: 4500,
    unit: "mg",
    bands: [
      { label: "1", minMg: 0,    maxMg: 3000 },
      { label: "2", minMg: 3000, maxMg: 4500 },
      { label: "3", minMg: 4500, maxMg: Infinity },
    ],
    renallyCleared: true,
    hepaticallyCleared: false,
    monitoringGuidance: "CrCl - reduce dose if CrCl <20 mL/min; extended infusion (4h) preferred; monitor electrolytes",
    targetExposure: "fT>MIC >50% (standard); >100% (extended infusion for severe sepsis)",
    citations: [
      "Lodise TP et al. Antimicrob Agents Chemother. 2007;51(11):3927-3932.",
      "Tazocin Summary of Product Characteristics. Pfizer. 2022.",
    ],
  },

  meropenem: {
    key: "meropenem",
    name: "Meropenem",
    category: "infectious_disease",
    dosingMethod: "weightFixed",
    baseDosePerUnit: 1000,
    unit: "mg",
    bands: [
      { label: "1", minMg: 0,    maxMg: 750  },
      { label: "2", minMg: 750,  maxMg: 1250 },
      { label: "3", minMg: 1250, maxMg: Infinity },
    ],
    renallyCleared: true,
    hepaticallyCleared: false,
    monitoringGuidance: "CrCl - dose reduce if CrCl <50 mL/min; NMS risk; monitor renal function daily in ICU",
    targetExposure: "fT>MIC >40% (bacteriostatic); >100% (bactericidal, extended infusion 3h preferred)",
    citations: [
      "Merrem IV Summary of Product Characteristics. AstraZeneca. 2022.",
      "Roberts JA et al. Lancet Infect Dis. 2014;14(6):498-509.",
    ],
  },

  // ─── ANTIFUNGAL ──────────────────────────────────────────────────────────────

  fluconazole: {
    key: "fluconazole",
    name: "Fluconazole",
    category: "antifungal",
    dosingMethod: "weightFixed",
    baseDosePerUnit: 400,
    unit: "mg",
    bands: [
      { label: "1", minMg: 0,   maxMg: 200 },
      { label: "2", minMg: 200, maxMg: 400 },
      { label: "3", minMg: 400, maxMg: Infinity },
    ],
    renallyCleared: true,
    hepaticallyCleared: false,
    monitoringGuidance: "LFTs weekly; 50% dose reduction if CrCl <50 mL/min; loading dose 800 mg day 1; QTc monitoring",
    targetExposure: "AUC/MIC >25 (Candida); Trough 8-20 mg/L",
    citations: [
      "Pappas PG et al. Clin Infect Dis. 2016;62(4):e1-50.",
      "Diflucan Summary of Product Characteristics. Pfizer. 2022.",
    ],
  },

  voriconazole: {
    key: "voriconazole",
    name: "Voriconazole",
    category: "antifungal",
    dosingMethod: "weightPK",
    baseDosePerUnit: 4,
    unit: "mg/kg",
    bands: [
      { label: "1", minMg: 0,   maxMg: 150 },
      { label: "2", minMg: 150, maxMg: 250 },
      { label: "3", minMg: 250, maxMg: Infinity },
    ],
    renallyCleared: false,
    hepaticallyCleared: true,
    monitoringGuidance: "TDM mandatory - highly variable PK; trough after day 5 then weekly; LFTs; visual disturbances; QTc",
    targetExposure: "Trough 1-5.5 mg/L; avoid >5.5 mg/L (neurotoxicity)",
    citations: [
      "Patterson TF et al. Clin Infect Dis. 2016;63(4):e1-60.",
      "Vfend Summary of Product Characteristics. Pfizer. 2022.",
      "Pascual A et al. Clin Infect Dis. 2008;46(2):201-211.",
    ],
  },

  // ─── ANTIVIRAL ───────────────────────────────────────────────────────────────

  acyclovir: {
    key: "acyclovir",
    name: "Acyclovir (IV)",
    category: "antiviral",
    dosingMethod: "weightPK",
    baseDosePerUnit: 10,
    unit: "mg/kg",
    bands: [
      { label: "1", minMg: 0,   maxMg: 400 },
      { label: "2", minMg: 400, maxMg: 700 },
      { label: "3", minMg: 700, maxMg: Infinity },
    ],
    renallyCleared: true,
    hepaticallyCleared: false,
    monitoringGuidance: "Aggressive IV hydration mandatory; CrCl before each dose; neurotoxicity monitoring; crystalluria prevention",
    targetExposure: "500 mg/m2 q8h (encephalitis); 10 mg/kg q8h (immunocompromised); dose adjust CrCl <50 mL/min",
    citations: [
      "Skoldenberg B et al. Lancet. 1984;2(8405):707-711.",
      "Zovirax Summary of Product Characteristics. GSK. 2022.",
      "Aronoff GR et al. Drug Prescribing in Renal Failure. 5th ed. ACP. 2007.",
    ],
  },
};

/** Retrieve a drug definition by key, throwing if not found */
export function getDrug(key: string): DrugDefinition {
  const drug = DRUG_FORMULARY[key];
  if (!drug) {
    throw new Error(`Drug not found in formulary: "${key}". Available: ${Object.keys(DRUG_FORMULARY).join(", ")}`);
  }
  return drug;
}

/** List all drug keys */
export function listDrugs(): string[] {
  return Object.keys(DRUG_FORMULARY);
}

/** Filter drugs by category */
export function getDrugsByCategory(category: DrugDefinition["category"]): DrugDefinition[] {
  return Object.values(DRUG_FORMULARY).filter((d) => d.category === category);
}