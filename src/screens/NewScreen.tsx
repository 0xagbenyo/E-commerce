import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import type { NavigationProp } from '@react-navigation/native';
import * as Updates from 'expo-updates';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { CategoryTabs } from '../components/CategoryTabs';
import { ProductCard } from '../components/ProductCard';
import { LoadingScreen } from '../components/LoadingScreen';
import { ProductCardSkeletonList } from '../components/ProductCardSkeletonList';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import { CartAnimation } from '../components/CartAnimation';
import { PriceFilter, SortOption } from '../components/PriceFilter';
import { useNewArrivals, usePricingRules, useWishlistActions, useWishlist, useCartActions } from '../hooks/erpnext';
import { useUserSession } from '../context/UserContext';
import { getProductDiscount } from '../utils/pricingRules';

const { width } = Dimensions.get('window');

// Map UI category names to ERPNext item_group names
const mapCategoryToItemGroup = (category: string): string | null => {
  const categoryMap: Record<string, string> = {
    'Women': 'Women',
    'Men': 'Men',
    'Kids': 'Kids',
    'Curve': 'Curve',
  };
  return category === 'All' ? null : (categoryMap[category] || null);
};

export const NewScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useUserSession();
  const { wishlistItems, refresh: refreshWishlist } = useWishlist(user?.email || null);
  const { toggleWishlist } = useWishlistActions(refreshWishlist);
  const { addToCart: addItemToCart } = useCartActions();
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Handle category selection - navigate to CategoryProductsScreen if not "All"
  const handleCategorySelect = useCallback((category: string) => {
    if (category === 'All') {
      setSelectedCategory('All');
    } else {
      // Navigate to CategoryProductsScreen with the selected category
      const itemGroupName = mapCategoryToItemGroup(category);
      if (itemGroupName) {
        // For top-level categories from NewScreen, parentName is empty
        // This will show sibling categories that also have no parent
        navigation.navigate('CategoryProducts', {
          categoryName: itemGroupName,
          parentName: '', // Top-level categories have no parent
        });
      }
    }
  }, [navigation]);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  
  // Cart animation state
  const [showCartAnimation, setShowCartAnimation] = useState(false);
  const [animationStartPos, setAnimationStartPos] = useState({ x: 0, y: 0 });
  const [animationEndPos, setAnimationEndPos] = useState({ x: 0, y: 0 });
  const [animationProductImage, setAnimationProductImage] = useState<string | undefined>(undefined);
  
  // Map category to item group name
  const itemGroupName = mapCategoryToItemGroup(selectedCategory);
  
  // Fetch pricing rules for discounts
  const { data: pricingRules = [], loading: pricingRulesLoading } = usePricingRules();
  
  // Optimistic state for immediate UI updates
  const [optimisticWishlist, setOptimisticWishlist] = useState<Set<string>>(new Set());
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  
  // Create a Set of wishlisted product IDs for quick lookup
  const wishlistedProductIds = useMemo(() => {
    const baseSet = new Set(wishlistItems.map(item => item.productId));
    // Merge with optimistic updates
    optimisticWishlist.forEach(id => baseSet.add(id));
    return baseSet;
  }, [wishlistItems, optimisticWishlist]);
  
  // Sync optimistic state with actual wishlist when it updates
  // Only sync when not currently performing operations to avoid infinite loops
  const wishlistIdsRef = useRef<string>('');
  const currentWishlistIds = useMemo(() => {
    const ids = [...new Set(wishlistItems.map(item => item.productId))].sort();
    return JSON.stringify(ids);
  }, [wishlistItems]);
  
  useEffect(() => {
    if (pendingOperations.size > 0) {
      return; // Don't sync while operations are pending
    }
    
    // Only update if the wishlist IDs actually changed
    if (currentWishlistIds === wishlistIdsRef.current) {
      return;
    }
    
    wishlistIdsRef.current = currentWishlistIds;
    
    // Parse IDs from the string to avoid depending on wishlistItems array
    const actualIds = JSON.parse(currentWishlistIds) as string[];
    const actualSet = new Set(actualIds);
    
    setOptimisticWishlist(prev => {
      // Clear optimistic state and sync with actual wishlist
      // This ensures we start fresh after operations complete
      const newSet = new Set(actualSet);
      
      // Only update if there's a change to prevent unnecessary re-renders
      if (newSet.size !== prev.size || Array.from(newSet).some(id => !prev.has(id)) || Array.from(prev).some(id => !newSet.has(id))) {
        return newSet;
      }
      return prev; // Return same reference if no change
    });
  }, [currentWishlistIds, pendingOperations.size]);
  
  // Always fetch all new arrivals, then filter by category client-side
  // Convert sortOption to server-side sorting parameter
  const sortByPrice = sortOption === 'lowToHigh' ? 'asc' : sortOption === 'highToLow' ? 'desc' : undefined;
  const { products: allNewArrivals, loading: newArrivalsLoading, refresh: refreshNewArrivals } = useNewArrivals(100, sortByPrice);
  
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
  
  // Check if page is initially loading (fresh load - no data loaded yet)
  const isInitialLoading = ((!allNewArrivals || allNewArrivals.length === 0) && newArrivalsLoading) && 
    (!pricingRules || pricingRules.length === 0);
  
  // Debug: Log products when they change
  useEffect(() => {
    console.log('NewScreen - allNewArrivals:', allNewArrivals?.length || 0, 'items');
    if (allNewArrivals && allNewArrivals.length > 0) {
      console.log('NewScreen - First product:', allNewArrivals[0]);
    }
  }, [allNewArrivals]);

  // Filter new arrivals by selected category and sort
  const displayArrivals = useMemo(() => {
    console.log('NewScreen - Filtering products. allNewArrivals:', allNewArrivals?.length || 0, 'selectedCategory:', selectedCategory);
    
    if (!allNewArrivals || allNewArrivals.length === 0) {
      console.log('NewScreen - No products to display');
      return [];
    }
    
    // If "All" is selected, use all new arrivals
    let filtered = allNewArrivals;
    if (selectedCategory !== 'All') {
    
      // Filter by category/item_group
      // Check both item_group and category fields to match
      filtered = allNewArrivals.filter((product: any) => {
        const productCategory = product.category || product.itemGroup || '';
        // Case-insensitive comparison
        return productCategory.toLowerCase() === itemGroupName?.toLowerCase();
      });
      console.log('NewScreen - Filtered products:', filtered.length, 'for category:', selectedCategory);
    }
    
    // No client-side sorting needed - server-side sorting is already applied
    console.log('NewScreen - Final displayArrivals:', filtered.length);
    return filtered;
  }, [selectedCategory, allNewArrivals, itemGroupName]);
  
  const isLoading = newArrivalsLoading;


  const renderProductItem = ({ item, index }: { item: any; index: number }) => {
    const discount = getProductDiscount(item, pricingRules);
    const isLeftColumn = index % 2 === 0;
    const row = Math.floor(index / 2);
    
    // Staggered layout pattern for visual interest
    const patterns = [
      ['tall', 'short'],
      ['medium', 'tall'],
      ['short', 'medium'],
    ];
    const patternIndex = row % patterns.length;
    const variant = (isLeftColumn 
      ? patterns[patternIndex][0] 
      : patterns[patternIndex][1]
    ) as 'tall' | 'medium' | 'short';

    return (
      <ProductCard
        product={item}
        onPress={(productId) => {
          (navigation as any).navigate('ProductDetails', { productId });
        }}
        onCartPress={async (productId, animationData) => {
          if (!user?.email) {
            Alert.alert('Login Required', 'Please log in to add items to your cart.');
            return;
          }
          
          try {
            const itemCode = item.itemCode || productId;
            const success = await addItemToCart(itemCode, 1);
            if (success) {
              // Trigger animation if data is available
              if (animationData) {
                const endX = width - 60; // Approx position of cart icon
                const endY = 50; // Approx position of cart icon
                setAnimationStartPos(animationData.startPos);
                setAnimationEndPos({ x: endX, y: endY });
                setAnimationProductImage(animationData.productImage);
                setShowCartAnimation(true);
              } else {
                setToastMessage('Item added to cart!');
                setToastVisible(true);
              }
            }
          } catch (error) {
            console.error('Error adding to cart:', error);
            Alert.alert('Error', 'Failed to add item to cart. Please try again.');
          }
        }}
        onWishlistPress={async (productId) => {
          // Prevent multiple simultaneous operations on the same item
          if (pendingOperations.has(productId)) {
            return;
          }
          
          const isWishlisted = wishlistedProductIds.has(productId);
          
          // Mark operation as pending
          setPendingOperations(prev => new Set(prev).add(productId));
          
          // Optimistic update - immediately update UI
          setOptimisticWishlist(prev => {
            const newSet = new Set(prev);
            if (isWishlisted) {
              newSet.delete(productId);
            } else {
              newSet.add(productId);
            }
            return newSet;
          });
          
          try {
            const success = await toggleWishlist(productId, isWishlisted);
            if (!success) {
              // Revert optimistic update on failure
              setOptimisticWishlist(prev => {
                const newSet = new Set(prev);
                if (isWishlisted) {
                  newSet.add(productId); // Re-add if removal failed
                } else {
                  newSet.delete(productId); // Remove if add failed
                }
                return newSet;
              });
            }
            // refreshWishlist is called automatically by useWishlistActions
          } finally {
            // Remove from pending immediately after operation completes
            // This allows immediate toggling back and forth
            setPendingOperations(prev => {
              const newSet = new Set(prev);
              newSet.delete(productId);
              return newSet;
            });
          }
        }}
        isWishlisted={wishlistedProductIds.has(item.id)}
        style={styles.productCard}
        variant={variant}
        pricingDiscount={discount}
      />
    );
  };

  const renderProducts = () => {
    // Show skeleton loading cards while fetching products
    if (newArrivalsLoading && (!allNewArrivals || allNewArrivals.length === 0)) {
      return <ProductCardSkeletonList count={6} numColumns={2} />;
    }
    
    // Show empty state only if we're not loading and have no products
    if (displayArrivals.length === 0 && !newArrivalsLoading) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.emptyText}>No new arrivals found</Text>
          <Text style={styles.emptySubtext}>
            {selectedCategory === 'All' 
              ? 'Check back soon for new products!' 
              : `No new arrivals in ${selectedCategory} category`}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={displayArrivals}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.productsList}
        columnWrapperStyle={styles.productRow}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#acc5e1"
            colors={["#acc5e1"]}
          />
        }
        renderItem={renderProductItem}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={true}
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={10}
      />
    );
  };

  // Show loading screen on initial load
  if (isInitialLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <CartAnimation
        visible={showCartAnimation}
        startPosition={animationStartPos}
        endPosition={animationEndPos}
        productImage={animationProductImage}
        onComplete={() => setShowCartAnimation(false)}
      />
      <Toast
        message={toastMessage}
        type="success"
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
      <Header />
      <CategoryTabs 
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        activeColor="#acc5e1"
      />
      <View style={styles.filterContainer}>
        <PriceFilter onSortChange={setSortOption} currentSort={sortOption} />
      </View>
      {renderProducts()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  productsList: {
    paddingHorizontal: Spacing.SCREEN_PADDING,
    paddingTop: Spacing.PADDING_MD,
    paddingBottom: Spacing.PADDING_XL,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.MARGIN_SM,
  },
  productCard: {
    width: (width - Spacing.SCREEN_PADDING * 2 - Spacing.MARGIN_SM) / 2,
    marginBottom: 0, // Row spacing handled by columnWrapperStyle
  },
  loadingContainer: {
    flex: 1,
    padding: Spacing.PADDING_XL * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.TEXT_SECONDARY,
    marginTop: Spacing.MARGIN_MD,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    padding: Spacing.PADDING_XL * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.TEXT_PRIMARY,
    marginTop: Spacing.MARGIN_MD,
    marginBottom: Spacing.MARGIN_SM,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
  },
  filterContainer: {
    paddingHorizontal: Spacing.PADDING_MD,
    paddingVertical: Spacing.PADDING_SM,
    backgroundColor: Colors.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: Colors.FLASH_SALE_RED, // Burgundy border
  },
});
