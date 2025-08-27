import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../components/Button';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';
import { Spacing } from '../constants/spacing';
import { Product, ProductColor, ProductSize } from '../types';

const { width, height } = Dimensions.get('window');

// Mock product data - in real app this would come from API
const mockProduct: Product = {
  id: '1',
  name: 'Summer Floral Maxi Dress',
  description: 'Beautiful floral print maxi dress perfect for summer. Made from lightweight, breathable fabric with a flattering silhouette. Features adjustable straps and a built-in bra for comfort and support.',
  price: 49.99,
  originalPrice: 79.99,
  discountPercentage: 37,
  category: 'Dresses',
  subcategory: 'Maxi Dresses',
  brand: 'Glamora',
  images: [
    'https://via.placeholder.com/400x600/FF4D6D/FFFFFF?text=Dress+1',
    'https://via.placeholder.com/400x600/007AFF/FFFFFF?text=Dress+2',
    'https://via.placeholder.com/400x600/98D8C8/FFFFFF?text=Dress+3',
    'https://via.placeholder.com/400x600/E6E6FA/FFFFFF?text=Dress+4',
  ],
  colors: [
    { id: '1', name: 'Blue Floral', hexCode: '#007AFF', inStock: true },
    { id: '2', name: 'Pink Floral', hexCode: '#FF4D6D', inStock: true },
    { id: '3', name: 'Green Floral', hexCode: '#98D8C8', inStock: false },
  ],
  sizes: [
    { id: '1', name: 'XS', inStock: true },
    { id: '2', name: 'S', inStock: true },
    { id: '3', name: 'M', inStock: true },
    { id: '4', name: 'L', inStock: false },
    { id: '5', name: 'XL', inStock: true },
  ],
  inStock: true,
  rating: 4.5,
  reviewCount: 128,
  tags: ['summer', 'floral', 'dress', 'maxi', 'casual'],
  isNew: true,
  isTrending: true,
  isOnSale: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const mockReviews = [
  {
    id: '1',
    userName: 'Sarah M.',
    rating: 5,
    title: 'Perfect summer dress!',
    comment: 'This dress is absolutely gorgeous! The fabric is lightweight and comfortable, perfect for hot summer days. The fit is true to size and the floral print is beautiful.',
    date: '2 days ago',
    helpful: 12,
  },
  {
    id: '2',
    userName: 'Jessica L.',
    rating: 4,
    title: 'Great quality for the price',
    comment: 'Really happy with this purchase. The dress fits well and the material is good quality. Only giving 4 stars because the straps could be a bit more adjustable.',
    date: '1 week ago',
    helpful: 8,
  },
];

export const ProductDetailsScreen: React.FC = () => {
  const [selectedColor, setSelectedColor] = useState<ProductColor>(mockProduct.colors[0]);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const navigation = useNavigation();
  const route = useRoute();

  const formatPrice = (price: number) => {
    return `$${price.toFixed(2)}`;
  };

  const calculateDiscount = () => {
    if (mockProduct.originalPrice && mockProduct.originalPrice > mockProduct.price) {
      return Math.round(((mockProduct.originalPrice - mockProduct.price) / mockProduct.originalPrice) * 100);
    }
    return 0;
  };

  const handleAddToCart = () => {
    if (!selectedSize) {
      Alert.alert('Select Size', 'Please select a size before adding to cart.');
      return;
    }
    
    Alert.alert(
      'Added to Cart',
      `${mockProduct.name} (${selectedSize.name}, ${selectedColor.name}) has been added to your cart!`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('Cart' as never) },
      ]
    );
  };

  const handleBuyNow = () => {
    if (!selectedSize) {
      Alert.alert('Select Size', 'Please select a size before purchasing.');
      return;
    }
    
    navigation.navigate('Checkout' as never);
  };

  const handleWishlist = () => {
    setIsWishlisted(!isWishlisted);
    Alert.alert(
      isWishlisted ? 'Removed from Wishlist' : 'Added to Wishlist',
      isWishlisted ? 'Item removed from your wishlist.' : 'Item added to your wishlist!'
    );
  };

  const renderImageCarousel = () => (
    <View style={styles.imageContainer}>
      <FlatList
        data={mockProduct.images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentImageIndex(index);
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={styles.productImage} resizeMode="cover" />
        )}
        keyExtractor={(_, index) => index.toString()}
      />
      
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.WHITE} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.wishlistButton}
        onPress={handleWishlist}
      >
        <Ionicons
          name={isWishlisted ? 'heart' : 'heart-outline'}
          size={24}
          color={isWishlisted ? Colors.VIBRANT_PINK : Colors.WHITE}
        />
      </TouchableOpacity>

      <View style={styles.imagePagination}>
        {mockProduct.images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentImageIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    </View>
  );

  const renderColorOptions = () => (
    <View style={styles.optionSection}>
      <Text style={styles.optionTitle}>Color: {selectedColor.name}</Text>
      <View style={styles.colorOptions}>
        {mockProduct.colors.map((color) => (
          <TouchableOpacity
            key={color.id}
            style={[
              styles.colorOption,
              { backgroundColor: color.hexCode },
              selectedColor.id === color.id && styles.colorOptionSelected,
              !color.inStock && styles.colorOptionDisabled,
            ]}
            onPress={() => color.inStock && setSelectedColor(color)}
            disabled={!color.inStock}
          >
            {selectedColor.id === color.id && (
              <Ionicons name="checkmark" size={16} color={Colors.WHITE} />
            )}
            {!color.inStock && (
              <View style={styles.outOfStockOverlay} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSizeOptions = () => (
    <View style={styles.optionSection}>
      <Text style={styles.optionTitle}>Size</Text>
      <View style={styles.sizeOptions}>
        {mockProduct.sizes.map((size) => (
          <TouchableOpacity
            key={size.id}
            style={[
              styles.sizeOption,
              selectedSize?.id === size.id && styles.sizeOptionSelected,
              !size.inStock && styles.sizeOptionDisabled,
            ]}
            onPress={() => size.inStock && setSelectedSize(size)}
            disabled={!size.inStock}
          >
            <Text
              style={[
                styles.sizeText,
                selectedSize?.id === size.id && styles.sizeTextSelected,
                !size.inStock && styles.sizeTextDisabled,
              ]}
            >
              {size.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderQuantitySelector = () => (
    <View style={styles.optionSection}>
      <Text style={styles.optionTitle}>Quantity</Text>
      <View style={styles.quantitySelector}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => quantity > 1 && setQuantity(quantity - 1)}
        >
          <Ionicons name="remove" size={20} color={Colors.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.quantityText}>{quantity}</Text>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => setQuantity(quantity + 1)}
        >
          <Ionicons name="add" size={20} color={Colors.TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReviews = () => (
    <View style={styles.reviewsSection}>
      <View style={styles.reviewsHeader}>
        <Text style={styles.reviewsTitle}>Customer Reviews</Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={16} color={Colors.WARNING} />
          <Text style={styles.ratingText}>
            {mockProduct.rating} ({mockProduct.reviewCount} reviews)
          </Text>
        </View>
      </View>
      
      {mockReviews.map((review) => (
        <View key={review.id} style={styles.reviewItem}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewerName}>{review.userName}</Text>
            <View style={styles.reviewRating}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= review.rating ? 'star' : 'star-outline'}
                  size={12}
                  color={Colors.WARNING}
                />
              ))}
            </View>
          </View>
          <Text style={styles.reviewTitle}>{review.title}</Text>
          <Text style={styles.reviewComment}>{review.comment}</Text>
          <View style={styles.reviewFooter}>
            <Text style={styles.reviewDate}>{review.date}</Text>
            <TouchableOpacity style={styles.helpfulButton}>
              <Ionicons name="thumbs-up-outline" size={14} color={Colors.TEXT_SECONDARY} />
              <Text style={styles.helpfulText}>Helpful ({review.helpful})</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderImageCarousel()}
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.brand}>{mockProduct.brand}</Text>
            <Text style={styles.name}>{mockProduct.name}</Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{formatPrice(mockProduct.price)}</Text>
              {mockProduct.originalPrice && mockProduct.originalPrice > mockProduct.price && (
                <Text style={styles.originalPrice}>{formatPrice(mockProduct.originalPrice)}</Text>
              )}
              {calculateDiscount() > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{calculateDiscount()}%</Text>
                </View>
              )}
            </View>

            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={Colors.WARNING} />
              <Text style={styles.ratingText}>
                {mockProduct.rating} ({mockProduct.reviewCount} reviews)
              </Text>
            </View>
          </View>

          <Text style={styles.description}>{mockProduct.description}</Text>

          {renderColorOptions()}
          {renderSizeOptions()}
          {renderQuantitySelector()}

          <View style={styles.actionButtons}>
            <Button
              title="Add to Cart"
              onPress={handleAddToCart}
              variant="outline"
              size="large"
              fullWidth
              style={styles.addToCartButton}
            />
            <Button
              title="Buy Now"
              onPress={handleBuyNow}
              variant="primary"
              size="large"
              fullWidth
              style={styles.buyNowButton}
            />
          </View>

          {renderReviews()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BACKGROUND,
  },
  imageContainer: {
    height: height * 0.5,
    position: 'relative',
  },
  productImage: {
    width,
    height: height * 0.5,
  },
  backButton: {
    position: 'absolute',
    top: Spacing.PADDING_LG,
    left: Spacing.PADDING_LG,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistButton: {
    position: 'absolute',
    top: Spacing.PADDING_LG,
    right: Spacing.PADDING_LG,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePagination: {
    position: 'absolute',
    bottom: Spacing.PADDING_LG,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: Colors.WHITE,
    width: 20,
  },
  content: {
    padding: Spacing.PADDING_LG,
  },
  header: {
    marginBottom: Spacing.MARGIN_LG,
  },
  brand: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    marginBottom: Spacing.MARGIN_XS,
  },
  name: {
    fontSize: Typography.FONT_SIZE_XL,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_SM,
    lineHeight: Typography.FONT_SIZE_XL * 1.3,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.MARGIN_SM,
  },
  price: {
    fontSize: Typography.FONT_SIZE_XL,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
    marginRight: Spacing.MARGIN_SM,
  },
  originalPrice: {
    fontSize: Typography.FONT_SIZE_LG,
    color: Colors.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
    marginRight: Spacing.MARGIN_SM,
  },
  discountBadge: {
    backgroundColor: Colors.VIBRANT_PINK,
    paddingHorizontal: Spacing.PADDING_SM,
    paddingVertical: Spacing.PADDING_XS,
    borderRadius: Spacing.BORDER_RADIUS_SM,
  },
  discountText: {
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_SM,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    marginLeft: Spacing.MARGIN_XS,
  },
  description: {
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.TEXT_SECONDARY,
    lineHeight: Typography.FONT_SIZE_MD * 1.5,
    marginBottom: Spacing.MARGIN_XL,
  },
  optionSection: {
    marginBottom: Spacing.MARGIN_LG,
  },
  optionTitle: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_MD,
  },
  colorOptions: {
    flexDirection: 'row',
    gap: Spacing.MARGIN_MD,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.BORDER,
  },
  colorOptionSelected: {
    borderColor: Colors.VIBRANT_PINK,
    borderWidth: 3,
  },
  colorOptionDisabled: {
    opacity: 0.5,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.MARGIN_SM,
  },
  sizeOption: {
    width: 50,
    height: 50,
    borderRadius: Spacing.BORDER_RADIUS_MD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.SURFACE,
  },
  sizeOptionSelected: {
    borderColor: Colors.VIBRANT_PINK,
    backgroundColor: Colors.VIBRANT_PINK,
  },
  sizeOptionDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.LIGHT_GRAY,
  },
  sizeText: {
    fontSize: Typography.FONT_SIZE_SM,
    fontWeight: Typography.FONT_WEIGHT_MEDIUM,
    color: Colors.TEXT_PRIMARY,
  },
  sizeTextSelected: {
    color: Colors.WHITE,
  },
  sizeTextDisabled: {
    color: Colors.TEXT_DISABLED,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.SURFACE,
    borderRadius: Spacing.BORDER_RADIUS_MD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
    paddingHorizontal: Spacing.PADDING_MD,
  },
  actionButtons: {
    marginBottom: Spacing.MARGIN_XL,
  },
  addToCartButton: {
    marginBottom: Spacing.MARGIN_MD,
  },
  buyNowButton: {
    marginBottom: Spacing.MARGIN_MD,
  },
  reviewsSection: {
    marginTop: Spacing.MARGIN_LG,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.MARGIN_LG,
  },
  reviewsTitle: {
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
  },
  reviewItem: {
    marginBottom: Spacing.MARGIN_LG,
    paddingBottom: Spacing.PADDING_LG,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.MARGIN_SM,
  },
  reviewerName: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewTitle: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_SM,
  },
  reviewComment: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    lineHeight: Typography.FONT_SIZE_SM * 1.4,
    marginBottom: Spacing.MARGIN_SM,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: Typography.FONT_SIZE_XS,
    color: Colors.TEXT_SECONDARY,
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.MARGIN_XS,
  },
  helpfulText: {
    fontSize: Typography.FONT_SIZE_XS,
    color: Colors.TEXT_SECONDARY,
  },
});
