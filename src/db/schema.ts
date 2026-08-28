import type { SQLiteDatabase } from 'expo-sqlite';

// Schema is intentionally household/profile-scoped everywhere, even though the
// app is single-household today — see the design doc, section 6 & 10.
export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  name TEXT NOT NULL,
  targets_json TEXT NOT NULL DEFAULT '{}',
  preferences_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

-- Universal "things with known macros per 100g": IFCT raw ingredients,
-- INDB whole dishes, custom entries, and OCR'd packaged foods.
-- Recipes are always a weighted sum of rows in this table.
CREATE TABLE IF NOT EXISTS food_items (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('ifct', 'indb', 'custom', 'ocr')),
  external_code TEXT,
  household_id TEXT REFERENCES households(id), -- NULL for shared ifct/indb reference data
  name TEXT NOT NULL,
  food_group TEXT,
  kcal REAL NOT NULL,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  fiber REAL NOT NULL DEFAULT 0,
  sugar REAL NOT NULL DEFAULT 0,
  serving_label TEXT,
  serving_grams REAL
);
CREATE INDEX IF NOT EXISTS idx_food_items_name ON food_items(name);
CREATE INDEX IF NOT EXISTS idx_food_items_source ON food_items(source);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  servings REAL NOT NULL DEFAULT 1,
  favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recipes_household ON recipes(household_id);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY,
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  food_item_id TEXT NOT NULL REFERENCES food_items(id),
  quantity_g REAL NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- Computed macros (total and per-serving) for every recipe, derived from its
-- ingredients — never stored redundantly, so it can't drift out of sync.
CREATE VIEW IF NOT EXISTS recipe_macros AS
SELECT
  r.id AS recipe_id,
  r.servings,
  SUM(ri.quantity_g / 100.0 * fi.kcal)    AS total_kcal,
  SUM(ri.quantity_g / 100.0 * fi.protein) AS total_protein,
  SUM(ri.quantity_g / 100.0 * fi.carbs)   AS total_carbs,
  SUM(ri.quantity_g / 100.0 * fi.fat)     AS total_fat,
  SUM(ri.quantity_g / 100.0 * fi.fiber)   AS total_fiber,
  SUM(ri.quantity_g / 100.0 * fi.sugar)   AS total_sugar,
  SUM(ri.quantity_g / 100.0 * fi.kcal)    / r.servings AS kcal_per_serving,
  SUM(ri.quantity_g / 100.0 * fi.protein) / r.servings AS protein_per_serving,
  SUM(ri.quantity_g / 100.0 * fi.carbs)   / r.servings AS carbs_per_serving,
  SUM(ri.quantity_g / 100.0 * fi.fat)     / r.servings AS fat_per_serving,
  SUM(ri.quantity_g / 100.0 * fi.fiber)   / r.servings AS fiber_per_serving,
  SUM(ri.quantity_g / 100.0 * fi.sugar)   / r.servings AS sugar_per_serving
FROM recipes r
JOIN recipe_ingredients ri ON ri.recipe_id = r.id
JOIN food_items fi ON fi.id = ri.food_item_id
GROUP BY r.id;

CREATE TABLE IF NOT EXISTS meal_plan_entries (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  household_id TEXT NOT NULL REFERENCES households(id),
  date TEXT NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_id TEXT REFERENCES recipes(id),
  portion REAL NOT NULL DEFAULT 1,
  locked INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_plan_profile_date ON meal_plan_entries(profile_id, date);

CREATE TABLE IF NOT EXISTS grocery_lists (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL REFERENCES households(id),
  week_start TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grocery_list_items (
  id TEXT PRIMARY KEY,
  grocery_list_id TEXT NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity REAL,
  unit TEXT,
  category TEXT,
  bought INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS logs (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('meal', 'weight', 'steps')),
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_logs_profile_date ON logs(profile_id, date);
`;

export function createSchema(db: SQLiteDatabase) {
  db.execSync(SCHEMA_SQL);
}
