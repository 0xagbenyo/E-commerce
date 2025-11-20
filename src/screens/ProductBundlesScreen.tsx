import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import * as Updates from 'expo-updates';
import { RootStackParamList } from '../types';
import type { NavigationProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { useProductBundles, useWishlistActions, useWishlist, useCartActions } from '../hooks/erpnext';
import { useUserSession } from '../context/UserContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { ProductCardSkeletonList } from '../components/ProductCardSkeletonList';
import { ProductBundleCard } from '../components/ProductBundleCard';

const { width } = Dimensions.get('window');

export const ProductBundlesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useUserSession();
  const { wishlistItems, refresh: refreshWishlist } = useWishlist(user?.email || null);
  const { toggleWishlist } = useWishlistActions(refreshWishlist);
  const { addToCart: addItemToCart } = useCartActions();
  const { data: productBundles, loading: bundlesLoading, error: bundlesError } = useProductBundles(100);
  
  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  
  // Handle pull-to-refresh - reload the entire page
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Navigate to Splash screen first to show SIAMAE
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Splash' }],
        })
      );
      
      // Wait a moment for Splash to appear, then reload the entire app
      setTimeout(async () => {
        try {
          await Updates.reloadAsync();
        } catch (error) {
          console.log('Updates.reloadAsync not available, using navigation reset');
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            })
          );
        }
      }, 1500);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setRefreshing(false);
    }
  }, [navigation]);
  
  // Check if page is initially loading
  const isInitialLoading = bundlesLoading && (!productBundles || productBundles.length === 0);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.PADDING_XS }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={20} color={Colors.WHITE} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Product Bundles</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderBundleItem = useCallback(({ item, index }: { item: any; index: number }) => {
    return (
      <View style={styles.bundleItemContainer}>
        <ProductBundleCard
          bundleName={item.bundleName}
          newItemCode={item.newItemCode}
          customCustomer={item.customCustomer}
          items={item.items}
        />
      </View>
    );
  }, []);

  if (isInitialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <ProductCardSkeletonList count={6} numColumns={2} />
      </SafeAreaView>
    );
  }

  if (bundlesError) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.ERROR} />
          <Text style={styles.errorText}>Failed to load bundles</Text>
          <Text style={styles.errorSubtext}>{bundlesError.message || 'Please try again later'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!productBundles || productBundles.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.emptyText}>No bundles available</Text>
          <Text style={styles.emptySubtext}>Check back later for new product bundles</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {renderHeader()}
      <FlatList
        data={productBundles}
        renderItem={renderBundleItem}
        keyExtractor={(item, index) => `bundle-${index}-${item.bundleName}`}
        contentContainerStyle={styles.listContent}
        numColumns={1}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.SHEIN_RED}
            colors={[Colors.SHEIN_RED]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={Colors.TEXT_SECONDARY} />
            <Text style={styles.emptyText}>No bundles available</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.SHEIN_RED,
    paddingHorizontal: Spacing.PADDING_MD,
    paddingBottom: Spacing.PADDING_SM,
  },
  backButton: {
    padding: Spacing.PADDING_XS,
  },
  headerTitle: {
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.WHITE,
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  listContent: {
    padding: Spacing.SCREEN_PADDING,
  },
  bundleItemContainer: {
    marginBottom: Spacing.MARGIN_MD,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.PADDING_XL,
  },
  errorText: {
    marginTop: Spacing.MARGIN_MD,
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.ERROR,
  },
  errorSubtext: {
    marginTop: Spacing.MARGIN_SM,
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.PADDING_XL,
  },
  emptyText: {
    marginTop: Spacing.MARGIN_MD,
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
  },
  emptySubtext: {
    marginTop: Spacing.MARGIN_SM,
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
  },
});


