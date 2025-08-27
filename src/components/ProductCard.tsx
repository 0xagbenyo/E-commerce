import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../types';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { Spacing } from '../constants/spacing';

const { width } = Dimensions.get('window');
const cardWidth = (width - Spacing.SCREEN_PADDING * 3) / 2;

export interface ProductCardProps {
  product: Product;
  onPress: (productId: string) => void;
  onWishlistPress: (productId: string) => void;
  isWishlisted?: boolean;
  style?: any;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onWishlistPress,
  isWishlisted = false,
  style,
}) => {
  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const calculateDiscount = () => {
    if (product.originalPrice && product.originalPrice > product.price) {
      return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    }
    return 0;
  };

  const discount = calculateDiscount();

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={() => onPress(product.id)}
      activeOpacity={0.9}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: product.images[0] }}
          style={styles.image}
          resizeMode="cover"
        />
        
        {/* Wishlist Button */}
        <TouchableOpacity
          style={styles.wishlistButton}
          onPress={() => onWishlistPress(product.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isWishlisted ? 'heart' : 'heart-outline'}
            size={20}
            color={isWishlisted ? Colors.VIBRANT_PINK : Colors.WHITE}
          />
        </TouchableOpacity>

        {/* Discount Badge */}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}

        {/* New Badge */}
        {product.isNew && (
          <View style={styles.newBadge}>
            <Text style={styles.newText}>NEW</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand}
        </Text>
        
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.priceContainer}>
          <Text style={styles.price}>
            {formatPrice(product.price)}
          </Text>
          
          {product.originalPrice && product.originalPrice > product.price && (
            <Text style={styles.originalPrice}>
              {formatPrice(product.originalPrice)}
            </Text>
          )}
        </View>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={12} color={Colors.WARNING} />
          <Text style={styles.rating}>
            {product.rating.toFixed(1)} ({product.reviewCount})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: Colors.SURFACE,
    borderRadius: Spacing.BORDER_RADIUS_LG,
    marginBottom: Spacing.MARGIN_MD,
    ...Spacing.SHADOW_SM,
  },
  
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: cardWidth * 1.3,
    borderTopLeftRadius: Spacing.BORDER_RADIUS_LG,
    borderTopRightRadius: Spacing.BORDER_RADIUS_LG,
    overflow: 'hidden',
  },
  
  image: {
    width: '100%',
    height: '100%',
  },
  
  wishlistButton: {
    position: 'absolute',
    top: Spacing.MARGIN_SM,
    right: Spacing.MARGIN_SM,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  discountBadge: {
    position: 'absolute',
    top: Spacing.MARGIN_SM,
    left: Spacing.MARGIN_SM,
    backgroundColor: Colors.VIBRANT_PINK,
    paddingHorizontal: Spacing.PADDING_SM,
    paddingVertical: Spacing.PADDING_XS,
    borderRadius: Spacing.BORDER_RADIUS_SM,
  },
  
  discountText: {
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_XS,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
  },
  
  newBadge: {
    position: 'absolute',
    bottom: Spacing.MARGIN_SM,
    left: Spacing.MARGIN_SM,
    backgroundColor: Colors.ELECTRIC_BLUE,
    paddingHorizontal: Spacing.PADDING_SM,
    paddingVertical: Spacing.PADDING_XS,
    borderRadius: Spacing.BORDER_RADIUS_SM,
  },
  
  newText: {
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_XS,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
  },
  
  content: {
    padding: Spacing.PADDING_MD,
  },
  
  brand: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    marginBottom: Spacing.MARGIN_XS,
  },
  
  name: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_PRIMARY,
    fontWeight: Typography.FONT_WEIGHT_REGULAR,
    marginBottom: Spacing.MARGIN_SM,
    lineHeight: Typography.FONT_SIZE_SM * 1.4,
  },
  
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.MARGIN_XS,
  },
  
  price: {
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.TEXT_PRIMARY,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    marginRight: Spacing.MARGIN_SM,
  },
  
  originalPrice: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
  },
  
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  rating: {
    fontSize: Typography.FONT_SIZE_XS,
    color: Colors.TEXT_SECONDARY,
    marginLeft: Spacing.MARGIN_XS,
  },
});

