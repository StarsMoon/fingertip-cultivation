/**
 * SaveMigrations — version migration for SaveData.
 * Index = from-version. MIGRATIONS[0] migrates v0→v1.
 */

import { SaveData, SAVE_VERSION, createDefaultSave } from './SaveData';

export type Migration = (old: Record<string, unknown>) => Record<string, unknown>;

export const MIGRATIONS: Migration[] = [];

export function migrate(save: SaveData): SaveData {
  const defaultSave = createDefaultSave();
  let data = { ...save } as Record<string, unknown>;
  const fromVersion = (data.version as number) || 0;

  for (let v = fromVersion; v < SAVE_VERSION; v++) {
    const migration = MIGRATIONS[v];
    if (migration) {
      data = migration(data);
    }
    data.version = v + 1;
  }

  return { ...defaultSave, ...data } as SaveData;
}
