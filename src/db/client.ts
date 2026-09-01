import { openDatabaseSync } from 'expo-sqlite';
import { createSchema, migrateIfNeeded } from './schema';
import { seedDatabase } from './seed';

// Single shared connection to the app's local database.
export const db = openDatabaseSync('mealprep.db');

migrateIfNeeded(db);
createSchema(db);
seedDatabase(db);
