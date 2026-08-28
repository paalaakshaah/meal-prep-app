import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigationProp } from '@react-navigation/native';
import { Pressable } from 'react-native';
import { colors, fonts } from '../theme';
import HistoryScreen from '../screens/history/HistoryScreen';
import LogScreen from '../screens/log/LogScreen';
import PlanScreen from '../screens/plan/PlanScreen';
import RecipesStack from './RecipesStack';
import type { RootStackParamList } from './types';

export type MainTabsParamList = {
  Recipes: undefined;
  Plan: undefined;
  Log: undefined;
  History: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

const ICONS: Record<keyof MainTabsParamList, keyof typeof Ionicons.glyphMap> = {
  Recipes: 'book-outline',
  Plan: 'calendar-outline',
  Log: 'pulse-outline',
  History: 'time-outline',
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontFamily: fonts.serifSemiBold, color: colors.text },
        headerShadowVisible: false,
        headerRight: () => (
          <Pressable
            hitSlop={10}
            onPress={() =>
              (navigation as unknown as NavigationProp<RootStackParamList>)
                .getParent()
                ?.navigate('Profile')
            }
            style={{ marginRight: 16 }}
          >
            <Ionicons name="person-circle-outline" size={24} color={colors.textSoft} />
          </Pressable>
        ),
        tabBarActiveTintColor: colors.accentDark,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansSemiBold, fontSize: 11 },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name as keyof MainTabsParamList]} size={size - 2} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Recipes" component={RecipesStack} options={{ headerShown: false }} />
      <Tab.Screen name="Plan" component={PlanScreen} />
      <Tab.Screen name="Log" component={LogScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
  );
}
