import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { CategoryTabs } from '../components/CategoryTabs';
import { ProductCard } from '../components/ProductCard';
import { LoadingScreen } from '../components/LoadingScreen';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
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
  const navigation = useNavigation();
  const { user } = useUserSession();
  const { wishlistItems, refresh: refreshWishlist } = useWishlist(user?.email || null);
  const { toggleWishlist } = useWishlistActions(refreshWishlist);
  const { addToCart: addItemToCart } = useCartActions();
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
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
  useEffect(() => {
    if (pendingOperations.size > 0) {
      return; // Don't sync while operations are pending
    }
    
    const actualSet = new Set(wishlistItems.map(item => item.productId));
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
  }, [wishlistItems, pendingOperations.size]);
  
  // Always fetch all new arrivals, then filter by category client-side
  const { data: allNewArrivals, loading: newArrivalsLoading, refresh: refreshNewArrivals } = useNewArrivals(100);
  
  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshNewArrivals(),
        refreshWishlist(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshNewArrivals, refreshWishlist]);
  
  // Check if page is initially loading (fresh load - no data loaded yet)
  const isInitialLoading = (!allNewArrivals && newArrivalsLoading) && 
    (!pricingRules || pricingRules.length === 0);
  
  // Filter new arrivals by selected category
  const displayArrivals = useMemo(() => {
    if (!allNewArrivals || allNewArrivals.length === 0) {
      return [];
    }
    
    // If "All" is selected, return all new arrivals
    if (selectedCategory === 'All') {
      return allNewArrivals;
    }
    
    // Filter by category/item_group
    // Check both item_group and category fields to match
    return allNewArrivals.filter((product: any) => {
      const productCategory = product.category || product.itemGroup || '';
      // Case-insensitive comparison
      return productCategory.toLowerCase() === itemGroupName?.toLowerCase();
    });
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
        onCartPress={async (productId) => {
          if (!user?.email) {
            Alert.alert('Login Required', 'Please log in to add items to your cart.');
            return;
          }
          
          try {
            const itemCode = item.itemCode || productId;
            const success = await addItemToCart(itemCode, 1);
            if (success) {
              setToastMessage('Item added to cart!');
              setToastVisible(true);
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
    if (displayArrivals.length === 0) {
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
            tintColor={Colors.SHEIN_PINK}
            colors={[Colors.SHEIN_PINK]}
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
    <SafeAreaView style={styles.container}>
      <Toast
        message={toastMessage}
        type="success"
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />
      <Header />
      <CategoryTabs 
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />
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
});
