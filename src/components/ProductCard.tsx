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
  onPress?: (productId: string) => void;
  onWishlistPress?: (productId: string) => void;
  onCartPress?: (productId: string) => void;
  isWishlisted?: boolean;
  style?: any;
  variant?: 'tall' | 'medium' | 'short'; // For staggered layout
  pricingDiscount?: number; // Discount from pricing rules
}

export const ProductCard: React.FC<ProductCardProps> = React.memo(({
  product,
  onPress,
  onWishlistPress,
  onCartPress,
  isWishlisted = false,
  style,
  variant = 'medium',
  pricingDiscount = 0,
}) => {
  // Safety check for product
  if (!product) {
    return null;
  }

  const formatPrice = (price: number) => {
    return `GH₵${price.toFixed(2)}`;
  };

  const calculateDiscount = () => {
    // Use pricing rule discount if available, otherwise calculate from prices
    if (pricingDiscount && typeof pricingDiscount === 'number' && pricingDiscount > 0) {
      return Math.round(pricingDiscount);
    }
    if (product?.originalPrice && product?.price && product.originalPrice > product.price) {
      return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    }
    return 0;
  };

  const discount = calculateDiscount();

  // Calculate prices based on discount
  const getDisplayPrices = () => {
    if (!product) {
      return { displayPrice: 0, originalPrice: 0 };
    }
    if (discount > 0) {
      // If we have a pricing rule discount, calculate the new price from current price
      if (pricingDiscount && typeof pricingDiscount === 'number' && pricingDiscount > 0) {
        const discountedPrice = product.price * (1 - discount / 100);
        return {
          displayPrice: discountedPrice,
          originalPrice: product.price, // Current price becomes the "original"
        };
      }
      // Otherwise use the existing price structure
      return {
        displayPrice: product.price,
        originalPrice: product.originalPrice,
      };
    }
    return {
      displayPrice: product.price,
      originalPrice: product.originalPrice,
    };
  };

  const { displayPrice, originalPrice } = getDisplayPrices();

  // Calculate heights based on variant for very subtle staggered layout
  const getHeights = () => {
    switch (variant) {
      case 'tall':
        return {
          imageHeight: cardWidth * 1.15, // Very slightly taller image
          contentPadding: Spacing.PADDING_MD, // Standard content space
        };
      case 'short':
        return {
          imageHeight: cardWidth * 1.10, // Very slightly shorter image
          contentPadding: Spacing.PADDING_MD, // Standard content space
        };
      case 'medium':
      default:
        return {
          imageHeight: cardWidth * 1.12, // Default image
          contentPadding: Spacing.PADDING_MD, // Standard content space
        };
    }
  };

  const { imageHeight, contentPadding } = getHeights();

  return (
    <TouchableOpacity
      style={[styles.container, style, { alignSelf: 'flex-start' }]}
      onPress={() => onPress?.(product.id)}
      activeOpacity={0.9}
    >
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {product.images && product.images.length > 0 && product.images[0] ? (
          <Image
            source={{ uri: product.images[0] }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={40} color={Colors.TEXT_SECONDARY} />
          </View>
        )}
        
        {/* Wishlist Button */}
        {onWishlistPress && (
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
        )}

        {/* Cart Button */}
        {onCartPress && (
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => onCartPress(product.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="cart-outline"
              size={20}
              color={Colors.WHITE}
            />
          </TouchableOpacity>
        )}

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

      <View style={[styles.content, { padding: contentPadding }]}>
        {product.brand ? (
          <Text style={styles.brand} numberOfLines={1} ellipsizeMode="tail">
            {product.brand}
          </Text>
        ) : null}
        
        {product.company && variant !== 'short' ? (
          <Text style={styles.company} numberOfLines={1} ellipsizeMode="tail">
            {product.company}
          </Text>
        ) : null}
        
        {product.name ? (
          <Text 
            style={styles.name} 
            numberOfLines={variant === 'tall' ? 3 : variant === 'short' ? 1 : 2}
            ellipsizeMode="tail"
          >
            {product.name}
          </Text>
        ) : null}

        <View style={styles.priceContainer}>
          <View style={styles.priceRow} pointerEvents="none">
            <View style={styles.priceTextContainer}>
              <Text 
                style={styles.price}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {formatPrice(displayPrice || 0)}
              </Text>
            </View>
            {originalPrice && originalPrice > (displayPrice || 0) && (
              <View style={styles.originalPriceTextContainer}>
                <Text 
                  style={styles.originalPrice}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {formatPrice(originalPrice)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Rating - only show for tall and medium variants */}
        {product.rating && product.rating > 0 && variant !== 'short' ? (
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={12} color={Colors.WARNING} />
            <Text style={styles.rating}>
              {product.rating.toFixed(1)} ({product.reviewCount || 0})
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.images?.[0] === nextProps.product.images?.[0] &&
    prevProps.isWishlisted === nextProps.isWishlisted &&
    prevProps.style === nextProps.style &&
    prevProps.variant === nextProps.variant &&
    prevProps.pricingDiscount === nextProps.pricingDiscount
  );
});

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: Colors.SURFACE,
    borderRadius: Spacing.BORDER_RADIUS_LG,
    marginBottom: Spacing.MARGIN_SM,
    overflow: 'hidden', // Prevent any content from overflowing
    ...Spacing.SHADOW_SM,
  },
  
  imageContainer: {
    position: 'relative',
    width: '100%',
    borderTopLeftRadius: Spacing.BORDER_RADIUS_LG,
    borderTopRightRadius: Spacing.BORDER_RADIUS_LG,
    overflow: 'hidden',
  },
  
  image: {
    width: '100%',
    height: '100%',
  },
  
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
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
  
  cartButton: {
    position: 'absolute',
    bottom: Spacing.MARGIN_SM,
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
    width: '100%',
    flexShrink: 1,
    overflow: 'hidden',
  },
  
  brand: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    marginBottom: Spacing.MARGIN_XS,
  },
  
  company: {
    fontSize: Typography.FONT_SIZE_XS,
    color: Colors.TEXT_SECONDARY,
    fontWeight: Typography.FONT_WEIGHT_REGULAR,
    marginBottom: Spacing.MARGIN_XS,
    fontStyle: 'italic',
  },
  
  name: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_PRIMARY,
    fontWeight: Typography.FONT_WEIGHT_REGULAR,
    marginBottom: Spacing.MARGIN_SM,
    lineHeight: Typography.FONT_SIZE_SM * 1.4,
  },
  
  priceContainer: {
    marginBottom: Spacing.MARGIN_XS,
    width: '100%',
    overflow: 'hidden',
  },
  
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  
  priceTextContainer: {
    flexShrink: 1,
    flexGrow: 0,
    minWidth: 0,
    maxWidth: '70%',
    marginRight: 6,
  },
  
  price: {
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.TEXT_PRIMARY,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
  },
  
  originalPriceTextContainer: {
    flexShrink: 1,
    flexGrow: 0,
    minWidth: 0,
    maxWidth: '28%',
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

