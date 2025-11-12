import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useShoppingCart, useCartActions } from '../hooks/erpnext';
import { useUserSession } from '../context/UserContext';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LoadingScreen } from '../components/LoadingScreen';

export const CartScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useUserSession();
  const { cartItems, loading, error, refresh } = useShoppingCart(user?.email || null);
  const { removeFromCart, updateQuantity, isLoading: isCartActionLoading } = useCartActions(refresh);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set()); // Track items being updated
  const [optimisticQuantities, setOptimisticQuantities] = useState<Map<string, number>>(new Map()); // Optimistic quantity updates
  
  // Sync optimistic quantities with actual cart items when cart updates
  // Only clear optimistic state when the actual cart quantity matches the optimistic one
  React.useEffect(() => {
    if (cartItems.length > 0 && optimisticQuantities.size > 0) {
      setOptimisticQuantities(prev => {
        const newMap = new Map(prev);
        let hasChanges = false;
        
        // Remove optimistic quantities that match the actual cart quantities
        cartItems.forEach(item => {
          const optimisticQty = newMap.get(item.itemCode);
          if (optimisticQty !== undefined && optimisticQty === item.quantity) {
            // Quantity matches server value, safe to clear optimistic state
            newMap.delete(item.itemCode);
            hasChanges = true;
          }
        });
        
        // Only update if there were changes to avoid unnecessary re-renders
        return hasChanges ? newMap : prev;
      });
    }
  }, [cartItems]);
  
  // Refresh cart when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.email) {
        refresh();
      }
    }, [user?.email, refresh])
  );
  
  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error('Error refreshing cart:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Handle remove item
  const handleRemoveItem = async (itemCode: string) => {
    try {
      await removeFromCart(itemCode);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };
  
  // Handle update quantity with optimistic update
  const handleUpdateQuantity = async (itemCode: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      await handleRemoveItem(itemCode);
      return;
    }
    
    // Optimistic update: immediately update the quantity in UI
    setOptimisticQuantities(prev => {
      const newMap = new Map(prev);
      newMap.set(itemCode, newQuantity);
      return newMap;
    });
    
    // Add to updating set
    setUpdatingItems(prev => new Set(prev).add(itemCode));
    
    try {
      await updateQuantity(itemCode, newQuantity);
      // Don't clear optimistic quantity here - let the useEffect sync handle it
      // The cart will refresh and the useEffect will clear when quantities match
    } catch (error) {
      console.error('Error updating quantity:', error);
      // Revert optimistic update on error
      setOptimisticQuantities(prev => {
        const newMap = new Map(prev);
        newMap.delete(itemCode);
        return newMap;
      });
    } finally {
      // Remove from updating set
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemCode);
        return newSet;
      });
    }
  };
  
  // Handle decrease quantity
  const handleDecreaseQuantity = async (itemCode: string, currentQuantity: number) => {
    const newQuantity = currentQuantity - 1;
    if (newQuantity <= 0) {
      await handleRemoveItem(itemCode);
      return;
    }
    await handleUpdateQuantity(itemCode, newQuantity);
  };
  
  // Get the effective quantity (optimistic or actual)
  const getEffectiveQuantity = (itemCode: string, actualQuantity: number): number => {
    return optimisticQuantities.get(itemCode) ?? actualQuantity;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.radioButton}>
            <Ionicons name="radio-button-off" size={20} color={Colors.BLACK} />
          </TouchableOpacity>
          <Text style={styles.radioLabel}>All</Text>
        </View>
        <Text style={styles.cartTitle}>Cart ({cartItems.length})</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={Colors.BLACK} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.shippingInfo}>
        <Text style={styles.shippingText}>Ship to Accra {'>'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFilterTabs = () => (
    <View style={styles.filterTabs}>
      {[
        { id: '1', name: 'All', active: true },
        { id: '2', name: 'Markdowns', icon: 'arrow-down' },
        { id: '3', name: 'Almost Out of Stock', icon: 'flame' },
      ].map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.filterTab,
            tab.active && styles.filterTabActive
          ]}
          onPress={() => setSelectedFilter(tab.name)}
        >
          {tab.icon && (
            <Ionicons 
              name={tab.icon as any} 
              size={16} 
              color={tab.active ? Colors.WHITE : Colors.BLACK} 
            />
          )}
          <Text style={[
            styles.filterTabText,
            tab.active && styles.filterTabTextActive
          ]}>
            {tab.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCartItem = ({ item }: { item: any }) => {
    if (!item.product) {
      return null; // Skip items without product data
    }
    
    const product = item.product;
    const formatPrice = (price: number) => `GH₵${price.toFixed(2)}`;
    const isUpdating = updatingItems.has(item.itemCode);
    
    // Get effective quantity (optimistic or actual)
    const effectiveQuantity = getEffectiveQuantity(item.itemCode, item.quantity);
    
    // Calculate total price for this item (price * quantity)
    const itemTotalPrice = product.price * effectiveQuantity;
    const itemTotalOriginalPrice = product.originalPrice ? product.originalPrice * effectiveQuantity : null;
    
    const handleItemPress = () => {
      // Navigate to product details using product.id
      const productId = product.id || item.productId;
      if (productId) {
        (navigation as any).navigate('ProductDetails', { productId });
      }
    };

    return (
      <TouchableOpacity 
        style={styles.cartItem}
        onPress={handleItemPress}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.brandName}>{product.brand || product.company || 'SIAMAE'}</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.BLACK} />
        </View>
        
        <View style={styles.itemContent}>
          <TouchableOpacity 
            style={styles.radioButton}
            onPress={(e) => {
              e.stopPropagation(); // Prevent triggering parent onPress
              if (selectedItems.includes(item.id)) {
                setSelectedItems(selectedItems.filter(id => id !== item.id));
              } else {
                setSelectedItems([...selectedItems, item.id]);
              }
            }}
          >
            <Ionicons 
              name={selectedItems.includes(item.id) ? "radio-button-on" : "radio-button-off"} 
              size={20} 
              color={selectedItems.includes(item.id) ? Colors.SHEIN_PINK : Colors.BLACK} 
            />
          </TouchableOpacity>
          
          <View style={styles.itemImage}>
            {product.images && product.images.length > 0 ? (
              <Image
                source={{ uri: product.images[0] }}
                style={styles.itemImageContent}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="image-outline" size={40} color={Colors.TEXT_SECONDARY} />
            )}
          </View>
          
          <View style={styles.itemDetails}>
            <Text style={styles.itemName} numberOfLines={2}>{product.name}</Text>
            
            <View style={styles.priceContainer}>
              {isUpdating ? (
                <ActivityIndicator size="small" color={Colors.SHEIN_PINK} style={styles.priceLoading} />
              ) : (
                <>
                  <Text style={styles.itemPrice}>{formatPrice(itemTotalPrice)}</Text>
                  {itemTotalOriginalPrice && itemTotalOriginalPrice > itemTotalPrice && (
                    <Text style={styles.originalPrice}>{formatPrice(itemTotalOriginalPrice)}</Text>
                  )}
                </>
              )}
            </View>
            
            <View style={styles.quantityContainer}>
              <TouchableOpacity 
                style={[styles.quantityButton, styles.quantityButtonMinus, isUpdating && styles.quantityButtonDisabled]}
                onPress={(e) => {
                  e.stopPropagation(); // Prevent triggering parent onPress
                  handleDecreaseQuantity(item.itemCode, effectiveQuantity);
                }}
                disabled={isUpdating || isCartActionLoading}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={Colors.ERROR} />
                ) : (
                  <Ionicons name="remove" size={20} color={Colors.ERROR} />
                )}
              </TouchableOpacity>
              <View style={styles.quantityBox}>
                {isUpdating ? (
                  <ActivityIndicator size="small" color={Colors.SHEIN_PINK} />
                ) : (
                  <Text style={styles.quantityText}>{effectiveQuantity}</Text>
                )}
              </View>
              <TouchableOpacity 
                style={[styles.quantityButton, styles.quantityButtonPlus, isUpdating && styles.quantityButtonDisabled]}
                onPress={(e) => {
                  e.stopPropagation(); // Prevent triggering parent onPress
                  handleUpdateQuantity(item.itemCode, effectiveQuantity + 1);
                }}
                disabled={isUpdating || isCartActionLoading}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={Colors.SUCCESS} />
                ) : (
                  <Ionicons name="add" size={20} color={Colors.SUCCESS} />
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteButton, isUpdating && styles.quantityButtonDisabled]}
                onPress={(e) => {
                  e.stopPropagation(); // Prevent triggering parent onPress
                  handleRemoveItem(item.itemCode);
                }}
                disabled={isUpdating || isCartActionLoading}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={Colors.TEXT_SECONDARY} />
                ) : (
                  <Ionicons name="trash-outline" size={18} color={Colors.TEXT_SECONDARY} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPromotionsBanner = () => (
    <View style={styles.promotionsBanner}>
      <View style={styles.promotionsContent}>
        <Ionicons name="pricetag" size={20} color={Colors.SHEIN_PINK} />
        <Text style={styles.promotionsText}>
          2 Promotions in your cart! Click to view exclusive deals and save more!
        </Text>
      </View>
      <TouchableOpacity style={styles.viewMoreButton}>
        <Text style={styles.viewMoreText}>View More</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCheckoutBar = () => (
    <View style={styles.checkoutBar}>
      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>GH₵0.00</Text>
      </View>
      <TouchableOpacity style={styles.checkoutButton}>
        <Text style={styles.checkoutButtonText}>Checkout</Text>
      </TouchableOpacity>
    </View>
  );

  // Show loading screen on initial load
  if (loading && cartItems.length === 0) {
    return <LoadingScreen />;
  }
  
  // Calculate total
  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      if (item.product) {
        return sum + (item.product.price * item.quantity);
      }
      return sum;
    }, 0);
  };
  
  const total = calculateTotal();
  
  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderFilterTabs()}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error loading cart: {error.message}</Text>
        </View>
      )}
      {!loading && cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={64} color={Colors.TEXT_SECONDARY} />
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>Add items to your cart to see them here</Text>
        </View>
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.SHEIN_PINK}
              colors={[Colors.SHEIN_PINK]}
            />
          }
        >
          {cartItems.map((item) => (
            <View key={item.id}>
              {renderCartItem({ item })}
            </View>
          ))}
        </ScrollView>
      )}
      {cartItems.length > 0 && (
        <View style={styles.checkoutBar}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>GH₵{total.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.checkoutButton}>
            <Text style={styles.checkoutButtonText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioButton: {
    padding: 4,
  },
  radioLabel: {
    fontSize: 16,
    color: Colors.BLACK,
    fontWeight: '500',
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  moreButton: {
    padding: 4,
  },
  shippingInfo: {
    alignSelf: 'flex-start',
  },
  shippingText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    gap: 4,
  },
  filterTabActive: {
    backgroundColor: Colors.DARK_GRAY,
  },
  filterTabText: {
    fontSize: 14,
    color: Colors.BLACK,
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: Colors.WHITE,
  },
  cartItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.BLACK,
    flex: 1,
  },
  trendsTag: {
    backgroundColor: Colors.SHEIN_PINK,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  trendsText: {
    fontSize: 12,
    color: Colors.WHITE,
    fontWeight: 'bold',
  },
  itemContent: {
    flexDirection: 'row',
    gap: 12,
  },
  itemImage: {
    width: 80,
    height: 100,
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  itemEmoji: {
    fontSize: 40,
  },
  itemImageContent: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  errorContainer: {
    padding: 16,
    backgroundColor: Colors.ERROR + '20',
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: Colors.ERROR,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
  },
  stockBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.SHEIN_ORANGE,
    paddingVertical: 2,
    alignItems: 'center',
  },
  stockText: {
    fontSize: 10,
    color: Colors.WHITE,
    fontWeight: 'bold',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: Colors.BLACK,
    marginBottom: 8,
    lineHeight: 18,
  },
  heartButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 4,
  },
  variantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  variantText: {
    fontSize: 14,
    color: Colors.BLACK,
    marginRight: 4,
  },
  reviewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: Colors.SUCCESS,
    marginLeft: 4,
  },
  salesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  salesText: {
    fontSize: 12,
    color: Colors.SHEIN_PINK,
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 24,
  },
  priceLoading: {
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  priceChange: {
    fontSize: 12,
    color: Colors.FLASH_SALE_RED,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonMinus: {
    backgroundColor: '#FFE5E5', // Light red background
  },
  quantityButtonPlus: {
    backgroundColor: '#E5F5E5', // Light green background
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  quantityBox: {
    width: 40,
    height: 32,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    color: Colors.BLACK,
  },
  promotionsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  promotionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  promotionsText: {
    fontSize: 14,
    color: Colors.BLACK,
    flex: 1,
  },
  viewMoreButton: {
    borderWidth: 1,
    borderColor: Colors.SHEIN_PINK,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  viewMoreText: {
    fontSize: 14,
    color: Colors.SHEIN_PINK,
    fontWeight: '500',
  },
  checkoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.BORDER,
    backgroundColor: Colors.WHITE,
  },
  totalContainer: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  checkoutButton: {
    backgroundColor: Colors.DARK_GRAY,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.WHITE,
  },
});
