import React, { useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Screens
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { CategoryProductsScreen } from '../screens/CategoryProductsScreen';
import { AllDealsScreen } from '../screens/AllDealsScreen';
import { PricingRulesScreen } from '../screens/PricingRulesScreen';
import { ProductBundlesScreen } from '../screens/ProductBundlesScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { NewScreen } from '../screens/NewScreen';
import { CartScreen } from '../screens/CartScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ProductDetailsScreen } from '../screens/ProductDetailsScreen';
import { CheckoutScreen } from '../screens/CheckoutScreen';
import { OrderSuccessScreen } from '../screens/OrderSuccessScreen';
import { OrderHistoryScreen } from '../screens/OrderHistoryScreen';
import { InvoiceDetailsScreen } from '../screens/InvoiceDetailsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { WishlistScreen } from '../screens/WishlistScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';

// Types
import { RootStackParamList, AuthStackParamList, MainTabParamList } from '../types';
import { Colors } from '../constants/colors';

const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Auth Navigator
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

// Main Tab Navigator
const MainTabNavigator = () => {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Categories') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'New') {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          } else if (route.name === 'Bag') {
            iconName = focused ? 'bag' : 'bag-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Colors.BLACK,
        tabBarInactiveTintColor: Colors.TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: Colors.WHITE,
          borderTopColor: Colors.BORDER,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 88 : 60,
        },
        headerShown: false,
      })}
    >
      <MainTab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: 'Shop' }}
      />
      <MainTab.Screen 
        name="Categories" 
        component={CategoriesScreen}
        options={{ tabBarLabel: 'Category' }}
      />
      <MainTab.Screen 
        name="New" 
        component={NewScreen}
        options={{ tabBarLabel: 'New' }}
      />
      <MainTab.Screen 
        name="Bag" 
        component={CartScreen}
        options={{ tabBarLabel: 'Bag' }}
      />
      <MainTab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: 'Me' }}
      />
    </MainTab.Navigator>
  );
};

// Root Navigator
export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Auth" component={AuthNavigator} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen 
          name="ProductDetails" 
          component={ProductDetailsScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen 
          name="CategoryProducts" 
          component={CategoryProductsScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen 
          name="AllDeals" 
          component={AllDealsScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen 
          name="PricingRules" 
          component={PricingRulesScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen 
          name="ProductBundles" 
          component={ProductBundlesScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen 
          name="Search" 
          component={SearchScreen}
          options={{ 
            presentation: 'card',
            headerShown: false,
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="Wishlist" 
          component={WishlistScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen 
          name="Cart" 
          component={CartScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen 
          name="OrderHistory" 
          component={OrderHistoryScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen 
          name="InvoiceDetails" 
          component={InvoiceDetailsScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen 
          name="EditProfile" 
          component={EditProfileScreen}
          options={{ presentation: 'card' }}
        />
        <Stack.Screen name="Splash" component={SplashScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
