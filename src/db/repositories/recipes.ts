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
  kcal_per_serving: number;
  protein_per_serving: number;
  carbs_per_serving: number;
  fat_per_serving: number;
  fiber_per_serving: number;
  sugar_per_serving: number;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function toPerServing(row: MacrosRow | null): Macros | null {
  if (!row) return null;
  return {
    kcal: round1(row.kcal_per_serving),
    protein: round1(row.protein_per_serving),
    carbs: round1(row.carbs_per_serving),
    fat: round1(row.fat_per_serving),
    fiber: round1(row.fiber_per_serving),
    sugar: round1(row.sugar_per_serving),
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

export function listRecipes(householdId: string, mealType?: MealType): RecipeWithMacros[] {
  const recipes = mealType
    ? db.getAllSync<Recipe>(
        'SELECT * FROM recipes WHERE household_id = ? AND meal_type = ? ORDER BY name COLLATE NOCASE',
        [householdId, mealType]
      )
    : db.getAllSync<Recipe>('SELECT * FROM recipes WHERE household_id = ? ORDER BY name COLLATE NOCASE', [
        householdId,
      ]);

  return recipes.map((recipe) => {
    const macros = db.getFirstSync<MacrosRow>('SELECT * FROM recipe_macros WHERE recipe_id = ?', [recipe.id]);
    return { ...recipe, perServing: toPerServing(macros), isQuickEstimate: checkIsQuickEstimate(recipe.id) };
  });
}

export function getRecipe(id: string): RecipeWithMacros | null {
  const recipe = db.getFirstSync<Recipe>('SELECT * FROM recipes WHERE id = ?', [id]);
  if (!recipe) return null;
  const macros = db.getFirstSync<MacrosRow>('SELECT * FROM recipe_macros WHERE recipe_id = ?', [id]);
  return { ...recipe, perServing: toPerServing(macros), isQuickEstimate: checkIsQuickEstimate(id) };
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
  servings: number;
  ingredients: RecipeIngredientInput[];
}): Recipe {
  if (input.ingredients.length === 0) {
    throw new Error('A recipe needs at least one ingredient to compute macros.');
  }
  const id = generateId('recipe');
  const now = new Date().toISOString();

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO recipes (id, household_id, name, meal_type, servings, favorite, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
      [id, input.householdId, input.name, input.mealType, input.servings, now, now]
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

export function setFavorite(id: string, favorite: boolean) {
  db.runSync('UPDATE recipes SET favorite = ?, updated_at = ? WHERE id = ?', [
    favorite ? 1 : 0,
    new Date().toISOString(),
    id,
  ]);
}
