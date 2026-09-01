import indbIngredientsData from '../../data/indb_ingredients.json';
import { getFoodItem } from './foodItems';

type RawEntry = {
  servings: number;
  ingredients: { code: string; source: 'ifct' | 'ukfct' | 'usfct'; quantityG: number }[];
};

const DATA = indbIngredientsData as Record<string, RawEntry>;

export type IndbIngredientBreakdown = {
  servings: number;
  ingredients: { foodItemId: string; name: string; quantityG: number }[];
};

// Real ingredient-by-ingredient breakdown for an INDB dish, sourced from the
// underlying research repo (not the aggregate-only public export) — see the
// design doc for provenance. Returns null if this dish has no breakdown
// available, in which case the UI falls back to the whole-dish quick estimate.
export function getIndbIngredientBreakdown(dishExternalCode: string): IndbIngredientBreakdown | null {
  const entry = DATA[dishExternalCode];
  if (!entry || entry.ingredients.length === 0) return null;

  const resolved = entry.ingredients
    .map((ing) => {
      const foodItem = getFoodItem(`${ing.source}_${ing.code}`);
      if (!foodItem) return null;
      return { foodItemId: foodItem.id, name: foodItem.name, quantityG: ing.quantityG };
    })
    .filter((x): x is { foodItemId: string; name: string; quantityG: number } => x !== null);

  if (resolved.length === 0) return null;
  return { servings: entry.servings, ingredients: resolved };
}
