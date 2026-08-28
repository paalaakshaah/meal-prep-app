import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, type } from '../../theme';

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <Text style={[type.h1, styles.title]}>Meal Prep History</Text>
        <Text style={[type.body, styles.subtitle]}>
          Past weeks' meal-prep plans will show up here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  title: { color: colors.text, marginBottom: 6 },
  subtitle: { color: colors.textSoft },
});
