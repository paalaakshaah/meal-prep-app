import { db } from '../client';

export function getDefaultHouseholdId(): string {
  const row = db.getFirstSync<{ id: string }>('SELECT id FROM households LIMIT 1');
  if (!row) {
    throw new Error('No household found — seedDatabase() should have created one on startup.');
  }
  return row.id;
}

export function getDefaultProfileId(): string {
  const row = db.getFirstSync<{ id: string }>('SELECT id FROM profiles LIMIT 1');
  if (!row) {
    throw new Error('No profile found — seedDatabase() should have created one on startup.');
  }
  return row.id;
}
