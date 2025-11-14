import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { getERPNextClient } from '../services/erpnext';
import { mapERPWebsiteItemToProduct } from '../services/mappers';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.95; // 95% of screen width (wider)
const CARD_HEIGHT = 220; // Longer card height
const ITEM_SIZE = 60; // Size for individual items in the bundle (smaller)

interface BundleItem {
  itemCode: string;
  itemName?: string;
  image?: string | null;
}

interface ProductBundleCardProps {
  bundleName: string;
  newItemCode: string;
  customCustomer?: string;
  items: BundleItem[];
  onPress?: () => void;
}

export const ProductBundleCard: React.FC<ProductBundleCardProps> = ({
  bundleName,
  newItemCode,
  customCustomer,
  items,
  onPress,
}) => {
  const navigation = useNavigation<any>();

  // Helper function to convert relative image path to full URL
  const getImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath) return null;
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    const pathParts = imagePath.split('/');
    const encodedParts = pathParts.map((part, idx) => {
      return idx === 0 && part === '' ? '' : encodeURIComponent(part);
    });
    const encodedPath = encodedParts.join('/');
    return `https://glamora.rxcue.net${encodedPath.startsWith('/') ? encodedPath : '/' + encodedPath}`;
  };

  const handleItemPress = async (item: BundleItem) => {
    try {
      const client = getERPNextClient();
      const filters = [['Website Item', 'item_code', '=', item.itemCode]];
      const websiteItems = await client.getWebsiteItems(filters, 1);
      
      if (websiteItems && websiteItems.length > 0) {
        const product = mapERPWebsiteItemToProduct(websiteItems[0]);
        navigation.navigate('ProductDetails', { productId: product.id });
      } else {
        const websiteItems = await client.searchItems(item.itemCode);
        if (websiteItems && websiteItems.length > 0) {
          const product = mapERPWebsiteItemToProduct(websiteItems[0]);
          navigation.navigate('ProductDetails', { productId: product.id });
        }
      }
    } catch (error) {
      console.error('Error searching for product:', error);
    }
  };

  // Show all items - user can scroll to see more
  const displayItems = items;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#FFFFFF', '#FAFAFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerIconContainer}>
            <LinearGradient
              colors={[Colors.SHEIN_RED, '#FF6B6B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="cube" size={16} color={Colors.WHITE} />
            </LinearGradient>
          </View>
          <View style={styles.headerTextContainer}>
            <Text style={styles.bundleLabel}>Bundle</Text>
            <Text style={styles.bundleName} numberOfLines={1}>
              {bundleName || 'Product Bundle'}
            </Text>
            {customCustomer && (
              <Text style={styles.customerName} numberOfLines={1}>
                by {customCustomer}
              </Text>
            )}
          </View>
        </View>
      
      <View style={styles.itemsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.itemsScrollContent}
          style={styles.itemsScrollView}
        >
          {displayItems.map((item, index) => {
            const imageUrl = getImageUrl(item.image);
            return (
              <TouchableOpacity
                key={`${item.itemCode}-${index}`}
                style={styles.itemWrapper}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.itemImageContainer}>
                  {imageUrl ? (
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.itemImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.placeholderImage}>
                      <Ionicons name="image-outline" size={18} color={Colors.TEXT_SECONDARY} />
                    </View>
                  )}
                </View>
                {item.itemName && (
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.itemName}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.footerIconContainer}>
          <Ionicons name="arrow-forward" size={12} color={Colors.WHITE} />
        </View>
        <Text style={styles.viewAllText}>View Bundle</Text>
      </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: Spacing.BORDER_RADIUS_LG,
    marginRight: Spacing.MARGIN_MD,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: Spacing.PADDING_SM,
    borderRadius: Spacing.BORDER_RADIUS_LG,
    height: '100%',
    justifyContent: 'space-between',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.MARGIN_XS,
    marginBottom: Spacing.MARGIN_XS,
    paddingBottom: Spacing.PADDING_XS,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  headerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  bundleLabel: {
    fontSize: 10,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  bundleName: {
    fontSize: Typography.FONT_SIZE_SM,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
  },
  customerName: {
    fontSize: 9,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    color: Colors.TEXT_SECONDARY,
    marginTop: 2,
    fontStyle: 'italic',
  },
  itemsContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
  },
  itemsScrollView: {
    flex: 1,
  },
  itemsScrollContent: {
    paddingRight: Spacing.PADDING_SM,
    alignItems: 'center',
    paddingLeft: 0,
  },
  itemWrapper: {
    alignItems: 'center',
    width: ITEM_SIZE,
    marginRight: 0,
    justifyContent: 'center',
  },
  itemImageContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: Spacing.BORDER_RADIUS_SM,
    overflow: 'hidden',
    backgroundColor: Colors.WHITE,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.WHITE,
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.LIGHT_GRAY,
  },
  itemName: {
    fontSize: 10,
    color: Colors.TEXT_PRIMARY,
    textAlign: 'center',
    width: ITEM_SIZE,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.MARGIN_XS,
    marginTop: Spacing.MARGIN_XS,
    paddingTop: Spacing.PADDING_XS,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  footerIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.SHEIN_RED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 10,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.SHEIN_RED,
  },
});

