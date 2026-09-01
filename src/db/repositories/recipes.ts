import { db } from '../client';
import { generateId } from '../ids';
import type {
  Macros,
  MealType,
  Recipe,
  RecipeIngredientDetail,
  RecipeIngredientInput,
  RecipeWithMacros,
} from '../types';
import { getFoodItem } from './foodItems';

type MacrosRow = {
  total_weight_g: number;
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sugar_per_100g: number;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function toPer100g(row: MacrosRow | null): Macros | null {
  if (!row) return null;
  return {
    kcal: round1(row.kcal_per_100g),
    protein: round1(row.protein_per_100g),
    carbs: round1(row.carbs_per_100g),
    fat: round1(row.fat_per_100g),
    fiber: round1(row.fiber_per_100g),
    sugar: round1(row.sugar_per_100g),
  };
}

function checkIsQuickEstimate(recipeId: string): boolean {
  const row = db.getFirstSync<{ cnt: number; sole_source: string | null }>(
    `SELECT COUNT(*) AS cnt, MAX(fi.source) AS sole_source
     FROM recipe_ingredients ri
     JOIN food_items fi ON fi.id = ri.food_item_id
     WHERE ri.recipe_id = ?`,
    [recipeId]
  );
  return row?.cnt === 1 && row.sole_source === 'indb';
}

function withMacros(recipe: Recipe): RecipeWithMacros {
  const macros = db.getFirstSync<MacrosRow>('SELECT * FROM recipe_macros WHERE recipe_id = ?', [recipe.id]);
  return {
    ...recipe,
    per100g: toPer100g(macros),
    totalWeightG: macros ? round1(macros.total_weight_g) : null,
    isQuickEstimate: checkIsQuickEstimate(recipe.id),
  };
}

export function listRecipes(householdId: string, mealType?: MealType): RecipeWithMacros[] {
  const recipes = mealType
    ? db.getAllSync<Recipe>(
        'SELECT * FROM recipes WHERE household_id = ? AND meal_type = ? ORDER BY name COLLATE NOCASE',
        [householdId, mealType]
      )
    : db.getAllSync<Recipe>('SELECT * FROM recipes WHERE household_id = ? ORDER BY name COLLATE NOCASE', [
        householdId,
      ]);

  return recipes.map(withMacros);
}

export function getRecipe(id: string): RecipeWithMacros | null {
  const recipe = db.getFirstSync<Recipe>('SELECT * FROM recipes WHERE id = ?', [id]);
  return recipe ? withMacros(recipe) : null;
}

export function getRecipeIngredients(recipeId: string): RecipeIngredientDetail[] {
  const rows = db.getAllSync<{ id: string; food_item_id: string; quantity_g: number }>(
    'SELECT id, food_item_id, quantity_g FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order',
    [recipeId]
  );
  return rows.map((row) => ({
    id: row.id,
    foodItemId: row.food_item_id,
    quantityG: row.quantity_g,
    foodItem: getFoodItem(row.food_item_id)!,
  }));
}

export function createRecipe(input: {
  householdId: string;
  name: string;
  mealType: MealType;
  ingredients: RecipeIngredientInput[];
}): Recipe {
  if (input.ingredients.length === 0) {
    throw new Error('A recipe needs at least one ingredient to compute macros.');
  }
  const id = generateId('recipe');
  const now = new Date().toISOString();

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO recipes (id, household_id, name, meal_type, favorite, created_at, updated_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [id, input.householdId, input.name, input.mealType, now, now]
    );
    const insertIngredient = db.prepareSync(
      'INSERT INTO recipe_ingredients (id, recipe_id, food_item_id, quantity_g, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    try {
      input.ingredients.forEach((ing, index) => {
        insertIngredient.executeSync([generateId('ri'), id, ing.foodItemId, ing.quantityG, index]);
      });
    } finally {
      insertIngredient.finalizeSync();
    }
  });

  return db.getFirstSync<Recipe>('SELECT * FROM recipes WHERE id = ?', [id])!;
}

export function updateRecipe(
  id: string,
  input: { name: string; mealType: MealType; ingredients: RecipeIngredientInput[] }
): void {
  if (input.ingredients.length === 0) {
    throw new Error('A recipe needs at least one ingredient to compute macros.');
  }
  const now = new Date().toISOString();

  db.withTransactionSync(() => {
    db.runSync('UPDATE recipes SET name = ?, meal_type = ?, updated_at = ? WHERE id = ?', [
      input.name,
      input.mealType,
      now,
      id,
    ]);
    db.runSync('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [id]);
    const insertIngredient = db.prepareSync(
      'INSERT INTO recipe_ingredients (id, recipe_id, food_item_id, quantity_g, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    try {
      input.ingredients.forEach((ing, index) => {
        insertIngredient.executeSync([generateId('ri'), id, ing.foodItemId, ing.quantityG, index]);
      });
    } finally {
      insertIngredient.finalizeSync();
    }
  });
}

export function deleteRecipe(id: string): void {
  db.runSync('DELETE FROM recipes WHERE id = ?', [id]);
}

export function setFavorite(id: string, favorite: boolean) {
  db.runSync('UPDATE recipes SET favorite = ?, updated_at = ? WHERE id = ?', [
    favorite ? 1 : 0,
    new Date().toISOString(),
    id,
  ]);
}
