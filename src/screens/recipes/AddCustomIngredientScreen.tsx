import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { isSupported as isOcrSupported, recognizeText } from 'expo-mlkit-ocr';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../../theme';
import { createCustomFoodItem } from '../../db/repositories/foodItems';
import { getDefaultHouseholdId } from '../../db/repositories/households';
import { invalidateFoodIndex } from '../../db/search';
import { parseNutritionLabel } from '../../ocr/parseNutritionLabel';
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

const ocrSupported = isOcrSupported();

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
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedFromPhoto, setScannedFromPhoto] = useState(false);

  async function runOcr(uri: string) {
    setPhotoUri(uri);
    setScanning(true);
    try {
      const result = await recognizeText(uri);
      const parsed = parseNutritionLabel(result);
      if (parsed.kcal === null && parsed.protein === null && parsed.fat === null) {
        Alert.alert(
          "Couldn't read that label",
          'No nutrition values were recognized. The photo is still here for reference — fill in the fields by hand.'
        );
        return;
      }
      setScannedFromPhoto(true);
      if (parsed.kcal !== null) setKcal(String(parsed.kcal));
      setMacros((prev) => ({
        protein: parsed.protein !== null ? String(parsed.protein) : prev.protein,
        carbs: parsed.carbs !== null ? String(parsed.carbs) : prev.carbs,
        fat: parsed.fat !== null ? String(parsed.fat) : prev.fat,
        fiber: parsed.fiber !== null ? String(parsed.fiber) : prev.fiber,
        sugar: parsed.sugar !== null ? String(parsed.sugar) : prev.sugar,
      }));
    } catch {
      Alert.alert('Scan failed', "Couldn't read that photo. The image is still here — fill in the fields by hand.");
    } finally {
      setScanning(false);
    }
  }

  function handleScanPress() {
    Alert.alert('Scan a label', 'Photograph the nutrition table on the packaging.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take Photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Camera permission needed', 'Allow camera access to scan a label.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ quality: 0.6 });
          if (!result.canceled && result.assets[0]) runOcr(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6 });
          if (!result.canceled && result.assets[0]) runOcr(result.assets[0].uri);
        },
      },
    ]);
  }

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
      source: scannedFromPhoto ? 'ocr' : 'custom',
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

        {ocrSupported && (
          <Pressable style={styles.scanBtn} onPress={handleScanPress} disabled={scanning}>
            {scanning ? (
              <ActivityIndicator size="small" color={colors.accentDark} />
            ) : (
              <Ionicons name="camera-outline" size={18} color={colors.accentDark} />
            )}
            <Text style={styles.scanBtnText}>{scanning ? 'Reading label…' : 'Scan a label'}</Text>
          </Pressable>
        )}

        {photoUri && (
          <View style={styles.photoWrap}>
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            {scannedFromPhoto && !scanning && (
              <Text style={styles.photoCaption}>Detected values below — check them against the label.</Text>
            )}
          </View>
        )}

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
  intro: { fontFamily: fonts.sansMedium, fontSize: 13.5, color: colors.textSoft, lineHeight: 19, marginBottom: 14 },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    paddingVertical: 13,
    marginBottom: 6,
  },
  scanBtnText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.accentDark },
  photoWrap: { marginTop: 14 },
  photo: { width: '100%', height: 220, borderRadius: 14, backgroundColor: colors.surface },
  photoCaption: { fontFamily: fonts.sansMedium, fontSize: 12, color: colors.textFaint, marginTop: 8 },
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
