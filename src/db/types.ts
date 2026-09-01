export type FoodSource = 'ifct' | 'indb' | 'ukfct' | 'usfct' | 'custom' | 'ocr';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type FoodItem = {
  id: string;
  source: FoodSource;
  external_code: string | null;
  household_id: string | null;
  name: string;
  food_group: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  serving_label: string | null;
  serving_grams: number | null;
};

export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
};

export type Recipe = {
  id: string;
  household_id: string;
  name: string;
  meal_type: MealType;
  servings: number;
  favorite: 0 | 1;
  created_at: string;
  updated_at: string;
};

export type RecipeWithMacros = Recipe & {
  perServing: Macros | null; // null if the recipe somehow has no ingredients yet
  // true when this recipe is just a single INDB dish copied wholesale (no real
  // ingredient breakdown) rather than something built up from raw ingredients.
  isQuickEstimate: boolean;
};

export type RecipeIngredientInput = {
  foodItemId: string;
  quantityG: number;
};

export type RecipeIngredientDetail = RecipeIngredientInput & {
  id: string;
  foodItem: FoodItem;
};
