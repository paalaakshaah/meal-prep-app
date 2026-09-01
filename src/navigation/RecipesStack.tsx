import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { colors, fonts } from '../theme';
import RecipesListScreen from '../screens/recipes/RecipesListScreen';
import AddRecipeSearchScreen from '../screens/recipes/AddRecipeSearchScreen';
import AddRecipeIngredientsScreen from '../screens/recipes/AddRecipeIngredientsScreen';
import AddCustomIngredientScreen from '../screens/recipes/AddCustomIngredientScreen';
import type { FoodItem } from '../db/types';
import type { RootStackParamList } from './types';

export type RecipesStackParamList = {
  RecipesList: undefined;
  AddRecipeSearch: undefined;
  AddRecipeIngredients:
    | { mode: 'quickfill'; dishFoodItemId: string; dishName: string }
    | { mode: 'scratch' }
    | { mode: 'edit'; recipeId: string }
    | undefined;
  AddCustomIngredient:
    // Adds the new food_item to a recipe already being built (existing behavior).
    | { purpose: 'ingredient'; initialName?: string; onCreated: (item: FoodItem) => void }
    // Scanning a whole packaged product straight into a brand-new recipe —
    // no recipe in progress yet, nothing to hand the item back to.
    | { purpose: 'recipe' };
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
        options={({ route }) => ({
          title: route.params?.mode === 'edit' ? 'Edit Recipe' : 'Ingredients',
        })}
      />
      <Stack.Screen
        name="AddCustomIngredient"
        component={AddCustomIngredientScreen}
        options={({ route }) => ({
          title: route.params.purpose === 'recipe' ? 'Scan a Product' : 'New Ingredient',
          presentation: 'modal',
        })}
      />
    </Stack.Navigator>
  );
}
