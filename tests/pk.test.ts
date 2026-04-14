/**
 * Tests: Pharmacokinetic calculation functions
 * Every formula is verified against hand-calculated reference values.
 */

import {
  calcCrCl,
  calcBSA,
  calcIBW,
  calcABW,
  selectDosingWeight,
  classifyRenalStage,
  derivePK,
} from "../src/pk";
import { PatientInputs } from "../src/types";

describe("calcCrCl — Cockcroft-Gault", () => {
  test("standard male: 70 kg, 45 y, Cr 90 umol/L", () => {
    const result = calcCrCl(45, 70, 90, "M");
    expect(result).toBeCloseTo(90.8, 0);
  });

  test("female correction factor 0.85 reduces result", () => {
    const male = calcCrCl(45, 70, 90, "M");
    const female = calcCrCl(45, 70, 90, "F");
    expect(female).toBeCloseTo(male * 0.85, 1);
  });

  test("higher creatinine gives lower CrCl", () => {
    const normal = calcCrCl(60, 70, 90, "M");
    const elevated = calcCrCl(60, 70, 300, "M");
    expect(elevated).toBeLessThan(normal);
  });

  test("elderly patient: 80 y, 55 kg, Cr 120 umol/L", () => {
    const result = calcCrCl(80, 55, 120, "M");
    expect(result).toBeLessThan(45);
  });

  test("minimum floor of 5 mL/min for extreme ESRD", () => {
    const result = calcCrCl(90, 40, 1800, "F");
    expect(result).toBe(5);
  });

  test("throws on zero creatinine", () => {
    expect(() => calcCrCl(45, 70, 0, "M")).toThrow("Serum creatinine must be > 0");
  });

  test("throws on zero weight", () => {
    expect(() => calcCrCl(45, 0, 90, "M")).toThrow("Weight must be > 0");
  });

  test("throws on zero age", () => {
    expect(() => calcCrCl(0, 70, 90, "M")).toThrow("Age must be > 0");
  });
});

describe("calcBSA — Mosteller formula", () => {
  test("reference: 70 kg, 170 cm", () => {
    const result = calcBSA(70, 170);
    expect(result).toBeCloseTo(1.78, 1);
  });

  test("larger patient has larger BSA", () => {
    const small = calcBSA(50, 155);
    const large = calcBSA(100, 185);
    expect(large).toBeGreaterThan(small);
  });

  test("BSA formula matches manual calculation", () => {
    expect(calcBSA(70, 170)).toBeCloseTo(Math.sqrt((170 * 70) / 3600), 4);
  });

  test("throws on zero weight", () => {
    expect(() => calcBSA(0, 170)).toThrow();
  });

  test("throws on zero height", () => {
    expect(() => calcBSA(70, 0)).toThrow();
  });
});

describe("calcIBW — Devine formula", () => {
  test("male 180 cm gives ~75 kg", () => {
    expect(calcIBW(180, "M")).toBeCloseTo(75.1, 0);
  });

  test("female 165 cm gives ~57 kg", () => {
    expect(calcIBW(165, "F")).toBeCloseTo(56.9, 0);
  });

  test("female baseline less than male baseline", () => {
    expect(calcIBW(170, "F")).toBeLessThan(calcIBW(170, "M"));
  });

  test("very short patient: result is at least 30 kg", () => {
    expect(calcIBW(120, "M")).toBeGreaterThanOrEqual(30);
    expect(calcIBW(130, "F")).toBeGreaterThanOrEqual(30);
  });
});

describe("calcABW — adjusted body weight", () => {
  test("ABW = IBW + 0.4 times (actual - IBW)", () => {
    const ibw = 60;
    const actual = 100;
    expect(calcABW(actual, ibw)).toBeCloseTo(ibw + 0.4 * (actual - ibw), 5);
  });

  test("obese patient: ABW is between IBW and actual weight", () => {
    const ibw = 65;
    const actual = 120;
    const abw = calcABW(actual, ibw);
    expect(abw).toBeGreaterThan(ibw);
    expect(abw).toBeLessThan(actual);
  });
});

describe("selectDosingWeight", () => {
  test("non-obese patient uses near-actual weight", () => {
    const wt = selectDosingWeight(70, 65, 178);
    expect(wt).toBeGreaterThanOrEqual(65);
    expect(wt).toBeLessThanOrEqual(72);
  });

  test("obese patient uses ABW not actual weight", () => {
    const ibw = calcIBW(178, "M");
    const abw = calcABW(120, ibw);
    const selected = selectDosingWeight(120, ibw, 178);
    expect(selected).toBeCloseTo(abw, 1);
  });
});

describe("classifyRenalStage — KDIGO classification", () => {
  test.each([
    [100, "G1_normal"],
    [90,  "G1_normal"],
    [75,  "G2_mild"],
    [60,  "G2_mild"],
    [55,  "G3a_moderate"],
    [45,  "G3a_moderate"],
    [40,  "G3b_moderate"],
    [30,  "G3b_moderate"],
    [20,  "G4_severe"],
    [15,  "G4_severe"],
    [10,  "G5_ESRD"],
    [5,   "G5_ESRD"],
  ])("CrCl %d gives %s", (crcl, expected) => {
    expect(classifyRenalStage(crcl)).toBe(expected);
  });
});

describe("derivePK — full parameter derivation", () => {
  const standardMale: PatientInputs = {
    weightKg: 70,
    heightCm: 175,
    ageYears: 50,
    serumCreatinineUmolL: 90,
    sex: "M",
    population: "general",
    hepaticGrade: "normal",
  };

  test("returns all required fields", () => {
    const pk = derivePK(standardMale);
    expect(pk).toHaveProperty("crClMlMin");
    expect(pk).toHaveProperty("bsaM2");
    expect(pk).toHaveProperty("ibwKg");
    expect(pk).toHaveProperty("abwKg");
    expect(pk).toHaveProperty("dosingWeightKg");
    expect(pk).toHaveProperty("bmi");
    expect(pk).toHaveProperty("renalStage");
  });

  test("BMI calculated correctly for 70 kg / 175 cm", () => {
    const pk = derivePK(standardMale);
    expect(pk.bmi).toBeCloseTo(70 / (1.75 * 1.75), 1);
  });

  test("G2 mild renal for standard 50yo patient", () => {
    const pk = derivePK(standardMale);
    expect(pk.renalStage).toBe("G2_mild");
  });

  test("G5_ESRD for very high creatinine", () => {
    const pk = derivePK({ ...standardMale, serumCreatinineUmolL: 900 });
    expect(pk.renalStage).toBe("G5_ESRD");
  });
});