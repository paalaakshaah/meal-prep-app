import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, type } from '../../theme';
import { fuzzySearchFoodItems } from '../../db/search';
import { getFoodItem } from '../../db/repositories/foodItems';
import { getIndbIngredientBreakdown } from '../../db/repositories/indbIngredients';
import { createRecipe } from '../../db/repositories/recipes';
import { getDefaultHouseholdId } from '../../db/repositories/households';
import type { FoodSource, Macros, MealType } from '../../db/types';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';

type LocalIngredient = {
  key: string;
  foodItemId: string;
  name: string;
  quantityG: number;
  per100g: Macros;
  source: FoodSource;
};

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const DEFAULT_SERVING_GRAMS = 150;

function computePerServing(ingredients: LocalIngredient[], servings: number): Macros | null {
  if (ingredients.length === 0 || servings <= 0) return null;
  const total = ingredients.reduce(
    (acc, ing) => {
      const factor = ing.quantityG / 100;
      acc.kcal += ing.per100g.kcal * factor;
      acc.protein += ing.per100g.protein * factor;
      acc.carbs += ing.per100g.carbs * factor;
      acc.fat += ing.per100g.fat * factor;
      acc.fiber += ing.per100g.fiber * factor;
      acc.sugar += ing.per100g.sugar * factor;
      return acc;
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
  );
  return {
    kcal: total.kcal / servings,
    protein: total.protein / servings,
    carbs: total.carbs / servings,
    fat: total.fat / servings,
    fiber: total.fiber / servings,
    sugar: total.sugar / servings,
  };
}

export default function AddRecipeIngredientsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RecipesStackParamList>>();
  const route =
    useRoute<NativeStackScreenProps<RecipesStackParamList, 'AddRecipeIngredients'>['route']>();
  const params = route.params;

  const initial = useMemo((): { ingredients: LocalIngredient[]; servings: number } => {
    if (params?.mode !== 'quickfill') return { ingredients: [], servings: 4 };

    const item = getFoodItem(params.dishFoodItemId);
    if (!item) return { ingredients: [], servings: 1 };

    // Prefer the real ingredient-by-ingredient breakdown (sourced from the
    // underlying research repo) over the whole-dish aggregate.
    const breakdown = item.external_code ? getIndbIngredientBreakdown(item.external_code) : null;
    if (breakdown) {
      return {
        servings: breakdown.servings,
        ingredients: breakdown.ingredients.map((ing) => {
          const foodItem = getFoodItem(ing.foodItemId)!;
          return {
            key: ing.foodItemId,
            foodItemId: ing.foodItemId,
            name: ing.name,
            quantityG: ing.quantityG,
            per100g: {
              kcal: foodItem.kcal,
              protein: foodItem.protein,
              carbs: foodItem.carbs,
              fat: foodItem.fat,
              fiber: foodItem.fiber,
              sugar: foodItem.sugar,
            },
            source: foodItem.source,
          };
        }),
      };
    }

    // Fall back to a single whole-dish "quick estimate" row when no
    // ingredient breakdown is available for this dish.
    return {
      servings: 1,
      ingredients: [
        {
          key: item.id,
          foodItemId: item.id,
          name: item.name,
          quantityG: item.serving_grams ?? DEFAULT_SERVING_GRAMS,
          per100g: {
            kcal: item.kcal,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            fiber: item.fiber,
            sugar: item.sugar,
          },
          source: item.source,
        },
      ],
    };
  }, [params]);

  const [name, setName] = useState(params?.mode === 'quickfill' ? params.dishName : '');
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [servings, setServings] = useState(initial.servings);
  const [ingredients, setIngredients] = useState<LocalIngredient[]>(initial.ingredients);
  const [ingredientQuery, setIngredientQuery] = useState('');

  const searchResults = useMemo(
    () => (ingredientQuery.trim() ? fuzzySearchFoodItems(ingredientQuery, 8) : []),
    [ingredientQuery]
  );

  const perServing = computePerServing(ingredients, servings);
  const isQuickEstimate = ingredients.length === 1 && ingredients[0].source === 'indb';

  function addIngredient(foodItemId: string) {
    const item = getFoodItem(foodItemId);
    if (!item) return;
    setIngredients((prev) => [
      ...prev,
      {
        key: `${item.id}_${Date.now()}`,
        foodItemId: item.id,
        name: item.name,
        quantityG: item.serving_grams ?? 100,
        per100g: {
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
          sugar: item.sugar,
        },
        source: item.source,
      },
    ]);
    setIngredientQuery('');
  }

  function removeIngredient(key: string) {
    setIngredients((prev) => prev.filter((i) => i.key !== key));
  }

  function updateQuantity(key: string, text: string) {
    const value = Number(text.replace(/[^0-9.]/g, ''));
    setIngredients((prev) => prev.map((i) => (i.key === key ? { ...i, quantityG: Number.isFinite(value) ? value : 0 } : i)));
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name this recipe', 'Give it a name before saving.');
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert('Add an ingredient', 'A recipe needs at least one ingredient to compute macros.');
      return;
    }
    createRecipe({
      householdId: getDefaultHouseholdId(),
      name: name.trim(),
      mealType,
      servings,
      ingredients: ingredients.map((i) => ({ foodItemId: i.foodItemId, quantityG: i.quantityG })),
    });
    navigation.popToTop();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Recipe name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Palak Paneer"
          placeholderTextColor={colors.textFaint}
          style={styles.nameInput}
        />

        <Text style={styles.label}>Meal type</Text>
        <View style={styles.pillRow}>
          {MEAL_TYPES.map((m) => {
            const active = mealType === m;
            return (
              <Pressable
                key={m}
                onPress={() => setMealType(m)}
                style={[styles.pill, active ? styles.pillActive : styles.pillInactive]}
              >
                <Text style={active ? styles.pillTextActive : styles.pillTextInactive}>
                  {m[0].toUpperCase() + m.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Servings</Text>
        <View style={styles.stepperRow}>
          <Pressable
            style={styles.stepperBtn}
            onPress={() => setServings((s) => Math.max(1, s - 1))}
          >
            <Ionicons name="remove" size={18} color={colors.accentDark} />
          </Pressable>
          <Text style={styles.stepperValue}>{servings}</Text>
          <Pressable style={styles.stepperBtn} onPress={() => setServings((s) => s + 1)}>
            <Ionicons name="add" size={18} color={colors.accentDark} />
          </Pressable>
        </View>

        <Text style={styles.label}>Ingredients</Text>
        {isQuickEstimate && (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.accentDark} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeText}>
                This is a whole-dish estimate from the Indian Nutrient Databank, not a real ingredient
                breakdown — the databank doesn't publish one. Macros are accurate for a typical version of this
                dish, but not necessarily to how you actually cook it.
              </Text>
              <Pressable onPress={() => setIngredients([])} hitSlop={6}>
                <Text style={styles.noticeAction}>Break it down into ingredients instead</Text>
              </Pressable>
            </View>
          </View>
        )}
        {ingredients.map((ing) => (
          <View key={ing.key} style={styles.ingredientRow}>
            <Pressable onPress={() => removeIngredient(ing.key)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.textFaint} />
            </Pressable>
            <Text style={[type.body, { flex: 1, color: colors.text }]} numberOfLines={1}>
              {ing.name}
            </Text>
            <TextInput
              value={String(ing.quantityG)}
              onChangeText={(t) => updateQuantity(ing.key, t)}
              keyboardType="numeric"
              style={styles.qtyInput}
            />
            <Text style={styles.unit}>g</Text>
          </View>
        ))}

        <View style={styles.searchBox}>
          <Ionicons name="add" size={18} color={colors.textFaint} style={{ marginRight: 6 }} />
          <TextInput
            value={ingredientQuery}
            onChangeText={setIngredientQuery}
            placeholder="Add ingredient…"
            placeholderTextColor={colors.textFaint}
            style={styles.searchInput}
          />
        </View>
        {searchResults.length > 0 && (
          <View style={styles.resultsBox}>
            {searchResults.map((r, i) => (
              <Pressable
                key={r.id}
                style={[styles.resultRow, i < searchResults.length - 1 && styles.resultRowBorder]}
                onPress={() => addIngredient(r.id)}
              >
                <Text style={[type.body, { color: colors.text }]}>{r.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>Per serving</Text>
        {perServing ? (
          <View style={styles.macroGrid}>
            <MacroStat label="kcal" value={Math.round(perServing.kcal)} bg={colors.accentSoft} fg={colors.accentDark} />
            <MacroStat label="protein" value={`${Math.round(perServing.protein)}g`} bg={colors.rustSoft} fg={colors.rustDark} />
            <MacroStat label="carbs" value={`${Math.round(perServing.carbs)}g`} bg={colors.goldSoft} fg={colors.goldDark} />
            <MacroStat label="fat" value={`${Math.round(perServing.fat)}g`} bg={colors.tealSoft} fg={colors.tealDark} />
          </View>
        ) : (
          <Text style={[type.body, { color: colors.textFaint, marginBottom: 12 }]}>Add ingredients to see macros</Text>
        )}
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Recipe</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function MacroStat({ label, value, bg, fg }: { label: string; value: string | number; bg: string; fg: string }) {
  return (
    <View style={[styles.macroStat, { backgroundColor: bg }]}>
      <Text style={[styles.macroValue, { color: fg }]}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
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
  notice: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  noticeText: { fontFamily: fonts.sansMedium, fontSize: 12.5, color: colors.text, lineHeight: 18 },
  noticeAction: { fontFamily: fonts.sansBold, fontSize: 12.5, color: colors.accentDark, marginTop: 8 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  pillActive: { backgroundColor: colors.accent },
  pillInactive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pillTextActive: { fontFamily: fonts.sansBold, fontSize: 13, color: '#fff' },
  pillTextInactive: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.textSoft },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.text, minWidth: 20, textAlign: 'center' },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  qtyInput: {
    width: 60,
    textAlign: 'right',
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  unit: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.textFaint, width: 14 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  searchInput: { flex: 1, fontFamily: fonts.sansMedium, fontSize: 14, color: colors.text },
  resultsBox: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },
  resultRow: { paddingHorizontal: 14, paddingVertical: 12 },
  resultRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  footerLabel: {
    fontFamily: fonts.sansBold,
    fontSize: 11.5,
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  macroGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  macroStat: { flex: 1, borderRadius: 12, paddingVertical: 9, alignItems: 'center' },
  macroValue: { fontFamily: fonts.sansExtraBold, fontSize: 15 },
  macroLabel: { fontFamily: fonts.sansBold, fontSize: 10.5, color: colors.textFaint, marginTop: 2 },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff' },
});
