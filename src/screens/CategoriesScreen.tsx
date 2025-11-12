import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { useCategories, usePricingRules, useWishlistActions, useWishlist } from '../hooks/erpnext';
import { useUserSession } from '../context/UserContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { ProductCard } from '../components/ProductCard';
import { Header } from '../components/Header';
import { getProductDiscount } from '../utils/pricingRules';
import { getERPNextClient } from '../services/erpnext';
import { mapERPWebsiteItemToProduct } from '../services/mappers';

const { width } = Dimensions.get('window');

export const CategoriesScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useUserSession();
  const { wishlistItems, refresh: refreshWishlist } = useWishlist(user?.email || null);
  const { toggleWishlist } = useWishlistActions(refreshWishlist);
  const { data: parentCategories, loading: categoriesLoading } = useCategories();
  const { data: pricingRules = [], loading: pricingRulesLoading } = usePricingRules();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [childCategories, setChildCategories] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [childImages, setChildImages] = useState<Record<string, string>>({});
  
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
      const newSet = new Set(prev);
      // Remove items that are no longer in the actual wishlist
      prev.forEach(id => {
        if (!actualSet.has(id)) {
          newSet.delete(id);
        }
      });
      // Only update if there's a change to prevent unnecessary re-renders
      if (newSet.size !== prev.size || Array.from(newSet).some(id => !prev.has(id))) {
        return newSet;
      }
      return prev; // Return same reference if no change
    });
  }, [wishlistItems, pendingOperations.size]);
  
  // Check if page is initially loading (fresh load - no data loaded yet)
  const isInitialLoading = (!parentCategories && categoriesLoading) && 
    (!pricingRules || pricingRules.length === 0);

  // Set first category as selected when data loads
  useEffect(() => {
    if (parentCategories && parentCategories.length > 0 && !selectedCategory) {
      // Log detailed information about all categories
      console.log('📚 Total Categories:', parentCategories.length);
      parentCategories.forEach((cat: any, idx: number) => {
        console.log(`  [${idx}] name: "${cat.name}", parentItemGroup: "${cat.parentItemGroup}", isGroup: ${cat.isGroup}`);
      });
      
      // Get first parent category (where parentItemGroup is empty/null)
      const firstParent = parentCategories.find((cat: any) => !cat.parentItemGroup || cat.parentItemGroup === '');
      if (firstParent) {
        console.log('📚 Selected First Parent:', firstParent.name);
        setSelectedCategory(firstParent.name);
        fetchChildCategories(firstParent.name);
      }
    }
  }, [parentCategories]);

  const fetchChildCategories = async (parentName: string) => {
    setLoadingChildren(true);
    try {
      const client = getERPNextClient();
      // Fetch all item groups and filter for children of the selected parent
      const response = await client.getItemGroups();
      
      console.log(`📚 Looking for children of parent: "${parentName}"`);
      console.log(`📚 Total groups returned: ${response.length}`);
      
      // Debug: Show all parent_item_group values (use raw field name from API)
      response.forEach((group: any, idx: number) => {
        if (group.parent_item_group) {
          console.log(`  [${idx}] ${group.name} -> parent: "${group.parent_item_group}"`);
        }
      });
      
      // Filter for children where parent_item_group matches selected parent (use raw field name!)
      const children = response.filter((group: any) => group.parent_item_group === parentName);
      console.log(`📚 Children of "${parentName}": ${children.length} found`);
      children.forEach((child: any) => {
        console.log(`  - ${child.name}`);
      });
      setChildCategories(children);

      // Fetch product images for each child category (get multiple products and pick one randomly)
      const images: Record<string, string> = {};
      for (const child of children) {
        try {
          // Fetch multiple products (up to 20) to get a better selection
          const websiteItems = await client.getWebsiteItemsByGroup(child.name, 20);
          if (websiteItems && websiteItems.length > 0) {
            // Map all products
            const products = websiteItems.map((item: any) => mapERPWebsiteItemToProduct(item));
            
            // Filter products that have images
            const productsWithImages = products.filter((product: any) => 
              product.images && product.images.length > 0
            );
            
            if (productsWithImages.length > 0) {
              // Pick a random product from the ones with images
              const randomIndex = Math.floor(Math.random() * productsWithImages.length);
              const randomProduct = productsWithImages[randomIndex];
              
              // Get the first image from the random product
              if (randomProduct.images && randomProduct.images.length > 0) {
                images[child.name] = randomProduct.images[0];
                console.log(`✅ Found image for category ${child.name}: ${randomProduct.images[0]}`);
              }
            } else if (products.length > 0) {
              // Fallback: if no products have images, just use the first product's image if available
              const firstProduct = products[0];
              if (firstProduct.images && firstProduct.images.length > 0) {
                images[child.name] = firstProduct.images[0];
                console.log(`✅ Found fallback image for category ${child.name}: ${firstProduct.images[0]}`);
              } else {
                console.log(`⚠️ No images found for category ${child.name} (${products.length} products fetched)`);
              }
            } else {
              console.log(`⚠️ No products found for category ${child.name}`);
            }
          }
        } catch (error) {
          console.warn(`❌ Could not fetch image for category ${child.name}:`, error);
        }
      }
      setChildImages(images);
    } catch (error) {
      console.error('Error fetching child categories:', error);
      setChildCategories([]);
    } finally {
      setLoadingChildren(false);
    }
  };

  const handleCategorySelect = (categoryName: string) => {
    setSelectedCategory(categoryName);
    fetchChildCategories(categoryName);
  }


  const renderSidebar = () => {
    // Filter to show only parent item groups (where parent_item_group is empty/null)
    const parentOnly = parentCategories?.filter(
      (cat: any) => !cat.parentItemGroup || cat.parentItemGroup === ''
    ) || [];

    return (
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <View style={styles.sidebarIndicator} />
          <Text style={styles.sidebarTitle}>Just for You</Text>
        </View>
        {categoriesLoading ? null : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {parentOnly && parentOnly.length > 0 ? (
              parentOnly.map((category) => {
                const categoryName = category.name || category.item_group_name || '';
                if (!categoryName) return null;
                return (
                  <TouchableOpacity
                    key={category.name || category.item_group_name}
                    style={[
                      styles.sidebarItem,
                      selectedCategory === category.name && styles.sidebarItemActive
                    ]}
                    onPress={() => handleCategorySelect(category.name)}
                  >
                    <Text style={[
                      styles.sidebarItemText,
                      selectedCategory === category.name && styles.sidebarItemTextActive
                    ]}>
                      {categoryName}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No categories available</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderProductGrid = (products: any[], title: string, showTrendsLogo = false) => (
    <View style={styles.productSection}>
      <View style={styles.sectionHeader}>
        {showTrendsLogo ? (
          <View style={styles.trendsLogoContainer}>
            <Text style={styles.trendsLogo}>SIAMAE</Text>
            <Text style={styles.trendsSubtitle}>Trends</Text>
          </View>
        ) : (
          <Text style={styles.sectionTitle}>{title}</Text>
        )}
      </View>
      <FlatList
        data={products}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.productGridList}
        columnWrapperStyle={styles.productGridRow}
        renderItem={({ item, index }) => {
          const discount = getProductDiscount(item, pricingRules);
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

          return (
            <ProductCard
              product={item}
              onPress={(productId) => {
                (navigation as any).navigate('ProductDetails', { productId });
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
                  await toggleWishlist(productId, isWishlisted);
                  // refreshWishlist is called automatically by useWishlistActions
                } finally {
                  // Remove from pending after a short delay to allow wishlist to sync
                  setTimeout(() => {
                    setPendingOperations(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(productId);
                      return newSet;
                    });
                  }, 500);
                }
              }}
              isWishlisted={wishlistedProductIds.has(item.id)}
              style={styles.productCard}
              variant={variant}
              pricingDiscount={discount}
            />
          );
        }}
        keyExtractor={(item) => item.id}
      />
    </View>
  );

  const renderChildCategoriesGrid = () => {
    if (loadingChildren) {
      return null; // Don't show anything while loading children
    }

    return (
      <View style={styles.productSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Picks for You</Text>
        </View>
        <View style={styles.childCategoriesGrid}>
          {childCategories.map((category: any, index: number) => {
            const image = childImages[category.name];
            const categoryName = category.item_group_name || category.name || 'Category';
            return (
              <TouchableOpacity
                key={category.name || category.item_group_name || `category-${index}`}
                style={styles.childCategoryItem}
                onPress={() => {
                  (navigation as any).navigate('CategoryProducts', {
                    categoryName: category.name,
                    parentName: selectedCategory,
                  });
                }}
              >
                {image ? (
                  <View style={styles.childCategoryCircle}>
                    <Image
                      source={{ uri: image }}
                      style={styles.childCategoryImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.warn(`Failed to load image for category ${category.name}:`, image, error);
                      }}
                    />
                  </View>
                ) : (
                  <View style={styles.childCategoryCircle}>
                    <Ionicons name="image" size={24} color={Colors.TEXT_SECONDARY} />
                  </View>
                )}
                {categoryName ? (
                  <Text style={styles.childCategoryName} numberOfLines={2}>
                    {categoryName}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderContent = () => (
    <View>
      {renderChildCategoriesGrid()}
    </View>
  );

  // Show loading screen on initial load
  if (isInitialLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header />
      <View style={styles.content}>
        {renderSidebar()}
        <View style={styles.mainContent}>
          {renderContent()}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: width * 0.35,
    borderRightWidth: 1,
    borderRightColor: Colors.BORDER,
    backgroundColor: Colors.LIGHT_GRAY,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  sidebarIndicator: {
    width: 4,
    height: 20,
    backgroundColor: Colors.BLACK,
    marginRight: 12,
    borderRadius: 2,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  sidebarItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  sidebarItemActive: {
    backgroundColor: Colors.WHITE,
  },
  sidebarItemText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  sidebarItemTextActive: {
    color: Colors.BLACK,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  productSection: {
    paddingVertical: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  trendsLogoContainer: {
    alignItems: 'center',
  },
  trendsLogo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.SHEIN_PINK,
  },
  trendsSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: -4,
  },
  productGridList: {
    paddingHorizontal: Spacing.SCREEN_PADDING,
    paddingTop: Spacing.PADDING_MD,
    paddingBottom: Spacing.PADDING_XL,
  },
  productGridRow: {
    justifyContent: 'space-between',
    marginBottom: Spacing.MARGIN_SM,
  },
  productCard: {
    width: (width * 0.65 - Spacing.SCREEN_PADDING * 2 - Spacing.MARGIN_SM) / 2,
    marginBottom: 0, // Row spacing handled by columnWrapperStyle
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  productEmoji: {
    fontSize: 24,
  },
  viewAllOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 12,
    color: Colors.BLACK,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  productPrice: {
    fontSize: 12,
    color: Colors.SHEIN_PINK,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
  },
  childCategoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  childCategoryItem: {
    alignItems: 'center',
    marginBottom: 24,
    width: '25%',
    paddingHorizontal: 4,
  },
  childCategoryCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  childCategoryImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.LIGHT_GRAY,
  },
  childCategoryEmoji: {
    fontSize: 36,
  },
  childCategoryName: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
    fontWeight: '500',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.LIGHT_GRAY,
  },
  backButtonText: {
    fontSize: 16,
    color: Colors.SHEIN_PINK,
    fontWeight: '600',
    marginLeft: 4,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
});

