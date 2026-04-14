/**
 * Tests: All 13 drugs — dose calculation and band assignment
 */

import { calculateDose } from "../src/engine";
import { PatientInputs } from "../src/types";

const STANDARD_PATIENT: PatientInputs = {
  weightKg: 70,
  heightCm: 170,
  ageYears: 50,
  serumCreatinineUmolL: 90,
  sex: "M",
  population: "general",
  hepaticGrade: "normal",
};

describe("Carboplatin — Calvert formula", () => {
  test("standard patient: dose = AUC 5 x (CrCl + 25)", () => {
    const result = calculateDose({ drugKey: "carboplatin", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(5 * (result.derivedPK.crClMlMin + 25), 1);
  });

  test("assigns Band C for standard patient", () => {
    const result = calculateDose({ drugKey: "carboplatin", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(5 * (result.derivedPK.crClMlMin + 25), 1);
    expect(result.recommendedBand.label).toBe("C");
  });

  test("severe renal impairment reduces dose significantly", () => {
    const renalPatient = { ...STANDARD_PATIENT, serumCreatinineUmolL: 450 };
    const normal = calculateDose({ drugKey: "carboplatin", patient: STANDARD_PATIENT });
    const renal = calculateDose({ drugKey: "carboplatin", patient: renalPatient });
    expect(renal.calculatedDoseMg).toBeLessThan(normal.calculatedDoseMg);
  });

  test("elderly population adjustment reduces dose", () => {
    const elderly = { ...STANDARD_PATIENT, ageYears: 75, population: "elderly" as const };
    const eldResult = calculateDose({ drugKey: "carboplatin", patient: elderly });
    expect(eldResult.populationAdjustmentApplied).toBe(true);
    expect(eldResult.populationAdjustmentRatio).toBe(0.85);
  });

  test("high-dose regimen increases dose by 25%", () => {
    const std = calculateDose({ drugKey: "carboplatin", patient: STANDARD_PATIENT, regimen: "standard" });
    const hd = calculateDose({ drugKey: "carboplatin", patient: STANDARD_PATIENT, regimen: "highDose" });
    expect(hd.calculatedDoseMg).toBeCloseTo(std.calculatedDoseMg * 1.25, 1);
  });
});

describe("Cisplatin — BSA-based", () => {
  test("standard patient: dose = 75 mg/m2 x BSA", () => {
    const result = calculateDose({ drugKey: "cisplatin", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(75 * result.derivedPK.bsaM2, 1);
  });

  test("renal adjustment flag present for CrCl < 60", () => {
    const renal = { ...STANDARD_PATIENT, serumCreatinineUmolL: 200 };
    const result = calculateDose({ drugKey: "cisplatin", patient: renal });
    const codes = result.flags.map((f) => f.code);
    expect(codes).toContain("RENAL_G3_MODERATE");
  });

  test("palliative regimen reduces dose by 25%", () => {
    const std = calculateDose({ drugKey: "cisplatin", patient: STANDARD_PATIENT });
    const pal = calculateDose({ drugKey: "cisplatin", patient: STANDARD_PATIENT, regimen: "palliative" });
    expect(pal.calculatedDoseMg).toBeCloseTo(std.calculatedDoseMg * 0.75, 1);
  });
});

describe("Oxaliplatin — BSA-based", () => {
  test("standard patient: dose = 85 mg/m2 x BSA", () => {
    const result = calculateDose({ drugKey: "oxaliplatin", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(85 * result.derivedPK.bsaM2, 1);
  });

  test("dose in Band 3 for average patient", () => {
    const result = calculateDose({ drugKey: "oxaliplatin", patient: STANDARD_PATIENT });
    expect(result.recommendedBand.label).toBe("3");
  });
});

describe("Docetaxel — BSA-based, hepatically cleared", () => {
  test("Child-Pugh B reduces dose by 25%", () => {
    const hepatic = { ...STANDARD_PATIENT, hepaticGrade: "childPughB" as const };
    const std = calculateDose({ drugKey: "docetaxel", patient: STANDARD_PATIENT });
    const hep = calculateDose({ drugKey: "docetaxel", patient: hepatic });
    expect(hep.calculatedDoseMg).toBeCloseTo(std.calculatedDoseMg * 0.75, 1);
    expect(hep.hepaticAdjustmentApplied).toBe(true);
  });

  test("Child-Pugh C reduces dose by 50% and flags danger", () => {
    const hepatic = { ...STANDARD_PATIENT, hepaticGrade: "childPughC" as const };
    const std = calculateDose({ drugKey: "docetaxel", patient: STANDARD_PATIENT });
    const hep = calculateDose({ drugKey: "docetaxel", patient: hepatic });
    expect(hep.calculatedDoseMg).toBeCloseTo(std.calculatedDoseMg * 0.5, 1);
    const dangerFlags = hep.flags.filter((f) => f.severity === "danger");
    expect(dangerFlags.length).toBeGreaterThan(0);
    expect(dangerFlags[0].code).toBe("HEPATIC_CHILD_PUGH_C");
  });

  test("renal impairment does NOT adjust dose", () => {
    const renal = { ...STANDARD_PATIENT, serumCreatinineUmolL: 400 };
    const std = calculateDose({ drugKey: "docetaxel", patient: STANDARD_PATIENT });
    const ren = calculateDose({ drugKey: "docetaxel", patient: renal });
    expect(ren.renalAdjustmentApplied).toBe(false);
    expect(std.calculatedDoseMg).toBeCloseTo(ren.calculatedDoseMg, 0);
  });
});

describe("Paclitaxel — BSA-based, hepatically cleared", () => {
  test("standard patient: dose = 175 mg/m2 x BSA", () => {
    const result = calculateDose({ drugKey: "paclitaxel", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(175 * result.derivedPK.bsaM2, 1);
  });

  test("hepatic impairment reduces dose", () => {
    const hepatic = { ...STANDARD_PATIENT, hepaticGrade: "childPughB" as const };
    const std = calculateDose({ drugKey: "paclitaxel", patient: STANDARD_PATIENT });
    const hep = calculateDose({ drugKey: "paclitaxel", patient: hepatic });
    expect(hep.calculatedDoseMg).toBeLessThan(std.calculatedDoseMg);
  });
});

describe("Gentamicin — weight-based, ODD", () => {
  test("dose = 5 mg/kg x dosing weight", () => {
    const result = calculateDose({ drugKey: "gentamicin", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(5 * result.derivedPK.dosingWeightKg, 0);
  });

  test("sub-Saharan Africa adjustment reduces dose by 13%", () => {
    const ssa = { ...STANDARD_PATIENT, population: "subSaharanAfrica" as const };
    const gen = calculateDose({ drugKey: "gentamicin", patient: STANDARD_PATIENT });
    const ssaResult = calculateDose({ drugKey: "gentamicin", patient: ssa });
    expect(ssaResult.calculatedDoseMg).toBeCloseTo(gen.calculatedDoseMg * 0.87, 1);
    expect(ssaResult.populationAdjustmentRatio).toBe(0.87);
  });

  test("pregnancy increases dose by 35%", () => {
    const preg = { ...STANDARD_PATIENT, sex: "F" as const, population: "pregnant" as const };
    const pregResult = calculateDose({ drugKey: "gentamicin", patient: preg });
    expect(pregResult.populationAdjustmentRatio).toBe(1.35);
  });

  test("malnutrition reduces dose by 15%", () => {
    const mal = { ...STANDARD_PATIENT, population: "malnourished" as const };
    const gen = calculateDose({ drugKey: "gentamicin", patient: STANDARD_PATIENT });
    const malResult = calculateDose({ drugKey: "gentamicin", patient: mal });
    expect(malResult.calculatedDoseMg).toBeCloseTo(gen.calculatedDoseMg * 0.85, 1);
  });

  test("resistance risk flag triggered", () => {
    const renalMal = {
      ...STANDARD_PATIENT,
      weightKg: 40,
      heightCm: 155,
      serumCreatinineUmolL: 450,
      population: "malnourished" as const,
    };
    const result = calculateDose({ drugKey: "gentamicin", patient: renalMal });
    const codes = result.flags.map((f) => f.code);
    const hasResistanceFlag = codes.includes("RESISTANCE_RISK_UNDEREXPOSURE") ||
                              codes.includes("RESISTANCE_RISK_LOW_NORMAL");
    expect(hasResistanceFlag).toBe(true);
  });

  test("G5 ESRD triggers danger flag", () => {
    const renal = { ...STANDARD_PATIENT, serumCreatinineUmolL: 600 };
    const result = calculateDose({ drugKey: "gentamicin", patient: renal });
    const codes = result.flags.map((f) => f.code);
    expect(codes).toContain("RENAL_G5_ESRD");
  });
});

describe("Amikacin — weight-based, ODD", () => {
  test("dose = 15 mg/kg x dosing weight", () => {
    const result = calculateDose({ drugKey: "amikacin", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(15 * result.derivedPK.dosingWeightKg, 0);
  });

  test("sub-Saharan Africa adjustment applied", () => {
    const ssa = { ...STANDARD_PATIENT, population: "subSaharanAfrica" as const };
    const result = calculateDose({ drugKey: "amikacin", patient: ssa });
    expect(result.populationAdjustmentApplied).toBe(true);
    expect(result.populationAdjustmentRatio).toBe(0.87);
  });

  test("resistance threshold is 10 mg/kg", () => {
    const { DRUG_FORMULARY } = require("../src/formulary");
    expect(DRUG_FORMULARY["amikacin"].resistanceThresholdMgPerKg).toBe(10.0);
  });

  test("renal impairment reduces dose", () => {
    const renal = { ...STANDARD_PATIENT, serumCreatinineUmolL: 300 };
    const norm = calculateDose({ drugKey: "amikacin", patient: STANDARD_PATIENT });
    const renResult = calculateDose({ drugKey: "amikacin", patient: renal });
    expect(renResult.calculatedDoseMg).toBeLessThan(norm.calculatedDoseMg);
  });
});

describe("Vancomycin — weight-based", () => {
  test("dose = 15 mg/kg x dosing weight", () => {
    const result = calculateDose({ drugKey: "vancomycin", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(15 * result.derivedPK.dosingWeightKg, 0);
  });

  test("HIV+ adjustment reduces dose and flags warning", () => {
    const hiv = { ...STANDARD_PATIENT, population: "hivPositive" as const };
    const std = calculateDose({ drugKey: "vancomycin", patient: STANDARD_PATIENT });
    const hivResult = calculateDose({ drugKey: "vancomycin", patient: hiv });
    expect(hivResult.calculatedDoseMg).toBeLessThan(std.calculatedDoseMg);
    const codes = hivResult.flags.map((f) => f.code);
    expect(codes).toContain("POP_HIV_VANCOMYCIN");
  });

  test("concurrent nephrotoxin adds warning flag", () => {
    const nephro = { ...STANDARD_PATIENT, concurrentNephrotoxins: true };
    const result = calculateDose({ drugKey: "vancomycin", patient: nephro });
    const codes = result.flags.map((f) => f.code);
    expect(codes).toContain("CONCURRENT_NEPHROTOXIN");
  });

  test("bands cover 5 tiers", () => {
    const { DRUG_FORMULARY } = require("../src/formulary");
    expect(DRUG_FORMULARY["vancomycin"].bands).toHaveLength(5);
  });
});

describe("Piperacillin-Tazobactam — fixed dose", () => {
  test("base dose = 4500 mg before adjustments", () => {
    const result = calculateDose({ drugKey: "piperacillinTazobactam", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(4500, 0);
  });

  test("severe renal impairment reduces dose", () => {
    const renal = { ...STANDARD_PATIENT, serumCreatinineUmolL: 500 };
    const result = calculateDose({ drugKey: "piperacillinTazobactam", patient: renal });
    expect(result.calculatedDoseMg).toBeLessThan(4500);
    expect(result.renalAdjustmentApplied).toBe(true);
  });
});

describe("Meropenem — fixed dose", () => {
  test("base dose = 1000 mg before adjustments", () => {
    const result = calculateDose({ drugKey: "meropenem", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(1000, 0);
  });

  test("ESRD reduces dose to 35% of base", () => {
    const esrd = { ...STANDARD_PATIENT, serumCreatinineUmolL: 1000 };
    const result = calculateDose({ drugKey: "meropenem", patient: esrd });
    expect(result.calculatedDoseMg).toBeCloseTo(1000 * 0.35, 0);
  });
});

describe("Fluconazole — fixed dose, renally cleared", () => {
  test("base dose = 400 mg at normal renal function", () => {
    const result = calculateDose({ drugKey: "fluconazole", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(400, 0);
  });

  test("moderate renal impairment reduces dose by 20%", () => {
    const renal = { ...STANDARD_PATIENT, serumCreatinineUmolL: 200 };
    const result = calculateDose({ drugKey: "fluconazole", patient: renal });
    expect(result.calculatedDoseMg).toBeCloseTo(400 * 0.8, 0);
  });
});

describe("Voriconazole — weight-based, hepatically cleared", () => {
  test("dose = 4 mg/kg x dosing weight", () => {
    const result = calculateDose({ drugKey: "voriconazole", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(4 * result.derivedPK.dosingWeightKg, 0);
  });

  test("hepatic impairment reduces dose for Child-Pugh B", () => {
    const hep = { ...STANDARD_PATIENT, hepaticGrade: "childPughB" as const };
    const std = calculateDose({ drugKey: "voriconazole", patient: STANDARD_PATIENT });
    const hepResult = calculateDose({ drugKey: "voriconazole", patient: hep });
    expect(hepResult.calculatedDoseMg).toBeCloseTo(std.calculatedDoseMg * 0.75, 1);
  });

  test("renal impairment does NOT reduce dose", () => {
    const renal = { ...STANDARD_PATIENT, serumCreatinineUmolL: 350 };
    const std = calculateDose({ drugKey: "voriconazole", patient: STANDARD_PATIENT });
    const renResult = calculateDose({ drugKey: "voriconazole", patient: renal });
    expect(renResult.renalAdjustmentApplied).toBe(false);
    expect(std.calculatedDoseMg).toBeCloseTo(renResult.calculatedDoseMg, 0);
  });
});

describe("Acyclovir — weight-based, renally cleared", () => {
  test("dose = 10 mg/kg x dosing weight", () => {
    const result = calculateDose({ drugKey: "acyclovir", patient: STANDARD_PATIENT });
    expect(result.calculatedDoseMg).toBeCloseTo(10 * result.derivedPK.dosingWeightKg, 0);
  });

  test("G4 severe renal impairment triggers danger flag", () => {
    const renal = { ...STANDARD_PATIENT, serumCreatinineUmolL: 450 };
    const result = calculateDose({ drugKey: "acyclovir", patient: renal });
    const codes = result.flags.map((f) => f.code);
    expect(codes).toContain("RENAL_G4_SEVERE");
  });
});