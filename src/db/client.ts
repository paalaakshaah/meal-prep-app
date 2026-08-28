import { openDatabaseSync } from 'expo-sqlite';

// Single shared connection to the app's local database.
// Schema creation and seeding (IFCT/INDB import) land here in Phase 1.
export const db = openDatabaseSync('mealprep.db');
