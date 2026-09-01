import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import type { Macros } from '../db/types';

export default function MacroPills({ macros, suffix }: { macros: Macros; suffix?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.kcalPill}>
        <Text style={styles.kcalText}>
          {Math.round(macros.kcal)} kcal{suffix ? ` ${suffix}` : ''}
        </Text>
      </View>
      <Text style={styles.detail}>
        {Math.round(macros.protein)}g P · {Math.round(macros.carbs)}g C · {Math.round(macros.fat)}g F
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' },
  kcalPill: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  kcalText: { fontFamily: fonts.sansBold, fontSize: 12, color: colors.accentDark },
  detail: { fontFamily: fonts.sansSemiBold, fontSize: 12, color: colors.textSoft },
});
