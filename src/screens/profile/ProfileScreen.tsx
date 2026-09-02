import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

const DEFAULT_STATS: ProfileStats = {
  weightKg: 70,
  heightCm: 165,
  age: 30,
  sex: 'female',
  activityLevel: 'moderate',
  pace: 'standard',
};

const DEFAULT_TARGETS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 };

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
      stats: savedTargets?.stats ?? DEFAULT_STATS,
      targets: savedTargets ?? DEFAULT_TARGETS,
    };
  }, [householdId, profileId]);

  const [householdName, setHouseholdName] = useState(initial.householdName);
  const [profileName, setProfileName] = useState(initial.profileName);
  const [stats, setStats] = useState<ProfileStats>(initial.stats);
  const [targets, setTargets] = useState<Macros>(initial.targets);
  const [favorites, setFavorites] = useState<RecipeWithMacros[]>([]);

  useFocusEffect(
    useCallback(() => {
      setFavorites(listFavoriteRecipes(householdId));
    }, [householdId])
  );

  function recompute() {
    setTargets((prev) => ({ ...prev, ...calculateTargets(stats) }));
  }

  function handleSave() {
    updateHouseholdName(householdId, householdName.trim() || 'Household');
    updateProfile(profileId, { name: profileName.trim() || 'Me', targets: { ...targets, stats } });
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
            <Text style={styles.statFieldLabel}>Weight (kg)</Text>
            <TextInput
              value={String(stats.weightKg)}
              onChangeText={(t) => setStats((s) => ({ ...s, weightKg: numOr(t, 0) }))}
              keyboardType="numeric"
              style={styles.statInput}
            />
          </View>
          <View style={styles.statField}>
            <Text style={styles.statFieldLabel}>Height (cm)</Text>
            <TextInput
              value={String(stats.heightCm)}
              onChangeText={(t) => setStats((s) => ({ ...s, heightCm: numOr(t, 0) }))}
              keyboardType="numeric"
              style={styles.statInput}
            />
          </View>
          <View style={styles.statField}>
            <Text style={styles.statFieldLabel}>Age</Text>
            <TextInput
              value={String(stats.age)}
              onChangeText={(t) => setStats((s) => ({ ...s, age: numOr(t, 0) }))}
              keyboardType="numeric"
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
