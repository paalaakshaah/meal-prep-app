import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, type } from '../../theme';
import { fuzzySearchDishes } from '../../db/search';
import type { RecipesStackParamList } from '../../navigation/RecipesStack';

export default function AddRecipeSearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RecipesStackParamList>>();
  const [query, setQuery] = useState('');

  const results = useMemo(() => fuzzySearchDishes(query, 8), [query]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.content}>
        <Text style={[type.body, styles.intro]}>
          Search a dish to pull a starting recipe from the Indian Nutrient Databank, or start from scratch.
        </Text>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textFaint} style={{ marginRight: 8 }} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. Palak Paneer"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoFocus
          />
        </View>

        {query.trim().length > 0 && (
          <View style={styles.resultsBox}>
            {results.length === 0 ? (
              <Text style={[type.body, { color: colors.textFaint, padding: 16 }]}>No matches in the databank.</Text>
            ) : (
              results.map((r, i) => (
                <Pressable
                  key={r.id}
                  style={[styles.resultRow, i < results.length - 1 && styles.resultRowBorder]}
                  onPress={() =>
                    navigation.navigate('AddRecipeIngredients', {
                      mode: 'quickfill',
                      dishFoodItemId: r.id,
                      dishName: r.name,
                    })
                  }
                >
                  <Text style={[type.title, { color: colors.text, flex: 1 }]}>{r.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </Pressable>
              ))
            )}
          </View>
        )}

        <Pressable
          style={styles.scratchLink}
          onPress={() => navigation.navigate('AddRecipeIngredients', { mode: 'scratch' })}
        >
          <Text style={styles.scratchText}>Can't find it? Start from scratch</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  intro: { color: colors.textSoft, marginBottom: 20, lineHeight: 20 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: { flex: 1, fontFamily: fonts.sansSemiBold, fontSize: 16, color: colors.text },
  resultsBox: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    overflow: 'hidden',
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  resultRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  scratchLink: { alignItems: 'center', marginTop: 24 },
  scratchText: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.accentDark },
});
