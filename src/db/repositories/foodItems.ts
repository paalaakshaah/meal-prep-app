import { db } from '../client';
import { generateId } from '../ids';
import type { FoodItem, FoodSource } from '../types';

export function getFoodItem(id: string): FoodItem | null {
  return db.getFirstSync<FoodItem>('SELECT * FROM food_items WHERE id = ?', [id]);
}

export function searchFoodItemsByName(query: string, limit = 30): FoodItem[] {
  const like = `%${query}%`;
  return db.getAllSync<FoodItem>(
    `SELECT * FROM food_items WHERE name LIKE ? COLLATE NOCASE ORDER BY name LIMIT ?`,
    [like, limit]
  );
}

export function listAllFoodItemsForIndex(): Pick<FoodItem, 'id' | 'name' | 'source'>[] {
  // Used to build the in-memory fuzzy-search index (see search/fuzzyFoodSearch.ts).
  return db.getAllSync('SELECT id, name, source FROM food_items');
}

export function createCustomFoodItem(input: {
  householdId: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  source?: Extract<FoodSource, 'custom' | 'ocr'>;
}): FoodItem {
  const id = generateId('food');
  db.runSync(
    `INSERT INTO food_items
      (id, source, external_code, household_id, name, food_group, kcal, protein, carbs, fat, fiber, sugar, serving_label, serving_grams)
     VALUES (?, ?, NULL, ?, ?, NULL, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
    [
      id,
      input.source ?? 'custom',
      input.householdId,
      input.name,
      input.kcal,
      input.protein,
      input.carbs,
      input.fat,
      input.fiber,
      input.sugar,
    ]
  );
  return getFoodItem(id)!;
}
