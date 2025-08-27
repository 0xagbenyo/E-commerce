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

// Mock data for categories
const sidebarCategories = [
  'New In',
  'Sale',
  'Women Clothing',
  'Beachwear',
  'Shoes',
  'Electronics',
  'Men Clothing',
  'Kids',
  'Curve',
  'Home & Kitchen',
  'Underwear & Sleepwear',
  'Jewelry & Accessories',
  'Baby & Maternity',
  'Sports & Outdoors',
  'Beauty & Health',
  'Home Textiles',
];

const picksForYou = [
  { id: '1', name: 'Men Sports Sets', image: '🏃‍♂️', price: 'GH₵25.00' },
  { id: '2', name: 'Plus Size Shorts', image: '👗', price: 'GH₵18.00' },
  { id: '3', name: 'Men Sports Shorts', image: '🩳', price: 'GH₵15.00' },
  { id: '4', name: 'Plus Size Denim Shorts', image: '👖', price: 'GH₵22.00' },
  { id: '5', name: 'Men Sauna Suits', image: '🥋', price: 'GH₵35.00' },
  { id: '6', name: 'Plus Size Blouses', image: '👚', price: 'GH₵20.00' },
  { id: '7', name: 'Plus Size Co-Ords', image: '👕', price: 'GH₵28.00' },
  { id: '8', name: 'Men Sport Polos', image: '👔', price: 'GH₵24.00' },
  { id: '9', name: 'Men Cycling Tops', image: '🚴‍♂️', price: 'GH₵30.00' },
  { id: '10', name: 'Men Sports Tights', image: '🩲', price: 'GH₵26.00' },
  { id: '11', name: 'Plus Size Bodysuits', image: '👙', price: 'GH₵19.00' },
  { id: '12', name: 'Men Sports Pants', image: '👖', price: 'GH₵32.00' },
];

const trendsStore = [
  { id: '1', name: 'View All', image: '📱', isViewAll: true },
  { id: '2', name: 'Glamora CURVE', image: '👗', price: 'GH₵45.00' },
  { id: '3', name: 'Glamora STYLE', image: '👚', price: 'GH₵38.00' },
  { id: '4', name: 'Pastel Collection', image: '🌸', price: 'GH₵42.00' },
  { id: '5', name: 'Star Pattern Set', image: '⭐', price: 'GH₵35.00' },
  { id: '6', name: 'Button Up Dress', image: '👗', price: 'GH₵48.00' },
];

export const CategoriesScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('New In');

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Ionicons name="mail-outline" size={20} color={Colors.TEXT_SECONDARY} />
        <Text style={styles.searchPlaceholder}>Skirt Plus Size</Text>
        <View style={styles.searchActions}>
          <TouchableOpacity style={styles.searchIcon}>
            <Ionicons name="camera" size={20} color={Colors.BLACK} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchIcon}>
            <Ionicons name="search" size={20} color={Colors.BLACK} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.searchIcon}>
            <Ionicons name="heart-outline" size={20} color={Colors.BLACK} />
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
        {['All', 'Women', 'Curve', 'Kids', 'Men', 'Home'].map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              category === 'All' && styles.categoryTabActive
            ]}
          >
            <Text style={[
              styles.categoryTabText,
              category === 'All' && styles.categoryTabTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderSidebar = () => (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <View style={styles.sidebarIndicator} />
        <Text style={styles.sidebarTitle}>Just for You</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {sidebarCategories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.sidebarItem,
              selectedCategory === category && styles.sidebarItemActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.sidebarItemText,
              selectedCategory === category && styles.sidebarItemTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderProductGrid = (products: any[], title: string, showTrendsLogo = false) => (
    <View style={styles.productSection}>
      <View style={styles.sectionHeader}>
        {showTrendsLogo ? (
          <View style={styles.trendsLogoContainer}>
            <Text style={styles.trendsLogo}>Glamora</Text>
            <Text style={styles.trendsSubtitle}>Trends</Text>
          </View>
        ) : (
          <Text style={styles.sectionTitle}>{title}</Text>
        )}
      </View>
      <FlatList
        data={products}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <View style={styles.productImage}>
              <Text style={styles.productEmoji}>{item.image}</Text>
              {item.isViewAll && (
                <View style={styles.viewAllOverlay}>
                  <Ionicons name="grid" size={20} color={Colors.WHITE} />
                </View>
              )}
            </View>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            {item.price && (
              <Text style={styles.productPrice}>{item.price}</Text>
            )}
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <View style={styles.content}>
        {renderSidebar()}
        <View style={styles.mainContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderProductGrid(picksForYou, 'Picks for You')}
            {renderProductGrid(trendsStore, '', true)}
          </ScrollView>
        </View>
      </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.LIGHT_GRAY,
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.TEXT_SECONDARY,
  },
  searchActions: {
    flexDirection: 'row',
    gap: 12,
  },
  searchIcon: {
    padding: 4,
  },
  categoryTabs: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
  },
  categoryTabActive: {
    backgroundColor: Colors.SHEIN_PINK,
  },
  categoryTabText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: Colors.WHITE,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: width * 0.35,
    borderRightWidth: 1,
    borderRightColor: Colors.BORDER,
    backgroundColor: Colors.LIGHT_GRAY,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  sidebarIndicator: {
    width: 4,
    height: 20,
    backgroundColor: Colors.BLACK,
    marginRight: 12,
    borderRadius: 2,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  sidebarItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  sidebarItemActive: {
    backgroundColor: Colors.WHITE,
  },
  sidebarItemText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  sidebarItemTextActive: {
    color: Colors.BLACK,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    backgroundColor: Colors.WHITE,
  },
  productSection: {
    paddingVertical: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  trendsLogoContainer: {
    alignItems: 'center',
  },
  trendsLogo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.SHEIN_PINK,
  },
  trendsSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: -4,
  },
  productCard: {
    width: (width * 0.65 - 48) / 3,
    marginBottom: 16,
    alignItems: 'center',
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.LIGHT_GRAY,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  productEmoji: {
    fontSize: 24,
  },
  viewAllOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productName: {
    fontSize: 12,
    color: Colors.BLACK,
    textAlign: 'center',
    marginBottom: 4,
    lineHeight: 16,
  },
  productPrice: {
    fontSize: 12,
    color: Colors.SHEIN_PINK,
    fontWeight: '500',
  },
});

