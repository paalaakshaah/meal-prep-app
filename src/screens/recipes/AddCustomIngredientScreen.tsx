import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fonts } from '../../theme';
import { createCustomFoodItem } from '../../db/repositories/foodItems';
import { getDefaultHouseholdId } from '../../db/repositories/households';
import { invalidateFoodIndex } from '../../db/search';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';

type MacroField = { key: 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar'; label: string };
const MACRO_FIELDS: MacroField[] = [
  { key: 'protein', label: 'Protein' },
  { key: 'carbs', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
  { key: 'fiber', label: 'Fiber' },
  { key: 'sugar', label: 'Sugar' },
];

function parseNumber(text: string): number {
  const n = Number(text.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export default function AddCustomIngredientScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RecipesStackParamList>>();
  const route = useRoute<NativeStackScreenProps<RecipesStackParamList, 'AddCustomIngredient'>['route']>();
  const { initialName, onCreated } = route.params;

  const [name, setName] = useState(initialName ?? '');
  const [kcal, setKcal] = useState('');
  const [macros, setMacros] = useState<Record<MacroField['key'], string>>({
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
  });

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name this ingredient', 'Give it a name before saving.');
      return;
    }
    if (!kcal.trim()) {
      Alert.alert('Add calories', 'Calories per 100g is needed to compute recipe macros.');
      return;
    }

    const item = createCustomFoodItem({
      householdId: getDefaultHouseholdId(),
      name: name.trim(),
      kcal: parseNumber(kcal),
      protein: parseNumber(macros.protein),
      carbs: parseNumber(macros.carbs),
      fat: parseNumber(macros.fat),
      fiber: parseNumber(macros.fiber),
      sugar: parseNumber(macros.sugar),
    });
    invalidateFoodIndex();
    onCreated(item);
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          Not in the database? Add it yourself — from a packaging label, or your best estimate. You can always
          edit it later.
        </Text>

        <Text style={styles.label}>Ingredient name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Homemade ghee"
          placeholderTextColor={colors.textFaint}
          style={styles.nameInput}
          autoFocus={!initialName}
        />

        <Text style={styles.label}>Calories (per 100g)</Text>
        <TextInput
          value={kcal}
          onChangeText={setKcal}
          placeholder="0"
          placeholderTextColor={colors.textFaint}
          keyboardType="numeric"
          style={styles.nameInput}
        />

        <Text style={styles.label}>Per 100g (optional)</Text>
        <View style={styles.macroGrid}>
          {MACRO_FIELDS.map((field) => (
            <View key={field.key} style={styles.macroField}>
              <Text style={styles.macroFieldLabel}>{field.label}</Text>
              <View style={styles.macroInputRow}>
                <TextInput
                  value={macros[field.key]}
                  onChangeText={(t) => setMacros((prev) => ({ ...prev, [field.key]: t }))}
                  placeholder="0"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="numeric"
                  style={styles.macroInput}
                />
                <Text style={styles.unit}>g</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Add Ingredient</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 12 },
  intro: { fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.textSoft, lineHeight: 19, marginBottom: 8 },
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
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  macroField: { width: '47%' },
  macroFieldLabel: { fontFamily: fonts.sansSemiBold, fontSize: 12.5, color: colors.textSoft, marginBottom: 6 },
  macroInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroInput: {
    flex: 1,
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
  unit: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.textFaint, width: 14 },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  saveBtn: { backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontFamily: fonts.sansBold, fontSize: 16, color: '#fff' },
});
