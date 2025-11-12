import React, { useMemo } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { Spacing } from '../constants/spacing';
import { Typography } from '../constants/typography';
import { ProductCard } from '../components/ProductCard';
import { Product } from '../types';

const { width } = Dimensions.get('window');

interface RouteParams {
  deals: Product[];
}

export const AllDealsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { deals = [] } = (route.params as RouteParams) || {};

  // Sort deals by discount percentage (highest first)
  const sortedDeals = useMemo(() => {
    return [...deals].sort((a: any, b: any) => (b.discount || 0) - (a.discount || 0));
  }, [deals]);

  const handleBack = () => {
    navigation.goBack();
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Ionicons name="chevron-back" size={24} color={Colors.BLACK} />
      </TouchableOpacity>
      <Text style={styles.title}>Super Deals</Text>
      <View style={styles.backButton} />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <FlatList
        data={sortedDeals}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gridContainer}
        renderItem={({ item, index }) => {
          const isLeftColumn = index % 2 === 0;
          const row = Math.floor(index / 2);
          const patterns = [
            ['tall', 'short'],
            ['medium', 'tall'],
            ['short', 'medium'],
          ];
          const patternIndex = row % patterns.length;
          const variant = (isLeftColumn
            ? patterns[patternIndex][0]
            : patterns[patternIndex][1]
          ) as 'tall' | 'medium' | 'short';

          return (
            <ProductCard
              product={item}
              onPress={(productId) => {
                (navigation as any).navigate('ProductDetails', { productId });
              }}
              onWishlistPress={(productId) => {
                console.log('Toggle wishlist for:', productId);
              }}
              style={styles.productCard}
              variant={variant}
              pricingDiscount={(item as any).discount}
            />
          );
        }}
        keyExtractor={(item) => item.id}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.PADDING_MD,
    paddingVertical: Spacing.PADDING_MD,
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.FONT_SIZE_LG,
    fontWeight: Typography.FONT_WEIGHT_BOLD,
    color: Colors.TEXT_PRIMARY,
    flex: 1,
    textAlign: 'center',
  },
  gridContainer: {
    paddingHorizontal: Spacing.PADDING_SM,
    paddingVertical: Spacing.PADDING_MD,
    gap: Spacing.MARGIN_SM,
  },
  productCard: {
    width: '48%',
    marginBottom: Spacing.MARGIN_SM,
  },
});

