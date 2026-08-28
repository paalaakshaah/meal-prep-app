import type { SQLiteDatabase } from 'expo-sqlite';
import ifctData from '../data/ifct2017.json';
import indbData from '../data/indb.json';
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

// Bump this whenever ifct2017.json / indb.json content changes, to force a re-seed.
const SEED_VERSION = '1';

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
    db.runSync("DELETE FROM food_items WHERE source IN ('ifct', 'indb')");

    const insert = db.prepareSync(
      `INSERT INTO food_items
        (id, source, external_code, household_id, name, food_group, kcal, protein, carbs, fat, fiber, sugar, serving_label, serving_grams)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
