import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');

// Mock wishlist data
const wishlistItems = [
  {
    id: '1',
    name: 'Glamora Plus Size Summer Dress',
    brand: 'GLAMORA CURVE',
    price: 'GH₵28.50',
    originalPrice: 'GH₵35.00',
    discount: '-19%',
    image: '👗',
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
    sizes: ['S', 'M', 'L', 'XL'],
    inStock: true,
  },
  {
    id: '2',
    name: 'Glamora Denim Jacket',
    brand: 'GLAMORA STYLE',
    price: 'GH₵42.00',
    image: '🧥',
    colors: ['#2C3E50', '#34495E'],
    sizes: ['M', 'L', 'XL'],
    inStock: true,
  },
  {
    id: '3',
    name: 'Glamora Floral Blouse',
    brand: 'GLAMORA PRIVÉ',
    price: 'GH₵18.90',
    originalPrice: 'GH₵25.00',
    discount: '-24%',
    image: '👚',
    colors: ['#E74C3C', '#F39C12', '#27AE60'],
    sizes: ['S', 'M', 'L'],
    inStock: false,
  },
  {
    id: '4',
    name: 'Glamora High-Waist Jeans',
    brand: 'GLAMORA CURVE',
    price: 'GH₵32.00',
    image: '👖',
    colors: ['#34495E', '#2C3E50'],
    sizes: ['28', '30', '32', '34'],
    inStock: true,
  },
  {
    id: '5',
    name: 'Glamora Evening Gown',
    brand: 'GLAMORA LUXE',
    price: 'GH₵89.00',
    image: '👗',
    colors: ['#8E44AD', '#2C3E50'],
    sizes: ['S', 'M', 'L'],
    inStock: true,
  },
];

export const WishlistScreen: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const renderWishlistItem = ({ item }: { item: any }) => {
    const isSelected = selectedItems.includes(item.id);
    
    return (
      <View style={[styles.wishlistItem, viewMode === 'list' && styles.listItem]}>
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

        <View style={[styles.itemImage, viewMode === 'list' && styles.listItemImage]}>
          <Text style={styles.itemEmoji}>{item.image}</Text>
          {item.discount && (
            <View style={styles.discountTag}>
              <Text style={styles.discountText}>{item.discount}</Text>
            </View>
          )}
          {!item.inStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.brandName}>{item.brand}</Text>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{item.price}</Text>
            {item.originalPrice && (
              <Text style={styles.originalPrice}>{item.originalPrice}</Text>
            )}
          </View>

          <View style={styles.colorSwatches}>
            {item.colors.map((color: string, index: number) => (
              <View 
                key={index} 
                style={[styles.colorSwatch, { backgroundColor: color }]} 
              />
            ))}
          </View>

          <View style={styles.sizeContainer}>
            <Text style={styles.sizeLabel}>Size:</Text>
            <View style={styles.sizeOptions}>
              {item.sizes.map((size: string, index: number) => (
                <View key={index} style={styles.sizeOption}>
                  <Text style={styles.sizeText}>{size}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.itemActions}>
            <TouchableOpacity 
              style={[styles.actionButton, !item.inStock && styles.disabledButton]}
              disabled={!item.inStock}
            >
              <Text style={[styles.actionButtonText, !item.inStock && styles.disabledText]}>
                Add to Cart
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeButton}>
              <Ionicons name="trash-outline" size={16} color={Colors.ERROR} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
        data={wishlistItems}
        renderItem={renderWishlistItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 2 : 1}
        contentContainerStyle={styles.wishlistContainer}
        showsVerticalScrollIndicator={false}
      />
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

