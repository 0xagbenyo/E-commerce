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

// Mock data for new arrivals
const newArrivals = [
  { id: '1', name: 'Summer Floral Dress', price: 'GH₵25.00', image: '👗', isNew: true },
  { id: '2', name: 'Denim Jacket', price: 'GH₵35.00', image: '🧥', isNew: true },
  { id: '3', name: 'Casual Sneakers', price: 'GH₵18.00', image: '👟', isNew: true },
  { id: '4', name: 'Elegant Blouse', price: 'GH₵22.00', image: '👚', isNew: true },
];

const trendingNow = [
  { id: '1', name: 'Crop Top Set', price: 'GH₵15.00', image: '👕', trend: '🔥 Trending' },
  { id: '2', name: 'Wide Leg Pants', price: 'GH₵28.00', image: '👖', trend: 'New Style' },
  { id: '3', name: 'Statement Necklace', price: 'GH₵8.00', image: '💍', trend: 'Popular' },
  { id: '4', name: 'Crossbody Bag', price: 'GH₵12.00', image: '👜', trend: 'Must Have' },
];

const categories = ['All', 'Women', 'Men', 'Kids', 'Accessories'];

export const NewScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.headerTitle}>New Arrivals</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={Colors.BLACK} />
        </TouchableOpacity>
      </View>
      <Text style={styles.headerSubtitle}>Discover the latest trends and fresh styles</Text>
    </View>
  );

  const renderCategoryTabs = () => (
    <View style={styles.categoryTabs}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryTab,
              selectedCategory === category && styles.categoryTabActive
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text style={[
              styles.categoryTabText,
              selectedCategory === category && styles.categoryTabTextActive
            ]}>
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderProductSection = (products: any[], title: string, subtitle?: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Ionicons name="sparkles" size={20} color={Colors.SHEIN_PINK} />
        </View>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        <TouchableOpacity>
          <Text style={styles.viewMoreText}>View all {'>'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={products}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.productsList}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <View style={styles.productImage}>
              <Text style={styles.productEmoji}>{item.image}</Text>
              {item.isNew && (
                <View style={styles.newTag}>
                  <Text style={styles.newTagText}>NEW</Text>
                </View>
              )}
              {item.trend && (
                <View style={styles.trendTag}>
                  <Text style={styles.trendText}>{item.trend}</Text>
                </View>
              )}
            </View>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.productPrice}>{item.price}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  );

  const renderFeaturedBanner = () => (
    <View style={styles.featuredBanner}>
      <View style={styles.bannerContent}>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle}>Spring Collection</Text>
          <Text style={styles.bannerSubtitle}>Up to 50% off new arrivals</Text>
          <TouchableOpacity style={styles.bannerButton}>
            <Text style={styles.bannerButtonText}>Shop Now</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bannerImage}>
          <Text style={styles.bannerEmoji}>🌸</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderHeader()}
        {renderCategoryTabs()}
        {renderFeaturedBanner()}
        {renderProductSection(newArrivals, 'New Arrivals', 'Fresh styles just in')}
        {renderProductSection(trendingNow, 'Trending Now', 'What\'s hot this week')}
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
    backgroundColor: Colors.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  notificationButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: Colors.TEXT_SECONDARY,
  },
  categoryTabs: {
    paddingVertical: 12,
    backgroundColor: Colors.WHITE,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
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
  featuredBanner: {
    margin: 16,
    backgroundColor: Colors.SHEIN_PINK,
    borderRadius: 12,
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.WHITE,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: Colors.WHITE,
    opacity: 0.9,
    marginBottom: 12,
  },
  bannerButton: {
    backgroundColor: Colors.WHITE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.SHEIN_PINK,
  },
  bannerImage: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerEmoji: {
    fontSize: 60,
  },
  section: {
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
  },
  viewMoreText: {
    fontSize: 14,
    color: Colors.SHEIN_PINK,
    fontWeight: '500',
  },
  productsList: {
    paddingHorizontal: 16,
  },
  productCard: {
    width: 140,
    marginRight: 12,
  },
  productImage: {
    width: 140,
    height: 160,
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  productEmoji: {
    fontSize: 60,
  },
  newTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.SUCCESS,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newTagText: {
    fontSize: 10,
    color: Colors.WHITE,
    fontWeight: 'bold',
  },
  trendTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.SHEIN_ORANGE,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendText: {
    fontSize: 10,
    color: Colors.WHITE,
    fontWeight: 'bold',
  },
  productName: {
    fontSize: 14,
    color: Colors.BLACK,
    marginBottom: 4,
    textAlign: 'center',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.BLACK,
    textAlign: 'center',
  },
});
