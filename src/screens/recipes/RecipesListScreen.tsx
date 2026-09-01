import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, type } from '../../theme';
import MacroPills from '../../components/MacroPills';
import { listRecipes, setFavorite } from '../../db/repositories/recipes';
import { getDefaultHouseholdId } from '../../db/repositories/households';
import type { MealType, RecipeWithMacros } from '../../db/types';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';

const FILTERS: { key: MealType | 'all' | 'favorites'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
  { key: 'favorites', label: 'Favorites' },
];

export default function RecipesListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RecipesStackParamList>>();
  const [recipes, setRecipes] = useState<RecipeWithMacros[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');

  const reload = useCallback(() => {
    const householdId = getDefaultHouseholdId();
    setRecipes(listRecipes(householdId));
  }, []);

  useFocusEffect(reload);

  const visible = useMemo(() => {
    if (filter === 'all') return recipes;
    if (filter === 'favorites') return recipes.filter((r) => r.favorite);
    return recipes.filter((r) => r.meal_type === filter);
  }, [recipes, filter]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(f) => f.key}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
          renderItem={({ item }) => {
            const active = filter === item.key;
            return (
              <Pressable
                onPress={() => setFilter(item.key)}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              >
                <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[type.h2, { color: colors.text, marginBottom: 6 }]}>
            {recipes.length === 0 ? 'No recipes yet' : 'Nothing here yet'}
          </Text>
          <Text style={[type.body, { color: colors.textSoft, textAlign: 'center' }]}>
            {recipes.length === 0
              ? 'Add a dish you cook often to get started.'
              : 'Try a different filter, or add a recipe for this category.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.thumb}>
                <Ionicons name="restaurant-outline" size={26} color={colors.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.title, { color: colors.text }]}>{item.name}</Text>
                    <Text style={styles.subtitle}>
                      {item.meal_type[0].toUpperCase() + item.meal_type.slice(1)}
                      {item.totalWeightG ? ` · Makes ~${Math.round(item.totalWeightG)}g` : ''}
                      {item.isQuickEstimate ? ' · Quick estimate' : ''}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      setFavorite(item.id, !item.favorite);
                      reload();
                    }}
                  >
                    <Ionicons
                      name={item.favorite ? 'star' : 'star-outline'}
                      size={18}
                      color={item.favorite ? colors.accent : colors.textFaint}
                    />
                  </Pressable>
                </View>
                {item.per100g ? (
                  <MacroPills macros={item.per100g} suffix="/100g" />
                ) : (
                  <Text style={styles.subtitle}>No ingredients yet</Text>
                )}
              </View>
            </View>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate('AddRecipeSearch')}>
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  filterRow: { paddingBottom: 16 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  chipActive: { backgroundColor: colors.accent },
  chipInactive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipText: { fontFamily: fonts.sansBold, fontSize: 13 },
  chipTextActive: { color: '#fff' },
  chipTextInactive: { color: colors.textSoft },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  subtitle: { fontFamily: fonts.sansSemiBold, fontSize: 12.5, color: colors.textFaint, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
