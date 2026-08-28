import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { colors, fonts } from '../theme';
import RecipesListScreen from '../screens/recipes/RecipesListScreen';
import AddRecipeSearchScreen from '../screens/recipes/AddRecipeSearchScreen';
import AddRecipeIngredientsScreen from '../screens/recipes/AddRecipeIngredientsScreen';
import type { RootStackParamList } from './types';

export type RecipesStackParamList = {
  RecipesList: undefined;
  AddRecipeSearch: undefined;
  AddRecipeIngredients:
    | { mode: 'quickfill'; dishFoodItemId: string; dishName: string }
    | { mode: 'scratch' }
    | undefined;
};

const Stack = createNativeStackNavigator<RecipesStackParamList>();

export default function RecipesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { fontFamily: fonts.serifSemiBold, color: colors.text },
        headerShadowVisible: false,
        headerTintColor: colors.accentDark,
      }}
    >
      <Stack.Screen
        name="RecipesList"
        component={RecipesListScreen}
        options={({ navigation }) => ({
          title: 'Recipes',
          headerRight: () => (
            <Pressable
              hitSlop={10}
              onPress={() =>
                (navigation as unknown as NavigationProp<RootStackParamList>).getParent()?.navigate('Profile')
              }
            >
              <Ionicons name="person-circle-outline" size={24} color={colors.textSoft} />
            </Pressable>
          ),
        })}
      />
      <Stack.Screen name="AddRecipeSearch" component={AddRecipeSearchScreen} options={{ title: 'Add Recipe' }} />
      <Stack.Screen
        name="AddRecipeIngredients"
        component={AddRecipeIngredientsScreen}
        options={{ title: 'Ingredients' }}
      />
    </Stack.Navigator>
  );
}
