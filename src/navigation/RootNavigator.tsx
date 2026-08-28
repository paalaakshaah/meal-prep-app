import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, fonts } from '../theme';
import ProfileScreen from '../screens/profile/ProfileScreen';
import MainTabs from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontFamily: fonts.serifSemiBold, color: colors.text },
        headerShadowVisible: false,
        headerTintColor: colors.accentDark,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}
