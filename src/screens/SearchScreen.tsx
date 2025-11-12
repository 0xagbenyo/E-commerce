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

// Mock data for Trends sections
const twoPieceSet = [
  { id: '1', name: 'Blue Floral Set', price: 'GH₵45.00', image: '👗', discount: '-30%' },
];

const kidsItems = [
  { id: '1', name: 'Dreamy T-Shirt Set', price: 'GH₵11.80', image: '👕' },
  { id: '2', name: 'Souflis Sportswear', price: 'GH₵11.90', image: '🏃‍♀️' },
  { id: '3', name: 'Elladie Kids Dress', price: 'GH₵9.30', image: '👗' },
  { id: '4', name: 'Playful Pattern Set', price: 'GH₵10.60', image: '👚' },
];

const sheinSxyCurve = [
  { id: '1', name: 'One Shoulder Top', price: 'GH₵11.00', image: '👚' },
  { id: '2', name: 'Denim Look Dress', price: 'GH₵31.68', image: '👗' },
  { id: '3', name: 'Denim Crop Top Set', price: 'GH₵17.00', image: '👕' },
  { id: '4', name: 'Denim Maxi Dress', price: 'GH₵29.00', image: '👗' },
];

const vibekara = [
  { id: '1', name: 'Pink Floral Dress', price: 'GH₵21.00', image: '👗' },
  { id: '2', name: 'Textured Midi Dress', price: 'GH₵24.30', image: '👗' },
  { id: '3', name: 'Ruched Mini Dress', price: 'GH₵19.30', image: '👗' },
  { id: '4', name: 'Red Midi Dress', price: 'GH₵17.90', image: '👗' },
];

export const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('قفطان مغربي');

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>SIAMAE Trends</Text>
          <View style={styles.logoArrow}>
            <Ionicons name="arrow-forward" size={16} color={Colors.SHEIN_PINK} />
          </View>
        </View>
        
        <View style={styles.searchContainer}>
          <Text style={styles.searchPlaceholder}>{searchQuery}</Text>
          <View style={styles.searchActions}>
            <TouchableOpacity style={styles.searchIcon}>
              <Ionicons name="search" size={20} color={Colors.BLACK} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.searchIcon}>
              <Ionicons name="heart-outline" size={20} color={Colors.BLACK} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderTwoPieceSet = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.hashtagContainer}>
          <Text style={styles.hashtag}>#TwoPieceSet</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.BLACK} />
        </View>
      </View>
      <View style={styles.featuredProduct}>
        <View style={styles.featuredImage}>
          <Text style={styles.featuredEmoji}>👗</Text>
        </View>
        <Text style={styles.featuredPrice}>GH₵45.00</Text>
      </View>
    </View>
  );

  const renderProductSection = (products: any[], title: string, subtitle?: string, showNewTag = false) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {showNewTag && (
            <View style={styles.newTag}>
              <Text style={styles.newTagText}>New</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={16} color={Colors.BLACK} />
        </View>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
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
              {item.discount && (
                <View style={styles.discountTag}>
                  <Text style={styles.discountText}>{item.discount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.productPrice}>{item.price}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
      <View style={styles.userReview}>
                  <Text style={styles.reviewText}>
            {title === 'SIAMAE CURVE' 
              ? 's***o: Wow 😍 I loved it and I\'m very comfortable on it 👌'
              : 'g***o: super pretty 😍😍'
            }
          </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <ScrollView showsVerticalScrollIndicator={false}>
        {renderTwoPieceSet()}
        {renderProductSection(kidsItems, 'Kids Collection')}
        {renderProductSection(sheinSxyCurve, 'SIAMAE CURVE', '316K Followers')}
        {renderProductSection(vibekara, 'SIAMAE Maternity', '23K Followers', true)}
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
    backgroundColor: Colors.SHEIN_PINK,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerContent: {
    paddingHorizontal: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.WHITE,
  },
  logoArrow: {
    marginLeft: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.WHITE,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchPlaceholder: {
    flex: 1,
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
  section: {
    paddingVertical: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  hashtagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hashtag: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  featuredProduct: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  featuredImage: {
    width: width - 32,
    height: 200,
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featuredEmoji: {
    fontSize: 80,
  },
  featuredPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.BLACK,
  },
  newTag: {
    backgroundColor: Colors.SUCCESS,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newTagText: {
    fontSize: 12,
    color: Colors.WHITE,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    marginTop: 4,
  },
  productsList: {
    paddingHorizontal: 16,
  },
  productCard: {
    width: 120,
    marginRight: 12,
  },
  productImage: {
    width: 120,
    height: 150,
    backgroundColor: Colors.LIGHT_GRAY,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  productEmoji: {
    fontSize: 50,
  },
  discountTag: {
    position: 'absolute',
    top: 8,
    left: 8,
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
  productPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.BLACK,
    textAlign: 'center',
  },
  userReview: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  reviewText: {
    fontSize: 14,
    color: Colors.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
});

