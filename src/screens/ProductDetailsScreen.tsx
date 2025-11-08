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
  ActivityIndicator,
  TextInput,
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
import { useProduct } from '../hooks/erpnext';

const { width, height } = Dimensions.get('window');

export const ProductDetailsScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId } = (route.params as any) || {};
  
  // Fetch product data from API
  const { data: product, loading, error, retry } = useProduct(productId || '');
  
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');

  // Memoize images array to prevent unnecessary re-renders
  const images = React.useMemo(() => {
    if (!product) return [];
    return (product.slideshowImages && product.slideshowImages.length > 0)
      ? product.slideshowImages
      : (product.images && product.images.length > 0
        ? product.images
        : ['https://via.placeholder.com/400x600/F2F2F7/8E8E93?text=No+Image']);
  }, [product?.id, product?.slideshowImages?.length, product?.images?.length]);

  // Set default color when product loads
  React.useEffect(() => {
    if (product && product.colors && product.colors.length > 0) {
      setSelectedColor(product.colors[0]);
    }
  }, [product?.id]); // Use product.id instead of product object to prevent infinite loops

  // Auto-scroll slideshow carousel
  React.useEffect(() => {
    if (!product || images.length <= 1) {
      // Clear any existing timer if no product or only one image
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
      return;
    }

    // Only auto-scroll if user is not manually scrolling
    if (isUserScrolling) {
      // Clear any existing timer
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
      return;
    }

    // Clear any existing timer before starting a new one
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }

    // Auto-scroll every 3 seconds
    autoScrollTimerRef.current = setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % images.length;
        
        // Scroll to next image
        if (carouselRef.current) {
          carouselRef.current.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
        }
        
        return nextIndex;
      });
    }, 3000);

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
        autoScrollTimerRef.current = null;
      }
    };
  }, [product?.id, images.length, isUserScrolling]); // Use stable dependencies - images array is memoized

  // Reset user scrolling flag after user stops scrolling
  React.useEffect(() => {
    if (isUserScrolling) {
      const timer = setTimeout(() => {
        setIsUserScrolling(false);
      }, 5000); // Resume auto-scroll after 5 seconds of no user interaction

      return () => clearTimeout(timer);
    }
  }, [isUserScrolling]);

  const formatPrice = (price: number) => {
    return `GH₵${price.toFixed(2)}`;
  };

  const calculateDiscount = () => {
    if (product && product.originalPrice && product.originalPrice > product.price) {
      return Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
    }
    return 0;
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    if (!selectedSize && product.sizes && product.sizes.length > 0) {
      Alert.alert('Select Size', 'Please select a size before adding to cart.');
      return;
    }
    
    Alert.alert(
      'Added to Cart',
      `${product.name}${selectedSize ? ` (${selectedSize.name})` : ''}${selectedColor ? `, ${selectedColor.name}` : ''} has been added to your cart!`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('Cart' as never) },
      ]
    );
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    if (!selectedSize && product.sizes && product.sizes.length > 0) {
      Alert.alert('Select Size', 'Please select a size before purchasing.');
      return;
    }
    
    navigation.navigate('Checkout' as never);
  };

  const handleWishlist = React.useCallback(() => {
    setIsWishlisted((prev) => {
      const newValue = !prev;
      Alert.alert(
        newValue ? 'Added to Wishlist' : 'Removed from Wishlist',
        newValue ? 'Item added to your wishlist!' : 'Item removed from your wishlist.'
      );
      return newValue;
    });
  }, []);

  const renderImageCarousel = React.useCallback(() => {
    if (!product || images.length === 0) return null;
    
    return (
      <View style={styles.imageContainer}>
        <FlatList
          ref={carouselRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => {
            // User started scrolling - pause auto-scroll
            setIsUserScrolling(true);
            if (autoScrollTimerRef.current) {
              clearInterval(autoScrollTimerRef.current);
              autoScrollTimerRef.current = null;
            }
          }}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentImageIndex(index);
            // User finished scrolling - resume auto-scroll after delay
            setTimeout(() => {
              setIsUserScrolling(false);
            }, 2000);
          }}
          onScrollToIndexFailed={(info) => {
            // Handle scroll to index failure gracefully
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              if (carouselRef.current) {
                carouselRef.current.scrollToIndex({ index: info.index, animated: false });
              }
            });
          }}
          getItemLayout={(data, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          renderItem={({ item }) => (
            <Image 
              source={{ uri: item }} 
              style={styles.productImage} 
              resizeMode="cover"
              defaultSource={require('../assets/images/download.jpg')}
            />
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
          {images.map((_, index) => (
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
  }, [product, images, currentImageIndex, isWishlisted, navigation, handleWishlist]);

  const renderColorOptions = () => {
    if (!product || !product.colors || product.colors.length === 0) return null;
    
    return (
      <View style={styles.optionSection}>
        <Text style={styles.optionTitle}>
          Color: {selectedColor ? selectedColor.name : 'Select'}
        </Text>
        <View style={styles.colorOptions}>
          {product.colors.map((color) => (
          <TouchableOpacity
            key={color.id}
            style={[
              styles.colorOption,
              { backgroundColor: color.hexCode },
              selectedColor && selectedColor.id === color.id && styles.colorOptionSelected,
              !color.inStock && styles.colorOptionDisabled,
            ]}
            onPress={() => color.inStock && setSelectedColor(color)}
            disabled={!color.inStock}
          >
            {selectedColor && selectedColor.id === color.id && (
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
  };

  const renderSizeOptions = () => {
    if (!product || !product.sizes || product.sizes.length === 0) return null;
    
    return (
      <View style={styles.optionSection}>
        <Text style={styles.optionTitle}>Size</Text>
        <View style={styles.sizeOptions}>
          {product.sizes.map((size) => (
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
  };

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

  // Strip HTML tags from text
  const stripHtmlTags = (html: string): string => {
    if (!html) return '';
    // Remove HTML tags and decode HTML entities
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/&apos;/g, "'") // Replace &apos; with '
      .trim();
  };

  const renderSpecifications = () => {
    if (!product || !product.specifications || product.specifications.length === 0) {
      return null;
    }

    return (
      <View style={styles.specificationsSection}>
        <Text style={styles.specificationsTitle}>Specifications</Text>
        {product.specifications.map((spec, index) => (
          <View key={index} style={styles.specificationItem}>
            <Text style={styles.specificationLabel}>{stripHtmlTags(spec.label)}</Text>
            <Text style={styles.specificationDescription}>{stripHtmlTags(spec.description)}</Text>
          </View>
        ))}
      </View>
    );
  };

  const handleSubmitReview = () => {
    if (reviewRating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting your review.');
      return;
    }
    if (!reviewTitle.trim()) {
      Alert.alert('Title Required', 'Please enter a review title.');
      return;
    }
    if (!reviewComment.trim()) {
      Alert.alert('Comment Required', 'Please enter your review comment.');
      return;
    }

    // TODO: Submit review to API
    Alert.alert(
      'Review Submitted',
      'Thank you for your review! It will be published after moderation.',
      [
        {
          text: 'OK',
          onPress: () => {
            setShowReviewForm(false);
            setReviewRating(0);
            setReviewTitle('');
            setReviewComment('');
          },
        },
      ]
    );
  };

  const renderReviewForm = () => {
    if (!showReviewForm) return null;

    return (
      <View style={styles.reviewFormContainer}>
        <Text style={styles.reviewFormTitle}>Write a Review</Text>
        
        <View style={styles.ratingInputContainer}>
          <Text style={styles.ratingInputLabel}>Rating</Text>
          <View style={styles.ratingStarsInput}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setReviewRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= reviewRating ? 'star' : 'star-outline'}
                  size={32}
                  color={star <= reviewRating ? Colors.WARNING : Colors.TEXT_SECONDARY}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.reviewInputContainer}>
          <Text style={styles.reviewInputLabel}>Title</Text>
          <TextInput
            style={styles.reviewInput}
            placeholder="Enter review title"
            value={reviewTitle}
            onChangeText={setReviewTitle}
            placeholderTextColor={Colors.TEXT_SECONDARY}
          />
        </View>

        <View style={styles.reviewInputContainer}>
          <Text style={styles.reviewInputLabel}>Comment</Text>
          <TextInput
            style={[styles.reviewInput, styles.reviewTextArea]}
            placeholder="Write your review..."
            value={reviewComment}
            onChangeText={setReviewComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor={Colors.TEXT_SECONDARY}
          />
        </View>

        <View style={styles.reviewFormActions}>
          <TouchableOpacity
            style={[styles.reviewFormButton, styles.reviewFormButtonCancel]}
            onPress={() => {
              setShowReviewForm(false);
              setReviewRating(0);
              setReviewTitle('');
              setReviewComment('');
            }}
          >
            <Text style={styles.reviewFormButtonTextCancel}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reviewFormButton, styles.reviewFormButtonSubmit]}
            onPress={handleSubmitReview}
          >
            <Text style={styles.reviewFormButtonTextSubmit}>Submit Review</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderReviews = () => {
    if (!product) return null;
    
    return (
      <View style={styles.reviewsSection}>
        <View style={styles.reviewsHeader}>
          <Text style={styles.reviewsTitle}>Customer Reviews</Text>
          {product.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={Colors.WARNING} />
              <Text style={styles.ratingText}>
                {product.rating.toFixed(1)} ({product.reviewCount} reviews)
              </Text>
            </View>
          )}
        </View>
        
        {!showReviewForm && (
          <TouchableOpacity
            style={styles.writeReviewButton}
            onPress={() => setShowReviewForm(true)}
          >
            <Ionicons name="create-outline" size={20} color={Colors.WHITE} />
            <Text style={styles.writeReviewButtonText}>Write a Review</Text>
          </TouchableOpacity>
        )}

        {renderReviewForm()}
        
        {product.reviewCount === 0 && !showReviewForm && (
          <Text style={styles.noReviewsText}>No reviews yet. Be the first to review!</Text>
        )}
      </View>
    );
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.SHEIN_PINK} />
          <Text style={styles.loadingText}>Loading product details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.ERROR} />
          <Text style={styles.errorText}>Failed to load product</Text>
          <Text style={styles.errorSubtext}>{error?.message || 'Product not found'}</Text>
          <View style={styles.errorActions}>
            <TouchableOpacity
              style={[styles.retryButton, styles.retryButtonPrimary]}
              onPress={retry}
            >
              <Ionicons name="refresh" size={20} color={Colors.WHITE} style={{ marginRight: 8 }} />
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.retryButtonText, { color: Colors.TEXT_PRIMARY }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderImageCarousel()}
        
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.brand}>{product.brand}</Text>
            {product.company && (
              <Text style={styles.company}>{product.company}</Text>
            )}
            <Text style={styles.name}>{product.name}</Text>
            
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{formatPrice(product.price)}</Text>
              {product.originalPrice && product.originalPrice > product.price && (
                <Text style={styles.originalPrice}>{formatPrice(product.originalPrice)}</Text>
              )}
              {calculateDiscount() > 0 && (
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>-{calculateDiscount()}%</Text>
                </View>
              )}
            </View>

            {product.rating > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color={Colors.WARNING} />
                <Text style={styles.ratingText}>
                  {product.rating.toFixed(1)} ({product.reviewCount} reviews)
                </Text>
              </View>
            )}

            {!product.inStock && (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Out of Stock</Text>
              </View>
            )}
          </View>

          {renderSpecifications()}
          
          {product.description && (
            <Text style={styles.description}>{stripHtmlTags(product.description)}</Text>
          )}
          
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
              disabled={!product.inStock}
            />
            <Button
              title="Buy Now"
              onPress={handleBuyNow}
              variant="primary"
              size="large"
              fullWidth
              style={styles.buyNowButton}
              disabled={!product.inStock}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.PADDING_XL,
  },
  loadingText: {
    marginTop: Spacing.MARGIN_MD,
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.TEXT_SECONDARY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.PADDING_XL,
  },
  errorText: {
    marginTop: Spacing.MARGIN_MD,
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.ERROR,
  },
  errorSubtext: {
    marginTop: Spacing.MARGIN_SM,
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    textAlign: 'center',
  },
  errorActions: {
    marginTop: Spacing.MARGIN_LG,
    flexDirection: 'row',
    gap: Spacing.MARGIN_MD,
    justifyContent: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.PADDING_LG,
    paddingVertical: Spacing.PADDING_MD,
    borderRadius: Spacing.BORDER_RADIUS_MD,
    borderWidth: 1,
    borderColor: Colors.TEXT_PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  retryButtonPrimary: {
    backgroundColor: Colors.SHEIN_PINK,
    borderColor: Colors.SHEIN_PINK,
  },
  retryButtonText: {
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
  },
  specificationsSection: {
    marginTop: Spacing.MARGIN_LG,
    marginBottom: Spacing.MARGIN_MD,
    paddingTop: Spacing.PADDING_LG,
    borderTopWidth: 1,
    borderTopColor: Colors.LIGHT_GRAY,
  },
  specificationsTitle: {
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_MD,
  },
  specificationItem: {
    marginBottom: Spacing.MARGIN_MD,
    paddingBottom: Spacing.PADDING_MD,
    borderBottomWidth: 1,
    borderBottomColor: Colors.LIGHT_GRAY,
  },
  specificationLabel: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_XS,
  },
  specificationDescription: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    lineHeight: Typography.FONT_SIZE_SM * 1.5,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.SHEIN_PINK,
    paddingVertical: Spacing.PADDING_MD,
    paddingHorizontal: Spacing.PADDING_LG,
    borderRadius: Spacing.BORDER_RADIUS_MD,
    marginTop: Spacing.MARGIN_MD,
    marginBottom: Spacing.MARGIN_LG,
  },
  writeReviewButtonText: {
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    marginLeft: Spacing.MARGIN_SM,
  },
  reviewFormContainer: {
    marginTop: Spacing.MARGIN_LG,
    padding: Spacing.PADDING_LG,
    backgroundColor: Colors.SURFACE,
    borderRadius: Spacing.BORDER_RADIUS_MD,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  reviewFormTitle: {
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_LG,
  },
  ratingInputContainer: {
    marginBottom: Spacing.MARGIN_LG,
  },
  ratingInputLabel: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_SM,
  },
  ratingStarsInput: {
    flexDirection: 'row',
    gap: Spacing.MARGIN_SM,
  },
  starButton: {
    padding: Spacing.PADDING_XS,
  },
  reviewInputContainer: {
    marginBottom: Spacing.MARGIN_LG,
  },
  reviewInputLabel: {
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
    color: Colors.TEXT_PRIMARY,
    marginBottom: Spacing.MARGIN_SM,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: Spacing.BORDER_RADIUS_MD,
    padding: Spacing.PADDING_MD,
    fontSize: Typography.FONT_SIZE_MD,
    color: Colors.TEXT_PRIMARY,
    backgroundColor: Colors.WHITE,
  },
  reviewTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  reviewFormActions: {
    flexDirection: 'row',
    gap: Spacing.MARGIN_MD,
    marginTop: Spacing.MARGIN_MD,
  },
  reviewFormButton: {
    flex: 1,
    paddingVertical: Spacing.PADDING_MD,
    borderRadius: Spacing.BORDER_RADIUS_MD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewFormButtonCancel: {
    backgroundColor: Colors.SURFACE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  reviewFormButtonSubmit: {
    backgroundColor: Colors.SHEIN_PINK,
  },
  reviewFormButtonTextCancel: {
    color: Colors.TEXT_PRIMARY,
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
  },
  reviewFormButtonTextSubmit: {
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_MD,
    fontWeight: Typography.FONT_WEIGHT_SEMIBOLD,
  },
  company: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    fontStyle: 'italic',
    marginBottom: Spacing.MARGIN_XS,
  },
  outOfStockBadge: {
    marginTop: Spacing.MARGIN_SM,
    alignSelf: 'flex-start',
    backgroundColor: Colors.ERROR,
    paddingHorizontal: Spacing.PADDING_MD,
    paddingVertical: Spacing.PADDING_XS,
    borderRadius: Spacing.BORDER_RADIUS_SM,
  },
  outOfStockText: {
    color: Colors.WHITE,
    fontSize: Typography.FONT_SIZE_SM,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
  },
  noReviewsText: {
    fontSize: Typography.FONT_SIZE_SM,
    color: Colors.TEXT_SECONDARY,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: Spacing.PADDING_LG,
  },
});
