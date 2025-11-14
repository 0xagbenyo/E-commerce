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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { useUserSession } from '../context/UserContext';
import { useWishlist } from '../hooks/erpnext';
import { useShoppingCart } from '../hooks/erpnext';
import { useOrders } from '../hooks/erpnext';
import { usePricingRules } from '../hooks/erpnext';
import { getERPNextClient } from '../services/erpnext';
import { mapERPWebsiteItemToProduct } from '../services/mappers';

const services = [
  { id: '1', label: 'Customer Service', icon: 'headset-outline' },
];

export const ProfileScreen: React.FC = () => {
  const [userDetails, setUserDetails] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const { user } = useUserSession();
  
  // Fetch user details
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!user?.email) {
        setLoadingUser(false);
        return;
      }
      
      try {
        setLoadingUser(true);
        const client = getERPNextClient();
        const userData = await client.getUserByEmail(user.email);
        setUserDetails(userData);
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setLoadingUser(false);
      }
    };
    
    fetchUserDetails();
  }, [user?.email]);
  
  // Fetch wishlist count
  const { wishlistItems, refresh: refreshWishlist } = useWishlist(user?.email || null);
  const wishlistCount = wishlistItems?.length || 0;
  
  // Fetch cart count
  const { cartItems, refresh: refreshCart } = useShoppingCart(user?.email || null);
  const cartCount = cartItems?.length || 0;
  
  // Fetch orders - using user email as customer identifier
  // Note: This might need adjustment if your ERPNext uses Customer doctype
  const { data: orders } = useOrders(user?.email || '', undefined);
  const orderCount = orders?.length || 0;
  
  // Fetch pricing rules for discount banner
  const { data: pricingRules = [] } = usePricingRules();
  
  // Get the latest/active pricing rule
  const latestPricingRule = pricingRules && pricingRules.length > 0 ? pricingRules[0] : null;
  const discountPercent = latestPricingRule?.discount_percentage || (latestPricingRule as any)?.discount_percentage || 0;
  
  // State for pricing rule products
  const [pricingRuleProducts, setPricingRuleProducts] = useState<any[]>([]);
  
  // Fetch products for the latest pricing rule
  useEffect(() => {
    const fetchPricingRuleProducts = async () => {
      if (!latestPricingRule || discountPercent === 0) {
        setPricingRuleProducts([]);
        return;
      }
      
      try {
        const client = getERPNextClient();
        const ruleAny = latestPricingRule as any;
        const products: any[] = [];
        
        // Fetch products by item codes
        if (ruleAny.items && Array.isArray(ruleAny.items) && ruleAny.items.length > 0) {
          for (const item of ruleAny.items) {
            try {
              const itemCode = item.item_code || item.item;
              if (itemCode) {
                let websiteItem;
                try {
                  websiteItem = await client.getWebsiteItem(itemCode);
                } catch (error) {
                  // Try search fallback
                  const searchResults = await client.searchWebsiteItems(itemCode);
                  if (searchResults && searchResults.length > 0) {
                    websiteItem = searchResults[0];
                  }
                }
                if (websiteItem) {
                  const product = mapERPWebsiteItemToProduct(websiteItem);
                  products.push(product);
                }
              }
            } catch (error) {
              // Skip items that can't be found
              continue;
            }
          }
        }
        
        // Fetch products by item groups
        if (ruleAny.item_groups && Array.isArray(ruleAny.item_groups) && ruleAny.item_groups.length > 0) {
          for (const group of ruleAny.item_groups) {
            try {
              const groupName = group.item_group || group.name;
              if (groupName) {
                const groupItems = await client.getItemsByGroup(groupName, 10);
                const groupProducts = groupItems.map((item: any) => mapERPWebsiteItemToProduct(item));
                products.push(...groupProducts);
              }
            } catch (error) {
              // Skip groups that can't be found
              continue;
            }
          }
        }
        
        setPricingRuleProducts(products);
      } catch (error) {
        console.error('Error fetching pricing rule products:', error);
        setPricingRuleProducts([]);
      }
    };
    
    fetchPricingRuleProducts();
  }, [latestPricingRule, discountPercent]);
  
  // Handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh user details
      if (user?.email) {
        const client = getERPNextClient();
        const userData = await client.getUserByEmail(user.email);
        setUserDetails(userData);
      }
      
      // Refresh wishlist and cart
      if (refreshWishlist) refreshWishlist();
      if (refreshCart) refreshCart();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // Calculate order status counts
  const unpaidCount = orders?.filter(o => o.status === 'pending').length || 0;
  const processingCount = orders?.filter(o => o.status === 'processing').length || 0;
  const shippedCount = orders?.filter(o => o.status === 'shipped').length || 0;
  
  // Get user display name
  const getUserDisplayName = () => {
    if (userDetails) {
      return userDetails.full_name || 
             `${userDetails.first_name || ''} ${userDetails.last_name || ''}`.trim() ||
             userDetails.name ||
             user?.email?.split('@')[0] ||
             'User';
    }
    return user?.email?.split('@')[0] || user?.fullName || 'User';
  };
  
  // Get user initials for avatar
  const getUserInitials = () => {
    const name = getUserDisplayName();
    if (name && name.length > 0) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name[0].toUpperCase();
    }
    return 'U';
  };

  const renderHeader = () => {
    if (loadingUser) {
      return (
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <ActivityIndicator size="small" color={Colors.SHEIN_PINK} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </View>
      );
    }
    
    if (!user?.email) {
      return (
        <View style={styles.header}>
          <View style={styles.profileInfo}>
            <Text style={styles.loadingText}>Please log in to view your profile</Text>
          </View>
        </View>
      );
    }
    
    return (
    <View style={styles.header}>
      <View style={styles.profileInfo}>
        <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getUserInitials()}</Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.usernameRow}>
              <Text style={styles.username}>{getUserDisplayName()}</Text>
            <View style={styles.membershipBadge}>
              <Text style={styles.membershipText}>S0</Text>
            </View>
          </View>
            <TouchableOpacity 
              style={styles.profileEditRow}
              onPress={() => (navigation as any).navigate('EditProfile')}
            >
            <Text style={styles.profileLabel}>My Profile</Text>
            <Ionicons name="pencil" size={16} color={Colors.BLACK} />
            </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerIcon}>
            <Ionicons name="grid" size={20} color={Colors.BLACK} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerIcon}
              onPress={() => (navigation as any).navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={20} color={Colors.BLACK} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  };


  const renderPricingRuleBanner = () => {
    // Only show banner if there's an active pricing rule with a discount
    if (!latestPricingRule || discountPercent === 0) {
      return null;
    }
    
    const handleBannerPress = () => {
      // Navigate to AllDeals screen with the pricing rule products
      (navigation as any).navigate('AllDeals', { 
        deals: pricingRuleProducts
      });
    };
    
    return (
        <TouchableOpacity 
        style={styles.pricingRuleBanner}
        onPress={handleBannerPress}
        activeOpacity={0.8}
        >
        <Ionicons name="pricetag" size={20} color={Colors.SHEIN_PINK} />
        <Text style={styles.pricingRuleBannerText}>
          Get {discountPercent}% Off - Tap to view deals!
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.SHEIN_PINK} />
        </TouchableOpacity>
  );
  };

  const renderOrdersSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Orders</Text>
        <TouchableOpacity onPress={() => (navigation as any).navigate('OrderHistory')}>
          <Text style={styles.viewAllText}>View all {'>'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.orderStatuses}>
        <View style={styles.orderStatus}>
          <Ionicons name="document-outline" size={24} color={Colors.BLACK} />
          <Text style={styles.orderStatusLabel}>Unpaid ({unpaidCount})</Text>
        </View>
        <View style={styles.orderStatus}>
          <Ionicons name="cube-outline" size={24} color={Colors.BLACK} />
          <Text style={styles.orderStatusLabel}>Processing ({processingCount})</Text>
        </View>
        <View style={styles.orderStatus}>
          <Ionicons name="car-outline" size={24} color={Colors.BLACK} />
          <Text style={styles.orderStatusLabel}>Shipped ({shippedCount})</Text>
        </View>
        <View style={styles.orderStatus}>
          <Ionicons name="chatbubble-outline" size={24} color={Colors.BLACK} />
          <Text style={styles.orderStatusLabel}>Review</Text>
        </View>
        <View style={styles.orderStatus}>
          <Ionicons name="arrow-undo-outline" size={24} color={Colors.BLACK} />
          <Text style={styles.orderStatusLabel}>Returns</Text>
          </View>
      </View>
    </View>
  );

  const renderActivitiesSection = () => (
    <View style={styles.section}>
      <View style={styles.activitiesContainer}>
        <TouchableOpacity 
          style={styles.activityItem}
          onPress={() => (navigation as any).navigate('Wishlist')}
          activeOpacity={0.7}
        >
            <View style={styles.activityContent}>
            <Ionicons name="heart-outline" size={20} color={Colors.BLACK} />
            <Text style={styles.activityLabel}>Wishlist</Text>
            <Text style={styles.activityValue}>{wishlistCount} item{wishlistCount !== 1 ? 's' : ''}</Text>
            </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderServicesSection = () => (
    <View style={styles.section}>
      <View style={styles.servicesContainer}>
        {services.map((service) => (
          <TouchableOpacity key={service.id} style={styles.serviceItem}>
            <Ionicons name={service.icon as any} size={24} color={Colors.BLACK} />
            <Text style={styles.serviceLabel}>{service.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );


  return (
    <SafeAreaView style={styles.container}>
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
        {renderHeader()}
        {renderPricingRuleBanner()}
        {renderOrdersSection()}
        {renderActivitiesSection()}
        {renderServicesSection()}
      </ScrollView>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  userInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginRight: 8,
  },
  googleBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  googleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.WHITE,
  },
  membershipBadge: {
    backgroundColor: Colors.SHEIN_PINK,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  membershipText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.WHITE,
  },
  profileEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileLabel: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pricingRuleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  pricingRuleBannerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.SHEIN_PINK,
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
    paddingVertical: 16,
  },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  viewAllText: {
    fontSize: 14,
    color: Colors.SHEIN_PINK,
    fontWeight: '500',
  },
  orderStatuses: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  orderStatus: {
    flex: 1,
    alignItems: 'center',
  },
  orderStatusLabel: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 4,
  },
  activitiesContainer: {
    paddingHorizontal: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  activityContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityLabel: {
    fontSize: 14,
    color: Colors.BLACK,
    flex: 1,
  },
  activityValue: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  servicesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  serviceItem: {
    flex: 1,
    alignItems: 'center',
  },
  serviceLabel: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginTop: 8,
    textAlign: 'center',
  },
  productsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    flex: 1,
    backgroundColor: Colors.WHITE,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  faveBanner: {
    backgroundColor: Colors.SHEIN_ORANGE,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  faveText: {
    fontSize: 10,
    color: Colors.WHITE,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  productEmoji: {
    fontSize: 50,
  },
  brandInfo: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  categoryBadge: {
    backgroundColor: Colors.SHEIN_PINK,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  categoryText: {
    fontSize: 8,
    color: Colors.WHITE,
    fontWeight: 'bold',
  },
  timerContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  timerText: {
    fontSize: 10,
    color: Colors.FLASH_SALE_RED,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  colorSwatches: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  colorSwatch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.WHITE,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 12,
    color: Colors.BLACK,
    marginBottom: 4,
    lineHeight: 16,
  },
  bestsellerText: {
    fontSize: 10,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginBottom: 2,
  },
  originalPrice: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  estimatedText: {
    fontSize: 10,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 8,
  },
  addToCartButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.SHEIN_PINK,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discountTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.SHEIN_ORANGE,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 10,
    color: Colors.WHITE,
    fontWeight: 'bold',
  },
});

