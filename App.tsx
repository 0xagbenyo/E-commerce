import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initializeERPNext } from './src/services/erpnext';

export default function App() {
  useEffect(() => {
    // Initialize ERPNext client with API credentials
    initializeERPNext({
      baseUrl: 'https://glamora.rxcue.net',
      apiKey: '37451612fa66805',
      apiSecret: '65eb634d99a4ab2',
    });
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={Platform.OS === 'ios' ? 'dark' : 'light'} />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
