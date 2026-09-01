import type { SQLiteDatabase } from 'expo-sqlite';
import ifctData from '../data/ifct2017.json';
import indbData from '../data/indb.json';
import ukfctData from '../data/ukfct.json';
import usfctData from '../data/usfct.json';
import { generateId } from './ids';

type IfctRow = {
  code: string;
  name: string;
  group: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
};

type IndbRow = {
  code: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  servingLabel: string | null;
  servingGrams: number | null;
};

type SupplementalFctRow = {
  code: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  source: 'ukfct' | 'usfct';
};

// Bump this whenever any of the bundled data files change, to force a re-seed.
const SEED_VERSION = '2';

function getMeta(db: SQLiteDatabase, key: string): string | null {
  const row = db.getFirstSync<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

function setMeta(db: SQLiteDatabase, key: string, value: string) {
  db.runSync('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value,
  ]);
}

function seedFoodItems(db: SQLiteDatabase) {
  db.withTransactionSync(() => {
    // Upsert rather than delete+reinsert: ids are deterministic (source_code),
    // so this refreshes content on a reseed without breaking the foreign key
    // that recipe_ingredients holds on food_items.id for existing recipes.
    const insert = db.prepareSync(
      `INSERT INTO food_items
        (id, source, external_code, household_id, name, food_group, kcal, protein, carbs, fat, fiber, sugar, serving_label, serving_grams)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         food_group = excluded.food_group,
         kcal = excluded.kcal,
         protein = excluded.protein,
         carbs = excluded.carbs,
         fat = excluded.fat,
         fiber = excluded.fiber,
         sugar = excluded.sugar,
         serving_label = excluded.serving_label,
         serving_grams = excluded.serving_grams`
    );
    try {
      for (const item of ifctData as IfctRow[]) {
        insert.executeSync([
          `ifct_${item.code}`,
          'ifct',
          item.code,
          item.name,
          item.group,
          item.kcal,
          item.protein,
          item.carbs,
          item.fat,
          item.fiber,
          item.sugar,
          null,
          null,
        ]);
      }
      for (const item of indbData as IndbRow[]) {
        insert.executeSync([
          `indb_${item.code}`,
          'indb',
          item.code,
          item.name,
          null,
          item.kcal,
          item.protein,
          item.carbs,
          item.fat,
          item.fiber,
          item.sugar,
          item.servingLabel,
          item.servingGrams,
        ]);
      }
      for (const item of [...(ukfctData as SupplementalFctRow[]), ...(usfctData as SupplementalFctRow[])]) {
        insert.executeSync([
          `${item.source}_${item.code}`,
          item.source,
          item.code,
          item.name,
          null,
          item.kcal,
          item.protein,
          item.carbs,
          item.fat,
          item.fiber,
          item.sugar,
          null,
          null,
        ]);
      }
    } finally {
      insert.finalizeSync();
    }

    setMeta(db, 'seed_version', SEED_VERSION);
  });
}

function ensureDefaultHousehold(db: SQLiteDatabase) {
  const existing = db.getFirstSync<{ id: string }>('SELECT id FROM households LIMIT 1');
  if (existing) return;

  const now = new Date().toISOString();
  const householdId = generateId('household');
  const profileId = generateId('profile');

  db.withTransactionSync(() => {
    db.runSync('INSERT INTO households (id, name, created_at) VALUES (?, ?, ?)', [
      householdId,
      'My Household',
      now,
    ]);
    db.runSync(
      'INSERT INTO profiles (id, household_id, name, targets_json, preferences_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [profileId, householdId, 'Me', '{}', '{}', now]
    );
  });
}

export function seedDatabase(db: SQLiteDatabase) {
  if (getMeta(db, 'seed_version') !== SEED_VERSION) {
    seedFoodItems(db);
  }
  ensureDefaultHousehold(db);
}
