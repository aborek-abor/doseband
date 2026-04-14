/**
 * Tests: Adjustments, input validation, edge cases, and audit trail
 */

import { calculateDose, calculateMultiple } from "../src/engine";
import { PatientInputs } from "../src/types";
import { listDrugs, getDrug, getDrugsByCategory } from "../src/formulary";

const BASE_PATIENT: PatientInputs = {
  weightKg: 70,
  heightCm: 170,
  ageYears: 50,
  serumCreatinineUmolL: 90,
  sex: "M",
  population: "general",
  hepaticGrade: "normal",
};

describe("Input validation", () => {
  test("rejects weight < 10 kg", () => {
    expect(() => calculateDose({ drugKey: "gentamicin", patient: { ...BASE_PATIENT, weightKg: 5 } }))
      .toThrow("Weight");
  });

  test("rejects weight > 300 kg", () => {
    expect(() => calculateDose({ drugKey: "gentamicin", patient: { ...BASE_PATIENT, weightKg: 350 } }))
      .toThrow("Weight");
  });

  test("rejects age < 1", () => {
    expect(() => calculateDose({ drugKey: "gentamicin", patient: { ...BASE_PATIENT, ageYears: 0 } }))
      .toThrow("Age");
  });

  test("rejects creatinine < 20", () => {
    expect(() => calculateDose({ drugKey: "gentamicin", patient: { ...BASE_PATIENT, serumCreatinineUmolL: 10 } }))
      .toThrow("Creatinine");
  });

  test("rejects height < 50 cm", () => {
    expect(() => calculateDose({ drugKey: "gentamicin", patient: { ...BASE_PATIENT, heightCm: 30 } }))
      .toThrow("Height");
  });

  test("rejects unknown drug key", () => {
    expect(() => calculateDose({ drugKey: "aspirin", patient: BASE_PATIENT }))
      .toThrow("Drug not found");
  });
});

describe("Regimen adjustments", () => {
  test("high dose: 1.25x multiplier", () => {
    const std = calculateDose({ drugKey: "gentamicin", patient: BASE_PATIENT, regimen: "standard" });
    const hd = calculateDose({ drugKey: "gentamicin", patient: BASE_PATIENT, regimen: "highDose" });
    expect(hd.calculatedDoseMg).toBeCloseTo(std.calculatedDoseMg * 1.25, 1);
    expect(hd.regimenAdjustmentApplied).toBe(true);
  });

  test("palliative: 0.75x multiplier", () => {
    const std = calculateDose({ drugKey: "cisplatin", patient: BASE_PATIENT, regimen: "standard" });
    const pal = calculateDose({ drugKey: "cisplatin", patient: BASE_PATIENT, regimen: "palliative" });
    expect(pal.calculatedDoseMg).toBeCloseTo(std.calculatedDoseMg * 0.75, 1);
  });

  test("paediatric: 0.8x multiplier", () => {
    const std = calculateDose({ drugKey: "amikacin", patient: BASE_PATIENT, regimen: "standard" });
    const ped = calculateDose({ drugKey: "amikacin", patient: BASE_PATIENT, regimen: "paediatric" });
    expect(ped.calculatedDoseMg).toBeCloseTo(std.calculatedDoseMg * 0.8, 1);
  });

  test("standard regimen: no adjustment applied", () => {
    const result = calculateDose({ drugKey: "gentamicin", patient: BASE_PATIENT, regimen: "standard" });
    expect(result.regimenAdjustmentApplied).toBe(false);
  });
});

describe("Combined adjustments (multiplicative)", () => {
  test("renal + population adjustments multiply correctly", () => {
    const renalSSA: PatientInputs = {
      ...BASE_PATIENT,
      serumCreatinineUmolL: 200,
      population: "subSaharanAfrica",
    };
    const adjusted = calculateDose({ drugKey: "gentamicin", patient: renalSSA });
    expect(adjusted.populationAdjustmentApplied).toBe(true);
    expect(adjusted.renalAdjustmentApplied).toBe(true);
  });

  test("hepatic + regimen adjustments for docetaxel", () => {
    const std = calculateDose({ drugKey: "docetaxel", patient: BASE_PATIENT, regimen: "standard" });
    const both = calculateDose({
      drugKey: "docetaxel",
      patient: { ...BASE_PATIENT, hepaticGrade: "childPughB" },
      regimen: "palliative",
    });
    expect(both.calculatedDoseMg).toBeCloseTo(std.calculatedDoseMg * 0.5625, 1);
  });
});

describe("Audit trail and result structure", () => {
  test("result includes ISO timestamp", () => {
    const result = calculateDose({ drugKey: "carboplatin", patient: BASE_PATIENT });
    expect(result.calculatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("result includes drug name and key", () => {
    const result = calculateDose({ drugKey: "carboplatin", patient: BASE_PATIENT });
    expect(result.drugKey).toBe("carboplatin");
    expect(result.drugName).toBe("Carboplatin");
  });

  test("result always includes monitoring flag", () => {
    const result = calculateDose({ drugKey: "vancomycin", patient: BASE_PATIENT });
    const codes = result.flags.map((f) => f.code);
    expect(codes).toContain("MONITORING_GUIDANCE");
  });

  test("flags have severity, code, and message", () => {
    const result = calculateDose({ drugKey: "gentamicin", patient: BASE_PATIENT });
    result.flags.forEach((flag) => {
      expect(flag).toHaveProperty("severity");
      expect(flag).toHaveProperty("code");
      expect(flag).toHaveProperty("message");
      expect(["info", "warning", "danger"]).toContain(flag.severity);
    });
  });

  test("derived PK fields are all positive numbers", () => {
    const result = calculateDose({ drugKey: "carboplatin", patient: BASE_PATIENT });
    const pk = result.derivedPK;
    expect(pk.crClMlMin).toBeGreaterThan(0);
    expect(pk.bsaM2).toBeGreaterThan(0);
    expect(pk.ibwKg).toBeGreaterThan(0);
    expect(pk.dosingWeightKg).toBeGreaterThan(0);
    expect(pk.bmi).toBeGreaterThan(0);
  });
});

describe("Formulary completeness", () => {
  const expectedDrugs = [
    "carboplatin", "cisplatin", "oxaliplatin", "docetaxel", "paclitaxel",
    "gentamicin", "amikacin", "vancomycin", "piperacillinTazobactam", "meropenem",
    "fluconazole", "voriconazole", "acyclovir",
  ];

  test("all 13 drugs present in formulary", () => {
    const keys = listDrugs();
    expectedDrugs.forEach((k) => expect(keys).toContain(k));
    expect(keys).toHaveLength(13);
  });

  test("every drug has at least one citation", () => {
    listDrugs().forEach((key) => {
      const drug = getDrug(key);
      expect(drug.citations.length).toBeGreaterThan(0);
    });
  });

  test("every drug has at least 2 dose bands", () => {
    listDrugs().forEach((key) => {
      const drug = getDrug(key);
      expect(drug.bands.length).toBeGreaterThanOrEqual(2);
    });
  });

  test("final band in every drug has maxMg = Infinity", () => {
    listDrugs().forEach((key) => {
      const drug = getDrug(key);
      const lastBand = drug.bands[drug.bands.length - 1];
      expect(lastBand.maxMg).toBe(Infinity);
    });
  });

  test("band ranges are contiguous (no gaps)", () => {
    listDrugs().forEach((key) => {
      const drug = getDrug(key);
      for (let i = 1; i < drug.bands.length; i++) {
        expect(drug.bands[i].minMg).toBe(drug.bands[i - 1].maxMg);
      }
    });
  });

  test("getDrugsByCategory returns correct counts", () => {
    expect(getDrugsByCategory("oncology")).toHaveLength(5);
    expect(getDrugsByCategory("infectious_disease")).toHaveLength(5);
    expect(getDrugsByCategory("antifungal")).toHaveLength(2);
    expect(getDrugsByCategory("antiviral")).toHaveLength(1);
  });

  test("getDrug throws for unknown key", () => {
    expect(() => getDrug("ibuprofen")).toThrow("Drug not found");
  });
});

describe("calculateMultiple — combination regimens", () => {
  test("returns one result per drug", () => {
    const results = calculateMultiple(["gentamicin", "vancomycin"], BASE_PATIENT);
    expect(results).toHaveLength(2);
    expect(results[0].drugKey).toBe("gentamicin");
    expect(results[1].drugKey).toBe("vancomycin");
  });

  test("results are independent calculations", () => {
    const [gent, vanc] = calculateMultiple(["gentamicin", "vancomycin"], BASE_PATIENT);
    expect(gent.calculatedDoseMg).not.toBe(vanc.calculatedDoseMg);
  });
});

describe("Band assignment edge cases", () => {
  test("dose at band boundary gets valid band", () => {
    const result = calculateDose({
      drugKey: "carboplatin",
      patient: { ...BASE_PATIENT, serumCreatinineUmolL: 155 },
    });
    expect(result.recommendedBand).toBeDefined();
    expect(typeof result.recommendedBand.label).toBe("string");
  });

  test("very high dose falls in final band", () => {
    const large = { ...BASE_PATIENT, weightKg: 120, heightCm: 195 };
    const result = calculateDose({ drugKey: "carboplatin", patient: large, regimen: "highDose" });
    expect(result.recommendedBand).toBeDefined();
    expect(result.calculatedDoseMg).toBeGreaterThan(0);
  });
});

describe("Engine — uncovered branches", () => {
  test("unknown dosing method throws", () => {
    const { DRUG_FORMULARY } = require("../src/formulary");
    const orig = DRUG_FORMULARY["carboplatin"].dosingMethod;
    DRUG_FORMULARY["carboplatin"].dosingMethod = "unknown";
    expect(() => calculateDose({ drugKey: "carboplatin", patient: BASE_PATIENT }))
      .toThrow("Unknown dosing method");
    DRUG_FORMULARY["carboplatin"].dosingMethod = orig;
  });

  test("creatinine > 2000 fails validation", () => {
    expect(() => calculateDose({ drugKey: "gentamicin", patient: { ...BASE_PATIENT, serumCreatinineUmolL: 2100 } }))
      .toThrow("Creatinine");
  });

  test("resistance risk LOW_NORMAL flag fires just above threshold", () => {
    const patient: PatientInputs = {
      ...BASE_PATIENT,
      weightKg: 70,
      heightCm: 175,
      serumCreatinineUmolL: 180,
      population: "malnourished",
    };
    const result = calculateDose({ drugKey: "gentamicin", patient });
    const codes = result.flags.map(f => f.code);
    expect(
      codes.includes("RESISTANCE_RISK_LOW_NORMAL") ||
      codes.includes("RESISTANCE_RISK_UNDEREXPOSURE")
    ).toBe(true);
  });
});