import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { useWishlist } from '../hooks/erpnext';
import { ProductCard } from '../components/ProductCard';
import { useNavigation } from '@react-navigation/native';
import { WishlistItem } from '../types';
import { useUserSession } from '../context/UserContext';

const { width } = Dimensions.get('window');

export const WishlistScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Get user email from session
  const { user } = useUserSession();
  const userEmail = user?.email || null;
  
  // Fetch wishlist from ERPNext
  const { wishlistItems, loading, error, refresh } = useWishlist(userEmail);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>Wishlist</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.viewModeButton}
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            <Ionicons 
              name={viewMode === 'grid' ? 'list' : 'grid'} 
              size={20} 
              color={Colors.BLACK} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchButton}>
            <Ionicons name="search" size={20} color={Colors.BLACK} />
          </TouchableOpacity>
        </View>
      </View>
      
      {selectedItems.length > 0 && (
        <View style={styles.selectionBar}>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionText}>
              {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
            </Text>
          </View>
          <View style={styles.selectionActions}>
            <TouchableOpacity style={styles.selectionButton}>
              <Text style={styles.selectionButtonText}>Move to Cart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.selectionButton, styles.deleteButton]}>
              <Text style={[styles.selectionButtonText, styles.deleteButtonText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderWishlistItem = ({ item, index }: { item: WishlistItem; index: number }) => {
    if (!item.product) {
      return null; // Skip items without product data
    }

    const isSelected = selectedItems.includes(item.id);
    const variants: ('tall' | 'medium' | 'short')[] = ['tall', 'medium', 'short'];
    const variant = variants[index % 3] as 'tall' | 'medium' | 'short';
    
    return (
      <View style={styles.wishlistItemWrapper}>
        <TouchableOpacity 
          style={styles.selectButton}
          onPress={() => {
            if (isSelected) {
              setSelectedItems(selectedItems.filter(id => id !== item.id));
            } else {
              setSelectedItems([...selectedItems, item.id]);
            }
          }}
        >
          <Ionicons 
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} 
            size={24} 
            color={isSelected ? Colors.SHEIN_PINK : Colors.TEXT_SECONDARY} 
          />
        </TouchableOpacity>
        <ProductCard
          product={item.product}
          variant={variant}
          onPress={() => {
            (navigation as any).navigate('ProductDetails', { productId: item.productId });
          }}
          onWishlistPress={() => {
            // Handle remove from wishlist
            console.log('Remove from wishlist:', item.productId);
          }}
        />
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color={Colors.LIGHT_GRAY} />
      <Text style={styles.emptyText}>Your wishlist is empty</Text>
      <Text style={styles.emptySubtext}>Start adding items you love!</Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={Colors.SHEIN_PINK} />
      <Text style={styles.loadingText}>Loading your wishlist...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={64} color={Colors.ERROR} />
      <Text style={styles.errorText}>Failed to load wishlist</Text>
      <TouchableOpacity style={styles.retryButton} onPress={refresh}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {loading && renderLoadingState()}
      {error && !loading && renderErrorState()}
      {!loading && !error && wishlistItems.length === 0 && renderEmptyState()}
      {!loading && !error && wishlistItems.length > 0 && (
        <FlatList
          data={wishlistItems}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          contentContainerStyle={styles.wishlistContainer}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={viewMode === 'grid' ? styles.row : undefined}
        />
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewModeButton: {
    padding: 4,
  },
  searchButton: {
    padding: 4,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.LIGHT_GRAY,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionText: {
    fontSize: 14,
    color: Colors.BLACK,
    fontWeight: '500',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.SHEIN_PINK,
  },
  deleteButton: {
    borderColor: Colors.ERROR,
  },
  selectionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.SHEIN_PINK,
  },
  deleteButtonText: {
    color: Colors.ERROR,
  },
  wishlistContainer: {
    padding: 16,
  },
  wishlistItemWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.BLACK,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  errorText: {
    fontSize: 16,
    color: Colors.ERROR,
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.SHEIN_PINK,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.WHITE,
    fontSize: 16,
    fontWeight: '600',
  },
  wishlistItem: {
    backgroundColor: Colors.WHITE,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: (width - 48) / 2,
    marginHorizontal: 4,
  },
  listItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
  },
  itemImage: {
    width: '100%',
    height: 150,
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  listItemImage: {
    width: 80,
    height: 80,
    marginBottom: 0,
    marginRight: 12,
  },
  itemEmoji: {
    fontSize: 40,
  },
  discountTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.FLASH_SALE_RED,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 12,
    color: Colors.WHITE,
    fontWeight: 'bold',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  outOfStockText: {
    color: Colors.WHITE,
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemInfo: {
    flex: 1,
  },
  brandName: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 14,
    color: Colors.BLACK,
    fontWeight: '500',
    marginBottom: 8,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.BLACK,
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    textDecorationLine: 'line-through',
  },
  colorSwatches: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  colorSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },
  sizeContainer: {
    marginBottom: 12,
  },
  sizeLabel: {
    fontSize: 12,
    color: Colors.TEXT_SECONDARY,
    marginBottom: 4,
  },
  sizeOptions: {
    flexDirection: 'row',
    gap: 4,
  },
  sizeOption: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.BORDER,
    borderRadius: 4,
  },
  sizeText: {
    fontSize: 12,
    color: Colors.BLACK,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.SHEIN_PINK,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.LIGHT_GRAY,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.WHITE,
  },
  disabledText: {
    color: Colors.TEXT_SECONDARY,
  },
  removeButton: {
    padding: 8,
  },
});

