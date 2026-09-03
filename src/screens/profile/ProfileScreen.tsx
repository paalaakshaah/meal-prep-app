import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, type } from '../../theme';
import MacroPills from '../../components/MacroPills';
import {
  ACTIVITY_LEVELS,
  PACES,
  calculateTargets,
  type ActivityLevel,
  type Pace,
  type ProfileStats,
  type Sex,
} from '../../domain/targets';
import {
  getDefaultHouseholdId,
  getDefaultProfileId,
  getHousehold,
  updateHouseholdName,
} from '../../db/repositories/households';
import { getProfile, getProfileTargets, updateProfile } from '../../db/repositories/profiles';
import { listFavoriteRecipes } from '../../db/repositories/recipes';
import type { Macros, RecipeWithMacros } from '../../db/types';
import type { RootStackParamList } from '../../navigation/types';

type DraftStats = {
  weightLb: string;
  heightFt: string;
  heightIn: string;
  age: string;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  pace: Pace | null;
};

const BLANK_STATS: DraftStats = {
  weightLb: '',
  heightFt: '',
  heightIn: '',
  age: '',
  sex: null,
  activityLevel: null,
  pace: null,
};

const DEFAULT_TARGETS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

// ProfileStats stays metric internally (that's what the BMR formula takes) —
// feet/inches and lb are purely how the Profile screen displays and edits it.
function cmToFeetInches(cm: number): { ft: string; inches: string } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches - ft * 12;
  return { ft: String(ft), inches: String(inches) };
}

function feetInchesToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * CM_PER_INCH * 10) / 10;
}

function kgToLb(kg: number): string {
  return String(Math.round((kg / KG_PER_LB) * 10) / 10);
}

function lbToKg(lb: number): number {
  return Math.round(lb * KG_PER_LB * 10) / 10;
}

function draftFromStats(stats: ProfileStats | undefined): DraftStats {
  if (!stats) return BLANK_STATS;
  const { ft, inches } = cmToFeetInches(stats.heightCm);
  return {
    weightLb: kgToLb(stats.weightKg),
    heightFt: ft,
    heightIn: inches,
    age: String(stats.age),
    sex: stats.sex,
    activityLevel: stats.activityLevel,
    pace: stats.pace,
  };
}

// Only a fully-filled-in draft becomes real stats — no field is ever
// defaulted, since a made-up weight/height/age would look like real data
// the user forgot to check.
function statsFromDraft(draft: DraftStats): ProfileStats | null {
  const weightLb = Number(draft.weightLb);
  const heightFt = Number(draft.heightFt);
  const heightIn = Number(draft.heightIn);
  const age = Number(draft.age);
  if (!draft.weightLb.trim() || !draft.heightFt.trim() || !draft.heightIn.trim() || !draft.age.trim()) return null;
  if (![weightLb, heightFt, heightIn, age].every(Number.isFinite)) return null;
  if (!draft.sex || !draft.activityLevel || !draft.pace) return null;
  return {
    weightKg: lbToKg(weightLb),
    heightCm: feetInchesToCm(heightFt, heightIn),
    age,
    sex: draft.sex,
    activityLevel: draft.activityLevel,
    pace: draft.pace,
  };
}

function sanitizeNumText(text: string): string {
  return text.replace(/[^0-9.]/g, '');
}

function numOr(text: string, fallback: number): number {
  const value = Number(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(value) && text.trim() !== '' ? value : fallback;
}

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const householdId = useMemo(() => getDefaultHouseholdId(), []);
  const profileId = useMemo(() => getDefaultProfileId(), []);

  const initial = useMemo(() => {
    const household = getHousehold(householdId);
    const profile = getProfile(profileId);
    const savedTargets = getProfileTargets(profileId);
    return {
      householdName: household?.name ?? '',
      profileName: profile?.name ?? '',
      stats: draftFromStats(savedTargets?.stats),
      targets: savedTargets ?? DEFAULT_TARGETS,
    };
  }, [householdId, profileId]);

  const [householdName, setHouseholdName] = useState(initial.householdName);
  const [profileName, setProfileName] = useState(initial.profileName);
  const [stats, setStats] = useState<DraftStats>(initial.stats);
  const [targets, setTargets] = useState<Macros>(initial.targets);
  const [favorites, setFavorites] = useState<RecipeWithMacros[]>([]);

  useFocusEffect(
    useCallback(() => {
      setFavorites(listFavoriteRecipes(householdId));
    }, [householdId])
  );

  function recompute() {
    const complete = statsFromDraft(stats);
    if (!complete) {
      Alert.alert(
        'Add your stats first',
        'Fill in weight (lb), height (ft and in), age, sex, activity level, and pace to calculate targets.'
      );
      return;
    }
    setTargets((prev) => ({ ...prev, ...calculateTargets(complete) }));
  }

  function handleSave() {
    updateHouseholdName(householdId, householdName.trim() || 'Household');
    updateProfile(profileId, {
      name: profileName.trim() || 'Me',
      targets: { ...targets, stats: statsFromDraft(stats) ?? undefined },
    });
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Household name</Text>
        <TextInput
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder="e.g. The Sharmas"
          placeholderTextColor={colors.textFaint}
          style={styles.nameInput}
        />

        <Text style={styles.label}>Your name</Text>
        <TextInput
          value={profileName}
          onChangeText={setProfileName}
          placeholder="e.g. Priya"
          placeholderTextColor={colors.textFaint}
          style={styles.nameInput}
        />

        <Text style={styles.label}>Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statField}>
            <Text style={styles.statFieldLabel}>Weight (lb)</Text>
            <TextInput
              value={stats.weightLb}
              onChangeText={(t) => setStats((s) => ({ ...s, weightLb: sanitizeNumText(t) }))}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={colors.textFaint}
              style={styles.statInput}
            />
          </View>
          <View style={styles.statField}>
            <Text style={styles.statFieldLabel}>Age</Text>
            <TextInput
              value={stats.age}
              onChangeText={(t) => setStats((s) => ({ ...s, age: sanitizeNumText(t) }))}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={colors.textFaint}
              style={styles.statInput}
            />
          </View>
        </View>
        <View style={[styles.statsRow, { marginTop: 10 }]}>
          <View style={styles.statField}>
            <Text style={styles.statFieldLabel}>Height (ft)</Text>
            <TextInput
              value={stats.heightFt}
              onChangeText={(t) => setStats((s) => ({ ...s, heightFt: sanitizeNumText(t) }))}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={colors.textFaint}
              style={styles.statInput}
            />
          </View>
          <View style={styles.statField}>
            <Text style={styles.statFieldLabel}>Height (in)</Text>
            <TextInput
              value={stats.heightIn}
              onChangeText={(t) => setStats((s) => ({ ...s, heightIn: sanitizeNumText(t) }))}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={colors.textFaint}
              style={styles.statInput}
            />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Sex</Text>
        <View style={styles.pillRow}>
          {(['female', 'male'] as Sex[]).map((s) => {
            const active = stats.sex === s;
            return (
              <Pressable
                key={s}
                onPress={() => setStats((prev) => ({ ...prev, sex: s }))}
                style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
              >
                <Text style={active ? styles.pillTextActive : styles.pillTextInactive}>
                  {s[0].toUpperCase() + s.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Activity level</Text>
        <View style={styles.pillRow}>
          {ACTIVITY_LEVELS.map((a) => {
            const active = stats.activityLevel === a.key;
            return (
              <Pressable
                key={a.key}
                onPress={() => setStats((prev) => ({ ...prev, activityLevel: a.key as ActivityLevel }))}
                style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
              >
                <Text style={active ? styles.pillTextActive : styles.pillTextInactive}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Pace</Text>
        <View style={styles.pillRow}>
          {PACES.map((p) => {
            const active = stats.pace === p.key;
            return (
              <Pressable
                key={p.key}
                onPress={() => setStats((prev) => ({ ...prev, pace: p.key as Pace }))}
                style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
              >
                <Text style={active ? styles.pillTextActive : styles.pillTextInactive}>
                  {p.label} · -{p.deficitKcal} kcal
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.targetsHeader}>
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0 }]}>Daily targets</Text>
          <Pressable onPress={recompute} hitSlop={8} style={styles.recalcBtn}>
            <Ionicons name="refresh" size={13} color={colors.accentDark} />
            <Text style={styles.recalcBtnText}>Recalculate from stats</Text>
          </Pressable>
        </View>
        <Text style={styles.helperText}>
          Suggested from your stats using the Mifflin-St Jeor formula — edit any field to override.
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statField}>
            <Text style={styles.statFieldLabel}>Kcal</Text>
            <TextInput
              value={String(targets.kcal)}
              onChangeText={(t) => setTargets((prev) => ({ ...prev, kcal: numOr(t, 0) }))}
              keyboardType="numeric"
              style={styles.statInput}
            />
          </View>
          <View style={styles.statField}>
            <Text style={styles.statFieldLabel}>Protein (g)</Text>
            <TextInput
              value={String(targets.protein)}
              onChangeText={(t) => setTargets((prev) => ({ ...prev, protein: numOr(t, 0) }))}
              keyboardType="numeric"
              style={styles.statInput}
            />
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statField}>
            <Text style={styles.statFieldLabel}>Carbs (g)</Text>
            <TextInput
              value={String(targets.carbs)}
              onChangeText={(t) => setTargets((prev) => ({ ...prev, carbs: numOr(t, 0) }))}
              keyboardType="numeric"
              style={styles.statInput}
            />
          </View>
          <View style={styles.statField}>
            <Text style={styles.statFieldLabel}>Fat (g)</Text>
            <TextInput
              value={String(targets.fat)}
              onChangeText={(t) => setTargets((prev) => ({ ...prev, fat: numOr(t, 0) }))}
              keyboardType="numeric"
              style={styles.statInput}
            />
          </View>
        </View>

        <Text style={styles.label}>Favorites</Text>
        {favorites.length === 0 ? (
          <Text style={[type.body, { color: colors.textFaint }]}>
            Star a recipe from the Recipes tab to see it here.
          </Text>
        ) : (
          <View style={styles.favList}>
            {favorites.map((r) => (
              <Pressable
                key={r.id}
                style={styles.favCard}
                onPress={() =>
                  navigation.navigate('MainTabs', {
                    screen: 'Recipes',
                    params: { screen: 'AddRecipeIngredients', params: { mode: 'edit', recipeId: r.id } },
                  })
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={[type.title, { color: colors.text }]}>{r.name}</Text>
                  {r.per100g && <MacroPills macros={r.per100g} suffix="/100g" />}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 12 },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 12.5,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 18,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.sansSemiBold,
    fontSize: 16,
    color: colors.text,
  },
  statsRow: { flexDirection: 'row', gap: 10 },
  statField: { flex: 1 },
  statFieldLabel: { fontFamily: fonts.sansSemiBold, fontSize: 11.5, color: colors.textFaint, marginBottom: 6 },
  statInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.text,
  },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  pillActive: { backgroundColor: colors.accent },
  pillInactive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pillTextActive: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  pillTextInactive: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.textSoft },
  targetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 8,
  },
  recalcBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recalcBtnText: { fontFamily: fonts.sansBold, fontSize: 11.5, color: colors.accentDark },
  helperText: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textFaint, marginBottom: 12, lineHeight: 17 },
  favList: { gap: 10 },
  favCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff' },
});
