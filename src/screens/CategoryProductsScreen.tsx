import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  SafeAreaView,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import type { NavigationProp } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { useProductsByCategory, useCategories, usePricingRules, useWishlistActions, useWishlist } from '../hooks/erpnext';
import { useUserSession } from '../context/UserContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { ProductCard } from '../components/ProductCard';
import { PriceFilter, SortOption } from '../components/PriceFilter';
import { getProductDiscount } from '../utils/pricingRules';
import { getERPNextClient } from '../services/erpnext';
import { mapERPWebsiteItemToProduct } from '../services/mappers';

const { width } = Dimensions.get('window');

interface RouteParams {
  categoryName: string;
  parentName: string;
}

export const CategoryProductsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { user } = useUserSession();
  const { wishlistItems, refresh: refreshWishlist } = useWishlist(user?.email || null);
  const { toggleWishlist } = useWishlistActions(refreshWishlist);
  const { categoryName: initialCategoryName, parentName } = route.params as RouteParams;

  const { data: allCategories } = useCategories();
  
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
  const [siblingsLoading, setSiblingsLoading] = useState(false);
  const [siblingCategories, setSiblingCategories] = useState<any[]>([]);
  const [siblingImages, setSiblingImages] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryName);
  const [sortOption, setSortOption] = useState<SortOption>('default');
  
  // Use selectedCategory state instead of route params for fetching products
  // Convert sortOption to server-side sorting parameter
  const sortByPrice = sortOption === 'lowToHigh' ? 'asc' : sortOption === 'highToLow' ? 'desc' : undefined;
  const { data: products, loading: productsLoading, refresh: refreshProducts } = useProductsByCategory(selectedCategory, 50, sortByPrice);
  const { data: pricingRules = [], loading: pricingRulesLoading } = usePricingRules();
  
  // Pull-to-refresh state
  const [refreshing, setRefreshing] = useState(false);
  
  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshProducts(),
        refreshWishlist(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshProducts, refreshWishlist]);
  
  // Check if page is initially loading (fresh load - no data loaded yet)
  const isInitialLoading = (!products && productsLoading) && 
    (!pricingRules || pricingRules.length === 0);

  // Fetch sibling categories and their first product image
  useEffect(() => {
    const fetchSiblings = async () => {
      setSiblingsLoading(true);
      try {
        const client = getERPNextClient();
        const allGroups = await client.getItemGroups();
        // Filter for children of the same parent
        const siblings = allGroups.filter(
          (group: any) => group.parent_item_group === parentName
        );
        setSiblingCategories(siblings);

        // Fetch first product image for each sibling category
        const images: Record<string, string> = {};
        for (const sibling of siblings) {
          try {
            console.log(`🖼️ Fetching images for sibling category: ${sibling.name}`);
            // Fetch multiple products to get a better selection
            const websiteItems = await client.getWebsiteItemsByGroup(sibling.name, 20);
            console.log(`📦 Found ${websiteItems?.length || 0} products for ${sibling.name}`);
            
            if (websiteItems && websiteItems.length > 0) {
              // Map all products
              const products = websiteItems.map((item: any) => mapERPWebsiteItemToProduct(item));
              console.log(`✅ Mapped ${products.length} products for ${sibling.name}`);
              
              // Filter products that have images
              const productsWithImages = products.filter((product: any) => 
                product.images && product.images.length > 0
              );
              console.log(`🖼️ Found ${productsWithImages.length} products with images for ${sibling.name}`);
              
              if (productsWithImages.length > 0) {
                // Pick a random product from the ones with images
                const randomIndex = Math.floor(Math.random() * productsWithImages.length);
                const randomProduct = productsWithImages[randomIndex];
                
                // Get the first image from the random product
                if (randomProduct.images && randomProduct.images.length > 0) {
                  images[sibling.name] = randomProduct.images[0];
                  console.log(`✅ Set image for ${sibling.name}: ${randomProduct.images[0]}`);
                }
              } else if (products.length > 0) {
                // Fallback: if no products have images, just use the first product's image if available
                const firstProduct = products[0];
                console.log(`⚠️ No products with images for ${sibling.name}, checking first product:`, firstProduct);
                if (firstProduct.images && firstProduct.images.length > 0) {
                  images[sibling.name] = firstProduct.images[0];
                  console.log(`✅ Set fallback image for ${sibling.name}: ${firstProduct.images[0]}`);
                } else {
                  console.log(`❌ First product has no images either for ${sibling.name}`);
                }
              } else {
                console.log(`❌ No products found for ${sibling.name}`);
              }
            } else {
              console.log(`❌ No website items found for ${sibling.name}`);
            }
          } catch (error) {
            console.warn(`❌ Could not fetch image for category ${sibling.name}:`, error);
          }
        }
        console.log(`📸 Final sibling images:`, images);
        setSiblingImages(images);
      } catch (error) {
        console.error('Error fetching sibling categories:', error);
      } finally {
        setSiblingsLoading(false);
      }
    };

    if (parentName) {
      fetchSiblings();
    }
  }, [parentName]);

  const handleCategoryChange = (categoryName: string, parentName: string) => {
    setSelectedCategory(categoryName);
    // Update route params for navigation state
    navigation.setParams({ categoryName, parentName } as any);
  };
  
  // Update selectedCategory when route params change (e.g., when navigating back)
  useEffect(() => {
    if (initialCategoryName && initialCategoryName !== selectedCategory) {
      setSelectedCategory(initialCategoryName);
    }
  }, [initialCategoryName]);

  // No client-side sorting needed - server-side sorting is already applied
  const sortedProducts = useMemo(() => {
    return products || [];
  }, [products]);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.PADDING_SM }]}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Ionicons name="chevron-back" size={24} color={Colors.BLACK} />
      </TouchableOpacity>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {selectedCategory}
      </Text>
      <View style={styles.headerIcons}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="search" size={24} color={Colors.BLACK} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="heart-outline" size={24} color={Colors.BLACK} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSiblingCategories = () => (
    <View style={styles.siblingContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.siblingScroll}
      >
        {siblingCategories.map((category) => {
          const image = siblingImages[category.name];
          const categoryName = category.item_group_name || category.name || 'Category';
          return (
            <TouchableOpacity
              key={category.name || category.item_group_name}
              style={[
                styles.siblingTab,
                selectedCategory === category.name && styles.siblingTabActive,
              ]}
              onPress={() => handleCategoryChange(category.name, parentName)}
            >
              {image ? (
                <View style={styles.siblingTabImageContainer}>
                  <Image
                    source={{ uri: image }}
                    style={styles.siblingTabImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.warn(`❌ Failed to load image for category ${category.name}:`, image, error);
                    }}
                    onLoad={() => {
                      console.log(`✅ Successfully loaded image for category ${category.name}`);
                    }}
                  />
                </View>
              ) : (
                <View style={styles.siblingTabPlaceholder}>
                  <Ionicons name="image" size={18} color={Colors.TEXT_SECONDARY} />
                </View>
              )}
              <Text
                style={[
                  styles.siblingTabText,
                  selectedCategory === category.name && styles.siblingTabTextActive,
                ]}
                numberOfLines={2}
              >
                {categoryName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersScroll}
      >
        <PriceFilter onSortChange={setSortOption} currentSort={sortOption} />

        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Category</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.SHEIN_PINK} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Size</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.SHEIN_PINK} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterChip}>
          <Text style={styles.filterChipText}>Color</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.SHEIN_PINK} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderProductItem = ({ item, index }: { item: any; index: number }) => {
    const isLeftColumn = index % 2 === 0;
    const row = Math.floor(index / 2);
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
    
    const discount = getProductDiscount(item, pricingRules);
    
    return (
      <ProductCard
        product={item}
        onPress={(productId) => {
          navigation.navigate('ProductDetails', { productId });
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
    const ListHeader = () => (
      <>
        {renderSiblingCategories()}
        <View style={styles.stickyFiltersWrapper}>
          {renderFilters()}
        </View>
      </>
    );

    if (!sortedProducts || sortedProducts.length === 0) {
      return (
        <>
          <ListHeader />
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color={Colors.LIGHT_GRAY} />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        </>
      );
    }

    return (
      <FlatList
        data={sortedProducts}
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
        ListHeaderComponent={ListHeader}
        ListHeaderComponentStyle={styles.listHeader}
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
      {renderHeader()}
      {renderProducts()}
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
    paddingHorizontal: Spacing.PADDING_SM,
    paddingBottom: Spacing.PADDING_SM,
    borderBottomWidth: 1,
    borderBottomColor: Colors.LIGHT_GRAY,
  },
  headerTitle: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: '600',
    color: Colors.BLACK,
    flex: 1,
    marginHorizontal: Spacing.MARGIN_XS,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.MARGIN_XS,
  },
  iconButton: {
    padding: Spacing.PADDING_XS,
  },
  siblingContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.LIGHT_GRAY,
    backgroundColor: Colors.WHITE,
  },
  siblingScroll: {
    paddingHorizontal: Spacing.PADDING_SM,
    paddingVertical: Spacing.PADDING_XS,
    gap: Spacing.MARGIN_XS,
  },
  siblingTab: {
    alignItems: 'center',
    paddingVertical: Spacing.PADDING_XS,
    marginRight: Spacing.MARGIN_XS,
    maxWidth: width * 0.25,
  },
  siblingTabActive: {
    opacity: 0.8,
  },
  siblingTabImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: Spacing.MARGIN_XS / 2,
    backgroundColor: Colors.LIGHT_GRAY,
    overflow: 'hidden',
  },
  siblingTabImage: {
    width: '100%',
    height: '100%',
  },
  siblingTabPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.MARGIN_XS / 2,
  },
  siblingTabText: {
    fontSize: Typography.FONT_SIZE_XS - 1,
    color: Colors.DARK_GRAY,
    fontWeight: '500',
    textAlign: 'center',
  },
  siblingTabTextActive: {
    color: Colors.SHEIN_PINK,
    fontWeight: '600',
  },
  stickyFiltersWrapper: {
    backgroundColor: Colors.WHITE,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.LIGHT_GRAY,
    backgroundColor: Colors.WHITE,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.PADDING_SM,
    paddingVertical: Spacing.PADDING_XS,
    gap: Spacing.MARGIN_XS,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.PADDING_SM,
    paddingVertical: Spacing.PADDING_XS,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.LIGHT_GRAY,
    marginRight: Spacing.MARGIN_XS,
  },
  filterChipText: {
    fontSize: Typography.FONT_SIZE_XS,
    color: Colors.BLACK,
    fontWeight: '500',
    marginRight: 3,
  },
  listHeader: {
    backgroundColor: Colors.WHITE,
  },
  productsList: {
    paddingHorizontal: Spacing.PADDING_SM,
    paddingTop: Spacing.PADDING_SM,
    paddingBottom: Spacing.PADDING_MD,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.MARGIN_XS,
  },
  productCard: {
    width: (width - Spacing.PADDING_SM * 2 - Spacing.MARGIN_XS) / 2,
    marginBottom: 0, // Row spacing handled by columnWrapperStyle
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.DARK_GRAY,
    marginTop: Spacing.MARGIN_SM,
  },
});

