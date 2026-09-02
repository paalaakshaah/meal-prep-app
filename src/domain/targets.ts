import type { Macros } from '../db/types';

export type Sex = 'female' | 'male';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Pace = 'mild' | 'standard' | 'aggressive';

export type ProfileStats = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
  pace: Pace;
};

export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; multiplier: number }[] = [
  { key: 'sedentary', label: 'Sedentary', multiplier: 1.2 },
  { key: 'light', label: 'Light', multiplier: 1.375 },
  { key: 'moderate', label: 'Moderate', multiplier: 1.55 },
  { key: 'active', label: 'Active', multiplier: 1.725 },
  { key: 'very_active', label: 'Very active', multiplier: 1.9 },
];

// A 500 kcal/day deficit is the standard "safe, sustainable" default
// (~0.5 kg/week); mild and aggressive scale that up or down. These aren't
// medical advice — they're a reasonable starting point the user can
// override outright via the target fields themselves.
export const PACES: { key: Pace; label: string; deficitKcal: number; ratePerWeekKg: number }[] = [
  { key: 'mild', label: 'Mild', deficitKcal: 250, ratePerWeekKg: 0.25 },
  { key: 'standard', label: 'Standard', deficitKcal: 500, ratePerWeekKg: 0.5 },
  { key: 'aggressive', label: 'Aggressive', deficitKcal: 750, ratePerWeekKg: 0.75 },
];

// Never let the calculator suggest below this, regardless of deficit —
// a floor against an unsafely low number falling out of the arithmetic.
const MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };

// Mifflin-St Jeor — the most accurate widely-used BMR equation for the
// general population (more accurate than Harris-Benedict across BMI ranges).
export function calculateBMR(stats: Pick<ProfileStats, 'weightKg' | 'heightCm' | 'age' | 'sex'>): number {
  const base = 10 * stats.weightKg + 6.25 * stats.heightCm - 5 * stats.age;
  return stats.sex === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(stats: ProfileStats): number {
  const multiplier = ACTIVITY_LEVELS.find((a) => a.key === stats.activityLevel)?.multiplier ?? 1.2;
  return calculateBMR(stats) * multiplier;
}

// Protein-forward split for weight loss (preserves muscle through a
// deficit) while still leaving real room for rice/roti — 30P/40C/30F.
export function calculateTargets(stats: ProfileStats): Macros {
  const tdee = calculateTDEE(stats);
  const deficit = PACES.find((p) => p.key === stats.pace)?.deficitKcal ?? 500;
  const kcal = Math.max(tdee - deficit, MIN_KCAL[stats.sex]);

  return {
    kcal: Math.round(kcal),
    protein: Math.round((kcal * 0.3) / 4),
    carbs: Math.round((kcal * 0.4) / 4),
    fat: Math.round((kcal * 0.3) / 9),
    fiber: 0,
    sugar: 0,
  };
}
