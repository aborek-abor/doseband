/**
 * DoseBand — Synthetic Patient Generator
 *
 * Produces deterministic, reproducible synthetic patient inputs covering:
 *   - Full continuous input ranges (boundary sweeping)
 *   - All population x drug x hepatic grade combinations
 *   - Edge cases: extreme renal failure, obesity, short stature, elderly
 *   - Resistance threshold boundary patients
 *
 * No real patient data is used. All patients are algorithmically generated.
 */

import { PatientInputs, PopulationContext, HepaticGrade, Sex } from "../src/types";

export interface SyntheticPatient {
  id: string;
  label: string;
  inputs: PatientInputs;
  category: "boundary" | "combinatorial" | "edge_case" | "resistance_boundary";
}

class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) & 0xffffffff;
    return (this.seed >>> 0) / 0xffffffff;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

const POPULATIONS: PopulationContext[] = [
  "general", "subSaharanAfrica", "hivPositive",
  "malnourished", "pregnant", "elderly",
];

const HEPATIC_GRADES: HepaticGrade[] = [
  "normal", "childPughA", "childPughB", "childPughC",
];

const SEXES: Sex[] = ["M", "F"];

export function generateBoundarySweep(): SyntheticPatient[] {
  const patients: SyntheticPatient[] = [];

  for (let wt = 20; wt <= 280; wt += 20) {
    patients.push({
      id: `boundary_wt_${wt}`,
      label: `Weight sweep: ${wt} kg`,
      category: "boundary",
      inputs: {
        weightKg: wt, heightCm: 170, ageYears: 50,
        serumCreatinineUmolL: 90, sex: "M",
        population: "general", hepaticGrade: "normal",
      },
    });
  }

  for (let cr = 20; cr <= 1800; cr += 60) {
    patients.push({
      id: `boundary_cr_${cr}`,
      label: `Creatinine sweep: ${cr}`,
      category: "boundary",
      inputs: {
        weightKg: 70, heightCm: 170, ageYears: 55,
        serumCreatinineUmolL: cr, sex: "M",
        population: "general", hepaticGrade: "normal",
      },
    });
  }

  for (let age = 18; age <= 90; age += 6) {
    patients.push({
      id: `boundary_age_${age}`,
      label: `Age sweep: ${age} years`,
      category: "boundary",
      inputs: {
        weightKg: 68, heightCm: 168, ageYears: age,
        serumCreatinineUmolL: 85, sex: "F",
        population: "general", hepaticGrade: "normal",
      },
    });
  }

  for (let ht = 140; ht <= 200; ht += 5) {
    patients.push({
      id: `boundary_ht_${ht}`,
      label: `Height sweep: ${ht} cm`,
      category: "boundary",
      inputs: {
        weightKg: 70, heightCm: ht, ageYears: 45,
        serumCreatinineUmolL: 90, sex: "M",
        population: "general", hepaticGrade: "normal",
      },
    });
  }

  const bsaWeights = [45, 60, 75, 90, 110, 130];
  const bsaHeights = [150, 160, 170, 180, 190];
  for (const w of bsaWeights) {
    for (const h of bsaHeights) {
      patients.push({
        id: `boundary_bsa_${w}_${h}`,
        label: `BSA grid: ${w}kg/${h}cm`,
        category: "boundary",
        inputs: {
          weightKg: w, heightCm: h, ageYears: 52,
          serumCreatinineUmolL: 88, sex: "F",
          population: "general", hepaticGrade: "normal",
        },
      });
    }
  }

  return patients;
}

export function generateCombinatorialMatrix(): SyntheticPatient[] {
  const patients: SyntheticPatient[] = [];
  let i = 0;

  for (const pop of POPULATIONS) {
    for (const sex of SEXES) {
      for (const hep of HEPATIC_GRADES) {
        if (pop === "pregnant" && sex === "M") continue;

        patients.push({
          id: `combo_${pop}_${sex}_${hep}_${i++}`,
          label: `Combo: ${pop} / ${sex} / ${hep}`,
          category: "combinatorial",
          inputs: {
            weightKg: 65, heightCm: 165, ageYears: 45,
            serumCreatinineUmolL: 88, sex,
            population: pop, hepaticGrade: hep,
          },
        });

        patients.push({
          id: `combo_renal_${pop}_${sex}_${hep}_${i++}`,
          label: `Combo+renal: ${pop} / ${sex} / ${hep}`,
          category: "combinatorial",
          inputs: {
            weightKg: 65, heightCm: 165, ageYears: 45,
            serumCreatinineUmolL: 220, sex,
            population: pop, hepaticGrade: hep,
          },
        });
      }
    }
  }

  return patients;
}

export function generateEdgeCases(): SyntheticPatient[] {
  return [
    { id: "edge_obese_severe", label: "Severe obesity: 180 kg, 175 cm", category: "edge_case",
      inputs: { weightKg:180, heightCm:175, ageYears:52, serumCreatinineUmolL:95, sex:"M", population:"general", hepaticGrade:"normal" } },
    { id: "edge_obese_moderate", label: "Moderate obesity: 110 kg, 168 cm", category: "edge_case",
      inputs: { weightKg:110, heightCm:168, ageYears:44, serumCreatinineUmolL:88, sex:"F", population:"general", hepaticGrade:"normal" } },
    { id: "edge_malnourished_severe", label: "Severe malnutrition: 38 kg, 165 cm", category: "edge_case",
      inputs: { weightKg:38, heightCm:165, ageYears:35, serumCreatinineUmolL:60, sex:"F", population:"malnourished", hepaticGrade:"normal" } },
    { id: "edge_esrd", label: "ESRD: creatinine 1500", category: "edge_case",
      inputs: { weightKg:68, heightCm:170, ageYears:60, serumCreatinineUmolL:1500, sex:"M", population:"general", hepaticGrade:"normal" } },
    { id: "edge_esrd_elderly", label: "ESRD + elderly: Cr 1200, age 80", category: "edge_case",
      inputs: { weightKg:55, heightCm:162, ageYears:80, serumCreatinineUmolL:1200, sex:"F", population:"elderly", hepaticGrade:"normal" } },
    { id: "edge_elderly_multi", label: "Elderly + hepatic B + renal G3", category: "edge_case",
      inputs: { weightKg:58, heightCm:160, ageYears:78, serumCreatinineUmolL:190, sex:"F", population:"elderly", hepaticGrade:"childPughB" } },
    { id: "edge_elderly_severe", label: "Elderly + Child-Pugh C + ESRD", category: "edge_case",
      inputs: { weightKg:52, heightCm:158, ageYears:82, serumCreatinineUmolL:900, sex:"F", population:"elderly", hepaticGrade:"childPughC" } },
    { id: "edge_hiv_renal", label: "HIV+ + moderate renal", category: "edge_case",
      inputs: { weightKg:62, heightCm:168, ageYears:42, serumCreatinineUmolL:240, sex:"M", population:"hivPositive", hepaticGrade:"normal" } },
    { id: "edge_hiv_hepatic", label: "HIV+ + Child-Pugh B", category: "edge_case",
      inputs: { weightKg:60, heightCm:165, ageYears:38, serumCreatinineUmolL:95, sex:"M", population:"hivPositive", hepaticGrade:"childPughB" } },
    { id: "edge_pregnancy_low_wt", label: "Pregnancy + low weight: 48 kg", category: "edge_case",
      inputs: { weightKg:48, heightCm:155, ageYears:24, serumCreatinineUmolL:65, sex:"F", population:"pregnant", hepaticGrade:"normal" } },
    { id: "edge_pregnancy_high_wt", label: "Pregnancy + high weight: 95 kg", category: "edge_case",
      inputs: { weightKg:95, heightCm:172, ageYears:32, serumCreatinineUmolL:70, sex:"F", population:"pregnant", hepaticGrade:"normal" } },
    { id: "edge_ssa_malnourished", label: "SSA + malnourished", category: "edge_case",
      inputs: { weightKg:42, heightCm:160, ageYears:30, serumCreatinineUmolL:75, sex:"F", population:"subSaharanAfrica", hepaticGrade:"normal" } },
    { id: "edge_nephrotoxin", label: "Nephrotoxin + G3 renal", category: "edge_case",
      inputs: { weightKg:70, heightCm:172, ageYears:55, serumCreatinineUmolL:195, sex:"M", population:"general", hepaticGrade:"normal", concurrentNephrotoxins:true } },
    { id: "edge_cr_g2_boundary", label: "Cr at G2/G3a boundary", category: "edge_case",
      inputs: { weightKg:70, heightCm:170, ageYears:55, serumCreatinineUmolL:148, sex:"M", population:"general", hepaticGrade:"normal" } },
    { id: "edge_cr_g3a_boundary", label: "Cr at G3a/G3b boundary", category: "edge_case",
      inputs: { weightKg:70, heightCm:170, ageYears:55, serumCreatinineUmolL:193, sex:"M", population:"general", hepaticGrade:"normal" } },
    { id: "edge_cr_g4_boundary", label: "Cr at G3b/G4 boundary", category: "edge_case",
      inputs: { weightKg:70, heightCm:170, ageYears:55, serumCreatinineUmolL:283, sex:"M", population:"general", hepaticGrade:"normal" } },
    { id: "edge_cr_esrd_boundary", label: "Cr at G4/ESRD boundary", category: "edge_case",
      inputs: { weightKg:70, heightCm:170, ageYears:55, serumCreatinineUmolL:545, sex:"M", population:"general", hepaticGrade:"normal" } },
    { id: "edge_highdose_obese", label: "High-dose + obese 120 kg", category: "edge_case",
      inputs: { weightKg:120, heightCm:175, ageYears:48, serumCreatinineUmolL:92, sex:"M", population:"general", hepaticGrade:"normal" } },
    { id: "edge_palliative_frail", label: "Palliative + frail elderly", category: "edge_case",
      inputs: { weightKg:45, heightCm:155, ageYears:79, serumCreatinineUmolL:350, sex:"F", population:"elderly", hepaticGrade:"childPughA" } },
    { id: "edge_large_bsa", label: "Large BSA: 130 kg, 195 cm", category: "edge_case",
      inputs: { weightKg:130, heightCm:195, ageYears:40, serumCreatinineUmolL:88, sex:"M", population:"general", hepaticGrade:"normal" } },
  ];
}

export function generateResistanceBoundary(): SyntheticPatient[] {
  const patients: SyntheticPatient[] = [];

  const creatinineValues = [
    { cr: 90,  label: "normal renal" },
    { cr: 185, label: "G3a moderate" },
    { cr: 280, label: "G3b moderate" },
    { cr: 380, label: "G4 severe" },
    { cr: 550, label: "G5 ESRD" },
  ];

  const populations: Array<{ pop: PopulationContext; label: string }> = [
    { pop: "general",          label: "general" },
    { pop: "subSaharanAfrica", label: "SSA" },
    { pop: "malnourished",     label: "malnourished" },
    { pop: "elderly",          label: "elderly" },
  ];

  let i = 0;
  for (const { cr } of creatinineValues) {
    for (const { pop } of populations) {
      patients.push({
        id: `resist_gent_${i++}`,
        label: `Gentamicin resistance boundary`,
        category: "resistance_boundary",
        inputs: {
          weightKg: 65, heightCm: 165, ageYears: 48,
          serumCreatinineUmolL: cr, sex: "M",
          population: pop, hepaticGrade: "normal",
        },
      });
    }
  }

  for (const { cr } of creatinineValues) {
    for (const { pop } of populations) {
      patients.push({
        id: `resist_amik_${i++}`,
        label: `Amikacin resistance boundary`,
        category: "resistance_boundary",
        inputs: {
          weightKg: 65, heightCm: 165, ageYears: 48,
          serumCreatinineUmolL: cr, sex: "F",
          population: pop, hepaticGrade: "normal",
        },
      });
    }
  }

  return patients;
}

export function generateRandomPopulation(n: number, seed = 42): SyntheticPatient[] {
  const rng = new SeededRandom(seed);
  const patients: SyntheticPatient[] = [];

  for (let i = 0; i < n; i++) {
    const sex = rng.pick(SEXES);
    const pop = rng.pick(POPULATIONS.filter(p => !(p === "pregnant" && sex === "M")));
    const age = rng.int(18, 88);
    const weight = rng.int(40, 180);
    const height = rng.int(148, 198);
    const baseCr = 70 + age * 0.8 + rng.range(-20, 60);
    const serumCr = Math.max(25, Math.min(1800, Math.round(baseCr)));

    patients.push({
      id: `random_${i}`,
      label: `Random #${i}: ${sex}, ${age}y, ${weight}kg`,
      category: "boundary",
      inputs: {
        weightKg: weight,
        heightCm: height,
        ageYears: age,
        serumCreatinineUmolL: serumCr,
        sex,
        population: pop,
        hepaticGrade: rng.pick(HEPATIC_GRADES),
        concurrentNephrotoxins: rng.next() < 0.1,
      },
    });
  }

  return patients;
}

export function generateAllPatients(randomN = 2000): SyntheticPatient[] {
  return [
    ...generateBoundarySweep(),
    ...generateCombinatorialMatrix(),
    ...generateEdgeCases(),
    ...generateResistanceBoundary(),
    ...generateRandomPopulation(randomN),
  ];
}