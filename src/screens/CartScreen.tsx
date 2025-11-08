import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

// Mock cart data
const cartItems = [
  {
    id: '1',
    brand: 'GLAMORA CURVE',
    name: 'GLAMORA Plus Size Women\'s Floral Top',
    variant: 'Yellow / 3XL',
    price: 'GH₵8.00',
    image: '👚',
    isTrends: true,
  },
  {
    id: '2',
    brand: 'GLAMORA PRIVÉ',
    name: 'GLAMORA Privé Plus Size Spring/Summer Top',
    variant: 'White / 4XL',
    price: 'GH₵8.10',
    image: '👚',
    stockLeft: '7 Left',
    reviews: '500+ 5-star reviews',
  },
  {
    id: '3',
    brand: 'GLAMORA PRIVÉ',
    name: 'GLAMORA Privé Plus Size Women\'s Tie-Dye Top',
    variant: 'Green / 4XL',
    price: 'GH₵9.10',
    image: '👚',
    salesInfo: '80% bought at this price',
  },
  {
    id: '4',
    brand: 'GLAMORA PRIVÉ',
    name: 'GLAMORA Privé 3 Pcs/Set Plus Size Tops',
    variant: 'Dark Green / 3XL',
    price: 'GH₵15.60',
    originalPrice: 'GH₵16.00',
    priceChange: '-GH₵0.40 since add',
    image: '👚',
    reviews: '100+ 5-star reviews',
  },
];

export const CartScreen: React.FC = () => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('All');

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.radioButton}>
            <Ionicons name="radio-button-off" size={20} color={Colors.BLACK} />
          </TouchableOpacity>
          <Text style={styles.radioLabel}>All</Text>
        </View>
        <Text style={styles.cartTitle}>Cart (19)</Text>
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

  const renderCartItem = ({ item }: { item: any }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemHeader}>
        <Text style={styles.brandName}>{item.brand}</Text>
        {item.isTrends && (
          <View style={styles.trendsTag}>
            <Text style={styles.trendsText}>Trends</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={Colors.BLACK} />
      </View>
      
      <View style={styles.itemContent}>
        <TouchableOpacity style={styles.radioButton}>
          <Ionicons name="radio-button-off" size={20} color={Colors.BLACK} />
        </TouchableOpacity>
        
        <View style={styles.itemImage}>
          <Text style={styles.itemEmoji}>{item.image}</Text>
          {item.stockLeft && (
            <View style={styles.stockBanner}>
              <Text style={styles.stockText}>{item.stockLeft}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <TouchableOpacity style={styles.heartButton}>
            <Ionicons name="heart-outline" size={20} color={Colors.BLACK} />
          </TouchableOpacity>
          
          <View style={styles.variantContainer}>
            <Text style={styles.variantText}>{item.variant}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.BLACK} />
          </View>
          
          {item.reviews && (
            <View style={styles.reviewsContainer}>
              <Ionicons name="thumbs-up" size={16} color={Colors.SUCCESS} />
              <Text style={styles.reviewsText}>{item.reviews}</Text>
            </View>
          )}
          
          {item.salesInfo && (
            <View style={styles.salesContainer}>
              <Ionicons name="cart" size={16} color={Colors.SHEIN_PINK} />
              <Text style={styles.salesText}>{item.salesInfo}</Text>
            </View>
          )}
          
          <View style={styles.priceContainer}>
            <Text style={styles.itemPrice}>{item.price}</Text>
            {item.originalPrice && (
              <Text style={styles.originalPrice}>{item.originalPrice}</Text>
            )}
            {item.priceChange && (
              <Text style={styles.priceChange}>{item.priceChange}</Text>
            )}
          </View>
          
          <View style={styles.quantityContainer}>
            <TouchableOpacity style={styles.quantityButton}>
              <Ionicons name="trash-outline" size={20} color={Colors.BLACK} />
            </TouchableOpacity>
            <View style={styles.quantityBox}>
              <Text style={styles.quantityText}>1</Text>
            </View>
            <TouchableOpacity style={styles.quantityButton}>
              <Ionicons name="add" size={20} color={Colors.BLACK} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

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

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderFilterTabs()}
      <ScrollView showsVerticalScrollIndicator={false}>
        {cartItems.map((item) => (
          <View key={item.id}>
            {renderCartItem({ item })}
          </View>
        ))}
        {renderPromotionsBanner()}
      </ScrollView>
      {renderCheckoutBar()}
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
