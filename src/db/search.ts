import Fuse from 'fuse.js';
import { listAllFoodItemsForIndex } from './repositories/foodItems';
import type { FoodSource } from './types';

type IndexEntry = { id: string; name: string; source: FoodSource };

let fuse: Fuse<IndexEntry> | null = null;

function getIndex(): Fuse<IndexEntry> {
  if (!fuse) {
    const entries = listAllFoodItemsForIndex() as IndexEntry[];
    fuse = new Fuse(entries, { keys: ['name'], threshold: 0.35, ignoreLocation: true });
  }
  return fuse;
}

// Call after adding a food_item outside this module (e.g. a custom
// ingredient) so it's searchable immediately, without needing an app restart.
export function invalidateFoodIndex() {
  fuse = null;
}

export type SearchResult = { id: string; name: string; source: FoodSource };

// General search across every food_item (raw ingredients, dishes, custom items) —
// used by "build from ingredients" when adding rows to a recipe.
export function fuzzySearchFoodItems(query: string, limit = 20): SearchResult[] {
  if (!query.trim()) return [];
  return getIndex()
    .search(query, { limit: limit * 2 })
    .map((r) => r.item)
    .slice(0, limit);
}

// Dish-only search — used by the Add Recipe "quick-fill from INDB" path.
export function fuzzySearchDishes(query: string, limit = 10): SearchResult[] {
  return fuzzySearchFoodItems(query, limit * 3)
    .filter((r) => r.source === 'indb')
    .slice(0, limit);
}
