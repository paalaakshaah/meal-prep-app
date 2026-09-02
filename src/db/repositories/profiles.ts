import { db } from '../client';
import type { Macros, Profile } from '../types';
import type { ProfileStats } from '../../domain/targets';

export type ProfileTargets = Macros & { stats?: ProfileStats };

export function getProfile(id: string): Profile | null {
  return db.getFirstSync<Profile>('SELECT * FROM profiles WHERE id = ?', [id]);
}

export function getProfileTargets(id: string): ProfileTargets | null {
  const profile = getProfile(id);
  if (!profile || !profile.targets_json || profile.targets_json === '{}') return null;
  try {
    return JSON.parse(profile.targets_json) as ProfileTargets;
  } catch {
    return null;
  }
}

export function updateProfile(id: string, input: { name: string; targets: ProfileTargets }): void {
  db.runSync('UPDATE profiles SET name = ?, targets_json = ? WHERE id = ?', [
    input.name,
    JSON.stringify(input.targets),
    id,
  ]);
}
