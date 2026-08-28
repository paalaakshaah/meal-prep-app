// Font families come from @expo-google-fonts/lora and @expo-google-fonts/manrope,
// loaded once in App.tsx via useFonts(). These keys must match those loaded there.
export const fonts = {
  serifMedium: 'Lora_500Medium',
  serifSemiBold: 'Lora_600SemiBold',
  serifBold: 'Lora_700Bold',

  sansRegular: 'Manrope_400Regular',
  sansMedium: 'Manrope_500Medium',
  sansSemiBold: 'Manrope_600SemiBold',
  sansBold: 'Manrope_700Bold',
  sansExtraBold: 'Manrope_800ExtraBold',
} as const;

export const type = {
  h1: { fontFamily: fonts.serifSemiBold, fontSize: 26 },
  h2: { fontFamily: fonts.serifSemiBold, fontSize: 20 },
  title: { fontFamily: fonts.serifSemiBold, fontSize: 17 },
  body: { fontFamily: fonts.sansMedium, fontSize: 14.5 },
  label: { fontFamily: fonts.sansSemiBold, fontSize: 12.5 },
  caption: { fontFamily: fonts.sansSemiBold, fontSize: 11.5 },
} as const;
